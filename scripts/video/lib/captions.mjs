/** Caption chunks from narration, timed by character share of each scene's speech. */

const MAX_CHARS = { landscape: 84, portrait: 52 };
const LINE_CHARS = { landscape: 46, portrait: 28 };

function sentences(text) {
  return text.match(/[^.!?]+[.!?]+["')]*\s*|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];
}

/** Split a sentence into balanced chunks no longer than max, preferring breaks after commas. */
function chunk(sentence, max) {
  if (sentence.length <= max) return [sentence];
  const n = Math.ceil(sentence.length / max);
  const target = sentence.length / n;
  const words = sentence.split(/\s+/);
  const out = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > max && cur) {
      out.push(cur);
      cur = w;
      continue;
    }
    cur = next;
    const remaining = n - out.length;
    if (remaining > 1 && (cur.length >= target || (/[,;:]$/.test(w) && cur.length > target * 0.6))) {
      out.push(cur);
      cur = "";
    }
  }
  if (cur) out.push(cur);
  return out;
}

function wrap(text, width) {
  if (text.length <= width) return [text];
  const words = text.split(" ");
  let best = [text];
  let bestScore = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ");
    const b = words.slice(i).join(" ");
    const score = Math.max(a.length, b.length) + (a.length > width || b.length > width ? 100 : 0);
    if (score < bestScore) {
      bestScore = score;
      best = [a, b];
    }
  }
  return best;
}

/**
 * scenes: [{ start, speech, narration, caption? }] with start and speech in seconds.
 * caption may be a string or an array of strings that replaces the narration text on screen.
 */
export function buildCues(scenes, format) {
  const cues = [];
  for (const s of scenes) {
    const override = s.caption;
    const parts = Array.isArray(override)
      ? override
      : sentences(override ?? s.narration).flatMap((x) => chunk(x, MAX_CHARS[format]));
    const total = parts.reduce((n, p) => n + p.length, 0);
    let t = s.start;
    for (const p of parts) {
      const d = (p.length / total) * s.speech;
      cues.push({ start: t, end: t + d, lines: wrap(p, LINE_CHARS[format]) });
      t += d;
    }
  }
  return cues;
}

const srtTime = (t) => {
  const ms = Math.round(t * 1000);
  const h = String(Math.floor(ms / 3600000)).padStart(2, "0");
  const m = String(Math.floor(ms / 60000) % 60).padStart(2, "0");
  const s = String(Math.floor(ms / 1000) % 60).padStart(2, "0");
  return `${h}:${m}:${s},${String(ms % 1000).padStart(3, "0")}`;
};

export function toSrt(cues) {
  return cues.map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.lines.join("\n")}\n`).join("\n");
}

const vttTime = (t) => {
  const ms = Math.round(t * 1000);
  const h = String(Math.floor(ms / 3600000)).padStart(2, "0");
  const m = String(Math.floor(ms / 60000) % 60).padStart(2, "0");
  const s = String(Math.floor(ms / 1000) % 60).padStart(2, "0");
  return `${h}:${m}:${s}.${String(ms % 1000).padStart(3, "0")}`;
};

/** WebVTT for the player's native <track> element, so captions are a viewer toggle, never burned into the pixels. */
export function toVtt(cues) {
  return `WEBVTT\n\n${cues.map((c) => `${vttTime(c.start)} --> ${vttTime(c.end)}\n${c.lines.join("\n")}\n`).join("\n")}`;
}

