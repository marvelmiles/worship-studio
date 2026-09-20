const ICE_GATHERING_TIMEOUT_MS = 3000;

// No ICE servers: only LAN host candidates are gathered, so nothing leaves the local network.
export const createPeerConnection = (): RTCPeerConnection =>
  new RTCPeerConnection({ iceServers: [] });

// Non-trickle signalling: wait for every candidate, with a timeout for browsers that never report completion.
export const waitForIceGathering = (
  connection: RTCPeerConnection,
  { isRestart = false, timeoutMs = ICE_GATHERING_TIMEOUT_MS } = {},
): Promise<void> => {
  if (!isRestart && connection.iceGatheringState === "complete") {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const finish = () => {
      connection.removeEventListener("icegatheringstatechange", onChange);
      window.clearTimeout(timer);
      resolve();
    };
    const onChange = () => {
      if (connection.iceGatheringState === "complete") finish();
    };
    const timer = window.setTimeout(finish, timeoutMs);
    connection.addEventListener("icegatheringstatechange", onChange);
  });
};
