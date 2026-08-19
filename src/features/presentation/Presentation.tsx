import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { useStore } from "../../store/useStore";
import { useAutoHideChrome } from "../../hooks/useAutoHideChrome";
import { useGoLive } from "../../hooks/useGoLive";
import { useViewport } from "../../hooks/useViewport";
import { usePortalHost } from "../../hooks/usePortalHost";
import { useAssetUrl } from "../../hooks/useAssetUrl";
import { useSpeech } from "../../hooks/useSpeech";
import { useBlobUrl } from "../../lib/blobUrls";
import { stripInlineFormatting } from "../../lib/inlineFormat";
import { stripListMarker } from "../../lib/lists";
import type { VideoProgress } from "../../lib/media";
import {
  MEDIA_SYNC_INTERVAL_MS,
  openPresentChannel,
  type PresentState,
} from "../../lib/presentChannel";
import { usePresentation } from "./usePresentation";
import { Stage } from "./Stage";
import { PresentationControls } from "./PresentationControls";
import { PresenterBar } from "./PresenterBar";
import { PresenterPip } from "./PresenterPip";
import { VideoSurface } from "../../components/media/VideoSurface";
import { VideoTransportBar } from "../../components/media/VideoTransportBar";
import type { Background, ScripturePassage } from "../../types";

function resolveRootBg(
  bg: Background | null,
  blobUrl: string | null,
): CSSProperties {
  if (!bg) return { background: "#000" };
  if (bg.type === "image") {
    const url = bg.blobId ? blobUrl : bg.dataUrl;
    return {
      backgroundImage: url ? `url(${url})` : undefined,
      backgroundColor: "#000",
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }
  if (bg.type === "solid") return { background: bg.color };
  return { background: bg.css || "#000" };
}

/** Where the clip's transport sits on the stage: above the presenter bar. */
const STAGE_TRANSPORT_STYLE: CSSProperties = {
  position: "fixed",
  left: "50%",
  bottom: 86,
  transform: "translateX(-50%)",
  zIndex: 20,
  width: "min(680px, calc(100vw - 32px))",
};

const END_LABELS: Record<string, string> = {
  manuscript: "End of manuscript",
  scripture: "End of passage",
  image: "End of images",
  video: "End of video",
};

export function Presentation() {
  const pushToast = useStore((s) => s.pushToast);
  const { width } = useViewport();
  const mode = useStore((s) => s.presentationMode);
  const setPresentationMode = useStore((s) => s.setPresentationMode);
  const {
    isExtended,
    isLive: live,
    isLiveFullscreen,
    goLive,
    endLive,
    toggleLiveFullscreen,
  } = useGoLive();
  const pipRef = useRef<HTMLDivElement>(null);
  // One element for the clip, moved between the stage and the floating
  // presenter rather than rebuilt at each, so popping out never restarts it.
  const videoHost = usePortalHost();
  // In pip mode the presentation shares the page with the app, so it only
  // claims the keyboard while the floating presenter holds focus.
  const shortcutGate = useCallback(
    () =>
      mode === "stage" ||
      Boolean(pipRef.current?.contains(document.activeElement)),
    [mode],
  );
  const handleToggleLiveFullscreen = () => {
    void toggleLiveFullscreen().then((ok) => {
      if (!ok)
        pushToast(
          "Could not enter fullscreen remotely. Click the fullscreen icon inside the projected window.",
        );
    });
  };
  const fullscreenOverride = useMemo(
    () =>
      live
        ? { isFullscreen: isLiveFullscreen, toggle: handleToggleLiveFullscreen }
        : undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [live, isLiveFullscreen, toggleLiveFullscreen],
  );
  const p = usePresentation(fullscreenOverride, shortcutGate);

  const announced = useRef(false);
  const stateRef = useRef<PresentState | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // The stage chrome answers to the pointer anywhere on the page rather than to
  // the root element: the clip's own element is portalled outside this tree, so
  // a listener bound here would never see a pointer moving over the video.
  const chrome = useAutoHideChrome({ enabled: mode === "stage" });
  const { visible: chromeActive, onHoverChange } = chrome;

  useEffect(() => {
    if (isExtended && !announced.current) {
      announced.current = true;
      pushToast("External display detected. Tap Go Live to project.");
    }
  }, [isExtended, pushToast]);

  const speech = useSpeech();

  const deck = p.deck;
  const deckKind = deck?.kind;
  const deckId = deck?.id;
  const deckRev = deck?.rev;
  const deckDoc = deck?.doc;
  const deckItem = deck?.item;
  useEffect(() => {
    if (!deckKind || !deckId) return;
    stateRef.current = {
      kind: deckKind,
      id: deckId,
      rev: deckRev,
      doc: deckDoc,
      item: deckItem,
      slideIndex: p.slideIndex,
      paused: p.paused,
      zoom: p.zoom,
      pan: p.pan,
      view: p.view,
      media: p.isVideoSlide ? p.mediaPlayback : undefined,
    };
    channelRef.current?.postMessage({ type: "state", state: stateRef.current });
  }, [
    deckKind,
    deckId,
    deckRev,
    deckDoc,
    deckItem,
    p.slideIndex,
    p.paused,
    p.zoom,
    p.pan.x,
    p.pan.y,
    p.pan,
    p.view,
    p.isVideoSlide,
    p.mediaPlayback,
  ]);

  useEffect(() => {
    if (!live) return;
    const channel = openPresentChannel((msg) => {
      if (msg.type === "request-state" && stateRef.current) {
        channel.postMessage({ type: "state", state: stateRef.current });
      }
    });
    channelRef.current = channel;
    if (stateRef.current)
      channel.postMessage({ type: "state", state: stateRef.current });
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [live]);

  /**
   * The projected window plays a video element of its own, which nothing in the
   * broadcast state can hold in step: each element buffers and starts on its
   * own schedule, so it drifts, and pops out of step altogether when the
   * operator moves between the stage and the floating presenter. Publishing
   * where this clip actually is, on a tick, lets that window correct itself
   * against the same clock the operator is watching.
   */
  const isVideoSlide = p.isVideoSlide;
  const videoPlaying = p.mediaPlayback.playing;
  const videoRate = p.videoSettings?.playbackRate ?? 1;
  const readVideoTime = p.getVideoTime;
  useEffect(() => {
    if (!live || !isVideoSlide) return;
    const publish = () => {
      const channel = channelRef.current;
      if (!channel) return;
      channel.postMessage({
        type: "media-sync",
        sync: {
          time: readVideoTime(),
          at: Date.now(),
          playing: videoPlaying,
          rate: videoRate,
        },
      });
    };
    publish();
    const timer = window.setInterval(publish, MEDIA_SYNC_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [live, isVideoSlide, videoPlaying, videoRate, readVideoTime, mode]);

  /**
   * Publishes the clip's transport for the rest of the app, which is how the
   * media editor offers to bring itself into line with what the room is already
   * watching. Only the changes are published, each carrying the clock its
   * position was read at, so a consumer works out where the clip has got to
   * without this having to broadcast on a tick.
   */
  const publishPresentedMedia = useStore((s) => s.publishPresentedMedia);
  const currentVideoId =
    p.currentSlide?.kind === "video" ? p.currentSlide.item.id : null;
  useEffect(() => {
    if (!isVideoSlide) {
      publishPresentedMedia(null);
      return;
    }
    publishPresentedMedia({
      playback: p.mediaPlayback,
      sync: {
        time: readVideoTime(),
        at: Date.now(),
        playing: p.mediaPlayback.playing,
        rate: videoRate,
      },
    });
  }, [
    isVideoSlide,
    currentVideoId,
    p.mediaPlayback,
    videoRate,
    readVideoTime,
    publishPresentedMedia,
  ]);

  const backdropBlobUrl = useBlobUrl(p.frame?.backdrop?.blobId);
  const audioSrc = useAssetUrl(p.audioItem);

  const canRead = deckKind === "scripture" && speech.supported;
  const handleToggleRead = () => {
    if (!deck || deckKind !== "scripture") return;
    if (speech.speaking) {
      speech.stop();
      return;
    }
    // Read from the current slide to the end, advancing the stage as each
    // slide's text begins. Verse-number prefixes and the trailing reference
    // line aren't spoken.
    const startSlideIndex = p.slideIndex;
    const showRef = Boolean(
      p.doc &&
      "showReference" in p.doc &&
      (p.doc as ScripturePassage).showReference,
    );
    const chunks = p.slides.slice(startSlideIndex).map((s) => {
      if (s.kind !== "text") return "";
      const lines =
        showRef && s.slide.lines.length > 1
          ? s.slide.lines.slice(0, -1)
          : s.slide.lines;
      return lines
        .map((line) => stripInlineFormatting(stripListMarker(line)))
        .join("\n");
    });
    speech.speak(chunks, (i) => p.goTo(startSlideIndex + i));
  };
  const readToggleRef = useRef(handleToggleRead);
  readToggleRef.current = handleToggleRead;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "r" || e.key === "R") readToggleRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!deck || !p.currentSlide || !p.frame) return null;

  const controlsVisible = !p.prefs.autoHideControls || chromeActive;
  const presenterVisible = !p.prefs.autoHidePresenterBar || chromeActive;

  // Once live, zoom/pan/view only shape what's broadcast to the external
  // popup, this window's own stage stays put so it can keep being used as
  // a console instead of mirroring the projected adjustments.
  const localZoom = live ? 1 : p.zoom;
  const localPan = live ? { x: 0, y: 0 } : p.pan;
  const localView = live ? "normal" : p.view;

  // Not async: window.open has to run inside the click that asked for it.
  const handleGoLive = () => {
    if (live) {
      endLive();
      pushToast("Ended the live projection.");
      return;
    }
    const result = goLive();
    if (result.ok) {
      pushToast(
        isExtended
          ? "Live on the external display."
          : "Presentation window opened. Drag it to your projector, then press its fullscreen button.",
      );
    } else if (result.reason === "blocked") {
      pushToast(
        "Popup blocked. Allow popups for this site to go live.",
        "error",
      );
    }
  };

  const handleExit = () => {
    speech.stop();
    endLive();
    p.exit();
  };

  /**
   * Moves between the fullscreen stage and the floating presenter. The clip's
   * element belongs to neither, it is only re-parented, so the move needs no
   * seek to paper over: playback carries on from the frame it was on.
   */
  const switchMode = (next: "stage" | "pip") => setPresentationMode(next);

  /**
   * Shrinks the presentation into the floating presenter so the operator can
   * use the rest of the app. The projected window is untouched: the audience
   * keeps seeing the stage while this window hands the screen back.
   */
  const handleShrinkToPip = () => {
    if (document.fullscreenElement) void document.exitFullscreen?.();
    switchMode("pip");
  };

  // On a clip the pause control is the clip's: holding a run of slides still
  // while a video keeps playing under it is not what the button is reached for.
  const paused = p.isVideoSlide ? !p.mediaPlayback.playing : p.paused;
  const handleTogglePause = p.isVideoSlide
    ? p.toggleVideoPlaying
    : p.togglePause;

  const videoProgress: VideoProgress | undefined = p.isVideoSlide
    ? {
        time: p.videoTime,
        start: p.videoSettings?.trimStart ?? 0,
        end: p.videoSettings?.trimEnd ?? p.videoDuration,
      }
    : undefined;

  const currentLabel =
    p.currentSlide.kind === "text"
      ? p.currentSlide.slide.label
      : p.currentSlide.item.name;
  const notes =
    p.currentSlide.kind === "text" ? p.currentSlide.slide.notes : "";

  // The one video element every surface shares. It lives here, outside both
  // the stage and the floating presenter, and is only re-parented into
  // whichever is on screen, so moving between them never interrupts the clip.
  // Only silenced while the projected window is carrying the sound.
  const videoLayer =
    p.frame.content.kind === "video"
      ? createPortal(
          <VideoSurface
            ref={p.videoRef}
            item={p.frame.content.item}
            playback={p.mediaPlayback}
            forceMuted={live}
            onTimeUpdate={p.onVideoTime}
            onEnded={p.onVideoEnded}
            style={{ pointerEvents: "auto" }}
          />,
          videoHost,
        )
      : null;

  const audioLayer =
    p.audioItem && audioSrc ? (
      <audio ref={p.audioRef} src={audioSrc} loop={p.prefs.loopAudio} />
    ) : null;

  // The floating presenter replaces the fullscreen stage without unmounting
  // this component, so the slide position, timer and audio all carry over.
  if (mode === "pip") {
    return (
      <>
        {videoLayer}
        <PresenterPip
          title={deck.title}
          currentLabel={currentLabel}
          notes={notes}
          frame={p.frame}
          slideIndex={p.slideIndex}
          total={p.slides.length}
          paused={paused}
          isLive={live}
          videoHost={videoHost}
          videoProgress={videoProgress}
          videoMuted={p.mediaPlayback.muted}
          onSeekVideo={p.seekVideoTo}
          onToggleVideoMuted={p.toggleVideoMuted}
          onRestartVideo={p.restartVideo}
          rootRef={pipRef}
          onPrev={() => p.go(-1)}
          onNext={() => p.go(1)}
          onTogglePause={handleTogglePause}
          onOpenStage={() => switchMode("stage")}
          onGoLive={handleGoLive}
          onStopLive={() => {
            endLive();
            pushToast("Ended the live projection.");
          }}
          onExit={handleExit}
        />
        {audioLayer}
      </>
    );
  }

  return (
    <>
      {videoLayer}
      <div
        ref={p.rootRef}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 150,
          ...resolveRootBg(p.frame.backdrop, backdropBlobUrl),
        }}
      >
        <Stage
          slideIndex={p.slideIndex}
          content={p.frame.content}
          animation={p.frame.animation}
          view={localView}
          zoom={localZoom}
          pan={localPan}
          onPanBy={p.panBy}
          durationMs={p.prefs.transitionDuration}
          easing={p.prefs.easing}
          videoHost={videoHost}
        />

        <PresentationControls
          paused={paused}
          view={p.view}
          zoom={p.zoom}
          showInfo={p.showInfo}
          isFullscreen={p.isFullscreen}
          visible={controlsVisible}
          isExternal={isExtended}
          isLive={live}
          canRead={canRead}
          reading={speech.speaking}
          onToggleRead={handleToggleRead}
          onHoverChange={onHoverChange}
          onGoLive={handleGoLive}
          onShrinkToPip={handleShrinkToPip}
          onTogglePause={handleTogglePause}
          onSetView={p.setViewMode}
          onZoomIn={p.zoomIn}
          onZoomOut={p.zoomOut}
          onResetZoom={p.resetZoom}
          onToggleInfo={p.toggleInfo}
          onToggleFullscreen={p.toggleFullscreen}
          onExit={handleExit}
        />

        {p.isVideoSlide && (
          <VideoTransportBar
            playing={p.mediaPlayback.playing}
            muted={p.mediaPlayback.muted}
            volume={p.mediaPlayback.volume}
            time={p.videoTime}
            start={p.videoSettings?.trimStart ?? 0}
            end={p.videoSettings?.trimEnd ?? p.videoDuration}
            visible={controlsVisible}
            onHoverChange={onHoverChange}
            compact={width < 560}
            onTogglePlaying={p.toggleVideoPlaying}
            onToggleMuted={p.toggleVideoMuted}
            onVolume={p.setVideoVolume}
            onSeek={p.seekVideoTo}
            onRestart={p.restartVideo}
            style={STAGE_TRANSPORT_STYLE}
          />
        )}

        {p.showInfo && (
          <PresenterBar
            title={deck.title}
            currentLabel={currentLabel}
            notes={notes}
            nextFrame={p.nextFrame}
            endLabel={END_LABELS[deck.kind] || "End"}
            slideIndex={p.slideIndex}
            total={p.slides.length}
            elapsed={p.elapsed}
            paused={p.paused}
            videoProgress={videoProgress}
            visible={presenterVisible}
            onHoverChange={onHoverChange}
            onPrev={() => p.go(-1)}
            onNext={() => p.go(1)}
          />
        )}
      </div>
      {audioLayer}
    </>
  );
}
