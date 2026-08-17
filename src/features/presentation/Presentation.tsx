import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useStore } from "../../store/useStore";
import { useGoLive } from "../../hooks/useGoLive";
import { useAssetUrl } from "../../hooks/useAssetUrl";
import { useSpeech } from "../../hooks/useSpeech";
import { useBlobUrl } from "../../lib/blobUrls";
import { stripInlineFormatting } from "../../lib/inlineFormat";
import { stripListMarker } from "../../lib/lists";
import {
  openPresentChannel,
  type PresentState,
} from "../../lib/presentChannel";
import { usePresentation } from "./usePresentation";
import { Stage } from "./Stage";
import { PresentationControls } from "./PresentationControls";
import { PresenterBar } from "./PresenterBar";
import { PresenterPip } from "./PresenterPip";
import { VideoControlsBar } from "./VideoControlsBar";
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

const END_LABELS: Record<string, string> = {
  manuscript: "End of manuscript",
  scripture: "End of passage",
  image: "End of images",
  video: "End of video",
};

export function Presentation() {
  const pushToast = useStore((s) => s.pushToast);
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

  const [chromeActive, setChromeActive] = useState(true);
  const hideTimer = useRef<number>();
  const hovering = useRef(false);
  const announced = useRef(false);
  const stateRef = useRef<PresentState | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const scheduleHide = () => {
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (!hovering.current) setChromeActive(false);
    }, 2800);
  };
  const wake = () => {
    setChromeActive(true);
    scheduleHide();
  };
  const onHoverChange = (isHovering: boolean) => {
    hovering.current = isHovering;
    if (isHovering) {
      setChromeActive(true);
      window.clearTimeout(hideTimer.current);
    } else {
      scheduleHide();
    }
  };

  useEffect(() => {
    wake();
    return () => window.clearTimeout(hideTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
   * Shrinks the presentation into the floating presenter so the operator can
   * use the rest of the app. The projected window is untouched: the audience
   * keeps seeing the stage while this window hands the screen back.
   */
  const handleShrinkToPip = () => {
    if (document.fullscreenElement) void document.exitFullscreen?.();
    setPresentationMode("pip");
  };

  const currentLabel =
    p.currentSlide.kind === "text"
      ? p.currentSlide.slide.label
      : p.currentSlide.item.name;
  const notes =
    p.currentSlide.kind === "text" ? p.currentSlide.slide.notes : "";

  // The floating presenter replaces the fullscreen stage without unmounting
  // this component, so the slide position, timer and audio all carry over.
  if (mode === "pip") {
    return (
      <>
        <PresenterPip
          title={deck.title}
          currentLabel={currentLabel}
          notes={notes}
          frame={p.frame}
          slideIndex={p.slideIndex}
          total={p.slides.length}
          paused={p.paused}
          isLive={live}
          rootRef={pipRef}
          onPrev={() => p.go(-1)}
          onNext={() => p.go(1)}
          onTogglePause={p.togglePause}
          onOpenStage={() => setPresentationMode("stage")}
          onGoLive={handleGoLive}
          onStopLive={() => {
            endLive();
            pushToast("Ended the live projection.");
          }}
          onExit={handleExit}
        />
        {p.audioItem && audioSrc && (
          <audio ref={p.audioRef} src={audioSrc} loop={p.prefs.loopAudio} />
        )}
      </>
    );
  }

  return (
    <div
      ref={p.rootRef}
      onPointerMove={wake}
      onPointerLeave={() => {
        window.clearTimeout(hideTimer.current);
        if (!hovering.current) setChromeActive(false);
      }}
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
        playback={p.mediaPlayback}
        forceMutedVideo={live}
        videoRef={p.videoRef}
        onVideoTime={p.onVideoTime}
        onVideoEnded={p.onVideoEnded}
      />

      <PresentationControls
        paused={p.paused}
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
        onTogglePause={p.togglePause}
        onSetView={p.setViewMode}
        onZoomIn={p.zoomIn}
        onZoomOut={p.zoomOut}
        onResetZoom={p.resetZoom}
        onToggleInfo={p.toggleInfo}
        onToggleFullscreen={p.toggleFullscreen}
        onExit={handleExit}
      />

      {p.isVideoSlide && (
        <VideoControlsBar
          playback={p.mediaPlayback}
          settings={p.videoSettings}
          time={p.videoTime}
          duration={p.videoDuration}
          visible={controlsVisible}
          onHoverChange={onHoverChange}
          onTogglePlaying={p.toggleVideoPlaying}
          onToggleMuted={p.toggleVideoMuted}
          onVolume={p.setVideoVolume}
          onSeek={p.seekVideoTo}
          onRestart={p.restartVideo}
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
          visible={presenterVisible}
          onHoverChange={onHoverChange}
          onPrev={() => p.go(-1)}
          onNext={() => p.go(1)}
        />
      )}

      {p.audioItem && audioSrc && (
        <audio ref={p.audioRef} src={audioSrc} loop={p.prefs.loopAudio} />
      )}
    </div>
  );
}
