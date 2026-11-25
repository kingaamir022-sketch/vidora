/**
 * Shared HTML5 drag-and-drop payload for panel tiles (v1.0.2, W4 — D15).
 * One MIME type, one JSON shape; drop targets are the timeline clip
 * elements (TimelineShell) and the preview (PreviewArea). File drops
 * (media import) keep using `dataTransfer.files` and are unaffected.
 */

export type PanelDragKind = 'effect' | 'filter' | 'transition' | 'sticker' | 'shape' | 'text';

export interface PanelDragPayload {
  /** Fill colour for shape drops. */
  fill?: string;
  /** Effect id, LUT name, transition id, sticker id, shape id or text preset id. */
  id: string;
  kind: PanelDragKind;
}

export const PANEL_DRAG_MIME = 'application/x-vidora-panel-drag';

export function encodePanelDrag(payload: PanelDragPayload): string {
  return JSON.stringify(payload);
}

export function decodePanelDrag(dt: DataTransfer): PanelDragPayload | null {
  try {
    const raw = dt.getData(PANEL_DRAG_MIME) || dt.getData('text/plain');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PanelDragPayload;
    if (!parsed || typeof parsed.id !== 'string' || typeof parsed.kind !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Clips that can visibly show an effect / LUT (the compositor's effect
 * passes run inside renderClipFrame, i.e. video/image only — sticker and
 * text frames are drawn by renderStickerFrame/renderTextFrame, which have
 * no effect pass, so an effect stacked on them changes nothing). */
export function canShowEffects(clipType: string | undefined): boolean {
  return clipType === 'video' || clipType === 'image';
}
