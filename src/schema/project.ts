import { z } from 'zod';

/**
 * Vidora project document schema (Phase 1, v0.2.0).
 * Non-destructive: the project JSON describes tracks, clips, effects,
 * keyframes and markers. Source media is never modified (SPEC Section 2).
 * v0.1.0 documents still validate and are migrated by `migrateProject`
 * (additive changes only — old documents keep validating).
 */

export const aspectRatioSchema = z.enum(['9:16', '16:9', '1:1', '4:5', '21:9', 'custom']);
export type AspectRatio = z.infer<typeof aspectRatioSchema>;

export const clipTypeSchema = z.enum(['video', 'audio', 'image', 'text', 'sticker']);
export type ClipType = z.infer<typeof clipTypeSchema>;

export const trackKindSchema = z.enum(['video', 'audio', 'text']);
export type TrackKind = z.infer<typeof trackKindSchema>;

export const mediaKindSchema = z.enum(['video', 'image', 'audio', 'gif']);
export type MediaKind = z.infer<typeof mediaKindSchema>;

export const keyframeSchema = z.object({
  easing: z.enum(['linear', 'ease', 'bezier']).default('linear'),
  property: z.string().min(1),
  time: z.number().min(0),
  value: z.number(),
});
export type Keyframe = z.infer<typeof keyframeSchema>;

export const effectSchema = z.object({
  id: z.string().min(1),
  intensity: z.number().min(0).max(1).default(1),
  name: z.string().min(1),
  params: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
});
export type Effect = z.infer<typeof effectSchema>;

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
  version: z.enum(['0.1.0', '0.2.0']),
});
export type VidoraProject = z.infer<typeof projectSchema>;

export function validateProject(data: unknown) {
  return projectSchema.safeParse(data);
}

export function parseProject(data: unknown): VidoraProject {
  return projectSchema.parse(data);
}

/** Migrate a v0.1.0 document to v0.2.0 (fills new fields with defaults). */
export function migrateProject(data: unknown): VidoraProject {
  const parsed = projectSchema.parse(data);
  return { ...parsed, version: '0.2.0' };
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
          duration: 10,
          effects: [],
          fit: 'fit',
          flipH: false,
          flipV: false,
          frozen: false,
          id: 'clip-sample-1',
          isCompound: false,
          keyframes: [],
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
  version: '0.2.0',
};
