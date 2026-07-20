# Stream module — one-tap pairing & Firebase signalling

The Stream module pairs a phone camera with the projecting laptop two ways:

1. **One-tap (needs Firebase):** the phone taps _Send my camera_ and starts
   broadcasting; the laptop opens _Display here_ and sees the phone in a live
   list — tap it to go live. No codes.
2. **QR / paste (offline fallback):** the two devices exchange a QR (or a pasted
   code). Works with **no internet at all**. Always available.

## What Firebase is (and isn't) doing

Firebase is an **ephemeral signalling middleman only** — never storage:

- It relays one WebRTC offer and one answer (a few hundred bytes of text).
- The **camera video never touches Firebase.** Media flows phone → laptop
  directly over the LAN (peer-to-peer, DTLS-encrypted). The WebRTC connection
  uses LAN-only ICE candidates; the one public STUN call is used solely to
  derive a network room id and carries no media.
- The moment the peer link reaches _connected_, both sides **delete** the
  handshake payload. `onDisconnect().remove()` also wipes a device's data if it
  closes or crashes. So the database sits empty during a live session.

Result: near-zero reads/writes and effectively **no stored data**, so it stays
inside the Firebase free tier for normal use.

## Setup

1. Create a free Firebase project.
2. **Build → Realtime Database → Create database.**
3. Copy the config values into a `.env` file (see `.env.example`):
   ```
   VITE_FIREBASE_API_KEY=…
   VITE_FIREBASE_PROJECT_ID=…
   VITE_FIREBASE_APP_ID=…
   VITE_FIREBASE_DATABASE_URL=https://<project>-default-rtdb.firebaseio.com
   ```
4. Paste the rules below into **Realtime Database → Rules**.

Restart `pnpm dev`. The Stream module now defaults to one-tap; without these
vars it silently uses QR/paste.

## Recommended Realtime Database rules

These confine all access to the ephemeral `signal/` subtree, forbid everything
else, and cap how large a stored description can be so the node can't be abused
as storage:

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "signal": {
      "$room": {
        ".read": true,
        ".write": true,
        "devices": {
          "$device": {
            ".validate": "newData.hasChildren(['name','ts'])",
            "name": { ".validate": "newData.isString() && newData.val().length < 64" },
            "ts": { ".validate": "newData.isNumber()" }
          }
        },
        "calls": {
          "$device": {
            "offer":  { ".validate": "newData.isString() && newData.val().length < 20000" },
            "answer": { ".validate": "newData.isString() && newData.val().length < 20000" },
            "viewerId": { ".validate": "newData.isString() && newData.val().length < 64" },
            "ts": { ".validate": "newData.isNumber()" }
          }
        }
      }
    }
  }
}
```

The rooms are public within the `signal/` namespace, which is fine because a
room id is derived from your network's public IP (people not on your WiFi don't
share it) and the media itself is encrypted P2P. If you want stricter isolation
across venues that share an ISP, add Firebase Anonymous Auth and gate
`.read`/`.write` on `auth != null` — the client already runs in a secure
context, so it's a small addition.
