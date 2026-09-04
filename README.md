# WorshipStudio

**About:** WorshipStudio is a browser-based church presentation and worship tool. It helps churches display song lyrics, hymns, sermons, Bible verses, images, and videos during services. It also includes a stream module for camera sharing and live broadcasting. Presentations can be customized with themes, backgrounds, presenter notes, and keyboard controls. WorshipStudio works offline and stores data locally in the browser using IndexedDB.

**Live Demo:** https://worshipstudio.netlify.app/

## Quick start

```bash
pnpm install
pnpm dev
```

Then open the URL Vite prints (default http://localhost:5173).

### Scripts

| Command          | What it does                                        |
| ---------------- | --------------------------------------------------- |
| `pnpm dev`       | Start the Vite dev server with HMR                  |
| `pnpm build`     | Type‑check (`tsc`) then build to `dist/`            |
| `pnpm preview`   | Preview the production build (exercises the PWA SW) |
| `pnpm typecheck` | Run the TypeScript compiler without emitting        |

> Requires Node 18+ (Node 20/22 recommended). If you prefer npm or yarn, the
> equivalent `install` / `run dev` commands work too.

## Tech stack

- **Vite + React 18 + TypeScript** — app foundation and tooling.
- **React Router** — `/` dashboard, `/manuscripts`, `/manuscripts/:manuscriptId`.
- **Zustand** — single source of truth for manuscripts, assets, themes, prefs, and
  storage synchronisation.
- **@dnd-kit** — drag‑to‑reorder slides in the editor.
- **Framer Motion** — configurable slide transitions in presentation mode.
- **Zod** — validates imported backup files before they touch your library.
- **vite-plugin-pwa** — service worker, offline caching, installable manifest.
- **lucide-react** — icon set.

## Features

- **Text → slides engine.** A declared opening line (`HYMN: Ancient Words`,
  `SONG: …`, `SERMON: …`) names the manuscript and files it in the matching
  collection instead of becoming a slide. Recognises `[verse] [solo] [chorus] [bridge]
[intro] [outro] [tag] [refrain] [pre-chorus]` (and custom) tags — `[solo]` is
  treated as a verse. Repeated sections auto‑number (Verse 1, Verse 2). A tag
  can also carry an explicit number (e.g. `[Verse 3]`) — explicit numbers are
  reserved first and unnumbered repeats fill in whatever's left, then sections
  are reordered into ascending numeric order regardless of how they were typed
  (other section types keep their own position). With no tags, blank‑line‑
  separated stanzas become numbered verses. Long sections split across slides
  at a configurable max‑lines.
- **Manuscript library.** Lyrics, hymns, sermons and general presentation
  decks in one place. Create / edit / search (title, author, text, collection),
  organise by collection (Worship, Praise, Hymns, Special Songs, Choir
  Ministration, Sermons, General), soft‑delete to Trash with restore or
  permanent delete.
- **Slide editor.** Per‑slide font family / size / weight / alignment / colour /
  line‑height / letter‑spacing / uppercase / shadow; per‑slide and
  per‑manuscript backgrounds; duplicate, split, merge, insert, reorder (drag),
  and a right‑click context menu.
- **Write on the slide itself.** The slide in the editor is the text area:
  type, paste and edit straight onto it and every change is already what the
  room will see, with no separate box to keep in step.
- **Place pictures, clips and text boxes.** Drop an image or video onto a slide
  from the media library or from the Asset Library's backgrounds, drag it where
  the layout needs it, resize it from its corners and stack it back and forth.
  A selected clip hands over its own player, so it can be played, scrubbed,
  muted or thrown fullscreen while the slide is being laid out. Sermon
  manuscripts are built out of text boxes, so a message is laid out the way a
  presentation is, and more boxes can be added to any of its slides.
- **Word‑style text formatting.** Highlight any word, phrase or line and apply
  bold, italic, underline, strikethrough or highlight from the toolbar that
  pops up over the selection or from the Inspector (Ctrl+B / I / U / D / H),
  or clear the formatting back off. Marks render as formatting rather than as
  symbols, and are stored as plain text (`**bold**`, `*italic*`,
  `++underline++`, `~~strikethrough~~`, `==highlight==`) so they survive copy
  and paste. Ctrl+Z / Ctrl+Y step through the edits.
- **Backgrounds & audio.** A built‑in gradient/solid background gallery plus
  custom image and MP3 uploads, managed in the Asset Library.
- **Themes.** Five built‑in themes that set the default look per manuscript.
- **Presentation mode.** Full‑screen projection, configurable transitions, a
  presenter bar (current slide notes, next‑slide preview, elapsed timer, slide
  counter), black/white screen, pause, and optional looping background audio.
- **A second module in the corner.** While a manuscript, passage, picture or
  clip holds the screen, a picture, a clip or the live camera can run in a
  small window in a corner of it, on the preview and on the audience display
  alike. Choose what it shows, move it between the four corners, size it,
  let it be heard or silence it, swap it for something else, or take it away,
  all without touching the running order. It mirrors its source module live:
  a passage or picture put on air from the Stream page appears over the camera
  inside it, a camera switch follows, and a picture or clip retouched in the
  media editor updates as soon as it is saved (or straight away, via Update
  presentation, for an edit that has not been saved yet).
- **Up to three cameras on one broadcast.** The Stream module joins three
  devices at once. One fills the screen; the others either sit in corner
  windows over it or wait off screen, ready to be cut to instantly, because
  every joined camera is already flowing. Switching which is which moves no
  media and needs no reconnection.
- **Backup.** Export the whole library to JSON and restore it later
  (validated on import).

### Keyboard shortcuts (presentation)

**Navigation**

| Key                       | Action         |
| ------------------------- | -------------- |
| → / Space / Page Dn / `L` | Next slide     |
| ← / Page Up / `H`         | Previous slide |
| Home                      | First slide    |
| End                       | Last slide     |

**Tag navigation** _(numbers are verse‑only; every other section type has a fixed letter shortcut)_

Hold `Ctrl`, type one or more digits, then release `Ctrl` to jump to that verse. Numbers reflect only the order verses appear in the slide list — `[solo]` sections count as verses too. Other section types (Chorus, Bridge, Intro, Outro, Tag, Refrain, Pre‑Chorus) are never numbered; jump to each with its own fixed `Ctrl` + letter shortcut instead.

| Keys                                 | Action                             |
| ------------------------------------ | ---------------------------------- |
| `Ctrl` hold + `1`, `2`… then release | Jump to **Verse** N                |
| `Ctrl` + `C`                         | Jump to first **Chorus** slide     |
| `Ctrl` + `B`                         | Jump to first **Bridge** slide     |
| `Ctrl` + `I`                         | Jump to first **Intro** slide      |
| `Ctrl` + `O`                         | Jump to first **Outro** slide      |
| `Ctrl` + `P`                         | Jump to first **Pre‑Chorus** slide |
| `Ctrl` + `R`                         | Jump to first **Refrain** slide    |
| `Ctrl` + `T`                         | Jump to first **Tag** slide        |

Example: if your manuscript has Verse 1 → Chorus → Verse 2 → Bridge, `Ctrl+1` jumps to Verse 1, `Ctrl+2` to Verse 2, `Ctrl+C` to the Chorus, and `Ctrl+B` to the Bridge. For a two-digit verse like 12, hold `Ctrl`, type `1` then `2`, then release `Ctrl`.

In the editor slide list, each verse's first slide shows a small `^N` badge; every other recognised section shows its fixed letter badge (e.g. `^C` for Chorus, `^B` for Bridge) in gold, so you can see which shortcut to use before you start presenting.

> Some browsers reserve `Ctrl+T`/`Ctrl+O`/etc. for their own tab/window shortcuts when the app is open in a regular browser tab. Install WorshipStudio as a PWA (see below) to get full use of every shortcut.

**Playback**

| Key | Action            |
| --- | ----------------- |
| `P` | Pause / resume    |
| Esc | Exit presentation |

On a clip, the playback keys drive the clip rather than the running order:
Space and `P` play and pause it, `←` / `→` seek five seconds, and `M` mutes it.
They work wherever the pointer last left the focus, including on the transport's
own play, mute and level controls, so adjusting the level is never what stops
Space from pausing. The one exception is a focused slider, which keeps the
arrow, Home, End and Page keys it answers to itself.

**View**

| Key | Action                                   |
| --- | ---------------------------------------- |
| `F` | Toggle fullscreen                        |
| `I` | Toggle presenter bar                     |
| `V` | Cycle screen fit (normal / cover / fill) |
| `+` | Zoom in                                  |
| `-` | Zoom out                                 |
| `0` | Reset zoom                               |

## Project structure

```
src/
  theme/        design tokens (colours, fonts, glass surface)
  lib/          parser, style/bg resolution, IndexedDB storage, zod schema, helpers
  data/         built-in backgrounds, themes, collections, seed manuscripts
  store/        Zustand store (state + actions + persistence)
  components/   SlideCanvas + reusable UI primitives (Button, Field, Modal, ContextMenu)
  hooks/        slide text editing (useTextFormatting, useSlideTextEditor), useDocumentTitle
  features/
    dashboard/  Dashboard
    manuscripts/ Manuscript library, editor, text + settings modals
    editor/     Shared deck workspace + SortableSlideList (dnd-kit)
    presentation/ Presentation overlay (Framer Motion)
    assets/     Asset Library modal
  App.tsx       layout shell, routes, global overlays
  main.tsx      entry (Router)
```

## Notes & intentional scope choices

These are deliberate engineering decisions, called out honestly:

- **Styling uses a design‑token inline‑style system, not Tailwind.** The look is
  fully self‑contained and needs no PostCSS/Tailwind build step, which keeps the
  project reliable to install and run. The tokens live in `src/theme/tokens.ts`.
- **Editing is live‑bound rather than React Hook Form.** A presentation editor
  benefits from instant preview on every keystroke, so fields write straight to
  the store. Zod is still used where it adds real value: validating imported
  backups.
- **React 18** is pinned for the broadest ecosystem compatibility; bumping to 19
  is straightforward if you want it.
- **The PWA icon is an SVG** (`public/icon.svg`). It's valid for the manifest and
  install; for app‑store‑grade installability on every platform you may want to
  add raster PNG icons (e.g. 192/512) and reference them in
  `vite.config.ts`.
- **The presenter view is an in‑window bar**, not a separate second‑monitor
  window. It shows current notes, the next slide, timer and counter.
- **Backgrounds support solid colours, gradients and uploaded images.** Video
  backgrounds are not included.
- The service worker is enabled for `build`/`preview` only (not `dev`), so the
  dev server stays simple. Run `pnpm build && pnpm preview` to try offline mode.

## License

Seed content uses public‑domain hymns. The code is provided for you to use and
adapt for your church or project.
