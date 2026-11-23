import { defaultTextStyle, type LoopAnimationKind, type TextStyle } from '../schema/project';
import { FONT_CATALOG } from './fonts';
import { evaluateMotionLoop } from './stickerAnim';

/**
 * Text styles, presets and loop animations (Phase 3, SPEC H; Phase 5
 * adds 36 presets, 40 open-license fonts and the `motion-*` loop kinds).
 * All preset names, colours and styles are ORIGINAL Vidora work — no
 * reference-app template or animation names are copied.
 * Fonts: the 4 legacy system stacks stay first (existing presets index
 * them), then the 40 open-license families from `src/lib/fonts.ts`
 * (downloaded by `npm run build:assets`; system fallback when missing).
 */

export const FONT_STACKS: { id: string; label: string; stack: string }[] = [
  { id: 'sans', label: 'Vidora Sans (system)', stack: 'Inter, system-ui, sans-serif' },
  { id: 'serif', label: 'Classic Serif (Georgia)', stack: 'Georgia, "Times New Roman", serif' },
  { id: 'mono', label: 'Mono (system)', stack: 'ui-monospace, "Cascadia Mono", Consolas, monospace' },
  { id: 'hand', label: 'Handwritten (cursive)', stack: '"Segoe Script", "Comic Sans MS", cursive' },
  ...FONT_CATALOG.map((f) => ({ id: f.id, label: `${f.family} (${f.category})`, stack: f.stack })),
];

/** Look a font stack up by id; falls back to the system sans stack. */
export function fontStackFor(id: string): string {
  return FONT_STACKS.find((f) => f.id === id || f.stack === id)?.stack ?? FONT_STACKS[0].stack;
}

/** One original text style preset: a full TextStyle plus display metadata. */
export interface TextStylePreset {
  category: string;
  description: string;
  id: string;
  name: string;
  style: TextStyle;
}

function preset(id: string, name: string, category: string, description: string, patch: Partial<TextStyle>): TextStylePreset {
  return { category, description, id, name, style: { ...defaultTextStyle(name), ...patch } };
}

/** 14 original text style presets (Phase 3, H-TEXTSTYLE). */
export const TEXT_STYLE_PRESETS: TextStylePreset[] = [
  preset('bold-title', 'Bold Title', 'Titles', 'Big white title with a soft drop shadow.', {
    bold: true, content: 'Bold Title', fill: '#FFFFFF', fontSize: 64,
    shadow: { blur: 8, color: '#000000', enabled: true, offsetX: 3, offsetY: 4 },
  }),
  preset('lower-third', 'Lower Third', 'Titles', 'Small name bar, lower-left style caption.', {
    align: 'left', backgroundColor: 'rgba(0,0,0,0.65)', backgroundPadding: 10, bold: true,
    content: 'Your Name', fill: '#FFFFFF', fontSize: 28,
  }),
  preset('neon-glow', 'Neon Glow', 'Effects', 'Bright cyan text with a strong glow.', {
    bold: true, content: 'Neon Glow', fill: '#A5F3FC', fontSize: 56,
    glow: { blur: 24, color: '#06B6D4', enabled: true },
  }),
  preset('clean-subtitle', 'Clean Subtitle', 'Subtitles', 'Plain centred subtitle, easy to read.', {
    bold: false, content: 'Clean Subtitle', fill: '#F4F4F5', fontSize: 24,
    shadow: { blur: 4, color: '#000000', enabled: true, offsetX: 1, offsetY: 2 },
  }),
  preset('retro-stamp', 'Retro Stamp', 'Titles', 'Warm retro stamp with a thick outline.', {
    bold: true, content: 'RETRO', fill: '#FDE68A', fontSize: 56, strokeColor: '#7C2D12', strokeWidth: 3,
  }),
  preset('handwritten-note', 'Handwritten Note', 'Subtitles', 'Casual handwritten-style note.', {
    bold: false, content: 'a little note', fill: '#FDE68A', fontFamily: FONT_STACKS[3].stack, fontSize: 32, italic: true,
  }),
  preset('violet-gradient', 'Violet Gradient', 'Effects', 'Violet-to-cyan gradient fill title.', {
    bold: true, content: 'Gradient', fill: '#FFFFFF', fillGradient: 'linear-gradient(90deg, #7C3AED 0%, #06B6D4 100%)', fontSize: 60,
  }),
  preset('outline-pop', 'Outline Pop', 'Effects', 'Hollow outline text that pops on video.', {
    bold: true, content: 'OUTLINE', fill: 'transparent', fontSize: 64, strokeColor: '#FFFFFF', strokeWidth: 4,
  }),
  preset('quote-card', 'Quote Card', 'Titles', 'Centred serif quote with generous line spacing.', {
    align: 'center', bold: false, content: '“Make it shine.”', fill: '#FAFAFA',
    fontFamily: FONT_STACKS[1].stack, fontSize: 40, italic: true, lineSpacing: 1.6,
  }),
  preset('mono-terminal', 'Mono Terminal', 'Subtitles', 'Terminal-style monospace caption.', {
    backgroundColor: 'rgba(9,9,11,0.8)', backgroundPadding: 8, bold: false, content: '> hello, world',
    fill: '#4ADE80', fontFamily: FONT_STACKS[2].stack, fontSize: 24,
  }),
  preset('sunset-banner', 'Sunset Banner', 'Titles', 'Warm sunset fill with a dark shadow.', {
    bold: true, content: 'SUNSET', fill: '#FDBA74', fontSize: 72,
    shadow: { blur: 6, color: '#7C2D12', enabled: true, offsetX: 0, offsetY: 4 },
  }),
  preset('soft-caption', 'Soft Caption', 'Subtitles', 'Small grey caption with a soft box.', {
    backgroundColor: 'rgba(255,255,255,0.12)', backgroundPadding: 6, bold: false,
    content: 'soft caption', fill: '#E4E4E7', fontSize: 18,
  }),
  preset('big-number', 'Big Number', 'Titles', 'Huge outlined number for countdowns and lists.', {
    bold: true, content: '01', fill: '#FFFFFF', fontSize: 120, strokeColor: '#7C3AED', strokeWidth: 2,
  }),
  preset('underlined-callout', 'Underlined Callout', 'Subtitles', 'Underlined callout line for emphasis.', {
    bold: true, content: 'Watch this', fill: '#FFFFFF', fontSize: 30, underline: true,
  }),
  // ---- Phase 5 (Section N): 36 more original presets, 50 total. ----
  preset('cinema-title', 'Cinema Title', 'Titles', 'Wide-spaced cinematic title.', {
    bold: true, content: 'CINEMA', fill: '#FFFFFF', fontFamily: fontStackFor('playfair-display'), fontSize: 68,
  }),
  preset('breaking-news', 'Breaking News', 'Titles', 'Red breaking-news banner.', {
    backgroundColor: '#DC2626', backgroundPadding: 12, bold: true, content: 'BREAKING NEWS', fill: '#FFFFFF', fontSize: 44,
  }),
  preset('vlog-title', 'Vlog Title', 'Titles', 'Friendly rounded vlog title.', {
    bold: true, content: 'My Vlog', fill: '#FFFFFF', fontFamily: fontStackFor('nunito'), fontSize: 56,
    shadow: { blur: 6, color: '#000000', enabled: true, offsetX: 2, offsetY: 3 },
  }),
  preset('gold-title', 'Gold Title', 'Titles', 'Rich gold gradient title.', {
    bold: true, content: 'GOLD', fill: '#FFFFFF', fillGradient: 'linear-gradient(90deg, #F59E0B 0%, #FDE68A 50%, #B45309 100%)', fontSize: 72,
  }),
  preset('minimal-title', 'Minimal Title', 'Titles', 'Small clean title, lots of air.', {
    bold: false, content: 'minimal', fill: '#FAFAFA', fontFamily: fontStackFor('inter'), fontSize: 36,
  }),
  preset('poster-title', 'Poster Title', 'Titles', 'Heavy display poster title.', {
    bold: true, content: 'POSTER', fill: '#FFFFFF', fontFamily: fontStackFor('anton'), fontSize: 88,
  }),
  preset('story-title', 'Story Title', 'Titles', 'Casual handwritten story title.', {
    bold: false, content: 'my story', fill: '#FFFFFF', fontFamily: fontStackFor('caveat'), fontSize: 56, italic: false,
  }),
  preset('elegant-title', 'Elegant Title', 'Titles', 'Elegant serif title for films.', {
    bold: false, content: 'Elegant', fill: '#F5F3FF', fontFamily: fontStackFor('playfair-display'), fontSize: 60, italic: true,
  }),
  preset('subtitle-small', 'Subtitle Small', 'Subtitles', 'Tiny subtitle for dense scenes.', {
    bold: false, content: 'small subtitle', fill: '#E4E4E7', fontSize: 16,
    shadow: { blur: 3, color: '#000000', enabled: true, offsetX: 1, offsetY: 1 },
  }),
  preset('subtitle-yellow', 'Subtitle Yellow', 'Subtitles', 'Classic yellow subtitle.', {
    bold: true, content: 'Yellow subtitle', fill: '#FDE047', fontSize: 26,
    shadow: { blur: 4, color: '#000000', enabled: true, offsetX: 1, offsetY: 2 },
  }),
  preset('subtitle-boxed', 'Subtitle Boxed', 'Subtitles', 'Subtitle on a solid dark box.', {
    backgroundColor: 'rgba(0,0,0,0.8)', backgroundPadding: 8, bold: false, content: 'boxed subtitle', fill: '#FFFFFF', fontSize: 24,
  }),
  preset('subtitle-top', 'Subtitle Top', 'Subtitles', 'Subtitle meant for the top of frame.', {
    bold: false, content: 'top subtitle', fill: '#F4F4F5', fontSize: 24,
    shadow: { blur: 4, color: '#000000', enabled: true, offsetX: 1, offsetY: 2 },
  }),
  preset('caption-tag', 'Caption Tag', 'Subtitles', 'Small pill tag caption.', {
    backgroundColor: 'rgba(124,58,237,0.85)', backgroundPadding: 8, bold: true, content: 'TAG', fill: '#FFFFFF', fontSize: 18,
  }),
  preset('lyric-line', 'Lyric Line', 'Subtitles', 'Centred lyric line with spacing.', {
    bold: false, content: 'sing along', fill: '#FFFFFF', fontFamily: fontStackFor('lora'), fontSize: 30, italic: true, lineSpacing: 1.4,
  }),
  preset('fire-text', 'Fire Text', 'Effects', 'Hot orange text with a warm glow.', {
    bold: true, content: 'FIRE', fill: '#FDBA74', fontSize: 64,
    glow: { blur: 20, color: '#EA580C', enabled: true },
  }),
  preset('ice-text', 'Ice Text', 'Effects', 'Cold cyan text with a frosty glow.', {
    bold: true, content: 'ICE', fill: '#A5F3FC', fontSize: 64,
    glow: { blur: 20, color: '#06B6D4', enabled: true },
  }),
  preset('rainbow-text', 'Rainbow Text', 'Effects', 'Rainbow gradient title.', {
    bold: true, content: 'RAINBOW', fill: '#FFFFFF', fillGradient: 'linear-gradient(90deg, #EF4444 0%, #F59E0B 25%, #22C55E 50%, #3B82F6 75%, #A855F7 100%)', fontSize: 60,
  }),
  preset('metal-text', 'Metal Text', 'Effects', 'Brushed-metal gradient title.', {
    bold: true, content: 'METAL', fill: '#FFFFFF', fillGradient: 'linear-gradient(180deg, #F8FAFC 0%, #94A3B8 50%, #F8FAFC 100%)', fontSize: 64,
  }),
  preset('shadow-pop', 'Shadow Pop', 'Effects', 'Hard offset shadow for punch.', {
    bold: true, content: 'POP', fill: '#FFFFFF', fontSize: 64,
    shadow: { blur: 0, color: '#7C3AED', enabled: true, offsetX: 6, offsetY: 6 },
  }),
  preset('glitch-text', 'Glitch Text', 'Effects', 'Glitchy cyan-magenta title.', {
    bold: true, content: 'GLITCH', fill: '#FFFFFF', fontSize: 60,
    shadow: { blur: 0, color: '#06B6D4', enabled: true, offsetX: -4, offsetY: 0 },
    strokeColor: '#EC4899', strokeWidth: 1,
  }),
  preset('hologram-text', 'Hologram Text', 'Effects', 'Holographic gradient title.', {
    bold: true, content: 'HOLO', fill: '#FFFFFF', fillGradient: 'linear-gradient(90deg, #06B6D4 0%, #A855F7 50%, #EC4899 100%)', fontSize: 60,
  }),
  preset('insta-story', 'Insta Story', 'Social', 'Story-ready bold caption.', {
    bold: true, content: 'new post', fill: '#FFFFFF', fontFamily: fontStackFor('montserrat'), fontSize: 40,
    shadow: { blur: 6, color: '#000000', enabled: true, offsetX: 0, offsetY: 3 },
  }),
  preset('reel-hook', 'Reel Hook', 'Social', 'Hook line for short video.', {
    bold: true, content: 'Wait for it...', fill: '#FFFFFF', fontFamily: fontStackFor('poppins'), fontSize: 36,
    shadow: { blur: 6, color: '#000000', enabled: true, offsetX: 0, offsetY: 3 },
  }),
  preset('tiktok-caption', 'TikTok Caption', 'Social', 'Short punchy caption.', {
    bold: true, content: 'POV: the edit', fill: '#FFFFFF', fontSize: 32,
    shadow: { blur: 4, color: '#000000', enabled: true, offsetX: 1, offsetY: 2 },
  }),
  preset('hashtag-line', 'Hashtag Line', 'Social', 'Hashtag line in cyan.', {
    bold: false, content: '#vidora #edit', fill: '#67E8F9', fontSize: 24,
  }),
  preset('cta-button', 'CTA Button', 'Social', 'Call-to-action pill text.', {
    backgroundColor: '#7C3AED', backgroundPadding: 12, bold: true, content: 'Follow now', fill: '#FFFFFF', fontSize: 28,
  }),
  preset('live-badge', 'Live Badge', 'Social', 'Red live badge text.', {
    backgroundColor: '#DC2626', backgroundPadding: 8, bold: true, content: '● LIVE', fill: '#FFFFFF', fontSize: 22,
  }),
  preset('typewriter', 'Typewriter', 'Retro', 'Old typewriter-style line.', {
    bold: false, content: 'Typewriter', fill: '#E7E5E4', fontFamily: fontStackFor('roboto-mono'), fontSize: 32,
  }),
  preset('arcade-title', 'Arcade Title', 'Retro', 'Chunky arcade display title.', {
    bold: true, content: 'ARCADE', fill: '#FDE047', fontFamily: fontStackFor('bebas-neue'), fontSize: 72,
  }),
  preset('western-title', 'Western Title', 'Retro', 'Dusty western poster title.', {
    bold: true, content: 'WESTERN', fill: '#D6D3D1', fontFamily: fontStackFor('roboto-slab'), fontSize: 56,
  }),
  preset('comic-title', 'Comic Title', 'Retro', 'Bold comic-book title.', {
    bold: true, content: 'POW!', fill: '#FDE047', fontSize: 72, strokeColor: '#18181B', strokeWidth: 4,
  }),
  preset('notebook-title', 'Notebook Title', 'Retro', 'Ruled-notebook handwriting.', {
    bold: false, content: 'Dear diary', fill: '#1C1917', fontFamily: fontStackFor('caveat'), fontSize: 48,
  }),
  preset('thin-title', 'Thin Title', 'Minimal', 'Ultra-light thin title.', {
    bold: false, content: 'thin', fill: '#FAFAFA', fontFamily: fontStackFor('raleway'), fontSize: 56,
  }),
  preset('dot-leader', 'Dot Leader', 'Minimal', 'Small dotted leader caption.', {
    bold: false, content: '• • •', fill: '#A1A1AA', fontSize: 24,
  }),
  preset('small-caps', 'Small Caps', 'Minimal', 'Small-caps style title.', {
    bold: false, content: 'SMALL CAPS', fill: '#E4E4E7', fontFamily: fontStackFor('montserrat'), fontSize: 30,
  }),
  preset('bare-caption', 'Bare Caption', 'Minimal', 'Bare caption, no decoration.', {
    bold: false, content: 'bare caption', fill: '#D4D4D8', fontSize: 20,
  }),
];

export const TEXT_PRESET_CATEGORIES = [...new Set(TEXT_STYLE_PRESETS.map((p) => p.category))];

/** Apply a preset on top of a clip's current style (keeps its content). */
export function applyPreset(style: TextStyle, presetId: string): TextStyle {
  const found = TEXT_STYLE_PRESETS.find((p) => p.id === presetId);
  if (!found) return style;
  return { ...found.style, content: style.content };
}

/** Loop animation state at a clip-local time (seconds). Returns the
 * per-frame transform/opacity multipliers the compositor applies. */
export interface LoopAnimationState {
  opacity: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
  scale: number;
}

const LOOP_BASE: LoopAnimationState = { offsetX: 0, offsetY: 0, opacity: 1, rotation: 0, scale: 1 };

export function evaluateLoopAnimation(kind: LoopAnimationKind, localTime: number, duration = 2): LoopAnimationState {
  if (kind === 'none' || duration <= 0) return { ...LOOP_BASE };
  // Phase 5 (N-TEXTANIM): `motion-*` kinds delegate to the sticker motion
  // evaluator (one spec per base design), shared by text and stickers.
  if (kind.startsWith('motion-')) {
    const m = evaluateMotionLoop(kind, localTime);
    return { offsetX: m.offsetX, offsetY: m.offsetY, opacity: m.opacity, rotation: m.rotation, scale: m.scale };
  }
  const phase = (localTime % duration) / duration; // 0..1, loops forever
  const t = phase * Math.PI * 2;
  switch (kind) {
    case 'pulse':
      return { ...LOOP_BASE, scale: 1 + 0.08 * Math.sin(t) };
    case 'wiggle':
      return { ...LOOP_BASE, rotation: 4 * Math.sin(t) };
    case 'float':
      return { ...LOOP_BASE, offsetY: -10 * Math.sin(t) };
    case 'blink':
      return { ...LOOP_BASE, opacity: phase < 0.5 ? 1 : 0.15 };
    case 'spin-slow':
      return { ...LOOP_BASE, rotation: phase * 360 };
    case 'shimmer':
      return { ...LOOP_BASE, opacity: 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t)) };
    case 'bounce-loop':
      return { ...LOOP_BASE, offsetY: -Math.abs(Math.sin(t)) * 24, scale: 1 + Math.abs(Math.sin(t)) * 0.04 };
    default:
      return { ...LOOP_BASE };
  }
}

export const LOOP_ANIMATION_LABELS: Record<LoopAnimationKind, string> = {
  'bounce-loop': 'Bounce loop',
  blink: 'Blink',
  float: 'Float',
  // Phase 5: one `motion-*` label per base sticker design (28 specs).
  'motion-arrow': 'Motion: Arrow Nudge',
  'motion-bell': 'Motion: Bell Ring',
  'motion-bubble': 'Motion: Bubble Rise',
  'motion-camera': 'Motion: Shutter Snap',
  'motion-check': 'Motion: Check Pop',
  'motion-clapper': 'Motion: Clap Snap',
  'motion-crown': 'Motion: Royal Float',
  'motion-drop': 'Motion: Drop Fall',
  'motion-flame': 'Motion: Flicker',
  'motion-flower': 'Motion: Bloom Turn',
  'motion-gift': 'Motion: Gift Wiggle',
  'motion-heart': 'Motion: Heartbeat',
  'motion-leaf': 'Motion: Leaf Drift',
  'motion-lightning': 'Motion: Flash Zap',
  'motion-mic': 'Motion: Mic Pulse',
  'motion-moon': 'Motion: Moon Sway',
  'motion-music-note': 'Motion: Note Dance',
  'motion-party': 'Motion: Party Pop',
  'motion-pause': 'Motion: Pause Fade',
  'motion-play': 'Motion: Play Pulse',
  'motion-rocket': 'Motion: Rocket Lift',
  'motion-shield': 'Motion: Shield Guard',
  'motion-smile': 'Motion: Happy Bounce',
  'motion-sparkle': 'Motion: Sparkle Pulse',
  'motion-star': 'Motion: Twinkle Spin',
  'motion-sun': 'Motion: Sun Spin',
  'motion-thumbs-up': 'Motion: Thumbs Rock',
  'motion-warning': 'Motion: Warn Blink',
  none: 'None',
  pulse: 'Pulse',
  shimmer: 'Shimmer',
  'spin-slow': 'Slow spin',
  wiggle: 'Wiggle',
};

/**
 * Word-wrap helper (pure): splits `text` into lines that fit `maxWidth`
 * when measured by `measure(text)`. Newlines in the text force a break.
 */
export function wrapLines(text: string, maxWidth: number, measure: (s: string) => number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/\s+/).filter((w) => w.length > 0);
    if (words.length === 0) {
      lines.push('');
      continue;
    }
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (measure(candidate) <= maxWidth || !current) {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
  }
  return lines.length > 0 ? lines : [''];
}

/** Canvas font string for a text style (used by the preview renderer). */
export function canvasFontFor(style: TextStyle): string {
  const weight = style.bold ? '700' : '400';
  const slant = style.italic ? 'italic ' : '';
  return `${slant}${weight} ${style.fontSize}px ${style.fontFamily}`;
}
