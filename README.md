# WorshipStudio

**A church worship presentation studio that runs in your browser, works offline, and needs no server.**

Paste lyrics, a hymn, a sermon outline or a Bible reference and WorshipStudio turns it into slides, then projects them full screen with themes, backgrounds, video, audio, presenter notes and keyboard control. It also streams phone cameras into a service and hands your whole library to another device across the room.

Everything is stored in the browser (IndexedDB). No account, no subscription, no upload.

**Live demo: [worshipstudio.netlify.app](https://worshipstudio.netlify.app/)**

Keywords: church presentation software, worship slides, lyrics to slides, hymn projection, Bible verse projection, sermon slides, ProPresenter alternative, EasyWorship alternative, OpenLP alternative, offline PWA, React, TypeScript.

## Why I built it

I built WorshipStudio for my own church.

Our services run on a laptop, a projector and whoever is free to run the slides that morning. The programs made for this job are desktop programs with a licence to buy and one machine to keep them on, and the hall WiFi is not something I can count on when the first song starts. So I wrote the one I wanted: everything in the browser's own storage, opens with no connection, and nobody has to install anything.

The rest follows from that room:

- **The internet is not a given.** The app stores everything locally and pairs devices by QR code when there is no network to find them on.
- **Nothing should leave the building.** Our songs, notes and photographs are the church's own, so nothing is uploaded and sharing goes device to device.
- **The operator is a volunteer.** Pasting the lyrics is the whole import step, and jumping to Verse 2 or the chorus is one keystroke.
- **The equipment is what we already own.** A laptop, a projector and someone's phone is a full camera setup.

## About the project

A single page React and TypeScript app that behaves like a desktop presentation program:

- **The library** holds manuscripts, an offline Bible, images, videos, sounds, backgrounds, themes and saved overlays.
- **The editor** is the slide itself, so what you type is already what the room will see.
- **Presentation mode** fills the projector while the operator keeps notes, the next slide and a timer on the laptop.
- **Stream** joins up to three phone cameras over WebRTC and stages overlays on top.
- **Quick Share** copies a library to a nearby device, over the WiFi or by code.

It builds to a static bundle, installs as a PWA and updates itself through a service worker.

## Features

**Library and editing**

- **Paste and it becomes slides.** Section tags such as `[verse]` and `[chorus]` are recognised and numbered, and long sections split across slides.
- **Manuscript library.** Lyrics, hymns, sermons and general decks, searchable by title, author or text, organised by collection, with a trash that restores.
- **Offline Bible.** The King James and American Standard versions are bundled, so any passage can be read, searched, saved and presented with no connection.
- **Write on the slide itself.** The slide in the editor is the text area, so there is no separate box to keep in step.
- **Slide styling.** Font, size, weight, colour, alignment, spacing and shadow, per slide or for the whole manuscript.
- **Pictures, clips and text boxes.** Drop them on a slide, drag, resize and stack them. A selected clip hands over its own player.
- **Word style formatting.** Bold, italic, underline, strikethrough and highlight, stored as plain text so they survive copy and paste.
- **One list for backgrounds, one for sounds.** Scoped to the slide or the whole manuscript, with a radio option that hands the choice back to the manuscript.
- **Silence is a choice.** None plays nothing and stops there, rather than falling through to the manuscript's or theme's sound.
- **Tune an asset for one place.** The pencil opens a picture, clip or sound in its own editor, and what you change comes back to that one use only.
- **Images and videos.** Import once and use anywhere, as a background, on a slide, over a broadcast or sent to another device.
- **Themes.** Built in themes set a manuscript's default look, and the theme editor builds more.

**Presenting**

- **Presentation mode.** Full screen with transitions, a presenter bar with notes, next slide, timer and counter, black and white screen, pause and looping audio.
- **Go Live puts it on the projector.** With a screen on HDMI the audience window opens already filling it, through the browser's Window Management API.
- **Grant the display permission up front.** Settings has a Projector section, so the first Go Live projects instead of spending the click on the prompt.
- **A second module in the corner.** A picture, a clip or the live camera runs in a corner of the slide and follows its source live.
- **Keyboard control.** Hold `Ctrl` and type a number for a verse, `Ctrl+C` for the chorus, and the slide list shows each badge before you start.

**Live camera**

- **Up to three cameras at once.** One fills the screen while the others sit in corners or wait off screen, already flowing and ready to cut to.
- **Pairing.** On the same WiFi a phone appears in the list and one tap connects it. Offline, the devices swap QR codes instead.
- **Codes a webcam can actually read.** A long code is shown as several small frames in turn, and the scanner searches the whole camera view.
- **It survives a sleeping phone.** A wake lock and an inaudible tone keep the page alive, and a dropped connection reconnects itself.
- **Full screen on the phone.** The sharing device fills its screen with what it is sending, including on iPhones, where the Fullscreen API is reserved.
- **Overlays saved for next time.** Save any staged element with its placement and styling, then add it to a later broadcast from Saved.

**Sharing and data**

- **Quick Share.** Every device with the page open on the same WiFi sees the others; pick who to send to, then pick items from a tab per part of the library.
- **Whatever an item needs travels with it.** A manuscript takes its background, sound, placed clips and theme, and the receiving device accepts or declines.
- **No network, no problem.** Devices that cannot see each other pair by QR or typed code, exactly as the camera does.
- **Sends you can watch.** Each device card has its own progress and stop button, and a transfer survives the phone sleeping.
- **Backup.** Export the whole library, media included, to one `.zip` and restore it later, validated on import.
- **Installs and works offline.** A service worker caches the app, so it opens with no connection and prompts when a new version is ready.

### Keyboard shortcuts (presentation)

**Navigation**

| Key                       | Action         |
| ------------------------- | -------------- |
| → / Space / Page Dn / `L` | Next slide     |
| ← / Page Up / `H`         | Previous slide |
| Home                      | First slide    |
| End                       | Last slide     |

**Tag navigation** _(numbers are verse only; every other section type has a fixed letter)_

Hold `Ctrl`, type one or more digits, then release `Ctrl` to jump to that verse. Numbers follow the order verses appear in the slide list, and `[solo]` counts as a verse. Other sections are never numbered, so each has its own letter instead.

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

In the editor slide list, each verse's first slide shows a `^N` badge and every other section its letter badge, so you can see the shortcut before you present. Install the app as a PWA to keep the shortcuts a browser tab would otherwise take.

**Playback**

| Key | Action            |
| --- | ----------------- |
| `P` | Pause / resume    |
| Esc | Exit presentation |

On a clip the playback keys drive the clip: Space and `P` play and pause, `←` and `→` seek five seconds, `M` mutes. A focused slider keeps the arrow and Page keys for itself.

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

Node 18 or newer, with 20 or 22 recommended. npm and yarn work too.

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
| `pnpm preview`                 | Preview the production build, service worker included   |
| `pnpm typecheck`               | Run the TypeScript compiler without emitting            |
| `pnpm lint` / `lint:fix`       | ESLint over the repo                                    |
| `pnpm format` / `format:check` | Prettier over `src/`                                    |
| `pnpm test` / `test:watch`     | Vitest suite                                            |
| `pnpm generate:hymns`          | Rebuild `src/data/hymns.json` from the freehymns corpus |
| `pnpm generate:icons`          | Render the PNG icon set from `public/icon.svg`          |
| `pnpm generate:bible-layout`   | Rebuild the Bible book and chapter layout data          |

## Environment variables

All optional. Without them, cameras and Quick Share still pair by QR or pasted code, which needs no server. Copy `.env.example` to `.env` to add one tap pairing over your WiFi through the Firebase Realtime Database, which relays the WebRTC handshake and none of the media (see `src/features/stream/STREAM_SIGNALING.md`):

| Variable                     | What it is            |
| ---------------------------- | --------------------- |
| `VITE_FIREBASE_API_KEY`      | Firebase web API key  |
| `VITE_FIREBASE_PROJECT_ID`   | Firebase project id   |
| `VITE_FIREBASE_APP_ID`       | Firebase web app id   |
| `VITE_FIREBASE_DATABASE_URL` | Realtime Database URL |

Cameras also need a secure context: serve over `https://` or `localhost` on both devices, or the browser will not open one.

## Deployment

`pnpm build` emits a static `dist/` that any static host serves. The repo ships a `netlify.toml`. Elsewhere, publish `dist/` and route unknown paths to `index.html` so client side routing works.

## Tech stack

Vite, React 18 and TypeScript, with React Router and Zustand. IndexedDB for documents and files, WebRTC with jsQR and qrcode-generator for cameras and sharing, Firebase Realtime Database as an optional signalling relay, @dnd-kit for dragging slides, Framer Motion for transitions, Zod for validating backups, fflate for the `.zip` format, vite-plugin-pwa and Workbox for offline, and lucide-react for icons.

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

Components are functions declared as `const`, files stay focused on one job, and anything shared lives in a hook, a component or a `lib/` module.

## Notes and intentional scope choices

- **Styling is a design token inline style system, not Tailwind**, so the look is self contained and needs no extra build step. The theme lives in `src/theme/uiTheme.ts` and is published as `--ws-*` CSS variables.
- **Editing is live bound rather than form managed.** Fields write straight to the store for instant preview; Zod guards the one place it earns its keep, imported backups.
- **React 18** is pinned for ecosystem compatibility. Moving to 19 is straightforward.
- **The presenter view is a bar or a floating window**, not a separate second monitor application.
- **Only the current `.zip` backup format is read.** The older inline JSON exports are not imported.
- **The service worker runs in development too**, so offline and install behaviour can be checked without a production build.

## Hymn library

The default manuscripts are the English hymnal from [freehymns/hymns](https://github.com/freehymns/hymns), bundled as `src/data/hymns.json` and seeded on first load, marked `builtIn` so they cannot be deleted by accident.

`pnpm generate:hymns` rebuilds that file through `src/lib/manuscript/hymnal.ts`, the same module the parser uses, so pasted hymnal text is treated exactly like the bundled corpus. Normalizing turns `Verse 1:` and `Refrain:` headings into sections, lifts an `Author:` line out of the lyrics, drops tune cues, and closes up singing hyphens so `a-bide` is stored as `abide`. That join only runs on documents that really are syllabified, so `self-control` in a manuscript you typed stays intact.

## License

Seed content is the public domain hymnal from [freehymns/hymns](https://github.com/freehymns/hymns), transcribed from The Cyber Hymnal and marked `Terms:Public Domain` at source. The code is provided for you to use and adapt for your church or project.
