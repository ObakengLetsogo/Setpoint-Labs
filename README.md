# Setpoint Labs

Learn PLC logic by running it. A browser based PLC and industrial automation training
platform: short lessons, ladder diagram and structured text that executes line by line,
and an animated 3D industrial rig that reacts in real time.

Self hosted on a Hostinger VPS (Nginx, PM2, Let's Encrypt), not Vercel. See the deploy
guide in Phase 7 of the build plan for server setup.

## Status

The motor start stop bench is live:

- Ladder engine (`engine/`): parser and scan executor with series and parallel logic, latch, TON, TOF, CTU and RES, plus a per-scan trace. Covered by Vitest (`npm test`).
- Rig (`rigs/motorStarter.ts`, `components/stage/`): physically based 3D motor starter with PLC, contactor, overload, MCB, X1 terminals, ducted wiring and a TEFC motor, driven live by the engine.
- Annotation stage: numbered markers pinned to parts, leader lines to cards, part renders in `public/parts/` (regenerate in development from `/render/parts?id=...`).
- Teaching panels (`components/teach/`): lab track, animated wiring view, wiring table, steps, code reader with tour, story and explore modes, and a live scan monitor.
- `window.setpointLabs` automation API for recording and tests.
- Contactor body baked in headless Blender (`scripts/blender/`, `BLENDER_PY=<python with bpy> scripts/blender/build.sh contactor`), compressed with meshopt and WebP.
- Progress, settings and edited code persist in the browser; a service worker keeps the bench usable offline.
- Lesson videos: `npm run video -- <lessonId>` renders narrated, captioned MP4s from `scripts/video/lessons/`. See `scripts/video/README.md`.
- End to end tests for lessons 1 to 3: `npm run test:e2e` (Playwright).

Auth, payments, more rigs and platform packs come in later phases.

## Stack

- Next.js (App Router) + TypeScript, Tailwind CSS v4 (tokens defined in `app/globals.css`)
- Barlow Condensed / Inter / JetBrains Mono via `next/font`
- React Three Fiber + drei for the 3D rigs (Phase 2)
- CodeMirror 6 for the code and ladder editors (Phase 2/3)
- MySQL 8.4+ with Prisma or Drizzle, Auth.js/Lucia style auth, Stitch payments (Phase 5)

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Project layout

```
app/                    Next.js App Router routes (shell, metadata)
components/
  shell/                Header, progress card, bottom tab bar, sheets
  stage/                3D stage placeholder (Phase 2 swaps in React Three Fiber)
  lessons/              Lesson carousel, tabbed lesson panel
  code/                 Try it yourself code card
  schematic/            Schematic / ladder diagram card
  monitor/              Scan monitor panel
data/                   Typed fake track/lesson data
lib/                    Shared config (domain, etc.)
public/brand/           Logo, favicons, PWA icons, OG image
```

## Design tokens

Colour, font and shadow tokens live in `app/globals.css` under `@theme`, generating
Tailwind utilities such as `bg-background`, `text-accent`, `font-display`. Light theme
only, no dark mode.

Setpoint Labs is for education only, not for use on live plant.
