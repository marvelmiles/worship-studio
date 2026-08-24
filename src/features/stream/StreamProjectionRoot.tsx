import { CameraPreviewWindows } from "./CameraPreviewWindow";
import { ProjectionSurface } from "./ProjectionSurface";
import { StreamPip } from "./StreamPip";
import { cameraPipWindow } from "./StreamPipLayer";
import {
  endStreamSession,
  primaryCamera,
  secondaryCameras,
  setSessionViewerLive,
  setStreamMode,
  useStreamSession,
} from "./lib/streamSession";

/**
 * Rendered once at the app root (outside the router), so the live camera
 * projection survives page navigation exactly like the slide presentation does.
 * It shows the full stage overlay or the floating PiP depending on the shared
 * session's mode, and nothing at all when no device is connected. Any camera
 * previews the operator has opened float over both.
 */
export function StreamProjectionRoot() {
  const session = useStreamSession();
  if (!session.active) return null;

  const primary = primaryCamera(session);

  return (
    <>
      {session.mode === "pip" ? (
        <StreamPip />
      ) : (
        <ProjectionSurface
          stream={primary?.stream ?? null}
          status={primary?.status ?? "connecting"}
          deviceName={primary?.deviceName}
          audioShared={primary?.audioShared ?? false}
          secondaries={secondaryCameras(session).map(cameraPipWindow)}
          onStop={endStreamSession}
          onPopOut={() => setStreamMode("pip")}
          onLiveChange={setSessionViewerLive}
        />
      )}
      <CameraPreviewWindows />
    </>
  );
}
