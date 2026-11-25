/**
 * Customizable keyboard shortcuts (master spec § Shortcuts; CapCut-fix
 * 2026-11-25, W1). The DEFAULT bindings match CapCut desktop exactly,
 * in CapCut's listed order: Select all Ctrl+A, Copy Ctrl+C, Cut Ctrl+X,
 * Paste Ctrl+V, Delete Backspace, Undo Ctrl+Z, Redo Ctrl+Shift+Z,
 * Play/pause Space, Split Ctrl+B, Zoom in/out Ctrl+/-, Last/Next frame
 * Ctrl+Left/Right, Preview axis S, Attach N, Separate audio Ctrl+Shift+S,
 * Full screen Ctrl+Shift+F, Hand tool H, Move V, Zoom to fit Shift+F.
 *
 * REMOVED (CapCut-fix Y6/Y7, W1): addMarker (M) and rippleDelete
 * (Shift+Delete) — CapCut desktop has no markers UI and no ripple
 * delete. Duplicate (Ctrl+D) is also unbound: CapCut's list has no
 * Duplicate shortcut (Duplicate lives in the right-click menu, R6).
 * The store still keeps `markers` in the project schema for old files,
 * but nothing writes them any more.
 */

export type ShortcutAction =
  | 'selectAll'
  | 'copy'
  | 'cut'
  | 'paste'
  | 'delete'
  | 'undo'
  | 'redo'
  | 'togglePlay'
  | 'split'
  | 'zoomIn'
  | 'zoomOut'
  | 'frameStepPrev'
  | 'frameStepNext'
  | 'previewAxis'
  | 'attachToggle'
  | 'separateAudio'
  | 'fullscreen'
  | 'handTool'
  | 'moveTool'
  | 'zoomToFit';

/** CapCut's order in the shortcuts list. */
export const SHORTCUT_ORDER: ShortcutAction[] = [
  'selectAll',
  'copy',
  'cut',
  'paste',
  'delete',
  'undo',
  'redo',
  'togglePlay',
  'split',
  'zoomIn',
  'zoomOut',
  'frameStepPrev',
  'frameStepNext',
  'previewAxis',
  'attachToggle',
  'separateAudio',
  'fullscreen',
  'handTool',
  'moveTool',
  'zoomToFit',
];

export const SHORTCUT_LABELS: Record<ShortcutAction, string> = {
  selectAll: 'Select all',
  copy: 'Copy',
  cut: 'Cut',
  paste: 'Paste',
  delete: 'Delete',
  undo: 'Undo',
  redo: 'Redo',
  togglePlay: 'Play/pause',
  split: 'Split',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  frameStepPrev: 'Last frame',
  frameStepNext: 'Next frame',
  previewAxis: 'Preview axis',
  attachToggle: 'Attach',
  separateAudio: 'Separate audio',
  fullscreen: 'Full screen',
  handTool: 'Hand tool',
  moveTool: 'Move',
  zoomToFit: 'Zoom to fit',
};

export const DEFAULT_SHORTCUTS: Record<ShortcutAction, string> = {
  selectAll: 'ctrl+a',
  copy: 'ctrl+c',
  cut: 'ctrl+x',
  paste: 'ctrl+v',
  delete: 'backspace',
  undo: 'ctrl+z',
  redo: 'ctrl+shift+z',
  togglePlay: 'space',
  split: 'ctrl+b',
  zoomIn: 'ctrl+=',
  zoomOut: 'ctrl+-',
  frameStepPrev: 'ctrl+arrowleft',
  frameStepNext: 'ctrl+arrowright',
  previewAxis: 's',
  attachToggle: 'n',
  separateAudio: 'ctrl+shift+s',
  fullscreen: 'ctrl+shift+f',
  handTool: 'h',
  moveTool: 'v',
  zoomToFit: 'shift+f',
};

export const SHORTCUTS_STORAGE_KEY = 'vidora.shortcuts.v1';

export function loadShortcuts(): Record<ShortcutAction, string> {
  try {
    const raw = localStorage.getItem(SHORTCUTS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SHORTCUTS };
    const parsed = JSON.parse(raw) as Partial<Record<string, string>>;
    // Drop stored bindings for actions that no longer exist (e.g. the
    // removed addMarker / rippleDelete / duplicate from before v1.0.1).
    const kept: Partial<Record<ShortcutAction, string>> = {};
    for (const action of SHORTCUT_ORDER) {
      if (typeof parsed[action] === 'string') kept[action] = parsed[action] as string;
    }
    return { ...DEFAULT_SHORTCUTS, ...kept };
  } catch {
    return { ...DEFAULT_SHORTCUTS };
  }
}

export function saveShortcuts(map: Record<ShortcutAction, string>): void {
  localStorage.setItem(SHORTCUTS_STORAGE_KEY, JSON.stringify(map));
}

/** Normalise a KeyboardEvent to the stored combo format, e.g. "ctrl+shift+z". */
export function eventToCombo(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('ctrl');
  if (e.shiftKey) parts.push('shift');
  if (e.altKey) parts.push('alt');
  const key = e.key.toLowerCase();
  if (key !== 'control' && key !== 'shift' && key !== 'alt' && key !== 'meta') parts.push(key === ' ' ? 'space' : key);
  return parts.join('+');
}

export function actionForCombo(map: Record<ShortcutAction, string>, combo: string): ShortcutAction | null {
  const entry = (Object.entries(map) as [ShortcutAction, string][]).find(([, v]) => v === combo);
  return entry ? entry[0] : null;
}

/** Human-readable label for a combo, e.g. "ctrl+shift+z" → "Ctrl + Shift + Z". */
export function formatCombo(combo: string): string {
  return combo
    .split('+')
    .map((k) =>
      k === 'ctrl'
        ? 'Ctrl'
        : k === 'shift'
          ? 'Shift'
          : k === 'alt'
            ? 'Alt'
            : k === 'space'
              ? 'Space'
              : k === 'backspace'
                ? 'Backspace'
                : k.startsWith('arrow')
                  ? k.replace('arrow', '')[0].toUpperCase() + k.replace('arrow', '').slice(1)
                  : k.toUpperCase(),
    )
    .join(' + ');
}
