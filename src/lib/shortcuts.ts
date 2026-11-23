/** Customizable keyboard shortcuts (Phase 1, SPEC B). Stored in localStorage; editable in the Shortcuts panel. */

export type ShortcutAction =
  | 'split'
  | 'delete'
  | 'duplicate'
  | 'copy'
  | 'paste'
  | 'undo'
  | 'redo'
  | 'togglePlay'
  | 'addMarker'
  | 'rippleDelete'
  | 'selectAll';

export const SHORTCUT_LABELS: Record<ShortcutAction, string> = {
  addMarker: 'Add marker at playhead',
  copy: 'Copy selected clip',
  delete: 'Delete selected clip',
  duplicate: 'Duplicate selected clip',
  paste: 'Paste clip',
  redo: 'Redo',
  rippleDelete: 'Ripple delete selected clip',
  selectAll: 'Select all clips on all tracks',
  split: 'Split clip at playhead',
  togglePlay: 'Play / pause',
  undo: 'Undo',
};

export const DEFAULT_SHORTCUTS: Record<ShortcutAction, string> = {
  addMarker: 'm',
  copy: 'ctrl+c',
  delete: 'delete',
  duplicate: 'ctrl+d',
  paste: 'ctrl+v',
  redo: 'ctrl+shift+z',
  rippleDelete: 'shift+delete',
  selectAll: 'ctrl+a',
  split: 's',
  togglePlay: 'space',
  undo: 'ctrl+z',
};

export const SHORTCUTS_STORAGE_KEY = 'vidora.shortcuts.v1';

export function loadShortcuts(): Record<ShortcutAction, string> {
  try {
    const raw = localStorage.getItem(SHORTCUTS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SHORTCUTS };
    const parsed = JSON.parse(raw) as Partial<Record<ShortcutAction, string>>;
    return { ...DEFAULT_SHORTCUTS, ...parsed };
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
