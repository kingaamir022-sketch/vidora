import { describe, expect, it } from 'vitest';
import { SAMPLE_PROJECT } from '../schema/project';
import { addClipToStickerTrack, addClipToTextTrack } from '../lib/timeline';
import { decodePanelDrag, encodePanelDrag } from '../lib/panelDrag';
import { GLSL_EFFECT_CATALOG } from '../lib/glslEffects';
import { useProjectStore } from '../store/projectStore';

/**
 * v1.0.2 functional round (W4): D13/D14/D15/D16 store-level behaviour.
 * - D15: effects/LUTs only show on video/image clips — applying with a
 *   sticker selected redirects to the video under the playhead, and an
 *   explicit drop on a sticker clip is refused, never stacked.
 * - D15: manual sticker adds land on a "Stickers N" track, never "Text N".
 * - D-c: addTrack('sticker') names the track "Stickers N".
 * - D14: GLSL effects without p1/p2 exist (param-less cards) — the panel
 *   labels them "No additional settings — Intensity only".
 * - D16: tile thumbnail helpers are DOM/canvas work and are covered by
 *   the Playwright probe (audit/capcut-fix/v102/w4/probe-d16.mjs),
 *   which asserts a photo img per tile; node has no canvas here.
 */

function freshStore() {
  const s = useProjectStore.getState();
  s.openProject(structuredClone(SAMPLE_PROJECT));
  return useProjectStore.getState();
}

describe('v1.0.2 D15 — effects only land where they can show', () => {
  it('tile click with the video clip selected applies the effect to it', () => {
    const s = freshStore();
    s.selectClip('clip-sample-1');
    const res = s.addEffect('warm-glow');
    expect(res.status).toBe('applied');
    const clip = useProjectStore.getState().project!.tracks[0].clips[0];
    expect(clip.effects.map((e) => e.name)).toEqual(['warm-glow']);
  });

  it('tile click with a sticker selected redirects to the video under the playhead', () => {
    const s = freshStore();
    s.addStickerClip('star-violet');
    const afterAdd = useProjectStore.getState();
    const stickerTrack = afterAdd.project!.tracks.find((t) => t.kind === 'sticker');
    expect(stickerTrack?.name).toBe('Stickers 1');
    const sticker = stickerTrack!.clips[0];
    expect(sticker.type).toBe('sticker');
    // The sticker add selects it; the playhead (0) is over the video clip.
    const res = useProjectStore.getState().addEffect('warm-glow');
    expect(res.status).toBe('redirected');
    expect(res.targetName).toBe('Sunset Coast — Title Card');
    const project = useProjectStore.getState().project!;
    const video = project.tracks[0].clips[0];
    expect(video.effects.map((e) => e.name)).toEqual(['warm-glow']);
    // The sticker itself never stacks the effect.
    const stickerAfter = project.tracks.find((t) => t.kind === 'sticker')!.clips[0];
    expect(stickerAfter.effects).toHaveLength(0);
  });

  it('explicit drop on a sticker clip is refused, never stacked', () => {
    const s = freshStore();
    s.addStickerClip('star-violet');
    const sticker = useProjectStore.getState().project!.tracks.find((t) => t.kind === 'sticker')!.clips[0];
    const res = useProjectStore.getState().addEffect('warm-glow', sticker.id);
    expect(res.status).toBe('blocked');
    const project = useProjectStore.getState().project!;
    expect(project.tracks.find((t) => t.kind === 'sticker')!.clips[0].effects).toHaveLength(0);
    expect(project.tracks[0].clips[0].effects).toHaveLength(0);
  });

  it('a second apply of the same effect reports already, no duplicate', () => {
    const s = freshStore();
    s.selectClip('clip-sample-1');
    expect(s.addEffect('warm-glow').status).toBe('applied');
    expect(useProjectStore.getState().addEffect('warm-glow').status).toBe('already');
    expect(useProjectStore.getState().project!.tracks[0].clips[0].effects).toHaveLength(1);
  });

  it('setBuiltinLut redirects the same way, setTransition targets a clip id', () => {
    const s = freshStore();
    s.addStickerClip('star-violet');
    const res = useProjectStore.getState().setBuiltinLut('Vidora Warm');
    expect(res.status).toBe('redirected');
    const project = useProjectStore.getState().project!;
    expect(project.tracks[0].clips[0].lut?.name).toBe('Vidora Warm');
    expect(project.tracks.find((t) => t.kind === 'sticker')!.clips[0].lut).toBeUndefined();
    useProjectStore.getState().setTransition({ direction: 'right', duration: 0.5, type: 'fade' }, 'clip-sample-1');
    expect(useProjectStore.getState().project!.tracks[0].clips[0].transitionIn?.type).toBe('fade');
  });
});

describe('v1.0.2 D15/D-c — sticker tracks and naming', () => {
  it('addClipToStickerTrack opens a "Stickers 1" track, text stays separate', () => {
    const base = structuredClone(SAMPLE_PROJECT);
    const stickerClip = { ...base.tracks[0].clips[0], id: 'clip-stk-1', name: 'Star', start: 0, duration: 3, trackId: '', type: 'sticker' as const };
    const next = addClipToStickerTrack(base, stickerClip);
    const track = next.tracks.find((t) => t.kind === 'sticker');
    expect(track?.name).toBe('Stickers 1');
    expect(track!.clips[0].trackId).toBe(track!.id);
    // A text clip still goes to a text track, not the sticker track.
    const textClip = { ...base.tracks[0].clips[0], id: 'clip-txt-1', name: 'Title', start: 0, duration: 3, trackId: '', type: 'text' as const };
    const next2 = addClipToTextTrack(next, textClip);
    expect(next2.tracks.find((t) => t.kind === 'text')?.name).toBe('Text 1');
  });

  it("addTrack('sticker') names the track Stickers N", () => {
    const s = freshStore();
    s.addTrack('sticker');
    const names = useProjectStore.getState().project!.tracks.filter((t) => t.kind === 'sticker').map((t) => t.name);
    expect(names).toEqual(['Stickers 1']);
    useProjectStore.getState().addTrack('sticker');
    expect(useProjectStore.getState().project!.tracks.filter((t) => t.kind === 'sticker').map((t) => t.name)).toEqual([
      'Stickers 1',
      'Stickers 2',
    ]);
  });

  it('addShapeClip and addBackgroundClip also land on the sticker track', () => {
    const s = freshStore();
    s.addShapeClip('circle', '#7C3AED');
    s.addBackgroundClip('violet-dusk', 4);
    const track = useProjectStore.getState().project!.tracks.find((t) => t.kind === 'sticker');
    expect(track?.name).toBe('Stickers 1');
    expect(track!.clips).toHaveLength(2);
  });
});

describe('v1.0.2 D14 — param-less GLSL effects exist and are labelled', () => {
  it('several GLSL effects have neither p1 nor p2 (Intensity-only cards)', () => {
    const paramLess = GLSL_EFFECT_CATALOG.filter((d) => !d.p1 && !d.p2).map((d) => d.id);
    expect(paramLess).toContain('sepia-deep');
    expect(paramLess).toContain('duotone-violet');
    expect(paramLess).toContain('channel-swap');
    expect(paramLess.length).toBeGreaterThan(0);
  });
});

describe('v1.0.2 D15 — panel drag payload round-trips', () => {
  it('encode/decode keeps kind + id (+ fill for shapes)', () => {
    for (const p of [
      { id: 'warm-glow', kind: 'effect' as const },
      { id: 'Vidora Warm', kind: 'filter' as const },
      { id: 'fade', kind: 'transition' as const },
      { id: 'star', kind: 'sticker' as const },
      { fill: '#7C3AED', id: 'circle', kind: 'shape' as const },
      { id: 'bold-title', kind: 'text' as const },
    ]) {
      const dt = { getData: (_mime: string) => encodePanelDrag(p) } as unknown as DataTransfer;
      expect(decodePanelDrag(dt)).toEqual(p);
    }
    const empty = { getData: (_mime: string) => '' } as unknown as DataTransfer;
    expect(decodePanelDrag(empty)).toBeNull();
  });
});
