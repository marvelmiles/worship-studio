import { useCallback, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useStore } from "../../store/useStore";
import { useAutoHideChrome } from "../../hooks/useAutoHideChrome";
import { useGoLive } from "../../hooks/useGoLive";
import { useViewport } from "../../hooks/useViewport";
import { usePortalHost } from "../../hooks/usePortalHost";
import { useBlobUrl } from "../../lib/blobUrls";
import type { VideoProgress } from "../../lib/media";
import type { PresentState } from "../../lib/presentChannel";
import {
  primaryCamera,
  secondaryCameras,
  useStreamSession,
} from "../stream/lib/streamSession";
import { cameraPipWindow } from "../stream/StreamPipLayer";
import { useStreamOverlays } from "../stream/lib/streamOverlayStore";
import { usePresentation } from "./usePresentation";
import { usePresentBroadcast } from "./lib/usePresentBroadcast";
import { useScriptureReadAloud } from "./lib/useScriptureReadAloud";
import { useSecondaryModule } from "./lib/useSecondaryModule";
import {
  DECK_END_LABELS,
  STAGE_TRANSPORT_STYLE,
  stageBackgroundStyle,
} from "./lib/stageBackground";
import { Stage } from "./Stage";
import { PresentationControls } from "./PresentationControls";
import { PresenterBar } from "./PresenterBar";
import { PresenterPip } from "./PresenterPip";
import { PortalSlot } from "../../components/ui/PortalSlot";
import {
  SecondaryPipContent,
  SecondaryPipFrame,
  secondaryLabel,
} from "./SecondaryPip";
import { SecondaryModuleMenu } from "./SecondaryModuleMenu";
import { VideoSurface } from "../../components/media/VideoSurface";
import { AudioSurface } from "../../components/media/AudioSurface";
import { VideoTransportBar } from "../../components/media/VideoTransportBar";

export const Presentation = () => {
  const pushToast = useStore((s) => s.pushToast);
  const { width } = useViewport();
  const mode = useStore((s) => s.presentationMode);
  const setPresentationMode = useStore((s) => s.setPresentationMode);
  const publishPresentedMedia = useStore((s) => s.publishPresentedMedia);
  const {
    isExtended,
    isLive,
    isLiveFullscreen,
    goLive,
    endLive,
    toggleLiveFullscreen,
  } = useGoLive();

  const pipRef = useRef<HTMLDivElement>(null);
  const videoHost = usePortalHost();
  const secondaryHost = usePortalHost();
  const hasAnnouncedDisplay = useRef(false);

  const shortcutGate = useCallback(
    () =>
      mode === "stage" ||
      Boolean(pipRef.current?.contains(document.activeElement)),
    [mode],
  );

  const requestLiveFullscreen = useCallback(() => {
    void toggleLiveFullscreen().then((ok) => {
      if (!ok) {
        pushToast(
          "Could not enter fullscreen remotely. Click the fullscreen icon inside the projected window.",
        );
      }
    });
  }, [pushToast, toggleLiveFullscreen]);

  const fullscreenOverride = useMemo(
    () =>
      isLive
        ? { isFullscreen: isLiveFullscreen, toggle: requestLiveFullscreen }
        : undefined,
    [isLive, isLiveFullscreen, requestLiveFullscreen],
  );

  const presentation = usePresentation(fullscreenOverride, shortcutGate);
  const streamSession = useStreamSession();
  const streamOverlays = useStreamOverlays();
  const secondary = useSecondaryModule();
  const chrome = useAutoHideChrome({ enabled: mode === "stage" });
  const { visible: isChromeVisible, onHoverChange } = chrome;

  const deck = presentation.deck;
  const readAloud = useScriptureReadAloud({
    isScripture: deck?.kind === "scripture",
    doc: presentation.doc,
    slides: presentation.slides,
    slideIndex: presentation.slideIndex,
    goTo: presentation.goTo,
  });

  const {
    isVideoSlide,
    mediaPlayback,
    videoSettings,
    getVideoTime,
    slideIndex,
    paused: isPaused,
    zoom,
    pan,
    view,
  } = presentation;
  const videoRate = videoSettings?.playbackRate ?? 1;

  const presentState: PresentState | null = useMemo(
    () =>
      deck
        ? {
            kind: deck.kind,
            id: deck.id,
            rev: deck.rev,
            doc: deck.doc,
            item: deck.item,
            slideIndex,
            paused: isPaused,
            zoom,
            pan,
            view,
            media: isVideoSlide ? mediaPlayback : undefined,
            secondary: secondary.state,
          }
        : null,
    [
      deck,
      slideIndex,
      isPaused,
      zoom,
      pan,
      view,
      isVideoSlide,
      mediaPlayback,
      secondary.state,
    ],
  );

  usePresentBroadcast(
    isLive,
    presentState,
    {
      isActive: isVideoSlide,
      playing: mediaPlayback.playing,
      rate: videoRate,
      getTime: getVideoTime,
    },
    {
      isActive: secondary.isClip,
      playing: secondary.video.playback.playing,
      rate: secondary.clipRate,
      getTime: secondary.video.getTime,
    },
  );

  useEffect(() => {
    if (isExtended && !hasAnnouncedDisplay.current) {
      hasAnnouncedDisplay.current = true;
      pushToast("External display detected. Tap Go Live to project.");
    }
  }, [isExtended, pushToast]);

  useEffect(() => {
    if (!isVideoSlide) {
      publishPresentedMedia(null);
      return;
    }
    publishPresentedMedia({
      playback: mediaPlayback,
      sync: {
        time: getVideoTime(),
        at: Date.now(),
        playing: mediaPlayback.playing,
        rate: videoRate,
      },
    });
  }, [
    isVideoSlide,
    mediaPlayback,
    videoRate,
    getVideoTime,
    publishPresentedMedia,
  ]);

  const backdropBlobUrl = useBlobUrl(
    presentation.frame?.backdrop?.type === "image"
      ? presentation.frame.backdrop.blobId
      : null,
  );

  if (!deck || !presentation.currentSlide || !presentation.frame) return null;

  const areControlsVisible =
    !presentation.prefs.autoHideControls || isChromeVisible;
  const isPresenterBarVisible =
    !presentation.prefs.autoHidePresenterBar || isChromeVisible;

  const handleGoLive = () => {
    if (isLive) {
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
    readAloud.speech.stop();
    endLive();
    presentation.exit();
  };

  const handleShrinkToPip = () => {
    if (document.fullscreenElement) void document.exitFullscreen?.();
    setPresentationMode("pip");
  };

  const isPlaybackPaused = isVideoSlide ? !mediaPlayback.playing : isPaused;
  const togglePlayback = isVideoSlide
    ? presentation.toggleVideoPlaying
    : presentation.togglePause;

  const videoProgress: VideoProgress | undefined = isVideoSlide
    ? {
        time: presentation.videoTime,
        start: videoSettings?.trimStart ?? 0,
        end: videoSettings?.trimEnd ?? presentation.videoDuration,
      }
    : undefined;

  const currentLabel =
    presentation.currentSlide.kind === "text"
      ? presentation.currentSlide.slide.label
      : presentation.currentSlide.item.name;
  const notes =
    presentation.currentSlide.kind === "text"
      ? presentation.currentSlide.slide.notes
      : "";

  const videoLayer =
    presentation.frame.content.kind === "video"
      ? createPortal(
          <VideoSurface
            ref={presentation.videoRef}
            item={presentation.frame.content.item}
            playback={mediaPlayback}
            forceMuted={isLive}
            onTimeUpdate={presentation.onVideoTime}
            onEnded={presentation.onVideoEnded}
            style={{ pointerEvents: "auto" }}
          />,
          videoHost,
        )
      : null;

  const audioLayer =
    presentation.audioItem && presentation.audioPlayback ? (
      <AudioSurface
        item={presentation.audioItem}
        loop={presentation.prefs.loopAudio}
        playback={presentation.audioPlayback}
      />
    ) : null;

  const secondaryContent = secondary.state
    ? createPortal(
        <SecondaryPipContent
          secondary={secondary.state}
          stream={primaryCamera(streamSession)?.stream ?? null}
          playback={secondary.video.playback}
          videoRef={secondary.video.surfaceRef}
          onVideoTime={secondary.video.onTimeUpdate}
          onVideoEnded={secondary.video.onEnded}
          forceMuted={isLive}
          overlays={streamOverlays}
          overlayPreview
          cameras={secondaryCameras(streamSession).map(cameraPipWindow)}
        />,
        secondaryHost,
      )
    : null;

  const secondaryLayer = secondary.state ? (
    <SecondaryPipFrame
      placement={secondary.state.placement}
      label={secondaryLabel(secondary.state)}
    >
      <PortalSlot host={secondaryHost} />
    </SecondaryPipFrame>
  ) : null;

  if (mode === "pip") {
    return (
      <>
        {videoLayer}
        {secondaryContent}
        <PresenterPip
          title={deck.title}
          currentLabel={currentLabel}
          notes={notes}
          frame={presentation.frame}
          slideIndex={slideIndex}
          total={presentation.slides.length}
          paused={isPlaybackPaused}
          isLive={isLive}
          videoHost={videoHost}
          videoProgress={videoProgress}
          videoMuted={mediaPlayback.muted}
          onSeekVideo={presentation.seekVideoTo}
          onToggleVideoMuted={presentation.toggleVideoMuted}
          onRestartVideo={presentation.restartVideo}
          secondaryLayer={secondaryLayer}
          secondaryMenu={<SecondaryModuleMenu variant="mini" />}
          rootRef={pipRef}
          onPrev={() => presentation.go(-1)}
          onNext={() => presentation.go(1)}
          onTogglePause={togglePlayback}
          onOpenStage={() => setPresentationMode("stage")}
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
      {secondaryContent}
      <div
        ref={presentation.rootRef}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 150,
          ...stageBackgroundStyle(presentation.frame.backdrop, backdropBlobUrl),
        }}
      >
        <Stage
          slideIndex={slideIndex}
          content={presentation.frame.content}
          animation={presentation.frame.animation}
          view={isLive ? "normal" : view}
          zoom={isLive ? 1 : zoom}
          pan={isLive ? { x: 0, y: 0 } : pan}
          onPanBy={presentation.panBy}
          durationMs={presentation.prefs.transitionDuration}
          easing={presentation.prefs.easing}
          videoHost={videoHost}
        />

        {secondaryLayer}

        <PresentationControls
          paused={isPlaybackPaused}
          view={view}
          zoom={zoom}
          showInfo={presentation.showInfo}
          isFullscreen={presentation.isFullscreen}
          visible={areControlsVisible}
          isExternal={isExtended}
          isLive={isLive}
          canRead={readAloud.canRead}
          reading={readAloud.isReading}
          onToggleRead={readAloud.toggleReadAloud}
          onHoverChange={onHoverChange}
          onGoLive={handleGoLive}
          onShrinkToPip={handleShrinkToPip}
          secondaryMenu={<SecondaryModuleMenu variant="stage" />}
          onTogglePause={togglePlayback}
          onSetView={presentation.setViewMode}
          onZoomIn={presentation.zoomIn}
          onZoomOut={presentation.zoomOut}
          onResetZoom={presentation.resetZoom}
          onToggleInfo={presentation.toggleInfo}
          onToggleFullscreen={presentation.toggleFullscreen}
          onExit={handleExit}
        />

        {isVideoSlide && (
          <VideoTransportBar
            playing={mediaPlayback.playing}
            muted={mediaPlayback.muted}
            volume={mediaPlayback.volume}
            time={presentation.videoTime}
            start={videoSettings?.trimStart ?? 0}
            end={videoSettings?.trimEnd ?? presentation.videoDuration}
            visible={areControlsVisible}
            onHoverChange={onHoverChange}
            compact={width < 560}
            onTogglePlaying={presentation.toggleVideoPlaying}
            onToggleMuted={presentation.toggleVideoMuted}
            onVolume={presentation.setVideoVolume}
            onSeek={presentation.seekVideoTo}
            onRestart={presentation.restartVideo}
            style={STAGE_TRANSPORT_STYLE}
          />
        )}

        {presentation.showInfo && (
          <PresenterBar
            title={deck.title}
            currentLabel={currentLabel}
            notes={notes}
            nextFrame={presentation.nextFrame}
            endLabel={DECK_END_LABELS[deck.kind] || "End"}
            slideIndex={slideIndex}
            total={presentation.slides.length}
            elapsed={presentation.elapsed}
            paused={isPaused}
            videoProgress={videoProgress}
            visible={isPresenterBarVisible}
            onHoverChange={onHoverChange}
            onPrev={() => presentation.go(-1)}
            onNext={() => presentation.go(1)}
          />
        )}
      </div>
      {audioLayer}
    </>
  );
};
