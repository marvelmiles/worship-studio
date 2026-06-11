# WorshipStudio

WorshipStudio is a church worship presentation studio that runs entirely in the browser. Paste song lyrics and WorshipStudio automatically transforms them into beautifully formatted slides, then projects them full-screen with customizable themes, backgrounds, presenter notes, and full keyboard control. All data is stored locally using IndexedDB, and the app continues to work offline once loaded. Try the live demo at https://worshipstudio.netlify.app/.

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
- **React Router** — `/` dashboard, `/library`, `/editor/:songId`.
- **Zustand** — single source of truth for songs, assets, themes, prefs, and
  storage synchronisation.
- **@dnd-kit** — drag‑to‑reorder slides in the editor.
- **Framer Motion** — configurable slide transitions in presentation mode.
- **Zod** — validates imported backup files before they touch your library.
- **vite-plugin-pwa** — service worker, offline caching, installable manifest.
- **lucide-react** — icon set.

## Features

- **Lyrics → slides engine.** Recognises `[verse] [chorus] [bridge] [intro]
[outro] [tag] [refrain] [pre-chorus]` (and custom) tags. Repeated sections
  auto‑number (Verse 1, Verse 2). With no tags, blank‑line‑separated stanzas
  become numbered verses. Long sections split across slides at a configurable
  max‑lines.
- **Song library.** Create / edit / search (title, artist, lyrics, collection),
  organise by collection, soft‑delete to Trash with restore or permanent
  delete.
- **Slide editor.** Per‑slide font family / size / weight / alignment / colour /
  line‑height / letter‑spacing / uppercase / shadow; per‑slide and per‑song
  backgrounds; duplicate, split, merge, insert, reorder (drag), and a
  right‑click context menu.
- **Backgrounds & audio.** A built‑in gradient/solid background gallery plus
  custom image and MP3 uploads, managed in the Asset Library.
- **Themes.** Five built‑in themes that set the default look per song.
- **Presentation mode.** Full‑screen projection, configurable transitions, a
  presenter bar (current slide notes, next‑slide preview, elapsed timer, slide
  counter), black/white screen, pause, and optional looping background audio.
- **Backup.** Export the whole library to JSON and restore it later
  (validated on import).

### Keyboard shortcuts (presentation)

| Key                         | Action               |
| --------------------------- | -------------------- |
| → / Space / Page Down / `l` | Next slide           |
| ← / Page Up / `h`           | Previous slide       |
| Home / End                  | First / last         |
| `B`                         | Black screen         |
| `W`                         | White screen         |
| `P`                         | Pause timer/audio    |
| `F`                         | Toggle fullscreen    |
| `I`                         | Toggle presenter bar |
| Esc                         | Exit                 |

## Project structure

```
src/
  theme/        design tokens (colours, fonts, glass surface)
  lib/          parser, style/bg resolution, IndexedDB storage, zod schema, helpers
  data/         built-in backgrounds, themes, seed songs
  store/        Zustand store (state + actions + persistence)
  components/   SlideCanvas + reusable UI primitives (Button, Field, Modal, ContextMenu)
  hooks/        useDocumentTitle
  features/
    dashboard/  Dashboard
    library/    Library
    editor/     Editor + SortableSlideList (dnd-kit)
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
