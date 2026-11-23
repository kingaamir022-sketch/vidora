/**
 * Original project templates (Phase 5, SPEC N — N-TEMPLATES).
 * 25 templates built only from Vidora's own assets: original text
 * presets, original stickers/shapes, procedural backgrounds, and named
 * media slots. Using a template always creates a NEW project — it never
 * overwrites the current one. A slot with no media shows its label on
 * the canvas (the preview draws a media-less clip's name).
 */

import { clipSchema, newId, type AspectRatio, type Clip, type VidoraProject } from '../schema/project';
import { TEXT_STYLE_PRESETS } from './text';
import { backgroundDef } from './backgrounds';
import { STICKER_CATALOG, shapeSvg, stickerById, type StickerDef } from './stickers';

/** Resolve a sticker by full catalog id, or by base design id (first
 * palette variant) — templates name the design, not a palette. */
function resolveSticker(id: string): StickerDef | undefined {
  return stickerById(id) ?? STICKER_CATALOG.find((s) => s.id.startsWith(`${id}-`));
}

export type TemplateCategory = 'Intro' | 'Outro' | 'Social' | 'Promo' | 'Vlog';

export const TEMPLATE_CATEGORIES: TemplateCategory[] = ['Intro', 'Outro', 'Social', 'Promo', 'Vlog'];

export interface TemplateClipItem {
  animationIn?: string;
  backgroundId?: string;
  content?: string;
  duration: number;
  fill?: string;
  kind: 'text' | 'sticker' | 'shape' | 'background';
  motion?: string;
  positionX?: number;
  positionY?: number;
  presetId?: string;
  scale?: number;
  shapeKind?: string;
  start: number;
  stickerId?: string;
}

export interface TemplateMediaSlot {
  duration: number;
  id: string;
  label: string;
  start: number;
}

export interface TemplateDef {
  category: TemplateCategory;
  description: string;
  duration: number;
  id: string;
  items: TemplateClipItem[];
  name: string;
  ratio: AspectRatio;
  slots: TemplateMediaSlot[];
}

const txt = (presetId: string, content: string, start: number, duration: number, extra: Partial<TemplateClipItem> = {}): TemplateClipItem => ({
  content,
  duration,
  kind: 'text',
  presetId,
  start,
  ...extra,
});
const stk = (stickerId: string, start: number, duration: number, extra: Partial<TemplateClipItem> = {}): TemplateClipItem => ({
  duration,
  kind: 'sticker',
  start,
  stickerId,
  ...extra,
});
const shp = (shapeKind: string, fill: string, start: number, duration: number, extra: Partial<TemplateClipItem> = {}): TemplateClipItem => ({
  duration,
  fill,
  kind: 'shape',
  shapeKind,
  start,
  ...extra,
});
const bgItem = (backgroundId: string, start: number, duration: number): TemplateClipItem => ({
  backgroundId,
  duration,
  kind: 'background',
  start,
});
const slot = (id: string, label: string, start: number, duration: number): TemplateMediaSlot => ({ duration, id, label, start });

export const TEMPLATE_CATALOG: TemplateDef[] = [
  // ---- Intro (16:9) ----
  { category: 'Intro', description: 'Bold violet opening title.', duration: 5, id: 'bold-open', items: [bgItem('violet-dusk', 0, 5), txt('bold-title', 'Your Title Here', 0.3, 4.4, { animationIn: 'fade' }), stk('star', 0.5, 4, { motion: 'motion-sparkle', positionX: 28, positionY: -18 })], name: 'Bold Opening', ratio: '16:9', slots: [] },
  { category: 'Intro', description: 'Quiet paper-textured welcome.', duration: 4, id: 'minimal-intro', items: [bgItem('paper-grain', 0, 4), txt('clean-subtitle', 'Welcome', 0.5, 3, { animationIn: 'rise', positionY: -10 })], name: 'Minimal Intro', ratio: '16:9', slots: [] },
  { category: 'Intro', description: 'Glowing neon title on midnight.', duration: 5, id: 'neon-intro', items: [bgItem('midnight-sky', 0, 5), txt('neon-glow', 'NEON', 0.4, 4.2, { animationIn: 'pop' }), stk('bolt', 1, 3.5, { motion: 'motion-lightning', positionX: 30 })], name: 'Neon Intro', ratio: '16:9', slots: [] },
  { category: 'Intro', description: 'Warm retro stamp opening.', duration: 5, id: 'retro-intro', items: [bgItem('film-dust', 0, 5), txt('retro-stamp', 'RETRO', 0.4, 4.2, { animationIn: 'zoom-in' }), stk('sun', 0.8, 3.6, { motion: 'motion-sun', positionX: -30, positionY: -20 })], name: 'Retro Intro', ratio: '16:9', slots: [] },
  { category: 'Intro', description: 'Sunset title over your footage.', duration: 6, id: 'sunset-intro', items: [txt('sunset-banner', 'SUNSET', 0.4, 5.2, { animationIn: 'fade', positionY: -14 }), shp('circle', '#FDBA74', 0, 6, { positionX: -34, positionY: 18, scale: 0.6 })], name: 'Sunset Intro', ratio: '16:9', slots: [slot('main', 'Main clip', 0, 6)] },
  // ---- Outro (16:9) ----
  { category: 'Outro', description: 'Simple thank-you end card.', duration: 5, id: 'thanks-outro', items: [bgItem('slate-rain', 0, 5), txt('bold-title', 'Thanks for watching', 0.5, 4, { animationIn: 'fade' }), stk('heart', 1, 3.5, { motion: 'motion-heart', positionX: 0, positionY: 18 })], name: 'Thanks Outro', ratio: '16:9', slots: [] },
  { category: 'Outro', description: 'Subscribe call-to-action card.', duration: 6, id: 'subscribe-outro', items: [bgItem('violet-dusk', 0, 6), txt('bold-title', 'Subscribe', 0.4, 5.2, { animationIn: 'pop' }), txt('clean-subtitle', 'New videos every week', 2.2, 3.2, { positionY: 14 }), stk('ribbon', 1, 4, { motion: 'motion-bell', positionX: 30, positionY: -16 })], name: 'Subscribe Outro', ratio: '16:9', slots: [] },
  { category: 'Outro', description: 'Point viewers at the next video.', duration: 5, id: 'next-video-outro', items: [txt('bold-title', 'Watch next', 0.4, 4.2, { animationIn: 'slide-left', positionX: -18 }), stk('arrow-right', 1, 3.5, { motion: 'motion-arrow', positionX: 32 })], name: 'Next Video Outro', ratio: '16:9', slots: [slot('next', 'Next video', 0, 5)] },
  { category: 'Outro', description: 'Slow credit roll on midnight.', duration: 8, id: 'credits-outro', items: [bgItem('midnight-sky', 0, 8), txt('quote-card', 'Made with Vidora', 0.5, 7, { animationIn: 'rise' }), stk('star', 1, 6, { motion: 'motion-star', positionX: -28, positionY: -20 })], name: 'Credits Outro', ratio: '16:9', slots: [] },
  // ---- Social (9:16) ----
  { category: 'Social', description: 'Hook line over your reel.', duration: 8, id: 'reel-hook', items: [txt('bold-title', 'Wait for it...', 0.3, 3, { animationIn: 'pop' }), txt('clean-subtitle', 'The ending is worth it', 4.5, 3, { positionY: 20 })], name: 'Reel Hook', ratio: '9:16', slots: [slot('main', 'Main clip', 0, 8)] },
  { category: 'Social', description: 'Centred quote on rose dawn.', duration: 6, id: 'quote-reel', items: [bgItem('rose-dawn', 0, 6), txt('quote-card', '“Make it shine.”', 0.5, 5, { animationIn: 'fade' })], name: 'Quote Reel', ratio: '9:16', slots: [] },
  { category: 'Social', description: 'Big sale banner for stories.', duration: 7, id: 'sale-reel', items: [bgItem('ember-glow', 0, 7), txt('bold-title', 'SALE', 0.4, 6.2, { animationIn: 'pop' }), txt('sunset-banner', '50% OFF', 2, 4.5, { positionY: 16 }), stk('bolt', 1, 5, { motion: 'motion-lightning', positionX: 28, positionY: -20 })], name: 'Sale Reel', ratio: '9:16', slots: [] },
  { category: 'Social', description: 'New-drop announcement.', duration: 6, id: 'story-promo', items: [bgItem('berry-blush', 0, 6), txt('bold-title', 'New drop', 0.4, 5.2, { animationIn: 'rise' }), txt('clean-subtitle', 'Out now', 2.4, 3, { positionY: 16 })], name: 'Story Promo', ratio: '9:16', slots: [] },
  { category: 'Social', description: 'How-to title over your clip.', duration: 10, id: 'tutorial-reel', items: [txt('bold-title', 'How to...', 0.3, 3.5, { animationIn: 'slide-left' }), txt('clean-subtitle', 'Step 1: watch closely', 4, 5.5, { positionY: 22 })], name: 'Tutorial Reel', ratio: '9:16', slots: [slot('main', 'Tutorial clip', 0, 10)] },
  { category: 'Social', description: 'Playful POV opener.', duration: 5, id: 'meme-reel', items: [bgItem('checker-soft', 0, 5), txt('bold-title', 'POV:', 0.4, 4.2, { animationIn: 'pop' }), txt('clean-subtitle', 'when the edit is perfect', 2, 2.8, { positionY: 16 })], name: 'Meme Reel', ratio: '9:16', slots: [] },
  // ---- Promo (16:9) ----
  { category: 'Promo', description: 'Product reveal with your footage.', duration: 10, id: 'product-launch', items: [txt('bold-title', 'Introducing', 0.3, 3, { animationIn: 'fade' }), txt('clean-subtitle', 'Something new is here', 4, 5.5, { positionY: 18 })], name: 'Product Launch', ratio: '16:9', slots: [slot('product', 'Product clip', 0, 10)] },
  { category: 'Promo', description: 'Urgent flash-sale banner.', duration: 8, id: 'flash-sale', items: [bgItem('ember-glow', 0, 8), txt('bold-title', 'FLASH SALE', 0.4, 7.2, { animationIn: 'pop' }), stk('bolt', 0.8, 6.5, { motion: 'motion-lightning', positionX: 30, positionY: -18 }), txt('clean-subtitle', 'Ends tonight', 3.5, 4, { positionY: 18 })], name: 'Flash Sale', ratio: '16:9', slots: [] },
  { category: 'Promo', description: 'Calm brand story layout.', duration: 12, id: 'brand-story', items: [txt('quote-card', 'Our story', 0.4, 4, { animationIn: 'rise' }), txt('clean-subtitle', 'Made with care, since day one', 5, 6.5, { positionY: 16 })], name: 'Brand Story', ratio: '16:9', slots: [slot('story', 'Story clip', 0, 12)] },
  { category: 'Promo', description: 'Soft invitation card.', duration: 8, id: 'event-invite', items: [bgItem('lavender-soft', 0, 8), txt('bold-title', 'You are invited', 0.5, 7, { animationIn: 'fade' }), txt('clean-subtitle', 'Save the date', 3, 4.5, { positionY: 16 })], name: 'Event Invite', ratio: '16:9', slots: [] },
  { category: 'Promo', description: 'App download call-to-action.', duration: 10, id: 'app-promo', items: [txt('bold-title', 'Download now', 0.4, 4, { animationIn: 'pop' }), txt('clean-subtitle', 'Free on every device', 4.5, 5, { positionY: 16 }), stk('balloon', 1, 8, { motion: 'motion-rocket', positionX: 32, positionY: -14 })], name: 'App Promo', ratio: '16:9', slots: [slot('app', 'App clip', 0, 10)] },
  // ---- Vlog (16:9) ----
  { category: 'Vlog', description: 'Day-in-my-life opener.', duration: 15, id: 'day-in-life', items: [txt('bold-title', 'A day in my life', 0.4, 4, { animationIn: 'fade' }), txt('clean-subtitle', 'Come along with me', 5, 4, { positionY: 18 })], name: 'Day In My Life', ratio: '16:9', slots: [slot('day', 'Day footage', 0, 15)] },
  { category: 'Vlog', description: 'Wanderlust travel title.', duration: 12, id: 'travel-vlog', items: [txt('bold-title', 'Wander', 0.4, 4, { animationIn: 'rise' }), txt('clean-subtitle', 'Episode 1 — the coast', 4.5, 6, { positionY: 16 }), stk('sun', 1, 10, { motion: 'motion-sun', positionX: 32, positionY: -18 })], name: 'Travel Vlog', ratio: '16:9', slots: [slot('travel', 'Travel clip', 0, 12)] },
  { category: 'Vlog', description: 'Tasty food title.', duration: 10, id: 'food-vlog', items: [txt('sunset-banner', 'Tasty', 0.4, 4, { animationIn: 'pop' }), txt('clean-subtitle', 'Today we cook...', 4.5, 5, { positionY: 18 })], name: 'Food Vlog', ratio: '16:9', slots: [slot('food', 'Food clip', 0, 10)] },
  { category: 'Vlog', description: 'Calm morning routine opener.', duration: 12, id: 'morning-routine', items: [bgItem('mint-breeze', 0, 3), txt('bold-title', 'Morning', 0.4, 4, { animationIn: 'fade' }), txt('clean-subtitle', 'Slow starts, good coffee', 5, 6, { positionY: 16 })], name: 'Morning Routine', ratio: '16:9', slots: [slot('morning', 'Morning clip', 3, 9)] },
  { category: 'Vlog', description: 'High-energy workout title.', duration: 10, id: 'workout-vlog', items: [txt('bold-title', 'Train hard', 0.4, 4, { animationIn: 'pop' }), txt('clean-subtitle', 'No excuses today', 4.5, 5, { positionY: 18 }), stk('burst', 1, 8, { motion: 'motion-flame', positionX: 32, positionY: -16 })], name: 'Workout Vlog', ratio: '16:9', slots: [slot('workout', 'Workout clip', 0, 10)] },
];

export function templateDef(id: string): TemplateDef | undefined {
  return TEMPLATE_CATALOG.find((t) => t.id === id);
}

export function templatesByCategory(category: TemplateCategory): TemplateDef[] {
  return TEMPLATE_CATALOG.filter((t) => t.category === category);
}

export function searchTemplates(query: string): TemplateDef[] {
  const q = query.trim().toLowerCase();
  if (!q) return TEMPLATE_CATALOG;
  return TEMPLATE_CATALOG.filter((t) => t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
}

function makeClip(partial: Record<string, unknown>): Clip {
  return clipSchema.parse(partial);
}

/**
 * Build a new project from a template (pure). Returns null for an unknown
 * template id. Slots become video clips named after the slot — with no
 * media they show their label on the canvas until footage is dropped in.
 */
export function applyTemplate(project: VidoraProject, templateId: string): VidoraProject | null {
  const def = templateDef(templateId);
  if (!def) return null;
  const videoTrackId = newId('track');
  const textTrackId = newId('track');
  const videoClips: Clip[] = def.slots.map((s) =>
    makeClip({
      duration: s.duration,
      id: newId('clip'),
      name: `▶ ${s.label}`,
      start: s.start,
      trackId: videoTrackId,
      type: 'video',
    }),
  );
  const textClips: Clip[] = [];
  for (const item of def.items) {
    const base = {
      duration: item.duration,
      id: newId('clip'),
      positionX: item.positionX ?? 0,
      positionY: item.positionY ?? 0,
      scale: item.scale ?? 1,
      start: item.start,
      trackId: textTrackId,
    };
    if (item.kind === 'text') {
      const preset = TEXT_STYLE_PRESETS.find((p) => p.id === item.presetId);
      const style = preset ? { ...preset.style, content: item.content ?? preset.style.content } : undefined;
      if (!style) continue;
      textClips.push(makeClip({
        ...base,
        animationIn: { duration: 0.5, kind: (item.animationIn ?? 'none') as never },
        animationLoop: { duration: 2, kind: (item.motion ?? 'none') as never },
        name: item.content ?? 'Text',
        text: { content: style.content, style, tts: null },
        type: 'text',
      }));
    } else if (item.kind === 'sticker') {
      const sticker = resolveSticker(item.stickerId ?? '');
      if (!sticker) continue;
      textClips.push(makeClip({
        ...base,
        animationLoop: { duration: 2, kind: (item.motion ?? 'none') as never },
        name: sticker.name,
        sticker: { category: sticker.category, id: sticker.id, kind: 'sticker', svg: sticker.svg },
        type: 'sticker',
      }));
    } else if (item.kind === 'shape') {
      const svg = shapeSvg(item.shapeKind ?? 'circle', item.fill ?? '#7C3AED');
      textClips.push(makeClip({
        ...base,
        name: `Shape ${item.shapeKind ?? ''}`,
        sticker: { category: 'Shapes', id: `shape-${item.shapeKind ?? 'circle'}`, kind: 'shape', svg },
        type: 'sticker',
      }));
    } else if (item.kind === 'background') {
      const bg = backgroundDef(item.backgroundId ?? '');
      if (!bg) continue;
      textClips.push(makeClip({
        ...base,
        duration: item.duration,
        name: bg.name,
        sticker: { category: 'Backgrounds', id: `bg-${bg.id}`, kind: 'sticker', svg: bg.svg },
        type: 'sticker',
      }));
    }
  }
  const tracks = [
    { clips: videoClips, hidden: false, id: videoTrackId, kind: 'video' as const, locked: false, muted: false, name: 'Video 1', solo: false, volume: 1 },
    { clips: [], hidden: false, id: newId('track'), kind: 'audio' as const, locked: false, muted: false, name: 'Audio 1', solo: false, volume: 1 },
    { clips: textClips, hidden: false, id: textTrackId, kind: 'text' as const, locked: false, muted: false, name: 'Text 1', solo: false, volume: 1 },
  ];
  const now = new Date().toISOString();
  return {
    ...structuredClone(project),
    aspectRatio: def.ratio,
    id: newId('project'),
    markers: [],
    media: [],
    name: `${def.name} — ${project.name}`,
    tracks,
    updatedAt: now,
  };
}
