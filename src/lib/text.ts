import { defaultTextStyle, type LoopAnimationKind, type TextStyle } from '../schema/project';

/**
 * Text styles, presets and loop animations (Phase 3, SPEC H).
 * All preset names, colours and styles are ORIGINAL Vidora work — no
 * reference-app template or animation names are copied.
 * Fonts are system stacks only; no web-font download happens here.
 */

export const FONT_STACKS: { id: string; label: string; stack: string }[] = [
  { id: 'sans', label: 'Vidora Sans (system)', stack: 'Inter, system-ui, sans-serif' },
  { id: 'serif', label: 'Classic Serif (Georgia)', stack: 'Georgia, "Times New Roman", serif' },
  { id: 'mono', label: 'Mono (system)', stack: 'ui-monospace, "Cascadia Mono", Consolas, monospace' },
  { id: 'hand', label: 'Handwritten (cursive)', stack: '"Segoe Script", "Comic Sans MS", cursive' },
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
