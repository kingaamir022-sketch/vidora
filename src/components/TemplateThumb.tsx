import { backgroundDef, backgroundThumbnail } from '../lib/backgrounds';
import { resolveSticker, type TemplateDef } from '../lib/templates';
import { TEXT_STYLE_PRESETS } from '../lib/text';

/**
 * TemplateThumb (v1.0.2, D16 follow-up): a template's real first frame.
 *
 * The editor Templates panel used to draw a slot-diagram SVG (purple bars
 * on black — blank for templates with no media slots) and the dashboard
 * Templates page used a flat per-category gradient with the name on it.
 * Both read as empty/flat tiles; CapCut's template cards show the actual
 * template visual. This renders the first frame from the template's own
 * items: procedural background (or dark base for slot templates, whose
 * footage comes from the user) + first title text in its preset fill +
 * first sticker/shape at its template position. All artwork is Vidora's
 * own (original backgrounds, text presets, stickers).
 *
 * Sizing: the wrapper is a container (containerType inline-size) so the
 * title scales with the rendered width via cqw units — the same component
 * is used at ~230px (editor panel), ~300px (dashboard card) and ~360px
 * (dashboard hover popup).
 *
 * v1.0.5 (BUG-CF-033): the root div used to carry `relative` AND receive
 * `absolute inset-0` from the dashboard callers — Tailwind's `relative`
 * wins over `absolute` in the cascade, so the div was position:relative
 * with zero height (all children are absolutely positioned) and
 * `overflow-hidden` clipped everything: every dashboard card was black.
 * The root no longer sets positioning; callers supply it (`absolute
 * inset-0` on the dashboard, `relative` + aspect-ratio in the editor).
 */
export default function TemplateThumb({ def, className = '' }: { def: TemplateDef; className?: string }) {
  const bgItem = def.items.find((i) => i.kind === 'background' && i.backgroundId);
  const bgDef = bgItem?.backgroundId ? backgroundDef(bgItem.backgroundId) : undefined;
  const bgUrl = bgDef ? backgroundThumbnail(bgDef) : undefined;
  const texts = def.items.filter((i) => i.kind === 'text' && i.content).sort((a, b) => a.start - b.start);
  const title = texts[0];
  const subtitle = texts[1];
  const titleFill = title?.presetId
    ? (TEXT_STYLE_PRESETS.find((p) => p.id === title.presetId)?.style.fill ?? '#FFFFFF')
    : '#FFFFFF';
  const subFill = subtitle?.presetId
    ? (TEXT_STYLE_PRESETS.find((p) => p.id === subtitle.presetId)?.style.fill ?? '#FFFFFF')
    : '#FFFFFF';
  const sticker = def.items.find((i) => i.kind === 'sticker' && i.stickerId);
  const stickerDef = sticker?.stickerId ? resolveSticker(sticker.stickerId) : undefined;
  const stickerUrl = stickerDef ? `data:image/svg+xml;utf8,${encodeURIComponent(stickerDef.svg)}` : undefined;
  const shape = def.items.find((i) => i.kind === 'shape' && i.shapeKind);

  return (
    <div
      role="img"
      aria-label={`${def.name} preview`}
      className={`overflow-hidden ${className}`}
      style={{ background: '#141414', containerType: 'inline-size' }}
    >
      {bgUrl ? (
        <img src={bgUrl} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      ) : null}
      {shape && shape.fill ? (
        <span
          aria-hidden
          className="absolute"
          style={{
            background: shape.fill,
            borderRadius: shape.shapeKind === 'circle' ? '50%' : 4,
            height: '24%',
            left: `calc(50% + ${(shape.positionX ?? 0) * 0.5}%)`,
            top: `calc(50% + ${(shape.positionY ?? 0) * 0.5}%)`,
            transform: 'translate(-50%, -50%)',
            width: '24%',
          }}
        />
      ) : null}
      {stickerUrl ? (
        <img
          src={stickerUrl}
          alt=""
          aria-hidden
          draggable={false}
          className="absolute"
          style={{
            height: '30%',
            left: `calc(50% + ${(sticker?.positionX ?? 0) * 0.5}%)`,
            top: `calc(50% + ${(sticker?.positionY ?? 0) * 0.5}%)`,
            transform: 'translate(-50%, -50%)',
            width: 'auto',
          }}
        />
      ) : null}
      {title ? (
        <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-[6%] text-center font-bold leading-tight" style={{ color: titleFill, fontSize: '8cqw', textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
          {title.content}
        </span>
      ) : null}
      {subtitle ? (
        <span className="absolute inset-x-0 px-[6%] text-center font-semibold leading-tight" style={{ color: subFill, fontSize: '4.5cqw', textShadow: '0 1px 6px rgba(0,0,0,0.6)', top: 'calc(50% + 7cqw)' }}>
          {subtitle.content}
        </span>
      ) : null}
    </div>
  );
}
