import { describe, expect, it } from 'vitest';
import { clampTtsRatePitch, narrationClipAt, pickVoice, shouldSpeak, voiceInfos } from '../lib/tts';
import type { Clip } from '../schema/project';
import { defaultTextStyle, SAMPLE_PROJECT } from '../schema/project';

function ttsClip(start: number, duration: number, content = 'Hello narration'): Clip {
  const base = SAMPLE_PROJECT.tracks[0].clips[0];
  return {
    ...base,
    duration,
    id: `clip-tts-${start}`,
    name: 'Narration',
    start,
    text: { content, style: defaultTextStyle(content), tts: { pitch: 1, rate: 1, voice: '' } },
    type: 'text',
  };
}

describe('TTS voice helpers (Phase 3, I-TTS)', () => {
  it('voiceInfos normalises browser voices to plain data', () => {
    const infos = voiceInfos([
      { lang: 'en-US', localService: true, name: 'Alex' },
      { lang: 'ur-PK', localService: false, name: 'Google Urdu' },
    ]);
    expect(infos).toEqual([
      { lang: 'en-US', local: true, name: 'Alex' },
      { lang: 'ur-PK', local: false, name: 'Google Urdu' },
    ]);
  });

  it('pickVoice prefers an exact name, then the language, then the first voice', () => {
    const voices = voiceInfos([
      { lang: 'en-US', localService: true, name: 'Alex' },
      { lang: 'ur-PK', localService: false, name: 'Google Urdu' },
    ]);
    expect(pickVoice(voices, 'Google Urdu')).toBe('Google Urdu');
    expect(pickVoice(voices, 'missing', 'ur')).toBe('Google Urdu');
    expect(pickVoice(voices, 'missing', 'fr')).toBe('Alex');
    expect(pickVoice([], 'anything')).toBe('');
  });

  it('clampTtsRatePitch keeps rate/pitch in 0.5–2', () => {
    expect(clampTtsRatePitch(0.1)).toBe(0.5);
    expect(clampTtsRatePitch(3)).toBe(2);
    expect(clampTtsRatePitch(1.4)).toBe(1.4);
  });
});

describe('narration scheduling (Phase 3, I-TTS)', () => {
  it('narrationClipAt finds the TTS clip under the playhead', () => {
    const clips = [ttsClip(2, 3)];
    expect(narrationClipAt(clips, 3)?.name).toBe('Narration');
    expect(narrationClipAt(clips, 1)).toBeNull();
    expect(narrationClipAt(clips, 5)).toBeNull(); // end is exclusive
  });

  it('ignores text clips without TTS', () => {
    const plain = { ...ttsClip(0, 5), text: { content: 'plain', style: defaultTextStyle('plain'), tts: null } };
    expect(narrationClipAt([plain], 2)).toBeNull();
  });

  it('shouldSpeak is true only when the playhead just entered the clip', () => {
    const clip = ttsClip(2, 3);
    expect(shouldSpeak(clip, 1.9, 2.1)).toBe(true);
    expect(shouldSpeak(clip, 2.1, 2.5)).toBe(false); // already inside
    expect(shouldSpeak(clip, 5.5, 6)).toBe(false); // after the clip
    expect(shouldSpeak(clip, 0, 1)).toBe(false); // before the clip
  });
});
