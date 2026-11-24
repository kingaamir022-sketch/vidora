/**
 * AI narration voices (Phase 6, Section O — O-AI-VOICES).
 * 16 voice presets: 4 languages (English, Urdu, Hindi, Arabic) x 4 roles
 * (Narrator, Warm, Energetic, Calm). Each preset has pitch/rate and an
 * original sample sentence in its language.
 *
 * Honest limit (same as Phase 3 TTS): speaking uses the browser's
 * speechSynthesis voices — quality depends on the voices installed on
 * this device. No voice is a recording of a real person; no artist or
 * celebrity voices. Rendered TTS audio in export needs an offline TTS
 * engine (Phase 7).
 */
import { pickVoice, type TtsVoiceInfo } from './tts';

export type AiVoiceLanguage = 'Arabic' | 'English' | 'Hindi' | 'Urdu';
export type AiVoiceRole = 'Calm' | 'Energetic' | 'Narrator' | 'Warm';

export interface AiVoicePreset {
  id: string;
  lang: AiVoiceLanguage;
  langTag: string;
  name: string;
  pitch: number;
  rate: number;
  role: AiVoiceRole;
  sample: string;
}

const SAMPLES: Record<AiVoiceLanguage, Record<AiVoiceRole, string>> = {
  English: {
    Narrator: 'Welcome back to the story. Today we walk through the old city at dawn.',
    Warm: 'Good morning! I hope your day starts with a smile and a cup of tea.',
    Energetic: 'Let us go! A brand new adventure is waiting, and we start right now!',
    Calm: 'Take a slow breath. The evening is quiet, and everything can wait.',
  },
  Urdu: {
    Narrator: 'Aaj ki kahani ek chhote se gaon se shuru hoti hai, jahan subah jaldi hoti hai.',
    Warm: 'Assalam o alaikum! Aap ka din acha guzre, yehi dua hai.',
    Energetic: 'Chalo, aaj kuch naya karte hain! Waqt zaya kiye baghair shuru karte hain!',
    Calm: 'Aaram se saans lein. Shaam khamosh hai, aur sab kuch intezar kar sakta hai.',
  },
  Hindi: {
    Narrator: 'Aaj ki kahani ek chhote gaon se shuru hoti hai, jahan subah jaldi hoti hai.',
    Warm: 'Namaste! Aapka din achha beete, yahi dua hai.',
    Energetic: 'Chalo, aaj kuch naya karte hain! Bina waqt ganwaye shuru karte hain!',
    Calm: 'Aaram se saans lein. Shaam shaant hai, aur sab kuch intezaar kar sakta hai.',
  },
  Arabic: {
    Narrator: 'تبدأ قصة اليوم من قرية صغيرة، حيث يأتي الصباح مبكرا.',
    Warm: 'صباح الخير! أتمنى لك يوما سعيدا.',
    Energetic: 'هيا بنا! مغامرة جديدة بانتظارنا، لنبدأ الآن!',
    Calm: 'خذ نفسا عميقا. المساء هادئ، وكل شيء يمكنه الانتظار.',
  },
};

const LANG_TAGS: Record<AiVoiceLanguage, string> = {
  Arabic: 'ar',
  English: 'en',
  Hindi: 'hi',
  Urdu: 'ur',
};

const ROLES: AiVoiceRole[] = ['Narrator', 'Warm', 'Energetic', 'Calm'];
const ROLE_TUNING: Record<AiVoiceRole, { pitch: number; rate: number }> = {
  Narrator: { pitch: 1, rate: 0.95 },
  Warm: { pitch: 1.1, rate: 0.95 },
  Energetic: { pitch: 1.15, rate: 1.15 },
  Calm: { pitch: 0.9, rate: 0.85 },
};

const LANGS: AiVoiceLanguage[] = ['English', 'Urdu', 'Hindi', 'Arabic'];

export const AI_VOICES: AiVoicePreset[] = LANGS.flatMap((lang) =>
  ROLES.map((role) => ({
    id: `voice-${lang.toLowerCase()}-${role.toLowerCase()}`,
    lang,
    langTag: LANG_TAGS[lang],
    name: `${lang} ${role}`,
    pitch: ROLE_TUNING[role].pitch,
    rate: ROLE_TUNING[role].rate,
    role,
    sample: SAMPLES[lang][role],
  })),
);

export const AI_VOICE_LANGUAGES: AiVoiceLanguage[] = LANGS;

/** Resolve a preset to a real browser voice name (language first, then
 * name, then first voice at all — pickVoice in lib/tts.ts). Returns ''
 * when the device has no voices at all. */
export function resolveAiVoice(voices: TtsVoiceInfo[], preset: AiVoicePreset): string {
  return pickVoice(voices, '', preset.langTag);
}

/** Speak a preset's sample sentence once (preview). Returns false when
 * speechSynthesis is unavailable. */
export function previewAiVoice(preset: AiVoicePreset, voiceName: string): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(preset.sample);
  utter.lang = preset.langTag;
  utter.pitch = preset.pitch;
  utter.rate = preset.rate;
  if (voiceName) {
    const voice = window.speechSynthesis.getVoices().find((v) => v.name === voiceName);
    if (voice) utter.voice = voice;
  }
  window.speechSynthesis.speak(utter);
  return true;
}
