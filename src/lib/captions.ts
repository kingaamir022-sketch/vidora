import { newId, type CaptionCue, type CaptionWord } from '../schema/project';

/**
 * Captions (Phase 3, SPEC I). Pure functions — no DOM.
 * SRT/VTT parse + serialize with readable errors; transcript-to-cues
 * word timing; cue split/merge helpers.
 */

export const CAPTION_LANGUAGES: { code: string; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ur', label: 'Urdu' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ar', label: 'Arabic' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'tr', label: 'Turkish' },
  { code: 'bn', label: 'Bengali' },
];

function parseTimecode(raw: string): number | null {
  const m = raw.trim().match(/^(?:(\d+):)?(\d{1,2}):(\d{1,2})[.,](\d{1,3})$/);
  if (!m) return null;
  const hours = m[1] ? Number(m[1]) : 0;
  const minutes = Number(m[2]);
  const seconds = Number(m[3]);
  const millis = Number(m[4].padEnd(3, '0'));
  if (minutes > 59 || seconds > 59) return null;
  return hours * 3600 + minutes * 60 + seconds + millis / 1000;
}

function formatTimecode(t: number, dot: '.' | ',' = ','): string {
  const totalMs = Math.max(0, Math.round(t * 1000));
  const ms = totalMs % 1000;
  const s = Math.floor(totalMs / 1000) % 60;
  const m = Math.floor(totalMs / 60000) % 60;
  const h = Math.floor(totalMs / 3600000);
  const pad = (n: number, len = 2) => n.toString().padStart(len, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}${dot}${pad(ms, 3)}`;
}

/** Split cue text into words with even timing across [start, end). */
export function retimeWords(text: string, start: number, end: number): CaptionWord[] {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return [];
  const span = Math.max(0, end - start);
  const per = span / words.length;
  return words.map((w, i) => ({ end: start + per * (i + 1), start: start + per * i, text: w }));
}

function makeCue(start: number, end: number, text: string): CaptionCue {
  return { end, id: newId('cue'), start, text: text.trim(), translations: {}, words: retimeWords(text.trim(), start, end) };
}

/** Parse an .srt file. Throws with a readable message on bad input. */
export function parseSrt(text: string): CaptionCue[] {
  const blocks = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  if (blocks.length === 0) throw new Error('No caption blocks found — is this an .srt file?');
  const cues: CaptionCue[] = [];
  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) continue;
    let idx = 0;
    if (/^\d+$/.test(lines[0])) idx = 1; // optional numeric index
    const timeLine = lines[idx];
    if (!timeLine) throw new Error(`Caption block is missing a timecode line: "${lines[0]?.slice(0, 40) ?? ''}".`);
    const parts = timeLine.split(/\s*-->\s*/);
    if (parts.length !== 2) throw new Error(`Bad timecode line (expected "HH:MM:SS,mmm --> HH:MM:SS,mmm"): "${timeLine}".`);
    const start = parseTimecode(parts[0]);
    const end = parseTimecode(parts[1]);
    if (start === null || end === null) throw new Error(`Could not read timecode: "${timeLine}".`);
    if (end <= start) throw new Error(`Caption end (${end}s) is not after its start (${start}s): "${timeLine}".`);
    const cueText = lines.slice(idx + 1).join('\n');
    if (!cueText) throw new Error(`Caption at ${formatTimecode(start)} has no text.`);
    cues.push(makeCue(start, end, cueText));
  }
  if (cues.length === 0) throw new Error('No valid caption cues found in this file.');
  return cues.sort((a, b) => a.start - b.start);
}

/** Parse a .vtt (WebVTT) file. Throws with a readable message on bad input. */
export function parseVtt(text: string): CaptionCue[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  if (!lines[0].trim().startsWith('WEBVTT')) throw new Error('Not a WebVTT file — the first line must start with "WEBVTT".');
  const blocks = normalized.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const cues: CaptionCue[] = [];
  for (const block of blocks) {
    const blockLines = block.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    if (blockLines.length === 0 || blockLines[0].startsWith('WEBVTT') || blockLines[0].startsWith('NOTE')) continue;
    const timeIdx = blockLines.findIndex((l) => l.includes('-->'));
    if (timeIdx < 0) continue; // style/region blocks are skipped, not errors
    const parts = blockLines[timeIdx].split(/\s*-->\s*/);
    const start = parseTimecode(parts[0].split(/\s+/)[0]);
    const end = parseTimecode(parts[1].split(/\s+/)[0]);
    if (start === null || end === null) throw new Error(`Could not read timecode: "${blockLines[timeIdx]}".`);
    if (end <= start) throw new Error(`Caption end is not after its start: "${blockLines[timeIdx]}".`);
    const cueText = blockLines.slice(timeIdx + 1).join('\n').replace(/<[^>]+>/g, '');
    if (!cueText.trim()) continue;
    cues.push(makeCue(start, end, cueText));
  }
  if (cues.length === 0) throw new Error('No valid caption cues found in this file.');
  return cues.sort((a, b) => a.start - b.start);
}

/**
 * Parse an .ass (Advanced SubStation Alpha) file. Reads the [Events]
 * Format line for the column order (never assumed), takes Dialogue
 * lines only (Comment lines are ignored), strips {\...} override
 * tags, turns \N into a line break and \h into a space. Styles are
 * NOT imported — cues use the current caption style (the panel says
 * so). Throws with a readable message on bad input.
 */
export function parseAss(text: string): CaptionCue[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n').map((l) => l.trim());
  let inEvents = false;
  let format: string[] | null = null;
  const cues: CaptionCue[] = [];
  // .ass times are H:MM:SS.cc (centiseconds).
  const parseAssTime = (raw: string): number | null => {
    const m = raw.trim().match(/^(\d+):(\d{1,2}):(\d{1,2})\.(\d{1,2})$/);
    if (!m) return null;
    return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4]) / 100;
  };
  for (const line of lines) {
    if (line.startsWith('[')) {
      inEvents = line.toLowerCase() === '[events]';
      continue;
    }
    if (!inEvents || !line) continue;
    if (line.toLowerCase().startsWith('format:')) {
      format = line.slice('format:'.length).split(',').map((c) => c.trim().toLowerCase());
      continue;
    }
    if (!line.toLowerCase().startsWith('dialogue:')) continue;
    if (!format) throw new Error('This .ass file has Dialogue lines but no Format line in [Events].');
    const startIdx = format.indexOf('start');
    const endIdx = format.indexOf('end');
    const textIdx = format.indexOf('text');
    if (startIdx < 0 || endIdx < 0 || textIdx < 0) {
      throw new Error('This .ass Format line has no Start, End or Text column.');
    }
    const body = line.slice('dialogue:'.length);
    const parts = body.split(',');
    if (parts.length <= textIdx) continue; // malformed line — skipped, not fatal
    const start = parseAssTime(parts[startIdx]);
    const end = parseAssTime(parts[endIdx]);
    if (start === null || end === null || end <= start) continue; // bad time — skipped
    // Text is usually the last column (then it may contain commas);
    // if a later column follows it, take only the text column.
    const rawText =
      textIdx === format.length - 1 ? parts.slice(textIdx).join(',') : (parts[textIdx] ?? '');
    const cueText = rawText
      .replace(/\{[^}]*\}/g, '')
      .replace(/\\N/g, '\n')
      .replace(/\\n/g, '\n')
      .replace(/\\h/g, ' ')
      .trim();
    if (!cueText) continue; // empty dialogue — skipped
    cues.push(makeCue(start, end, cueText));
  }
  if (cues.length === 0) throw new Error('No dialogue lines found in this .ass file.');
  return cues.sort((a, b) => a.start - b.start);
}


/**
 * Parse an .lrc (lyrics) file (CapCut-fix 2026-11-25, K4). Lines are
 * `[mm:ss.xx] text`; `[ti:]`/`[ar:]`/… metadata tags are skipped. A
 * cue ends where the next line starts (last cue: +3 s). Same parser
 * family as .srt — timestamps + text, word timing retimed evenly.
 */
export function parseLrc(text: string): CaptionCue[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const timed: { start: number; text: string }[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (/^\[(ti|ar|al|by|offset|length|#):/i.test(line)) continue; // metadata tags
    const m = line.match(/^\[(\d{1,2}):(\d{1,2}(?:\.\d{1,3})?)\]\s*(.*)$/);
    if (!m) continue; // non-timed lines are skipped, not errors
    const start = Number(m[1]) * 60 + Number(m[2]);
    const cueText = (m[3] ?? '').trim();
    if (!cueText) continue;
    timed.push({ start, text: cueText });
  }
  if (timed.length === 0) throw new Error('No timed lines found — is this an .lrc file? Lines look like "[00:12.34] your lyrics".');
  timed.sort((a, b) => a.start - b.start);
  return timed.map((t, i) => makeCue(t.start, i + 1 < timed.length ? timed[i + 1].start : t.start + 3, t.text));
}

/** Parse a caption file by extension. Returns cues or throws. */
export function parseCaptionFile(name: string, text: string): CaptionCue[] {
  const lower = name.toLowerCase();
  if (lower.endsWith('.srt')) return parseSrt(text);
  if (lower.endsWith('.vtt')) return parseVtt(text);
  if (lower.endsWith('.ass')) return parseAss(text);
  if (lower.endsWith('.lrc')) return parseLrc(text);
  throw new Error('Unsupported caption file — use .srt, .vtt, .ass or .lrc.');
}

/** Serialize cues to .srt text. */
export function serializeSrt(cues: CaptionCue[]): string {
  return cues
    .slice()
    .sort((a, b) => a.start - b.start)
    .map((c, i) => `${i + 1}\n${formatTimecode(c.start)} --> ${formatTimecode(c.end)}\n${c.text}`)
    .join('\n\n') + (cues.length > 0 ? '\n' : '');
}

/** Serialize cues to .vtt (WebVTT) text. */
export function serializeVtt(cues: CaptionCue[]): string {
  const body = cues
    .slice()
    .sort((a, b) => a.start - b.start)
    .map((c) => `${formatTimecode(c.start, '.')} --> ${formatTimecode(c.end, '.')}\n${c.text}`)
    .join('\n\n');
  return `WEBVTT\n\n${body}${cues.length > 0 ? '\n' : ''}`;
}

/**
 * Distribute a pasted/typed transcript across [start, end) as cues.
 * Words are timed evenly; a new cue starts every `wordsPerCue` words
 * (or at sentence ends). This is the honest Phase 3 auto-caption
 * engine: it times a transcript you paste — real speech-to-text
 * (Whisper) is Phase 7.
 */
export function transcriptToCues(transcript: string, start: number, end: number, wordsPerCue = 8): CaptionCue[] {
  const words = transcript.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0 || end <= start) return [];
  const span = end - start;
  const perWord = span / words.length;
  const cues: CaptionCue[] = [];
  let chunk: string[] = [];
  let chunkStart = start;
  const flush = (chunkEnd: number) => {
    if (chunk.length === 0) return;
    const text = chunk.join(' ');
    cues.push({ end: chunkEnd, id: newId('cue'), start: chunkStart, text, translations: {}, words: retimeWords(text, chunkStart, chunkEnd) });
    chunk = [];
  };
  words.forEach((word, i) => {
    if (chunk.length === 0) chunkStart = start + perWord * i;
    chunk.push(word);
    const sentenceEnd = /[.!?…]$/.test(word);
    if (chunk.length >= wordsPerCue || sentenceEnd || i === words.length - 1) {
      flush(start + perWord * (i + 1));
    }
  });
  return cues;
}

/** Split one cue at an absolute time; returns the two halves or null.
 * A word straddling the split goes to the side holding its midpoint. */
export function splitCue(cue: CaptionCue, at: number): [CaptionCue, CaptionCue] | null {
  if (at <= cue.start + 0.01 || at >= cue.end - 0.01) return null;
  const mid = (w: CaptionWord) => (w.start + w.end) / 2;
  const leftText = cue.words.filter((w) => mid(w) < at).map((w) => w.text).join(' ');
  const rightText = cue.words.filter((w) => mid(w) >= at).map((w) => w.text).join(' ');
  const left: CaptionCue = {
    ...cue,
    end: at,
    id: newId('cue'),
    text: leftText || cue.text,
    words: retimeWords(leftText || cue.text, cue.start, at),
  };
  const right: CaptionCue = {
    ...cue,
    id: newId('cue'),
    start: at,
    text: rightText || cue.text,
    words: retimeWords(rightText || cue.text, at, cue.end),
  };
  return [left, right];
}

/** Merge two adjacent cues into one (keeps the earlier id). */
export function mergeCues(a: CaptionCue, b: CaptionCue): CaptionCue {
  const [first, second] = a.start <= b.start ? [a, b] : [b, a];
  const text = `${first.text} ${second.text}`.trim();
  return { ...first, end: Math.max(first.end, second.end), text, words: retimeWords(text, first.start, Math.max(first.end, second.end)) };
}

/** The cue active at `time`, or null. */
export function cueAt(cues: CaptionCue[], time: number): CaptionCue | null {
  return cues.find((c) => time >= c.start && time < c.end) ?? null;
}

/** The word active at `time` inside a cue, or null. */
export function wordAt(cue: CaptionCue, time: number): { index: number; word: CaptionWord } | null {
  const index = cue.words.findIndex((w) => time >= w.start && time < w.end);
  return index >= 0 ? { index, word: cue.words[index] } : null;
}

/** Caption style presets (Phase 3, I-CAPTION-STYLE; Phase 5 adds 12, 20 total) — all original.
 * `highlight` / `highlightBackground` colour the active word (Phase 5,
 * N-CAPTIONPRESETS); when absent the overlay falls back to the Phase 3
 * defaults (white text on a violet box). */
export interface CaptionStylePreset {
  background: string;
  /** Template group in the Captions tab (CapCut-fix K5): Trending, Classic, NEW, Hits, Word. */
  category: 'Trending' | 'Classic' | 'NEW' | 'Hits' | 'Word';
  color: string;
  description: string;
  fontSize: number;
  /** Active-word text colour (defaults to white). */
  highlight?: string;
  /** Active-word background (defaults to #7C3AED). */
  highlightBackground?: string;
  id: string;
  name: string;
  position: 'top' | 'center' | 'bottom';
}

export const CAPTION_STYLE_PRESETS: CaptionStylePreset[] = [
  { background: 'rgba(0,0,0,0.65)', color: '#FFFFFF', description: 'Classic white on a dark box, bottom.', fontSize: 28, highlight: '#FFFFFF', highlightBackground: '#7C3AED', id: 'classic-box', category: 'Trending', name: 'Classic Box', position: 'bottom' },
  { background: 'transparent', color: '#FFFFFF', description: 'Plain white text with a shadow, bottom.', fontSize: 28, highlight: '#FFFFFF', highlightBackground: '#7C3AED', id: 'plain-white', category: 'Trending', name: 'Plain White', position: 'bottom' },
  { background: 'rgba(124,58,237,0.85)', color: '#FFFFFF', description: 'Violet box, bold and bright.', fontSize: 30, highlight: '#FFFFFF', highlightBackground: '#06B6D4', id: 'violet-pop', category: 'Trending', name: 'Violet Pop', position: 'bottom' },
  { background: 'rgba(0,0,0,0.8)', color: '#FDE68A', description: 'Warm yellow on black, bottom.', fontSize: 26, highlight: '#18181B', highlightBackground: '#FDE68A', id: 'gold-on-black', category: 'Classic', name: 'Gold on Black', position: 'bottom' },
  { background: 'rgba(6,182,212,0.85)', color: '#082F49', description: 'Cyan box with dark text, top.', fontSize: 28, highlight: '#FFFFFF', highlightBackground: '#0891B2', id: 'cyan-top', category: 'Hits', name: 'Cyan Top', position: 'top' },
  { background: 'transparent', color: '#FDE68A', description: 'Big yellow karaoke-style text, centre.', fontSize: 44, highlight: '#18181B', highlightBackground: '#FDE68A', id: 'big-centre', category: 'Hits', name: 'Big Centre', position: 'center' },
  { background: 'rgba(255,255,255,0.92)', color: '#18181B', description: 'White box, dark text, bottom.', fontSize: 26, highlight: '#FFFFFF', highlightBackground: '#18181B', id: 'paper', category: 'Classic', name: 'Paper', position: 'bottom' },
  { background: 'rgba(0,0,0,0.6)', color: '#4ADE80', description: 'Green mono-style caption, bottom.', fontSize: 24, highlight: '#052E16', highlightBackground: '#4ADE80', id: 'terminal-green', category: 'Hits', name: 'Terminal Green', position: 'bottom' },
  // ---- Phase 5 (Section N): 12 more original presets, 20 total. ----
  { background: 'rgba(0,0,0,0.7)', color: '#FCA5A5', description: 'Soft red on black, bottom.', fontSize: 26, highlight: '#FFFFFF', highlightBackground: '#DC2626', id: 'soft-red', category: 'NEW', name: 'Soft Red', position: 'bottom' },
  { background: 'rgba(255,255,255,0.9)', color: '#7C3AED', description: 'Violet text on white, bottom.', fontSize: 28, highlight: '#FFFFFF', highlightBackground: '#7C3AED', id: 'violet-paper', category: 'NEW', name: 'Violet Paper', position: 'bottom' },
  { background: 'transparent', color: '#67E8F9', description: 'Bright cyan, no box, bottom.', fontSize: 30, highlight: '#082F49', highlightBackground: '#67E8F9', id: 'cyan-glow', category: 'Trending', name: 'Cyan Glow', position: 'bottom' },
  { background: 'rgba(24,24,27,0.85)', color: '#F4F4F5', description: 'Neutral zinc box, bottom.', fontSize: 26, highlight: '#FFFFFF', highlightBackground: '#3F3F46', id: 'zinc-box', category: 'Classic', name: 'Zinc Box', position: 'bottom' },
  { background: 'rgba(0,0,0,0.65)', color: '#FFFFFF', description: 'Large centred caption for lyrics.', fontSize: 40, highlight: '#FFFFFF', highlightBackground: '#EC4899', id: 'lyric-centre', category: 'Hits', name: 'Lyric Centre', position: 'center' },
  { background: 'transparent', color: '#FFFFFF', description: 'Top banner caption.', fontSize: 28, highlight: '#18181B', highlightBackground: '#FFFFFF', id: 'top-banner', category: 'NEW', name: 'Top Banner', position: 'top' },
  { background: 'rgba(120,53,15,0.85)', color: '#FEF3C7', description: 'Warm amber box, bottom.', fontSize: 26, highlight: '#451A03', highlightBackground: '#FBBF24', id: 'amber-box', category: 'Classic', name: 'Amber Box', position: 'bottom' },
  { background: 'rgba(0,0,0,0.6)', color: '#C4B5FD', description: 'Soft violet text, bottom.', fontSize: 28, highlight: '#FFFFFF', highlightBackground: '#8B5CF6', id: 'lavender-soft', category: 'NEW', name: 'Lavender Soft', position: 'bottom' },
  { background: 'rgba(6,78,59,0.85)', color: '#A7F3D0', description: 'Deep green box, bottom.', fontSize: 26, highlight: '#022C22', highlightBackground: '#34D399', id: 'forest-box', category: 'NEW', name: 'Forest Box', position: 'bottom' },
  { background: 'transparent', color: '#FDE68A', description: 'Big gold text, centre, no box.', fontSize: 48, highlight: '#18181B', highlightBackground: '#FDE68A', id: 'gold-centre', category: 'Hits', name: 'Gold Centre', position: 'center' },
  { background: 'rgba(255,255,255,0.95)', color: '#0F172A', description: 'Clean news-ticker box, bottom.', fontSize: 24, highlight: '#FFFFFF', highlightBackground: '#0F172A', id: 'news-ticker', category: 'Classic', name: 'News Ticker', position: 'bottom' },
  { background: 'rgba(0,0,0,0.75)', color: '#F9A8D4', description: 'Pink on black, bottom.', fontSize: 28, highlight: '#FFFFFF', highlightBackground: '#EC4899', id: 'pink-pop', category: 'Trending', name: 'Pink Pop', position: 'bottom' },
  // ---- CapCut-fix (2026-11-25, K5): word-by-word highlight styles. ----
  { background: 'rgba(0,0,0,0.65)', color: '#FFFFFF', description: 'Word-by-word pop: each word lights up in teal as it is spoken.', fontSize: 32, highlight: '#062A2A', highlightBackground: '#00D9D9', id: 'word-pop', category: 'Word', name: 'Word Pop', position: 'bottom' },
  { background: 'transparent', color: '#FFFFFF', description: 'Karaoke words: big centred text, active word in yellow.', fontSize: 44, highlight: '#18181B', highlightBackground: '#FDE68A', id: 'word-karaoke', category: 'Word', name: 'Word Karaoke', position: 'center' },
  { background: 'rgba(0,0,0,0.8)', color: '#FCA5A5', description: 'Word bounce: active word jumps out in pink on black.', fontSize: 30, highlight: '#FFFFFF', highlightBackground: '#EC4899', id: 'word-bounce', category: 'Word', name: 'Word Bounce', position: 'bottom' },
];

export function captionStyleById(id: string | undefined): CaptionStylePreset {
  return CAPTION_STYLE_PRESETS.find((s) => s.id === id) ?? CAPTION_STYLE_PRESETS[0];
}
