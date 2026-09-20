# Quick Share: handing a library to another device

Quick Share is the automated side of Export and Import. Instead of writing a
`.zip`, carrying it and picking it up again, one device builds exactly the same
archive and pushes it straight to another device on the same WiFi, which reads
it through the same validated import path.

Open it from the share icon in the header, or from **Settings → Data → Quick
Share**.

## What happens, step by step

1. **Both devices open the page.** Each one announces itself in the room its
   network derives (`lib/networkRoom.ts`), so every device with the page open
   appears in the others' list. Closing the page removes it again.
2. **Pick the devices.** The first screen is the list of devices here now; tick
   one or several and move on.
3. **Pick what to send.** The second screen holds a tab per part of the
   library: manuscripts, passages, images, videos, audio, colours, themes,
   saved overlays and settings. Each tab lists the real things, with their
   own thumbnails, searchable and sorted newest, oldest, recently modified or
   A to Z. Click an item to tick it, or take a whole tab with **Select all**.
   What is ticked is held across every tab, so one send can carry a manuscript,
   two clips and a passage together.
4. **What a tab covers.** Images and videos list everything of that kind
   anywhere in the project: the media library and the asset library at once. A
   picture attached as a background is one tile, not two, and ticking it sends
   every record that names its file, so it lands in both places on the other
   device.
5. **Anything needed travels too.** A manuscript takes its background, its
   sound, the clips placed on its slides and its theme; a saved overlay takes
   the passage or clip it shows (`lib/shareSelection.ts`). Built-in themes,
   backgrounds and sounds stay behind, because every device already has them.
6. **The archive is built once.** `buildBackup` (`lib/backupPayload.ts`) picks
   the records and the files they need, and `packBackupZip` (`lib/backup.ts`)
   writes the same `.zip` a manual export writes. The same archive is then
   handed to each device in turn.
7. **The other device is asked first.** It sees who is sending, what is coming
   and how big it is, and can decline. Nothing moves until it accepts.
8. **The archive travels device to device.** It goes down a WebRTC data channel
   in 16 KB chunks, paused whenever the link has more queued than it can push
   (`lib/shareTransfer.ts`).
9. **The receiving device imports it.** The archive goes through `importData`
   in merge mode, so everything already there is kept and the incoming copy
   wins where both hold the same item. The result travels back, so the sender
   sees whether it landed.

## Sharing one thing from where it lives

Every library lists its own quick share: the ellipsis menu on an image, a
video, a manuscript or a saved passage, and on a sound in the asset library.
Choosing it opens the same device list in a modal; tick the devices and press
Send. The item's records are worked out by the same catalogue the page uses
(`lib/shareCatalog.ts`), so a picture that is also a background still goes over
as both, and a manuscript still takes its assets with it.

A modal is sending only, so it does not announce this device to the others:
there is nowhere for an incoming library to be accepted from a library page.

## Why it merges rather than replaces

Quick share always merges with the incoming copy winning. Replacing a library
from another room's device is destructive and cannot be undone, so that choice
stays in Settings, where the file, the mode and the confirmation are all in
front of the person doing it.

## What each part does

| File                   | Role                                                     |
| ---------------------- | -------------------------------------------------------- |
| `lib/shareSignaling.ts`| Presence and offer/answer relay, under `signal/<room>/share` |
| `lib/sharePeer.ts`     | The LAN-only peer connection and its data channel          |
| `lib/shareProtocol.ts` | The control messages, validated with Zod                   |
| `lib/shareTransfer.ts` | Chunking, backpressure and reassembly                      |
| `lib/shareSession.ts`  | One conversation, from offer to result, for either side    |
| `lib/useShareLobby.ts` | This device's presence and the list of the others          |
| `lib/shareSelection.ts`| Which records travel, and what they cannot arrive without  |
| `lib/shareCatalog.ts`  | Everything shareable, grouped into tabs of real items      |
| `lib/useOutgoingShares.ts` | Building the archive and sending it, one device at a time |
| `lib/useIncomingShare.ts`  | Answering offers and importing what arrives           |

## What Firebase carries

The same as for the Stream module, and no more: one offer and one answer per
pair of devices, a few hundred bytes of text each, plus a presence row holding a
device name and a timestamp. **The library itself never touches Firebase.** It
travels straight between the two devices over the WiFi, DTLS encrypted, using
LAN-only ICE candidates. Both sides delete the handshake as soon as the link is
up, and `onDisconnect().remove()` clears a device that closes or crashes.

Quick share lives under `signal/<room>/share`, inside the subtree the
recommended rules in `../stream/STREAM_SIGNALING.md` already open, so an
existing deployment needs no rules change. Those rules include optional
validation for this subtree.

Without Firebase settings the page says so and points at Export and Import,
which need no server at all.

## Limits worth knowing

- **Both pages must be open.** A device that is not on the page cannot be seen
  and cannot receive; there is no background transfer.
- **One at a time, each way.** The sender hands devices the archive in turn, and
  a device already receiving turns down a second offer rather than queueing it.
- **The archive is held in memory** on both sides while it moves, so a library
  of many gigabytes is still better carried as a file through Settings.
