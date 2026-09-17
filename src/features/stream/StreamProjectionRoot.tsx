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

export const StreamProjectionRoot = () => {
  const session = useStreamSession();
  if (!session.active) return null;

  const primary = primaryCamera(session);

  return (
    <>
      {session.mode === "pip" ? (
        <>
          <StreamPip />
          <CameraPreviewWindows />
        </>
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
        >
          <CameraPreviewWindows />
        </ProjectionSurface>
      )}
    </>
  );
};
