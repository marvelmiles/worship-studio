/**
 * Derives a room id that every device on the same WiFi lands in automatically,
 * with no code to type — the piece that makes pairing a single tap.
 *
 * The trick: a public STUN server reflects back this network's public IP (its
 * server-reflexive ICE candidate). Two devices behind the same router share
 * that IP, so hashing it yields a room id they both compute independently and
 * identically. The IP is only ever hashed, never stored, and this throwaway
 * connection is used solely to read the reflexive candidate — the actual camera
 * link in peer.ts still gathers LAN-only candidates and never uses STUN, so no
 * media is ever exposed to it.
 *
 * Falls back to null when STUN is blocked or yields nothing; the caller then
 * offers the QR / code pairing instead.
 */

// Public STUN, used only to observe the reflexive candidate. No media flows here.
const STUN = "stun:stun.l.google.com:19302";

/** Small, stable, non-cryptographic hash → short base36 room id. */
function hashToRoom(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return "net-" + (h >>> 0).toString(36);
}

function publicIpFromCandidate(candidate: string): string | null {
  // "candidate:<foundation> <component> <proto> <priority> <ip> <port> typ srflx ..."
  const parts = candidate.split(" ");
  const typIdx = parts.indexOf("typ");
  if (typIdx === -1 || parts[typIdx + 1] !== "srflx") return null;
  return parts[4] ?? null;
}

/**
 * Resolves to a room id shared by everyone on this network, or null if the
 * public IP can't be observed within the timeout.
 */
export function deriveNetworkRoom(timeoutMs = 4000): Promise<string | null> {
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

    // A data channel makes the connection gather candidates without any media.
    pc.createDataChannel("probe");
    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .catch(() => finish(null));
  });
}
