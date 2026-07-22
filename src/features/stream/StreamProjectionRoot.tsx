import { ProjectionSurface } from "./ProjectionSurface";
import { StreamPip } from "./StreamPip";
import { endStreamSession, setStreamMode, useStreamSession } from "./lib/streamSession";

/**
 * Rendered once at the app root (outside the router), so the live camera
 * projection survives page navigation exactly like the slide presentation does.
 * It shows the full stage overlay or the floating PiP depending on the shared
 * session's mode, and nothing at all when no device is connected.
 */
export function StreamProjectionRoot() {
  const session = useStreamSession();
  if (!session.active) return null;

  if (session.mode === "pip") return <StreamPip />;

  return (
    <ProjectionSurface
      stream={session.stream}
      status={session.status}
      deviceName={session.deviceName}
      onStop={endStreamSession}
      onPopOut={() => setStreamMode("pip")}
    />
  );
}
