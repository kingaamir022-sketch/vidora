import type { LeftTab } from '../store/projectStore';

/**
 * Honest placeholder left panel (parity retrofit, Rule 12).
 * Tabs whose feature phase has not been built yet still open a panel, so
 * the tab order and panel layout match the reference — but the panel says
 * plainly what is coming and in which phase. Nothing here is faked.
 */
const COMING: Record<string, { phase: string; items: string }> = {
  Text: {
    phase: 'Phase 3 — built',
    items: 'Text tool (fonts, size, colour, gradient, stroke, shadow, glow, background box, alignment, spacing), text templates, animated text, shapes, drawing/pen tool, motion tracking. Open the Text tab to use it.',
  },
  Stickers: {
    phase: 'Phase 3 — built',
    items: '224 original procedural SVG stickers in 8 categories, 10 shapes with a fill picker, freehand drawing. Open the Stickers tab to use them.',
  },
  Captions: {
    phase: 'Phase 3 — built',
    items: 'Auto captions from a pasted transcript (word-level highlight), 8 caption styles, manual cue editing, SRT/VTT import/export, per-cue translation editing, text-to-speech narration, transcript view. Open the Captions tab to use them.',
  },
  Templates: {
    phase: 'Phase 8',
    items: 'Template system with replaceable media slots (vlog, intro/outro, slideshow, promo, reel, product, birthday, travel, quote, countdown, lyric-style). Templates are built in Phase 5 and wired up in Phase 8.',
  },
  'AI Tools': {
    phase: 'Phase 6 — built',
    items: 'AI Library: Generate (prompt → image, video, music, dialogue scene, all local, no credits), 100 AI music tracks, 100 AI clips, 110 AI images, 16 narration voices. Open the AI Tools tab to use it.',
  },
};

export default function PlaceholderPanel({ tab }: { tab: LeftTab }) {
  const info = COMING[tab] ?? { phase: 'a later phase', items: 'This tool is part of a later phase.' };
  return (
    <div className="w-72 shrink-0 overflow-y-auto border-r border-zinc-800 bg-zinc-950 p-4 text-zinc-100" aria-label={`${tab} panel`}>
      <h2 className="text-sm font-semibold">{tab}</h2>
      <p className="mt-2 text-xs leading-relaxed text-zinc-400">
        {tab} tools arrive in {info.phase}. Nothing here is a working tool yet — this panel only tells you what is coming, so the tab is never a dead click.
      </p>
      <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">{info.items}</p>
      <p className="mt-3 border-t border-zinc-800 pt-3 text-[11px] leading-relaxed text-zinc-500">
        What already works: the dashboard, media import, timeline editing, speed, keyframes, effects, transitions, LUTs, colour, masks, text, stickers, captions, audio tools and basic export.
      </p>
    </div>
  );
}
