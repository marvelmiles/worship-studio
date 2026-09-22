# Quick Share: handing a library to another device

Quick Share is the automated side of Export and Import. Instead of writing a
`.zip`, carrying it and picking it up again, one device builds exactly the same
archive and pushes it straight to another device on the same WiFi, which reads
it through the same validated import path.

It works with no internet at all. With internet, devices on the same WiFi find
each other on their own; without it, two devices pair by reading each other's
code (see **Sharing with no internet**) and everything else is the same.

Open it from the share icon in the header, or from **Settings → Data → Quick
Share**.

## What happens, step by step

1. **Both devices open the page.** Each one announces itself in the room its
   network derives (`lib/networkRoom.ts`), so every device with the page open
   appears in the others' list. Closing the page removes it again.
2. **Pick the devices.** The first screen is the list of devices here now; tick
   one or several and move on.
3. **Pick what to send.** The second screen opens on a module chooser:
   manuscripts, passages, images, videos, audio, colours, themes, saved
   overlays and settings. Each module lists the real things with their own
   covers (a document shows its background, theme and first line; a theme
   shows its background and font; a saved overlay shows what it puts on
   screen), searchable and sorted newest, oldest, recently modified or A to Z.
   Click an item to tick it, or take a whole module with **Select all**. What
   is ticked is held across every module, so one send can carry a manuscript,
   two clips and a passage together.
4. **What a module covers.** Images and videos list everything of that kind
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
   A device that declines or never replies leaves the list, with a toast
   saying so.
8. **The archive travels device to device.** It goes down a WebRTC data channel
   in 16 KB chunks, paused whenever the link has more queued than it can push
   (`lib/shareTransfer.ts`).
9. **The receiving device imports it.** The archive goes through `importData`
   in merge mode, so everything already there is kept and the incoming copy
   wins where both hold the same item. The result travels back, so the sender
   sees whether it landed.

## Sharing with no internet

Browsers cannot look for each other on a network by themselves, so with no
internet the two devices introduce themselves by code instead of through the
online lookup. The data path does not change: it was always straight between
the two devices over the WiFi.

1. **On the sending device**, choose **Pair with a code** (under Devices here
   now, or in the quick share modal of any library). It shows a QR code.
2. **On the receiving device**, open Quick Share and choose **Receive with a
   code**. Scan the sender's code, or paste it if it was copied across. It
   shows a reply code.
3. **Back on the sending device**, scan or paste the reply. The two link up,
   say their names to each other (a `hello` message), and the receiving
   device joins the device list marked "Paired with a code".

From there it is the ordinary flow: tick it, pick what to send, press send.
Declines, stops and failures behave the same as for a device found on the
network.

- **The pairing lasts.** The link stays up between sends, so one pairing
  covers as many sends as needed, from the page or from any library's quick
  share modal (`lib/pairedShareDevices.ts` holds it for the whole app). It
  ends when either side forgets or disconnects it, the receiving page closes,
  or the link drops; the card then leaves the list.
- **What it needs.** Both devices on the same WiFi or phone hotspot. The
  network does not need internet, and nothing leaves it. The app itself
  loads offline once it has been opened before, since it is installed as a
  PWA.
- **Going offline is noticed.** With no connection the lobby does not wait
  on the lookup: it says so at once and points at pairing by code. Coming
  back online, it looks for network devices again by itself.
- **Codes cannot be crossed.** A quick share code and a Stream camera code
  carry different kinds, so scanning one in the wrong place is refused with
  a clear message rather than failing to connect.

## Sending and stopping

- A floating send button appears once at least one device and one item are
  chosen. Pressed, it turns into a ring showing how far the whole send has
  got, with a stop button above it. Ticking and unticking is locked while it
  runs.
- Each device card carries its own status and progress ring in place of its
  checkbox, and its own stop button. A stopped device leaves the list; once
  nothing is left sending, the screen starts over with no device chosen.
- A device keeps its card while it is being sent to, even if it drops off the
  network list for a moment because it slept or its browser was minimised.
- Refresh is always available. During a send it asks first, since looking
  again cancels what is still going.
- Stopping always asks first. Either side can stop: the one that stops sends a
  `cancel` message so the other stops waiting at once (`lib/shareProtocol.ts`).
- Once every device has the whole thing, the screen clears itself; the
  single-item modal closes.
- While anything is moving, both sides hold a screen wake lock and an
  inaudible audio keep-alive, so a phone that sleeps or is locked keeps
  sending instead of freezing the page mid transfer.

## Sharing one thing from where it lives

Every library lists its own quick share: the ellipsis menu on an image, a
video, a manuscript or a saved passage, and on a sound in the asset library.
Choosing it opens the same device list in a modal; tick the devices and press
Send. The refresh button in its header looks for devices again. The item's records are worked out by the same catalogue the page uses
(`lib/shareCatalog.ts`), so a picture that is also a background still goes over
as both, and a manuscript still takes its assets with it.

A modal is sending only, so it does not announce this device to the others:
there is nowhere for an incoming library to be accepted from a library page. Any device already paired with a code is listed there too, and the modal
can pair a new one.

## Why it merges rather than replaces

Quick share always merges with the incoming copy winning. Replacing a library
from another room's device is destructive and cannot be undone, so that choice
stays in Settings, where the file, the mode and the confirmation are all in
front of the person doing it.

## What each part does

| File                            | Role                                                                 |
| ------------------------------- | -------------------------------------------------------------------- |
| `lib/shareSignaling.ts`         | Presence and offer/answer relay, under `signal/<room>/share`         |
| `lib/sharePeer.ts`              | The LAN-only peer connection and its data channel                    |
| `lib/shareProtocol.ts`          | The control messages, validated with Zod                             |
| `lib/shareTransfer.ts`          | Chunking, backpressure and reassembly                                |
| `lib/shareSession.ts`           | One conversation, from offer to result, over any open channel        |
| `lib/networkShareConnection.ts` | Reaching a device found on the network, through the relay            |
| `lib/sharePairing.ts`           | Pairing two devices by code, with no server                          |
| `lib/pairedShareDevices.ts`     | The devices paired by code, held for the whole app                   |
| `lib/useShareLobby.ts`          | This device's presence, the others, and whether it is online         |
| `lib/shareSelection.ts`         | Which records travel, and what they cannot arrive without            |
| `lib/shareCatalog.ts`           | Everything shareable, grouped into modules with real covers          |
| `lib/useOutgoingShares.ts`      | Building the archive and sending it, one device at a time            |
| `lib/useQuickShare.ts`          | Lobby, pairing, selection and sending together, for page and modal   |
| `lib/useStopSharePrompt.ts`     | The confirmation in front of every stop                              |
| `lib/useIncomingShare.ts`       | Answering offers from the relay and from paired links, and importing |

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

Without Firebase settings, or without internet, none of this is used and
devices pair by code instead.

## Limits worth knowing

- **Both pages must be open.** A device that is not on the page cannot be seen
  and cannot receive; there is no background transfer.
- **One at a time, each way.** The sender hands devices the archive in turn, and
  a device already receiving turns down a second offer rather than queueing it.
- **The archive is held in memory** on both sides while it moves, so a library
  of many gigabytes is still better carried as a file through Settings.
