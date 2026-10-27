# Lesson video pipeline

Turns a lesson spec into a narrated, captioned video by driving the real 3D bench. Runs headless on the server or in a sandbox; nothing needs a desktop.

```bash
npm run video:setup                      # once: Piper + the offline voice in scripts/video/.venv and models/
npm run video -- foundations-2           # videos/foundations-2.mp4 + .srt, plus .portrait.mp4 + .srt
npm run video -- foundations-2 --format landscape
npm run video -- foundations-2 --preview 5,20,40   # stills only, to check framing first
npm run video -- foundations-2 --audio-only        # narration, timing and music only
```

Pass `--build` to rebuild the app first. Set `VIDEO_BASE_URL` to record against a server that is already running.

## Voice

The voice is one config value, `provider:name`, set per course in `config.json`:

| Value | Needs |
| --- | --- |
| `azure:en-ZA-LukeNeural` (default), `azure:en-ZA-LeahNeural` (fallback) | `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` |
| `elevenlabs:<voiceId>` | `ELEVENLABS_API_KEY`, stock library voices only |
| `piper:en_GB-alan-medium` (offline fallback) | `npm run video:setup` |

Order of precedence: `--voice`, `VIDEO_VOICE`, the lesson spec's `voice`, the course entry, then `voice.default`. An Azure voice falls back to the fallback voice, then to the offline voice. A video always uses one voice from start to finish. Stock voices only, never a clone of a real person.

## Lesson spec

`lessons/<lessonId>.json`:

```json
{
  "lessonId": "foundations-2",
  "course": "foundations",
  "scenes": [
    {
      "id": "tap-start",
      "narration": "Tap Start. The rung goes true and writes Run Seal.",
      "caption": "Optional on screen text, a string or an array of caption chunks",
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

A scene lasts its narration plus `pauseAfter` (default 0.6 s). `at` is seconds from the scene start, a percentage of the narration, or `"end"`. `call` is any `window.setpointLabs` method: `play`, `pause`, `press`, `tap`, `setInput`, `setFault`, `focus` (part, glow), `resetView`, `rotate`, `zoom`, `select`, `explode`, `highlightRung`, `showLabel`.

## How it works

1. Narration per scene through the voice provider, cached in `.video-cache/tts`.
2. Playwright opens `/record/<lessonId>?hideChrome=1&manual=1` at 1920x1080 and 1080x1920 with a fake clock. Each frame advances timers by 1/30 s, renders the scene exactly once and captures it, so runs are repeatable.
3. ffmpeg joins a 3 s intro card, the frames and a 3 s outro card; burns in captions; mixes the voice over background music that ducks under it; and encodes H.264 at CRF 20 (preset veryfast) with AAC audio.

Background music is a generated soft pad. To use your own royalty free track, drop it in `assets/music.mp3`.

On a machine without a GPU, frames render in software at about 1.5 s each, so a 90 s video takes about an hour per format.
