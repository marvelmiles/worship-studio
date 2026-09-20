const STUN = "stun:stun.l.google.com:19302";

const hashToRoom = (input: string): string => {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return "net-" + (h >>> 0).toString(36);
};

const publicIpFromCandidate = (candidate: string): string | null => {
  const parts = candidate.split(" ");
  const typIdx = parts.indexOf("typ");
  if (typIdx === -1 || parts[typIdx + 1] !== "srflx") return null;
  return parts[4] ?? null;
};

export const deriveNetworkRoom = (timeoutMs = 4000): Promise<string | null> => {
  return new Promise((resolve) => {
    let pc: RTCPeerConnection;
    try {
      pc = new RTCPeerConnection({ iceServers: [{ urls: STUN }] });
    } catch {
      resolve(null);
      return;
    }

    let settled = false;
    const finish = (room: string | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      pc.onicecandidate = null;
      pc.close();
      resolve(room);
    };

    const timer = window.setTimeout(() => finish(null), timeoutMs);

    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      const ip = publicIpFromCandidate(event.candidate.candidate);
      if (ip) finish(hashToRoom(ip));
    };

    pc.createDataChannel("probe");
    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .catch(() => finish(null));
  });
};
