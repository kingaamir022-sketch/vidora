import { z } from 'zod';

/**
 * Vidora project document schema (Phase 2, v0.3.0).
 * Non-destructive: the project JSON describes tracks, clips, effects,
 * keyframes and markers. Source media is never modified (SPEC Section 2).
 * v0.1.0 / v0.2.0 documents still validate and are migrated by
 * `migrateProject` (additive changes only — old documents keep validating).
 */

export const aspectRatioSchema = z.enum(['9:16', '16:9', '1:1', '4:5', '21:9', 'custom']);
export type AspectRatio = z.infer<typeof aspectRatioSchema>;

export const clipTypeSchema = z.enum(['video', 'audio', 'image', 'text', 'sticker']);
export type ClipType = z.infer<typeof clipTypeSchema>;

export const trackKindSchema = z.enum(['video', 'audio', 'text']);
export type TrackKind = z.infer<typeof trackKindSchema>;

export const mediaKindSchema = z.enum(['video', 'image', 'audio', 'gif']);
export type MediaKind = z.infer<typeof mediaKindSchema>;

export const easingSchema = z.enum(['linear', 'ease', 'ease-in', 'ease-out', 'bezier']);
export type Easing = z.infer<typeof easingSchema>;

/** A keyframe on a clip. `time` is seconds relative to the clip start. */
export const keyframeSchema = z.object({
  bezier: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
  easing: easingSchema.default('linear'),
  id: z.string().min(1),
  property: z.string().min(1),
  time: z.number().min(0),
  value: z.number(),
});
export type Keyframe = z.infer<typeof keyframeSchema>;

/** Keyframe-able clip properties. */
export const KEYFRAME_PROPERTIES = [
  'positionX',
  'positionY',
  'scale',
  'rotation',
  'opacity',
  'volume',
  'brightness',
  'maskFeather',
] as const;
export type KeyframeProperty = (typeof KEYFRAME_PROPERTIES)[number];

export const animationKindSchema = z.enum([
  'none',
  'fade',
  'slide-left',
  'slide-right',
  'slide-up',
  'slide-down',
  'zoom-in',
  'zoom-out',
  'spin',
  'bounce',
  'pop',
]);
export type AnimationKind = z.infer<typeof animationKindSchema>;

export const animationSchema = z.object({
  duration: z.number().min(0.05).max(5).default(0.5),
  kind: animationKindSchema.default('none'),
});
export type ClipAnimation = z.infer<typeof animationSchema>;

export const effectSchema = z.object({
  id: z.string().min(1),
  intensity: z.number().min(0).max(1).default(1),
  name: z.string().min(1),
  params: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
});
export type Effect = z.infer<typeof effectSchema>;

export const transitionTypeSchema = z.enum(['fade', 'dissolve', 'slide', 'push', 'zoom', 'wipe', 'blur', 'spin']);
export type TransitionType = z.infer<typeof transitionTypeSchema>;

export const transitionSchema = z.object({
  direction: z.enum(['left', 'right', 'up', 'down']).default('right'),
  duration: z.number().min(0.05).max(5).default(0.5),
  type: transitionTypeSchema,
});
export type ClipTransition = z.infer<typeof transitionSchema>;

/** A parsed .cube LUT stored in the project (flat RGB grid, size^3 * 3 values). */
export const lutSchema = z
  .object({
    data: z.array(z.number().min(0).max(1)),
    intensity: z.number().min(0).max(1).default(1),
    name: z.string().min(1),
    size: z.number().int().min(2).max(64),
    source: z.enum(['builtin', 'imported']).default('builtin'),
  })
  .refine((lut) => lut.data.length === lut.size ** 3 * 3, { message: 'LUT data length must equal size^3 * 3' });
export type Lut = z.infer<typeof lutSchema>;

export const curvePointSchema = z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) });
export type CurvePoint = z.infer<typeof curvePointSchema>;

export const curvesSchema = z.object({
  b: z.array(curvePointSchema).default([{ x: 0, y: 0 }, { x: 1, y: 1 }]),
  g: z.array(curvePointSchema).default([{ x: 0, y: 0 }, { x: 1, y: 1 }]),
  r: z.array(curvePointSchema).default([{ x: 0, y: 0 }, { x: 1, y: 1 }]),
});
export type Curves = z.infer<typeof curvesSchema>;

export const colorWheelSchema = z.object({
  b: z.number().min(-1).max(1).default(0),
  g: z.number().min(-1).max(1).default(0),
  r: z.number().min(-1).max(1).default(0),
});
export type ColorWheel = z.infer<typeof colorWheelSchema>;

export const blendModeSchema = z.enum([
  'normal',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'soft-light',
  'hard-light',
  'difference',
]);
export type BlendMode = z.infer<typeof blendModeSchema>;

export const adjustmentSchema = z.object({
  blendMode: blendModeSchema.default('normal'),
  brightness: z.number().min(-1).max(1).default(0),
  contrast: z.number().min(-1).max(1).default(0),
  curves: curvesSchema.default({ b: [{ x: 0, y: 0 }, { x: 1, y: 1 }], g: [{ x: 0, y: 0 }, { x: 1, y: 1 }], r: [{ x: 0, y: 0 }, { x: 1, y: 1 }] }),
  denoise: z.number().min(0).max(1).default(0),
  exposure: z.number().min(-2).max(2).default(0),
  gain: colorWheelSchema.default({ b: 0, g: 0, r: 0 }),
  gamma: colorWheelSchema.default({ b: 0, g: 0, r: 0 }),
  highlights: z.number().min(-1).max(1).default(0),
  hslHue: z.number().min(-180).max(180).default(0),
  hslLightness: z.number().min(-1).max(1).default(0),
  hslSaturation: z.number().min(-1).max(1).default(0),
  hue: z.number().min(-180).max(180).default(0),
  /** Lens correction: stored flag only. Full render needs a camera profile (Phase 8). */
  lensCorrection: z.boolean().default(false),
  lift: colorWheelSchema.default({ b: 0, g: 0, r: 0 }),
  saturation: z.number().min(-1).max(1).default(0),
  shadows: z.number().min(-1).max(1).default(0),
  sharpen: z.number().min(0).max(1).default(0),
  /** Stabilization: stored flag only. Real stabilization needs motion analysis (Phase 7). */
  stabilization: z.boolean().default(false),
  temperature: z.number().min(-1).max(1).default(0),
  tint: z.number().min(-1).max(1).default(0),
});
export type Adjustment = z.infer<typeof adjustmentSchema>;

export function defaultAdjustment(): Adjustment {
  return {
    blendMode: 'normal',
    brightness: 0,
    contrast: 0,
    curves: { b: [{ x: 0, y: 0 }, { x: 1, y: 1 }], g: [{ x: 0, y: 0 }, { x: 1, y: 1 }], r: [{ x: 0, y: 0 }, { x: 1, y: 1 }] },
    denoise: 0,
    exposure: 0,
    gain: { b: 0, g: 0, r: 0 },
    gamma: { b: 0, g: 0, r: 0 },
    highlights: 0,
    hslHue: 0,
    hslLightness: 0,
    hslSaturation: 0,
    hue: 0,
    lensCorrection: false,
    lift: { b: 0, g: 0, r: 0 },
    saturation: 0,
    shadows: 0,
    sharpen: 0,
    stabilization: false,
    temperature: 0,
    tint: 0,
  };
}

export const maskShapeSchema = z.enum(['linear', 'mirror', 'circle', 'rectangle', 'heart', 'star', 'pen']);
export type MaskShape = z.infer<typeof maskShapeSchema>;

export const maskSchema = z.object({
  feather: z.number().min(0).max(1).default(0),
  invert: z.boolean().default(false),
  points: z.array(z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) })).default([]),
  shape: maskShapeSchema,
});
export type ClipMask = z.infer<typeof maskSchema>;

export const chromaKeySchema = z.object({
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#00FF00'),
  enabled: z.boolean().default(false),
  smoothness: z.number().min(0).max(1).default(0.2),
  tolerance: z.number().min(0).max(1).default(0.3),
});
export type ChromaKey = z.infer<typeof chromaKeySchema>;

export const layoutModeSchema = z.enum(['full', 'pip', 'split2', 'split3', 'split4']);
export type LayoutMode = z.infer<typeof layoutModeSchema>;

export const backgroundSchema = z.object({
  color: z.string().default('#000000'),
  gradient: z.string().default('linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)'),
  imageSrc: z.string().optional(),
  type: z.enum(['blur', 'color', 'gradient', 'image']).default('blur'),
});
export type ClipBackground = z.infer<typeof backgroundSchema>;

export const mediaFolderSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
});
export type MediaFolder = z.infer<typeof mediaFolderSchema>;

export const mediaItemSchema = z.object({
  createdAt: z.string().datetime(),
  duration: z.number().min(0).optional(),
  folderId: z.string().min(1).default('folder-all'),
  height: z.number().int().positive().optional(),
  id: z.string().min(1),
  kind: mediaKindSchema,
  mime: z.string().min(1),
  name: z.string().min(1),
  size: z.number().min(0),
  /** Object URL (session only) or data URL. Never persisted as file bytes. */
  src: z.string().min(1),
  thumbnail: z.string().optional(),
  width: z.number().int().positive().optional(),
});
export type MediaItem = z.infer<typeof mediaItemSchema>;

export const cropSchema = z.object({
  height: z.number().min(0).max(1),
  width: z.number().min(0).max(1),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});
export type Crop = z.infer<typeof cropSchema>;

export const clipSchema = z.object({
  adjustment: adjustmentSchema.default(defaultAdjustment()),
  animationIn: animationSchema.default({ duration: 0.5, kind: 'none' }),
  animationOut: animationSchema.default({ duration: 0.5, kind: 'none' }),
  background: backgroundSchema.default({ color: '#000000', gradient: 'linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)', type: 'blur' }),
  chromaKey: chromaKeySchema.default({ color: '#00FF00', enabled: false, smoothness: 0.2, tolerance: 0.3 }),
  compoundId: z.string().optional(),
  crop: cropSchema.optional(),
  duration: z.number().positive(),
  effects: z.array(effectSchema).default([]),
  fit: z.enum(['fit', 'fill']).default('fit'),
  flipH: z.boolean().default(false),
  flipV: z.boolean().default(false),
  frozen: z.boolean().default(false),
  groupId: z.string().optional(),
  id: z.string().min(1),
  isCompound: z.boolean().default(false),
  keyframes: z.array(keyframeSchema).default([]),
  layoutMode: layoutModeSchema.default('full'),
  layoutSlot: z.number().int().min(0).max(3).default(0),
  lut: lutSchema.optional(),
  mask: maskSchema.optional(),
  mediaId: z.string().optional(),
  name: z.string().min(1),
  opacity: z.number().min(0).max(1).default(1),
  pitchPreserved: z.boolean().default(true),
  positionX: z.number().default(0),
  positionY: z.number().default(0),
  reversed: z.boolean().default(false),
  rotation: z.number().min(-360).max(360).default(0),
  scale: z.number().min(0.05).max(10).default(1),
  sourceDuration: z.number().positive().optional(),
  sourceStart: z.number().min(0).default(0),
  /** Timeline length in seconds. sourceDuration / speed = duration when speed changes. */
  speed: z.number().min(0.1).max(100).default(1),
  src: z.string().optional(),
  start: z.number().min(0),
  trackId: z.string().min(1),
  transitionIn: transitionSchema.optional(),
  type: clipTypeSchema,
  volume: z.number().min(0).max(2).default(1),
});
export type Clip = z.infer<typeof clipSchema>;

export const trackSchema = z.object({
  clips: z.array(clipSchema).default([]),
  hidden: z.boolean().default(false),
  id: z.string().min(1),
  kind: trackKindSchema,
  locked: z.boolean().default(false),
  muted: z.boolean().default(false),
  name: z.string().min(1),
});
export type Track = z.infer<typeof trackSchema>;

export const markerSchema = z.object({
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  label: z.string().min(1),
  time: z.number().min(0),
});
export type Marker = z.infer<typeof markerSchema>;

export const projectSchema = z.object({
  aspectRatio: aspectRatioSchema,
  createdAt: z.string().datetime(),
  customRatio: z.object({ height: z.number().int().positive(), width: z.number().int().positive() }).optional(),
  folders: z.array(mediaFolderSchema).default([{ id: 'folder-all', name: 'All media' }]),
  fps: z.number().int().min(1).max(120),
  id: z.string().min(1),
  isDraft: z.boolean().default(false),
  markers: z.array(markerSchema).default([]),
  media: z.array(mediaItemSchema).default([]),
  name: z.string().min(1).max(120),
  resolution: z.object({ height: z.number().int().positive(), width: z.number().int().positive() }),
  tracks: z.array(trackSchema).default([]),
  updatedAt: z.string().datetime(),
  version: z.enum(['0.1.0', '0.2.0', '0.3.0']),
});
export type VidoraProject = z.infer<typeof projectSchema>;

export function validateProject(data: unknown) {
  return projectSchema.safeParse(data);
}

export function parseProject(data: unknown): VidoraProject {
  return projectSchema.parse(data);
}

/**
 * Migrate a v0.1.0 / v0.2.0 document to v0.3.0 (fills new fields with
 * defaults). Old keyframes (no `id`) gain one; old effects keep working.
 */
export function migrateProject(data: unknown): VidoraProject {
  const raw = data as Record<string, unknown>;
  const tracks = Array.isArray(raw?.tracks) ? (raw.tracks as Record<string, unknown>[]) : [];
  const migratedTracks = tracks.map((t) => {
    const clips = Array.isArray(t.clips) ? (t.clips as Record<string, unknown>[]) : [];
    return {
      ...t,
      clips: clips.map((c) => {
        const kfs = Array.isArray(c.keyframes) ? (c.keyframes as Record<string, unknown>[]) : [];
        return {
          ...c,
          keyframes: kfs.map((k) => ({ ...k, id: typeof k.id === 'string' ? k.id : newId('kf') })),
        };
      }),
    };
  });
  const parsed = projectSchema.parse({ ...raw, tracks: migratedTracks });
  return { ...parsed, version: '0.3.0' };
}

/** Resolution for an aspect ratio, given a custom size when ratio is 'custom'. */
export function resolutionForRatio(
  ratio: AspectRatio,
  custom?: { width: number; height: number },
): { width: number; height: number } {
  switch (ratio) {
    case '9:16':
      return { height: 1920, width: 1080 };
    case '1:1':
      return { height: 1080, width: 1080 };
    case '4:5':
      return { height: 1350, width: 1080 };
    case '21:9':
      return { height: 1080, width: 2520 };
    case 'custom':
      return custom && custom.width > 0 && custom.height > 0 ? custom : { height: 1080, width: 1920 };
    case '16:9':
    default:
      return { height: 1080, width: 1920 };
  }
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** The one sample project shipped with Phase 0 (original content, no real media). */
export const SAMPLE_PROJECT: VidoraProject = {
  aspectRatio: '16:9',
  createdAt: '2026-11-22T00:00:00.000Z',
  folders: [{ id: 'folder-all', name: 'All media' }],
  fps: 30,
  id: 'sample-sunset-coast',
  isDraft: false,
  markers: [{ color: '#7C3AED', label: 'Intro', time: 0 }],
  media: [],
  name: 'Sunset Coast — Sample Project',
  resolution: { height: 1080, width: 1920 },
  tracks: [
    {
      clips: [
        {
          adjustment: defaultAdjustment(),
          animationIn: { duration: 0.5, kind: 'none' },
          animationOut: { duration: 0.5, kind: 'none' },
          background: { color: '#000000', gradient: 'linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)', type: 'blur' },
          chromaKey: { color: '#00FF00', enabled: false, smoothness: 0.2, tolerance: 0.3 },
          duration: 10,
          effects: [],
          fit: 'fit',
          flipH: false,
          flipV: false,
          frozen: false,
          id: 'clip-sample-1',
          isCompound: false,
          keyframes: [],
          layoutMode: 'full',
          layoutSlot: 0,
          name: 'Sunset Coast — Title Card',
          opacity: 1,
          pitchPreserved: true,
          positionX: 0,
          positionY: 0,
          reversed: false,
          rotation: 0,
          scale: 1,
          sourceDuration: 10,
          sourceStart: 0,
          speed: 1,
          start: 0,
          trackId: 'track-video-1',
          type: 'video',
          volume: 1,
        },
      ],
      hidden: false,
      id: 'track-video-1',
      kind: 'video',
      locked: false,
      muted: false,
      name: 'Video 1',
    },
    {
      clips: [],
      hidden: false,
      id: 'track-audio-1',
      kind: 'audio',
      locked: false,
      muted: false,
      name: 'Audio 1',
    },
  ],
  updatedAt: '2026-11-22T00:00:00.000Z',
  version: '0.3.0',
};
