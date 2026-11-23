import type { Clip } from '../schema/project';

/**
 * Text-to-speech helpers (Phase 3, SPEC I — I-TTS). The browser parts
 * (speechSynthesis) live in the component; everything here is pure and
 * testable without a browser.
 *
 * Honest limits: this speaks via the browser's speechSynthesis voices
 * during preview. Rendered TTS audio in export needs an offline TTS
 * engine (Phase 4/7) and is NOT claimed here.
 */

export interface TtsVoiceInfo {
  lang: string;
  local: boolean;
  name: string;
}

/** Normalise a SpeechSynthesisVoice list into plain data. */
export function voiceInfos(voices: { lang: string; localService: boolean; name: string }[]): TtsVoiceInfo[] {
  return voices.map((v) => ({ lang: v.lang, local: v.localService, name: v.name }));
}

/** Pick a voice by name, falling back to the first voice for the
 * language, then the first voice at all. Returns '' when none exist. */
export function pickVoice(voices: TtsVoiceInfo[], wantedName: string, lang = 'en'): string {
  if (voices.length === 0) return '';
  const exact = voices.find((v) => v.name === wantedName);
  if (exact) return exact.name;
  const byLang = voices.find((v) => v.lang.toLowerCase().startsWith(lang.toLowerCase()));
  if (byLang) return byLang.name;
  return voices[0].name;
}

/** The TTS narration clip active at the playhead (text clip with tts set). */
export function narrationClipAt(clips: Clip[], playhead: number): Clip | null {
  return clips.find((c) => c.type === 'text' && c.text?.tts && playhead >= c.start && playhead < c.start + c.duration) ?? null;
}

/**
 * Should the narration for `clip` start speaking now? True only when
 * the playhead just entered the clip (previous playhead was before the
 * clip start, current is inside it) — so it speaks once per entry,
 * not every frame.
 */
export function shouldSpeak(clip: Clip, prevPlayhead: number, playhead: number): boolean {
  if (!clip.text?.tts) return false;
  return prevPlayhead < clip.start && playhead >= clip.start && playhead < clip.start + clip.duration;
}

/** Clamp rate/pitch into the speechSynthesis range 0.5–2. */
export function clampTtsRatePitch(v: number): number {
  return Math.min(2, Math.max(0.5, v));
}
