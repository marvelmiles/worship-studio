# WorshipStudio

**A complete church worship presentation studio that runs in your browser, works offline, and needs no server.**

Paste song lyrics, a hymn, a sermon outline or a Bible reference, and WorshipStudio turns it into formatted slides, then projects them full screen on the hall's television or projector with themes, backgrounds, video, looping audio, presenter notes and keyboard control. It also runs a live camera stream, stages overlays over it, and hands your whole library to another device across the room without touching the internet.

Everything lives in the browser's own storage (IndexedDB). There is no account, no subscription and no upload. Once the page has loaded a single time, the app keeps working with the WiFi off.

**Live demo: [worshipstudio.netlify.app](https://worshipstudio.netlify.app/)**

Keywords: church presentation software, worship slides, lyrics to slides, hymn projection, Bible verse projection, sermon slides, ProPresenter alternative, EasyWorship alternative, OpenLP alternative, offline PWA, React, TypeScript.

## About the project

WorshipStudio is a single page React application, written in TypeScript, that behaves like a desktop presentation program:

- **The library** holds manuscripts (song lyrics, hymns, sermons, general decks), an offline Bible, images, videos, sounds, backgrounds, themes and saved overlays.
- **The editor** is the slide itself. You type onto the slide you are about to project, so what you edit is already what the room will see.
- **Presentation mode** fills the screen, or the second display over HDMI, while the operator keeps notes, the next slide, a timer and the running order on the laptop.
- **The Stream module** joins up to three phones as cameras over WebRTC and stages passages, pictures, clips and announcements over the picture.
- **Quick Share** copies part or all of a library to another device on the same WiFi, device to device, with a QR or typed code as the fallback when there is no network at all.

The whole thing is a static bundle. It installs as a PWA, updates itself through a service worker, and can be hosted on any static host, or on a laptop in the building.

## Why WorshipStudio exists

Most churches run their services on a borrowed laptop, a projector at the end of a long cable, and a volunteer who was handed the keyboard ten minutes before the first song. The software that does this job properly is desktop software: a licence to buy, an installer to run, a Windows machine to keep, and a copy of the library on that one machine.

WorshipStudio was built around what that room actually looks like:

- **The internet is not a given.** The hall WiFi drops, the data bundle runs out, and the service starts anyway. So the app stores everything locally, works with the network off, and pairs devices by camera and code when there is no network to discover them on.
- **Nothing should leave the building.** A church's songs, sermon notes and photographs are its own. Nothing is uploaded, and device to device sharing carries the data straight over the local network rather than through a server.
- **The operator is a volunteer, not an engineer.** Pasting lyrics is the whole import step. Sections are recognised and numbered automatically. Jumping to Verse 2 or the Chorus is one keystroke, and the slide list shows which key that is before the service starts.
- **The equipment is whatever the church already owns.** A laptop, a projector and someone's phone is a full camera setup. Hardware nobody has to buy is hardware that cannot fail to arrive.
- **The browser is enough.** Everything a projection program needs, full screen, a second display, a camera, local storage, offline start, now exists on the web platform. Asking a church to install nothing is the shortest path from "we need slides" to slides on the wall.

## Features

- **Text to slides engine.** A declared opening line (`HYMN: Ancient Words`, `SONG: …`, `SERMON: …`) names the manuscript and files it in the matching collection instead of becoming a slide. Recognises `[verse] [solo] [chorus] [bridge] [intro] [outro] [tag] [refrain] [pre-chorus]` and custom tags, where `[solo]` is treated as a verse. Repeated sections number themselves (Verse 1, Verse 2). A tag can carry an explicit number such as `[Verse 3]`: explicit numbers are reserved first, unnumbered repeats fill in whatever is left, then sections are reordered into ascending numeric order however they were typed, while other section types keep their own position. With no tags at all, stanzas separated by blank lines become numbered verses. Long sections split across slides at a configurable maximum number of lines.
- **Manuscript library.** Lyrics, hymns, sermons and general presentation decks in one place. Create, edit and search by title, author, text or collection, organise by collection (Worship, Praise, Hymns, Special Songs, Choir Ministration, Sermons, General), and soft delete to Trash with restore or permanent delete.
- **Offline Bible.** The King James and American Standard versions are bundled, so books, chapters and verses are read, searched and projected with no connection. Any range can be saved as a passage document with its own theme, background, text styling and audio, then presented like any other manuscript.
- **Slide editor.** Per slide font family, size, weight, alignment, colour, line height, letter spacing, uppercase and shadow. Per slide and per manuscript backgrounds. Duplicate, split, merge, insert and reorder slides by dragging, with a right click context menu.
- **Write on the slide itself.** The slide in the editor is the text area: type, paste and edit straight onto it, and every change is already what the room will see, with no separate box to keep in step.
- **Place pictures, clips and text boxes.** Drop an image or video onto a slide from the media library or from the asset library's backgrounds, drag it where the layout needs it, resize it from its corners and stack it back and forth. A selected clip hands over its own player, so it can be played, scrubbed, muted or thrown fullscreen while the slide is being laid out. Sermon manuscripts are built out of text boxes, so a message is laid out the way a presentation is, and more boxes can be added to any of its slides.
- **Word style text formatting.** Highlight any word, phrase or line and apply bold, italic, underline, strikethrough or highlight from the toolbar that pops up over the selection or from the inspector (Ctrl+B / I / U / D / H), or clear the formatting back off. Marks render as formatting rather than as symbols, and are stored as plain text (`**bold**`, `*italic*`, `++underline++`, `~~strikethrough~~`, `==highlight==`) so they survive copy and paste. Ctrl+Z and Ctrl+Y step through the edits.
- **Backgrounds and audio, in one list each.** The inspector gives backgrounds a single scrolling grid of tiles, newest first, holding built in gradients and solids, uploaded pictures and clips, and anything already in the image and video libraries, with the one option that hands the choice back to the manuscript as a radio button above it. Sounds are a list of the ten newest, with the rest an asset library away. Both are scoped to the slide or to the whole document with a tab.
- **Silence is a choice.** A slide, manuscript or theme can be set to None, which plays nothing and stops there, rather than falling through to the sound the document or theme would otherwise lend it.
- **Tune an asset for one place.** The pencil beside a background or sound opens that picture, clip or sound in its own full editor page, with a back arrow to the slide, manuscript or passage it came from. What is applied there comes back to that one place only: the file in your library, and everywhere else it is used, stay exactly as they were. Trimmed clips and sounds report their trimmed length wherever they are listed, not the length of the original file.
- **Image and video libraries.** Pictures and clips are imported once and used anywhere: as backgrounds, placed on a slide, staged over a broadcast or sent to another device. Each has an editor for framing, filters and trimming, and every list shows real thumbnails, including a decoded frame for a clip rather than a black rectangle.
- **Themes.** Built in themes set the default look of a manuscript, and a theme editor builds more from the same controls the inspector uses.
- **Presentation mode.** Full screen projection, configurable transitions, a presenter bar with the current slide's notes, the next slide, an elapsed timer and a slide counter, black and white screen, pause, and optional looping background audio.
- **Go Live puts the picture on the projector.** With a screen attached over HDMI, or VGA through an adapter, Go Live opens the audience window on that display and fills it, while the operator keeps the app and the presenter view on the laptop. It uses the browser's Window Management API, so the first Go Live on a machine asks to "manage windows on all your displays". Holding that permission is what lets the window open already filling the television in one click, because a window cannot be told to fill a display after it has opened. Answering the prompt can take longer than the click it was riding on, so the first press may only buy the permission and say so: press Go Live once more and it lands on the projector. Settings has a Projector section that asks up front, so the first press projects too, and names the display the audience will see. If the permission is refused the window still opens, and the button at its top right corner, or F, fills the screen.
- **A second module in the corner.** While a manuscript, passage, picture or clip holds the screen, a picture, a clip or the live camera can run in a small window in a corner of it, on the preview and on the audience display alike. Choose what it shows, move it between the four corners, size it, let it be heard or silence it, swap it for something else, or take it away, all without touching the running order. It mirrors its source module live: a passage or picture put on air from the Stream page appears over the camera inside it, a camera switch follows, and a picture or clip retouched in the media editor updates as soon as it is saved, or straight away through Update presentation for an edit that has not been saved yet.
- **Up to three cameras on one broadcast.** The Stream module joins three devices at once. One fills the screen while the others either sit in corner windows over it or wait off screen, ready to be cut to instantly, because every joined camera is already flowing. Switching which is which moves no media and needs no reconnection.
- **Pairing a camera.** On the same WiFi a phone appears in the laptop's device list and one tap connects it. With no network at all, the two devices swap codes by camera instead: a long code is shown as several small QR frames in turn, which a laptop webcam reads far more reliably than one dense code, and the scanner searches the whole camera frame rather than only the aiming box. Side by side the code and the scanner sit in two columns; on a narrower screen they become tabs, so a phone is never scrolling past a QR code to reach its camera.
- **A broadcast that survives a sleeping phone.** The sharing device holds a screen wake lock and plays an inaudible tone, so the browser leaves the page running instead of freezing it once the screen locks or the browser is put away. A brief network drop reads as Reconnecting rather than ending the stream, and a one tap camera is reconnected automatically through an ICE restart when the phone comes back. The capture is watched throughout, by its own events and on a timer, so a camera the operating system stopped or muted is reopened the moment the device is back.
- **A full screen camera on any phone.** The sharing device can fill its screen with what it is sending, with controls that fade away and return on a touch. Where a browser keeps the Fullscreen API for its own video player, iPhones among them, the camera fills the viewport instead of leaving the button dead.
- **Overlays saved for next time.** Any element staged over a broadcast, whether a passage, a manuscript, a picture, a clip or a scrolling announcement, can be saved with its placement, styling and content under a name of its own, then added to a later broadcast from Saved. Saved overlays are kept with the rest of the library and travel through backup export and import.
- **Quick Share.** The share icon in the header opens a page where every device with it open on the same WiFi sees the others. Pick the devices, then pick what to send from a tab per part of the library: manuscripts, passages, images, videos, audio, colours, themes, saved overlays and settings. Each tab lists the real items with their thumbnails, searchable, sortable and selectable one at a time or all at once, and what you tick is kept as you move between tabs. Images and videos cover everything of that kind anywhere in the project, the media library and the asset library at once, listing a picture attached as a background only once. Anything an item needs travels with it: a manuscript takes its background, sound, placed clips and theme. Every library also offers Quick share in its own card menu, for sending one image, video, manuscript, passage or sound on its own. The receiving device is told who is sending and what is coming, and accepts or declines; what it accepts is merged into its library, so nothing it already has is lost. The data travels device to device over the WiFi and never through a server (`src/features/share/QUICK_SHARE.md`).
- **Sharing with no internet, and no WiFi discovery.** Where devices cannot see each other, Quick Share pairs by code exactly as the Stream module does: one device shows a QR code, the other scans or pastes it, and the transfer runs over the local link that handshake opens.
- **Sends that keep going.** Each device card carries its own progress and its own stop button, a send survives the phone sleeping or the browser being minimised, and stopping asks first so a long transfer is never lost to a stray tap.
- **Backup.** Export the whole library, images, videos and audio included, to a single `.zip`, and restore it later, validated on import.
- **Installable and offline.** A service worker caches the app shell, so WorshipStudio installs to the home screen or desktop, opens without a browser bar, starts with no connection, and prompts when a new version is ready.

### Keyboard shortcuts (presentation)

**Navigation**

| Key                       | Action         |
| ------------------------- | -------------- |
| → / Space / Page Dn / `L` | Next slide     |
| ← / Page Up / `H`         | Previous slide |
| Home                      | First slide    |
| End                       | Last slide     |

**Tag navigation** _(numbers are verse only; every other section type has a fixed letter shortcut)_

Hold `Ctrl`, type one or more digits, then release `Ctrl` to jump to that verse. Numbers reflect only the order verses appear in the slide list, and `[solo]` sections count as verses too. Other section types (Chorus, Bridge, Intro, Outro, Tag, Refrain, Pre-Chorus) are never numbered; jump to each with its own fixed `Ctrl` + letter shortcut instead.

| Keys                                 | Action                             |
| ------------------------------------ | ---------------------------------- |
| `Ctrl` hold + `1`, `2`… then release | Jump to **Verse** N                |
| `Ctrl` + `C`                         | Jump to first **Chorus** slide     |
| `Ctrl` + `B`                         | Jump to first **Bridge** slide     |
| `Ctrl` + `I`                         | Jump to first **Intro** slide      |
| `Ctrl` + `O`                         | Jump to first **Outro** slide      |
| `Ctrl` + `P`                         | Jump to first **Pre-Chorus** slide |
| `Ctrl` + `R`                         | Jump to first **Refrain** slide    |
| `Ctrl` + `T`                         | Jump to first **Tag** slide        |

Example: if your manuscript has Verse 1, Chorus, Verse 2, Bridge, then `Ctrl+1` jumps to Verse 1, `Ctrl+2` to Verse 2, `Ctrl+C` to the Chorus and `Ctrl+B` to the Bridge. For a two digit verse like 12, hold `Ctrl`, type `1` then `2`, then release `Ctrl`.

In the editor slide list, each verse's first slide shows a small `^N` badge, and every other recognised section shows its fixed letter badge, `^C` for Chorus or `^B` for Bridge, so you can see which shortcut to use before you start presenting.

> Some browsers reserve `Ctrl+T`, `Ctrl+O` and others for their own tab and window shortcuts when the app is open in a regular browser tab. Install WorshipStudio as a PWA to get full use of every shortcut.

**Playback**

| Key | Action            |
| --- | ----------------- |
| `P` | Pause / resume    |
| Esc | Exit presentation |

On a clip, the playback keys drive the clip rather than the running order: Space and `P` play and pause it, `←` and `→` seek five seconds, and `M` mutes it. They work wherever the pointer last left the focus, including on the transport's own play, mute and level controls, so adjusting the level is never what stops Space from pausing. The one exception is a focused slider, which keeps the arrow, Home, End and Page keys it answers to itself.

**View**

| Key | Action                                   |
| --- | ---------------------------------------- |
| `F` | Toggle fullscreen                        |
| `I` | Toggle presenter bar                     |
| `V` | Cycle screen fit (normal / cover / fill) |
| `+` | Zoom in                                  |
| `-` | Zoom out                                 |
| `0` | Reset zoom                               |

## Installation

```bash
git clone https://github.com/marvelmiles/worship-studio.git
cd worship-studio
pnpm install
```

Requires Node 18 or newer, with Node 20 or 22 recommended. npm and yarn work just as well: use their own `install` and `run` commands.

## Running

```bash
pnpm dev
```

Then open the URL Vite prints, by default http://localhost:5173.

### Scripts

| Command                        | What it does                                            |
| ------------------------------ | ------------------------------------------------------- |
| `pnpm dev`                     | Start the Vite dev server with HMR                      |
| `pnpm build`                   | Type check with `tsc`, then build to `dist/`            |
| `pnpm preview`                 | Preview the production build, exercising the PWA worker |
| `pnpm typecheck`               | Run the TypeScript compiler without emitting            |
| `pnpm lint` / `lint:fix`       | ESLint over the repo                                    |
| `pnpm format` / `format:check` | Prettier over `src/`                                    |
| `pnpm test` / `test:watch`     | Vitest suite                                            |
| `pnpm generate:hymns`          | Rebuild `src/data/hymns.json` from the freehymns corpus |
| `pnpm generate:icons`          | Render the PNG icon set from `public/icon.svg`          |
| `pnpm generate:bible-layout`   | Rebuild the Bible book and chapter layout data          |

## Environment variables

Every variable is optional. Without them the Stream module still pairs by QR or pasted code, which needs no server at all, and Quick Share pairs by code the same way. Copy `.env.example` to `.env` to enable one tap pairing over your WiFi through the Firebase Realtime Database, which relays only the WebRTC handshake and none of the media (see `src/features/stream/STREAM_SIGNALING.md`):

| Variable                     | What it is            |
| ---------------------------- | --------------------- |
| `VITE_FIREBASE_API_KEY`      | Firebase web API key  |
| `VITE_FIREBASE_PROJECT_ID`   | Firebase project id   |
| `VITE_FIREBASE_APP_ID`       | Firebase web app id   |
| `VITE_FIREBASE_DATABASE_URL` | Realtime Database URL |

Camera sharing also needs a secure context: serve the app over `https://`, or over `localhost`, on both devices, or the browser will not open a camera at all.

## Deployment

`pnpm build` emits a static `dist/` that any static host serves. The repo ships a `netlify.toml`. On other hosts, publish `dist/` and route unknown paths to `index.html` so client side routing works. Set the Firebase variables above in the host's environment if you want one tap pairing in production.

## Tech stack

- **Vite, React 18 and TypeScript** for the app foundation and tooling.
- **React Router** for every screen, with each path declared once in `src/routes.ts`.
- **Zustand** as the single source of truth for manuscripts, assets, themes, preferences and storage synchronisation.
- **IndexedDB** for documents and binary files, so a library survives a refresh and a flight.
- **WebRTC**, with **jsQR** and **qrcode-generator**, for camera streaming and device to device sharing, including the QR pairing that needs no server.
- **Firebase Realtime Database**, optional, purely as a signalling relay for one tap pairing.
- **@dnd-kit** for dragging slides into order.
- **Framer Motion** for slide transitions in presentation mode.
- **Zod** for validating imported backups before they touch your library.
- **fflate** for reading and writing the `.zip` backup format in the browser.
- **vite-plugin-pwa** and **workbox-window** for the service worker, offline caching and the installable manifest.
- **lucide-react** for icons.

## Architecture

```
src/
  theme/        the UI theme (uiTheme.ts), its provider and the --ws-* CSS variables
  lib/          parser, style and background resolution, storage, zod schema, helpers
  data/         built-in backgrounds, themes, collections, fonts, seed manuscripts
                (hymns.json holds the bundled hymnal, generated, not edited by hand)
  store/        Zustand store (state, actions and persistence)
  components/   SlideCanvas and reusable UI primitives (Button, Field, Modal, ContextMenu)
  hooks/        shared behaviour (text editing, media playback, wake lock, viewport)
  features/
    dashboard/    Dashboard
    manuscripts/  Manuscript library, editor, text and settings modals
    editor/       Shared deck workspace, its edit hooks (deckEditor/) and slide list
    bible/        Reader, passage editor and the reader's selection and save hooks
    media/        Image and video libraries and editors
    presentation/ Presentation overlay (Framer Motion) and its projection hooks
    settings/     Settings modal, split per section
    share/        Quick Share: handing a library to a nearby device
    stream/       Camera sharing: sender/, receiver/, stage/, overlays and lib/
    assets/       Asset library
  routes.ts     every path in the app, one function per route
  App.tsx       layout shell, routes, global overlays
  main.tsx      entry (Router)
```

Components are functions declared as `const`, files stay focused on one job, and anything shared lives in a hook, a component or a `lib/` module rather than being repeated.

## Notes and intentional scope choices

These are deliberate engineering decisions, called out honestly:

- **Styling uses a design token inline style system, not Tailwind.** The look is fully self contained and needs no PostCSS or Tailwind build step, which keeps the project reliable to install and run. The theme lives in `src/theme/uiTheme.ts` and reaches components through `useUITheme()`, and the same values are published as `--ws-*` CSS variables for stylesheets and module level styles.
- **Editing is live bound rather than React Hook Form.** A presentation editor benefits from instant preview on every keystroke, so fields write straight to the store. Zod is still used where it adds real value: validating imported backups.
- **React 18** is pinned for the broadest ecosystem compatibility. Moving to 19 is straightforward if you want it.
- **The presenter view is an in-window bar or a floating window**, not a separate second monitor application. It shows current notes, the next slide, a timer and a counter, and can be popped out while you work elsewhere.
- **Only the current backup format is read.** Backups are `.zip` archives, and the much older inline JSON exports are no longer imported.
- The service worker is enabled in development too, so install and offline behaviour can be checked without a production build.

## Hymn library

The default manuscripts are the full English hymnal from [freehymns/hymns](https://github.com/freehymns/hymns), bundled as `src/data/hymns.json` so every hymn is searchable and presentable offline. They are seeded into IndexedDB on first load and marked `builtIn`, so they cannot be deleted by accident.

`pnpm generate:hymns` rebuilds that file. It clones the corpus into `.cache/`, or reads `--source=<path>`, then normalizes each file through `src/lib/manuscript/hymnal.ts`, the same module the parser uses, so pasted hymnal text is treated exactly like the bundled corpus. Normalizing means:

- `Verse 1:` and `Refrain:` headings become sections, including `Refrain A` and `Introduction`
- an `Author:` line anywhere in the file becomes the manuscript's author instead of a lyric
- tune cues such as `Verse 1:@e1` and `Road Map:` lines are dropped
- singing hyphens are closed up, so `a-bide` is stored and searched as `abide`

The join only runs when a document really is syllabified, measured by how many words carry a hyphen and how short the pieces are. A manuscript you typed yourself keeps `self-control` and `day-to-day` intact.

Hymns are seeded at four lines a slide with a slightly smaller type size, so a stanza always leaves space above and below it rather than filling the frame. Longer sections simply break across more slides.

## License

Seed content is the public domain hymnal from [freehymns/hymns](https://github.com/freehymns/hymns), transcribed from The Cyber Hymnal and marked `Terms:Public Domain` at source. The code is provided for you to use and adapt for your church or project.
