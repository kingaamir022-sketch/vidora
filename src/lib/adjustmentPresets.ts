import type { Adjustment } from '../schema/project';

/**
 * Saved adjustment presets (CapCut-fix 2026-11-25, M1). The Adjustment
 * tab is a presets library: "Add adjustment" saves the selected clip's
 * current colour adjustment as a named preset; Yours lists the saved
 * presets; Brand presets come from the Spaces page's brand kit. Presets
 * live in localStorage on this computer.
 */
export interface AdjustmentPreset {
  adjustment: Adjustment;
  id: string;
  name: string;
}

const KEY = 'vidora.adjustment-presets.v1';

export function loadAdjustmentPresets(): AdjustmentPreset[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]') as AdjustmentPreset[];
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function saveAdjustmentPreset(preset: AdjustmentPreset): AdjustmentPreset[] {
  const next = [preset, ...loadAdjustmentPresets().filter((p) => p.id !== preset.id)];
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function deleteAdjustmentPreset(id: string): AdjustmentPreset[] {
  const next = loadAdjustmentPresets().filter((p) => p.id !== id);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
