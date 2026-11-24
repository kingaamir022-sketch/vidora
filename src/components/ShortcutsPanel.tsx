import { useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { SHORTCUT_LABELS, type ShortcutAction } from '../lib/shortcuts';

/** Customizable keyboard shortcuts (Phase 1, SPEC B). Click a shortcut, then press keys. */
export default function ShortcutsPanel() {
  const open = useProjectStore((s) => s.shortcutsOpen);
  const setOpen = useProjectStore((s) => s.setShortcutsOpen);
  const shortcuts = useProjectStore((s) => s.shortcuts);
  const setShortcut = useProjectStore((s) => s.setShortcut);
  const resetShortcuts = useProjectStore((s) => s.resetShortcuts);
  const [capturing, setCapturing] = useState<ShortcutAction | null>(null);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
      <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-950 p-5 text-zinc-100">
        <h2 className="text-lg font-semibold">Keyboard shortcuts</h2>
        <p className="mt-1 text-xs text-zinc-400">Click a shortcut, then press the new key combination. Esc cancels.</p>
        <ul className="mt-4 space-y-2">
          {(Object.keys(SHORTCUT_LABELS) as ShortcutAction[]).map((action) => (
            <li key={action} className="flex items-center justify-between gap-3 text-sm">
              <span>{SHORTCUT_LABELS[action]}</span>
              <button
                type="button"
                onClick={() => setCapturing(action)}
                onKeyDown={(e) => {
                  if (!capturing || capturing !== action) return;
                  e.preventDefault();
                  if (e.key === 'Escape') {
                    setCapturing(null);
                    return;
                  }
                  const parts: string[] = [];
                  if (e.ctrlKey || e.metaKey) parts.push('ctrl');
                  if (e.shiftKey) parts.push('shift');
                  if (e.altKey) parts.push('alt');
                  const key = e.key.toLowerCase();
                  if (key !== 'control' && key !== 'shift' && key !== 'alt' && key !== 'meta') {
                    parts.push(key === ' ' ? 'space' : key);
                    setShortcut(action, parts.join('+'));
                    setCapturing(null);
                  }
                }}
                className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono text-xs"
              >
                {capturing === action ? 'Press keys…' : shortcuts[action]}
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={resetShortcuts} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm">
            Reset to defaults
          </button>
          <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-2 text-sm font-semibold text-white">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
