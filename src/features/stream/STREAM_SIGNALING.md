# Stream module: pairing and signalling

The Stream module pairs a phone camera with the projecting laptop two ways:

1. **One tap (needs Firebase).** The phone taps _Share this camera_ and starts
   broadcasting; the laptop opens _Show a camera here_ and sees the phone in a
   live list. Tap it to go live. No codes.
2. **QR or pasted code (offline fallback).** The two devices swap a code by
   camera, or by any messaging app. Works with no internet at all, and is always
   available.

## How the codes are shown and read

**One request, one code.** A pairing code is always a single QR that never
changes while it is on screen. That only works because the description behind it
is kept small, in three steps:

1. **Fewer codecs.** The offer names H.264, VP8 and rtx for video and Opus for
   audio (`lib/peerTuning.ts`), instead of the twenty-odd codecs a browser lists
   by default. Every WebRTC browser is required to support VP8, so a phone can
   always answer, and H.264 still wins where the phone encodes it in hardware.
2. **Fewer candidates.** The transmitted copy drops TCP and link-local
   candidates, which can never win a LAN pairing (`lib/sdp.ts`). The local
   description keeps everything it gathered.
3. **Shared-dictionary compression.** Both devices deflate against the same
   table of SDP boilerplate (`lib/sdpDictionary.ts`), so a description costs only
   the bytes unique to this call, and the result is Base45 encoded to stay in the
   QR alphanumeric mode.

Together these turn a roughly 6 KB description into a code of a few hundred
characters: a QR of about 80 modules, drawn at medium error correction so it
reads through screen glare and camera blur.

The dictionary is part of the wire format. Both devices must hold the same one,
so changing it means bumping `PREFIX` in `lib/streamSignal.ts`; a code from a
mismatched build is rejected rather than half-decoded.

The scanner (`lib/useQrScanner.ts`) reads the **whole camera frame** as well as
the centred aiming box, so a code does not have to fit neatly inside the box. It
uses the browser's own barcode detector where one exists and jsQR in a worker
otherwise, alternating resolutions so both a crisp and a slightly blurred frame
have a chance to decode.

## What Firebase is (and is not) doing

Firebase is an **ephemeral signalling middleman only**, never storage:

- It relays one WebRTC offer and one answer (a few hundred bytes of text).
- The **camera video never touches Firebase.** Media flows phone to laptop
  directly over the LAN (peer to peer, DTLS encrypted). The connection uses
  LAN-only ICE candidates; the one public STUN call only derives a room id and
  carries no media.
- The moment the peer link reaches _connected_, both sides **delete** the
  handshake payload. `onDisconnect().remove()` also wipes a device's data if it
  closes or crashes, so the database sits empty during a live session.
- A broadcaster leaves only a tiny presence row (name and timestamp) while it
  waits, refreshed once a minute and re-announced whenever its socket
  reconnects, so a phone that slept still appears in the list.

Result: near zero reads and writes, and effectively no stored data, so it stays
inside the Firebase free tier for normal use.

## Staying connected

A phone that sleeps or is backgrounded is expected, not treated as a failure:

- The sharing device holds a screen wake lock while it is broadcasting.
- ICE `disconnected` reads as **Reconnecting**, never as a dropped camera.
- When a one-tap connection does fail, the laptop restarts ICE and re-sends the
  offer through signalling every few seconds for three minutes, and the phone
  answers as soon as it is back. Only after that window is the camera reported
  as stopped.
- If the operating system ended the camera capture while the page was hidden,
  the sender reopens it when the page is visible again.

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

Restart the dev server. The Stream module now defaults to one tap; without these
variables it silently uses the QR or pasted code instead.

## Recommended Realtime Database rules

These confine all access to the ephemeral `signal/` subtree, forbid everything
else, and cap how large a stored description can be so the node cannot be abused
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
            "name": {
              ".validate": "newData.isString() && newData.val().length < 64"
            },
            "ts": { ".validate": "newData.isNumber()" }
          }
        },
        "calls": {
          "$device": {
            "offer": {
              ".validate": "newData.isString() && newData.val().length < 20000"
            },
            "answer": {
              ".validate": "newData.isString() && newData.val().length < 20000"
            },
            "viewerId": {
              ".validate": "newData.isString() && newData.val().length < 64"
            },
            "ts": { ".validate": "newData.isNumber()" }
          }
        }
      }
    }
  }
}
```

The rooms are public within the `signal/` namespace, which is fine because a
room id is derived from your network's public IP (people not on your WiFi do not
share it) and the media itself is encrypted peer to peer. For stricter isolation
across venues that share an ISP, add Firebase Anonymous Auth and gate
`.read`/`.write` on `auth != null`.
