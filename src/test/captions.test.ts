import { describe, expect, it } from 'vitest';
import {
  CAPTION_STYLE_PRESETS,
  cueAt,
  mergeCues,
  parseCaptionFile,
  parseSrt,
  parseVtt,
  retimeWords,
  serializeSrt,
  serializeVtt,
  splitCue,
  transcriptToCues,
  wordAt,
} from '../lib/captions';

const SRT_SAMPLE = `1
00:00:01,000 --> 00:00:03,500
Hello world

2
00:00:04,000 --> 00:00:06,000
Second caption here
`;

const VTT_SAMPLE = `WEBVTT

00:00:01.000 --> 00:00:03.500
Hello world

00:00:04.000 --> 00:00:06.000
Second caption here
`;

describe('SRT parsing (Phase 3, I-SRT)', () => {
  it('parses cues with start/end/text and word timing', () => {
    const cues = parseSrt(SRT_SAMPLE);
    expect(cues).toHaveLength(2);
    expect(cues[0].start).toBe(1);
    expect(cues[0].end).toBe(3.5);
    expect(cues[0].text).toBe('Hello world');
    expect(cues[0].words).toHaveLength(2);
    expect(cues[0].words[0].start).toBe(1);
    expect(cues[0].words[1].end).toBeCloseTo(3.5, 9);
  });

  it('throws readable errors for bad input', () => {
    expect(() => parseSrt('not a caption file')).toThrow(/timecode/i);
    expect(() => parseSrt('1\n00:00:05,000 --> 00:00:02,000\nBackwards\n')).toThrow(/not after/i);
    expect(() => parseSrt('')).toThrow(/No caption blocks/i);
  });

  it('round-trips through serializeSrt', () => {
    const cues = parseSrt(SRT_SAMPLE);
    const again = parseSrt(serializeSrt(cues));
    expect(again.map((c) => [c.start, c.end, c.text])).toEqual(cues.map((c) => [c.start, c.end, c.text]));
  });
});

describe('VTT parsing (Phase 3, I-SRT)', () => {
  it('parses a WebVTT file', () => {
    const cues = parseVtt(VTT_SAMPLE);
    expect(cues).toHaveLength(2);
    expect(cues[1].text).toBe('Second caption here');
  });

  it('rejects files without a WEBVTT header', () => {
    expect(() => parseVtt('00:00:01.000 --> 00:00:02.000\nHi\n')).toThrow(/WEBVTT/i);
  });

  it('round-trips through serializeVtt', () => {
    const cues = parseVtt(VTT_SAMPLE);
    const again = parseVtt(serializeVtt(cues));
    expect(again.map((c) => [c.start, c.end, c.text])).toEqual(cues.map((c) => [c.start, c.end, c.text]));
  });

  it('parseCaptionFile routes by extension and parses .lrc', () => {
    expect(parseCaptionFile('subs.srt', SRT_SAMPLE)).toHaveLength(2);
    expect(parseCaptionFile('subs.vtt', VTT_SAMPLE)).toHaveLength(2);
    // Phase 9 (M-ASS): .ass parses now.
    expect(parseCaptionFile('subs.ass', '[Events]\nFormat: Layer, Start, End, Text\nDialogue: 0,0:00:01.00,0:00:02.00,Hi\n')).toHaveLength(1);
    // CapCut-fix (2026-11-25, K4): .lrc parses now (lyrics timestamps + text).
    expect(parseCaptionFile('subs.lrc', '[00:01.00] hi')).toHaveLength(1);
  });
});

describe('transcript word timing (Phase 3, I-CAPTION-AUTO)', () => {
  it('distributes words evenly across the duration', () => {
    const cues = transcriptToCues('one two three four', 0, 8, 8);
    expect(cues).toHaveLength(1);
    expect(cues[0].words).toHaveLength(4);
    expect(cues[0].words[0]).toEqual({ end: 2, start: 0, text: 'one' });
    expect(cues[0].words[3].end).toBeCloseTo(8, 9);
  });

  it('starts a new cue every wordsPerCue words', () => {
    const cues = transcriptToCues('a b c d e f g h i j', 0, 10, 4);
    expect(cues).toHaveLength(3);
    expect(cues[0].text).toBe('a b c d');
    expect(cues[2].text).toBe('i j');
  });

  it('breaks cues at sentence ends', () => {
    const cues = transcriptToCues('Hello there. How are you?', 0, 6, 8);
    expect(cues).toHaveLength(2);
    expect(cues[0].text).toBe('Hello there.');
  });

  it('returns no cues for an empty transcript or empty span', () => {
    expect(transcriptToCues('', 0, 5)).toEqual([]);
    expect(transcriptToCues('words here', 5, 5)).toEqual([]);
  });
});

describe('cue helpers (Phase 3, I-CAPTION-MANUAL)', () => {
  it('retimeWords splits a cue into evenly timed words', () => {
    const words = retimeWords('alpha beta gamma', 10, 13);
    expect(words).toHaveLength(3);
    expect(words[1]).toEqual({ end: 12, start: 11, text: 'beta' });
    expect(retimeWords('', 0, 1)).toEqual([]);
  });

  it('splitCue divides a cue at a time and re-times both halves', () => {
    const [cues] = [parseSrt(SRT_SAMPLE)];
    const halves = splitCue(cues[0], 2);
    expect(halves).not.toBeNull();
    expect(halves![0].end).toBe(2);
    expect(halves![1].start).toBe(2);
    expect(halves![0].text).toBe('Hello');
    expect(halves![1].text).toBe('world');
    expect(splitCue(cues[0], 0.5)).toBeNull(); // outside the cue
    expect(splitCue(cues[0], 3.5)).toBeNull();
  });

  it('mergeCues joins two cues and re-times the words', () => {
    const cues = parseSrt(SRT_SAMPLE);
    const merged = mergeCues(cues[0], cues[1]);
    expect(merged.text).toBe('Hello world Second caption here');
    expect(merged.start).toBe(1);
    expect(merged.end).toBe(6);
    expect(merged.words).toHaveLength(5);
  });

  it('cueAt and wordAt find the active cue/word', () => {
    const cues = parseSrt(SRT_SAMPLE);
    expect(cueAt(cues, 2)?.text).toBe('Hello world');
    expect(cueAt(cues, 3.7)).toBeNull();
    expect(wordAt(cues[0], 2.5)?.word.text).toBe('world');
    expect(wordAt(cues[0], 0.5)).toBeNull();
  });
});

describe('caption style presets (Phase 3, I-CAPTION-STYLE)', () => {
  it('ships at least 8 original styles with top/center/bottom positions', () => {
    expect(CAPTION_STYLE_PRESETS.length).toBeGreaterThanOrEqual(8);
    const positions = new Set(CAPTION_STYLE_PRESETS.map((s) => s.position));
    expect(positions.has('top')).toBe(true);
    expect(positions.has('center')).toBe(true);
    expect(positions.has('bottom')).toBe(true);
  });
});
