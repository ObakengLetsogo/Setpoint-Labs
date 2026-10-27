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

const assTime = (t) => {
  const cs = Math.round(t * 100);
  return `${Math.floor(cs / 360000)}:${String(Math.floor(cs / 6000) % 60).padStart(2, "0")}:${String(Math.floor(cs / 100) % 60).padStart(2, "0")}.${String(cs % 100).padStart(2, "0")}`;
};

/** Styled for burning in: Inter on a navy box, lifted clear of the bottom edge. */
export function toAss(cues, { width, height }, format) {
  const portrait = format === "portrait";
  const size = portrait ? 58 : 46;
  const marginV = portrait ? 150 : 46;
  // ASS colours are &HAABBGGRR. Box is ink #1B2430 at about 10% transparency.
  const style = `Style: Cap,Inter SemiBold,${size},&H00FFFFFF,&H00FFFFFF,&H1A30241B,&H1A30241B,0,0,0,0,100,100,0.2,0,3,${portrait ? 20 : 16},0,2,80,80,${marginV},1`;
  const events = cues.map((c) => `Dialogue: 0,${assTime(c.start)},${assTime(c.end)},Cap,,0,0,0,,${c.lines.join("\\N")}`);
  return `[Script Info]
ScriptType: v4.00+
PlayResX: ${width}
PlayResY: ${height}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
${style}

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${events.join("\n")}
`;
}
