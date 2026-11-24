import { describe, expect, it, vi } from 'vitest';
import { SAMPLE_PROJECT, type VidoraProject } from '../schema/project';
import {
  defaultExportOptions,
  estimateFileSizeBytes,
  exportFileName,
  exportSizeFor,
  formatBytesShort,
  probeExportCapabilities,
  qualityBitrate,
  resolveExportPlan,
} from '../lib/exportEngine';
import { applyTemplateWithSlots, TEMPLATE_CATALOG } from '../lib/templates';
import { buildBundle, bundleFileName, bundleToText, parseBundle, relinkMedia } from '../lib/cloudBackup';
import { addComment, mergeComments, setCommentResolved, type ProjectComment } from '../lib/collab';
import { buildPresentationHtml, buildShareCaption, SOCIAL_TARGETS } from '../lib/share';
import { loadJobs, newExportJob } from '../lib/exportQueue';

function fakeProject(): VidoraProject {
  return JSON.parse(JSON.stringify(SAMPLE_PROJECT)) as VidoraProject;
}

describe('Phase 8 — export options math (L-EXPORT)', () => {
  it('exports 35 templates in the catalog', () => {
    expect(TEMPLATE_CATALOG.length).toBe(35);
    expect(new Set(TEMPLATE_CATALOG.map((t) => t.id)).size).toBe(35);
  });

  it('qualityBitrate rises with quality and resolution', () => {
    expect(qualityBitrate('fast', 720)).toBeLessThan(qualityBitrate('recommended', 720));
    expect(qualityBitrate('recommended', 720)).toBeLessThan(qualityBitrate('high', 720));
    expect(qualityBitrate('recommended', 720)).toBeLessThan(qualityBitrate('recommended', 1080));
    expect(qualityBitrate('recommended', 720)).toBe(5_000_000);
  });

  it('exportSizeFor always returns even dimensions (BUG-P8-002)', () => {
    // H.264/VP8/VP9 encode YUV 4:2:0 and reject odd dimensions: 16:9
    // at 480p used to compute 853x480 and the encoder threw.
    expect(exportSizeFor(fakeProject(), 480)).toEqual({ height: 480, width: 854 });
    for (const res of [360, 480, 720, 1080, 1440, 2160] as const) {
      const size = exportSizeFor(fakeProject(), res);
      expect(size.width % 2).toBe(0);
      expect(size.height % 2).toBe(0);
    }
    const portrait = fakeProject();
    portrait.resolution = { height: 1920, width: 1080 };
    for (const res of [360, 480, 720] as const) {
      const size = exportSizeFor(portrait, res);
      expect(size.width % 2).toBe(0);
      expect(size.height % 2).toBe(0);
    }
  });

  it('exportSizeFor keeps the project aspect at the chosen height', () => {
    const size = exportSizeFor(fakeProject(), 720);
    expect(size).toEqual({ height: 720, width: 1280 });
    const size4k = exportSizeFor(fakeProject(), 2160);
    expect(size4k).toEqual({ height: 2160, width: 3840 });
  });

  it('estimateFileSizeBytes grows with duration and quality', () => {
    const base = defaultExportOptions();
    const short = estimateFileSizeBytes(10, base);
    const long = estimateFileSizeBytes(60, base);
    expect(long).toBeGreaterThan(short);
    expect(estimateFileSizeBytes(10, { ...base, quality: 'high' })).toBeGreaterThan(estimateFileSizeBytes(10, { ...base, quality: 'fast' }));
  });

  it('exportFileName sanitizes the project name', () => {
    expect(exportFileName('My Cool Video!', 'mp4')).toBe('My-Cool-Video.mp4');
    expect(exportFileName('   ', 'mp4')).toBe('vidora-export.mp4');
  });

  it('formatBytesShort formats sizes', () => {
    expect(formatBytesShort(500)).toBe('500 B');
    expect(formatBytesShort(2048)).toBe('2 KB');
    expect(formatBytesShort(3_145_728)).toBe('3.0 MB');
  });

  it('resolveExportPlan falls back honestly when a codec is missing', () => {
    const none = { aac: false, h264: false, mediaRecorder: false, notes: [], opus: false, videoEncoder: false, vp8: false, vp9: false };
    const plan = resolveExportPlan('mp4', none);
    expect(plan.videoCodec).toBeNull();
    expect(plan.videoNote).toBeTruthy();
    const webm = resolveExportPlan('webm', { ...none, videoEncoder: true, vp8: true, opus: true });
    expect(webm.videoCodec).toBe('vp8');
    expect(webm.audioCodec).toBe('opus');
    const mp4 = resolveExportPlan('mp4', { ...none, videoEncoder: true, h264: true, aac: true });
    expect(mp4.videoCodec).toBe('avc');
    expect(mp4.audioCodec).toBe('aac');
  });

  it('probeExportCapabilities returns all-false honestly in jsdom (no WebCodecs)', async () => {
    const caps = await probeExportCapabilities();
    expect(caps.videoEncoder).toBe(false);
    expect(caps.h264).toBe(false);
    expect(caps.notes.length).toBeGreaterThan(0);
  });
});

describe('Phase 8 — template slots (L-TEMPLATES-SLOTS)', () => {
  it('fills a slot with real media and keeps placeholders for empty slots', () => {
    const project = fakeProject();
    project.media = [
      {
        id: 'm-clip',
        kind: 'video',
        name: 'my-workout.mp4',
        size: 1024,
        src: 'blob:fake',
        type: 'video/mp4',
      } as never,
    ];
    const out = applyTemplateWithSlots(project, 'workout-vlog', { workout: 'm-clip' });
    expect(out).not.toBeNull();
    const videoClip = out!.tracks
      .flatMap((t) => t.clips)
      .find((c) => c.type === 'video' && c.mediaId === 'm-clip');
    expect(videoClip).toBeDefined();
    expect(videoClip?.name).toBe('my-workout.mp4');
    expect(videoClip?.duration).toBe(10);
  });

  it('uses a labelled placeholder when the slot is empty', () => {
    const project = fakeProject();
    const out = applyTemplateWithSlots(project, 'workout-vlog', {});
    expect(out).not.toBeNull();
    const videoClip = out!.tracks.flatMap((t) => t.clips).find((c) => c.type === 'video');
    expect(videoClip?.name).toBe('▶ Workout clip');
    expect(videoClip?.mediaId).toBeUndefined();
  });

  it('keeps the source project media library', () => {
    const project = fakeProject();
    project.media = [{ id: 'm1', kind: 'image', name: 'a.png', size: 10, src: 'blob:a', type: 'image/png' } as never];
    const out = applyTemplateWithSlots(project, 'quote-intro', {});
    expect(out).not.toBeNull();
    expect(out!.media).toEqual(project.media);
    expect(out!.name).toContain('Quote Intro');
  });

  it('returns null for an unknown template', () => {
    expect(applyTemplateWithSlots(fakeProject(), 'no-such-template', {})).toBeNull();
  });
});

describe('Phase 8 — cloud backup bundle (L-CLOUD)', () => {
  it('round-trips a project through bundle text', () => {
    const project = fakeProject();
    const bundle = buildBundle(project);
    const text = bundleToText(bundle);
    const parsed = parseBundle(text);
    expect(parsed.kind).toBe('vidora-bundle');
    expect(parsed.version).toBe('0.9.0');
    expect(parsed.project.name).toBe(project.name);
    expect(parsed.project.id).toBe(project.id);
  });

  it('rejects garbage, wrong-kind and newer-version bundles', () => {
    expect(() => parseBundle('not json')).toThrow();
    expect(() => parseBundle(JSON.stringify({ kind: 'other', version: '0.9.0', project: {} }))).toThrow();
    expect(() => parseBundle(JSON.stringify({ kind: 'vidora-bundle', version: '99.0.0', project: {} }))).toThrow('newer Vidora');
    // An older bundle is fine to open.
    expect(() => parseBundle(JSON.stringify({ kind: 'vidora-bundle', version: '0.8.0', project: fakeProject() }))).not.toThrow();
  });

  it('bundleFileName ends in .vidora', () => {
    expect(bundleFileName(fakeProject())).toMatch(/\.vidora$/);
  });

  it('relinkMedia matches by name+size and reports missing files', () => {
    const project = fakeProject();
    project.media = [
      { id: 'm1', kind: 'video', name: 'a.mp4', size: 100, src: 'blob:old', type: 'video/mp4' } as never,
      { id: 'm2', kind: 'video', name: 'b.mp4', size: 200, src: 'blob:old2', type: 'video/mp4' } as never,
    ];
    const sessionMedia = [
      { id: 's1', kind: 'video', name: 'a.mp4', size: 100, src: 'blob:new-a', type: 'video/mp4' } as never,
    ];
    const result = relinkMedia(project, sessionMedia);
    expect(result.relinked).toEqual(['a.mp4']);
    expect(result.missing).toEqual(['b.mp4']);
    expect(result.project.media[0].src).toBe('blob:new-a');
    // The original project is not mutated.
    expect(project.media[0].src).toBe('blob:old');
  });
});

describe('Phase 8 — comments (L-COLLAB)', () => {
  const comment = (over: Partial<ProjectComment> = {}): ProjectComment => ({
    author: 'A',
    createdAt: '2026-11-24T00:00:00.000Z',
    id: 'c1',
    resolved: false,
    text: 'Fix the title',
    time: 3.5,
    ...over,
  });

  it('addComment appends and mergeComments dedupes by id', () => {
    const list = addComment([], 'A', 3.5, 'Fix the title');
    expect(list).toHaveLength(1);
    expect(list[0].time).toBe(3.5);
    expect(list[0].resolved).toBe(false);
    const { added, merged } = mergeComments(list, [comment(), comment({ id: 'c2', text: 'second' })]);
    // comment() has a fresh id, so both incoming comments are new.
    expect(added).toHaveLength(2);
    expect(merged).toHaveLength(3);
    const again = mergeComments(merged, [comment({ id: 'c3', text: 'third' })]);
    expect(again.added).toHaveLength(1);
    expect(again.merged).toHaveLength(4);
  });

  it('setCommentResolved toggles resolved', () => {
    const list = setCommentResolved([comment()], 'c1', true);
    expect(list[0].resolved).toBe(true);
    expect(setCommentResolved(list, 'c1', false)[0].resolved).toBe(false);
  });
});

describe('Phase 8 — share helpers (L-SHARE)', () => {
  it('buildShareCaption mentions the project and Vidora', () => {
    const caption = buildShareCaption('My Video', 12);
    expect(caption).toContain('My Video');
    expect(caption).toContain('Made with Vidora');
    expect(caption).toContain('12s');
  });

  it('social targets point at the platforms upload pages', () => {
    const byId = Object.fromEntries(SOCIAL_TARGETS.map((t) => [t.id, t]));
    expect(byId.youtube.url).toBe('https://www.youtube.com/upload');
    expect(byId.tiktok.url).toBe('https://www.tiktok.com/upload');
    expect(byId.facebook.url).toBe('https://www.facebook.com/videos/upload');
    expect(byId.instagram.url).toBeNull();
  });

  it('buildPresentationHtml embeds the video file name and a player', () => {
    const html = buildPresentationHtml('My Video', 'My-Video.mp4', 12);
    expect(html).toContain('My-Video.mp4');
    expect(html).toContain('<video');
    expect(html).not.toContain('<script');
  });
});

describe('Phase 8 — export queue (L-EXPORT-QUEUE)', () => {
  it('newExportJob creates a queued video job with the right options', () => {
    const job = newExportJob(fakeProject(), 'video', { ...defaultExportOptions(), fileName: 'My Clip' });
    expect(job.status).toBe('queued');
    expect(job.kind).toBe('video');
    expect(job.options.fileName).toBe('My Clip');
    expect(job.step).toBe('Queued');
    expect(job.progress).toBe(0);
  });

  it('loadJobs returns an array (empty on a fresh jsdom localStorage)', () => {
    expect(Array.isArray(loadJobs())).toBe(true);
  });

  it('a job saved after an empty first load stays queued (BUG-P8-001)', async () => {
    // Regression: loadJobs() used to leave its "first load" flag unset
    // when the store was empty, so the first load AFTER a job was saved
    // flipped that fresh job to "interrupted" and the queue never ran.
    // The test env is node (no localStorage), so stub an in-memory one.
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      clear: () => store.clear(),
      getItem: (k: string) => store.get(k) ?? null,
      removeItem: (k: string) => store.delete(k),
      setItem: (k: string, v: string) => store.set(k, v),
    });
    try {
      vi.resetModules();
      const q = await import('../lib/exportQueue');
      expect(q.loadJobs()).toEqual([]); // first load, empty store
      const job = q.newExportJob(fakeProject(), 'video', defaultExportOptions());
      q.saveJobs([job]);
      const loaded = q.loadJobs();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].status).toBe('queued');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
