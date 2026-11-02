# Lesson video pipeline

Turns a lesson spec into a narrated, captioned video by driving the real 3D bench (the actual
`/record` route and rig, not a mockup). Runs headless on a server or in a sandbox, nothing needs
a desktop - but it does need the three things below set up first.

## One-time setup on a fresh machine

**1. App dependencies**

```bash
npm install
npx playwright install chromium   # only if Chromium isn't already present on this machine
```

**2. A database.** `/record` loads lesson content through `/api/lessons/[id]`, which queries
MySQL (`lib/server/videos.ts`, checking for an already-published video row). Without a reachable
database that route 500s, `program` never loads, and every action in a lesson spec
(`play`, `tap`, `highlightRung`...) silently no-ops - the lecture renders with an empty ladder
panel and nothing visibly happens. This bit us once; don't skip it.

```bash
# Debian/Ubuntu example. Use whatever MySQL 8.4+/MariaDB you have; schema is plain Drizzle/MySQL.
apt-get install -y mariadb-server
mkdir -p /var/run/mysqld && chown mysql:mysql /var/run/mysqld
mysqld_safe &                      # or your platform's normal MySQL service start
mysql -uroot -e "
  CREATE DATABASE IF NOT EXISTS setpoint;
  CREATE USER IF NOT EXISTS 'setpoint'@'localhost' IDENTIFIED BY 'devpass';
  GRANT ALL PRIVILEGES ON setpoint.* TO 'setpoint'@'localhost';
"
export DATABASE_URL="mysql://setpoint:devpass@localhost:3306/setpoint"
npm run db:migrate
```

Keep `DATABASE_URL` set (and the server started with it in its environment) for every later step.

**3. The approved voice.** Kokoro ONNX, `af_heart`, 0.95x speed - chosen to match the course's
one consistent instructor voice. Don't substitute a different default voice without sign-off.

```bash
npm run video:setup          # pip install kokoro-onnx + downloads ~350MB of model files
export KOKORO_DIR=/root/kokoro   # wherever setup put them; the script tells you
```

Azure and ElevenLabs providers exist in `lib/tts/` but need API keys and are not the approved
voice for Foundation content - Kokoro is primary, Piper (`npm run video:setup:piper`) is the
offline last-resort fallback only.

## Rendering a lecture

```bash
# Start (or point at) a server with DATABASE_URL set:
npx next start -p 4317 -H 127.0.0.1 &
export VIDEO_BASE_URL=http://127.0.0.1:4317   # skips the build+ensureServer dance, much faster for iteration

npm run video -- f-why --preview 2,20,40,60       # stills only - check framing before spending render time
npm run video -- f-why --format landscape         # the real render
npm run video -- f-why --format landscape --resume          # continue an interrupted capture
npm run video -- f-why --format landscape --workers 4       # split capture across N browser instances
```

Writes `videos/<lessonId>.mp4` + `.srt` + `.vtt` (landscape) and `.portrait.mp4/.srt/.vtt`.
`videos/` is gitignored - final files are delivered separately, not committed.

**On `--workers`:** worth trying, but temper expectations. In a sandbox with no GPU,
Chromium's software rasterizer (SwiftShader) already tends to saturate the available CPU cores
*within one instance*, so running several concurrently can net surprisingly little - we measured
~20% on a 4-core box, not 4x. If you have a real GPU available, that's a far bigger win than more
worker processes; see "Speed" below.

**On `--resume`:** every frame write is idempotent and the frame-skip path used here doubles as
the resume mechanism - interrupting a render (background task limits, a killed process, whatever)
never loses more than the in-flight frame. Re-run with `--resume` and it picks up where it left
off by scanning which frame files already exist.

## Lesson spec

`lessons/<lessonId>.json` - see `f-why.json`, `f-inside.json`, `f-scan.json` for real examples
built against the shipped lesson content (not a toy example):

```json
{
  "lessonId": "f-why",
  "course": "foundations",
  "scenes": [
    {
      "id": "tap-start",
      "narration": "Tap Start. The rung goes true and writes Run Seal.",
      "caption": "Optional on-screen text override, a string or an array of caption chunks",
      "pauseAfter": 0.6,
      "actions": [
        { "at": 0.6, "call": "tap", "args": ["start"] },
        { "at": "60%", "call": "highlightRung", "args": [1] },
        { "at": "end", "call": "showLabel", "args": [null] }
      ]
    }
  ]
}
```

`lessonId` must match a real lesson id from `data/curriculum.ts` (that's what `/record` loads and
what gates access to content via `/api/lessons/[id]`) - it also decides which rig and which real
ladder program the video shows. A scene lasts its narration plus `pauseAfter` (default 0.6s). `at`
is seconds from the scene start, a percentage of the narration, or `"end"`. `call` is any
`window.setpointLabs` method (`components/AutomationApi.tsx`): `play`, `pause`, `step`, `press`,
`tap`, `setInput`, `setSpeed`, `setFault`, `focus` (part, glow), `resetView`, `rotate`, `zoom`,
`select`, `explode`, `highlightRung`, `showLabel`.

The source of truth for a lecture's content (topics, order, demo, faults, lab) is the Curriculum
and Lecture Guide - that's a confidential business document, shared outside this repo (ask
whoever onboarded you), not committed here. The repo itself is public.

## Captions

Never burn captions into the video pixels - `assemble.mjs` does not do that. The lesson video
player (`components/teach/LessonVideo.tsx`) already has a native `<track kind="captions">` wired
to the `.vtt` this pipeline writes (`data/videos.ts`: `captions` field), so captions are a viewer
toggle in the player, not baked in. If you're eyeballing a raw `.mp4` in a plain player (Finder
preview, double-click, etc.) you will see no captions at all - that's expected; load the `.vtt` as
a subtitle track (VLC: right-click → Subtitle → Add Subtitle File) or view it through the actual
lesson page.

## How it works

1. Narration per scene through the voice provider, cached in `.video-cache/tts`.
2. Playwright opens `/record/<lessonId>?hideChrome=1&manual=1` at 1920x1080 and/or 1080x1920 with
   a fake clock. Each frame advances timers by 1/30s, renders the scene exactly once and captures
   it, so runs are repeatable.
3. ffmpeg joins a 3s intro card, the frames and a 3s outro card; mixes the voice over background
   music that ducks under it; and encodes H.264 at CRF 20 (preset veryfast) with AAC audio.

Background music is a generated soft pad. To use your own royalty free track, drop it in
`assets/music.mp3`.

## Speed

On a machine without a GPU, frames render in software at roughly 1.5-2s each - a 90s video is
close to an hour per format, and `--workers` helps only modestly for the reason above. If you have
a real GPU (your own machine, or an hourly rental like RunPod/Vast.ai), Chromium can use hardware
WebGL instead of the forced SwiftShader path in `record.mjs`'s launch args, which should be a much
bigger win than CPU-side parallelism - that swap hasn't been tried/tuned yet, budget time for it.

## Working with Claude Code on this

If you're using Claude Code (or another AI assistant) to help with this pipeline: set
`git config user.name` / `user.email` to your own identity before it commits anything - commits
should land under your name, not "Claude", and without Co-Authored-By/Claude-Session attribution
lines, unless you want that. Work on `main` or a branch off it.
