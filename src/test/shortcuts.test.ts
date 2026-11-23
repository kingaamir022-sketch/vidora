import { describe, expect, it } from 'vitest';
import { actionForCombo, DEFAULT_SHORTCUTS, eventToCombo, SHORTCUT_LABELS } from '../lib/shortcuts';
import { exportFileName, pickMimeType, resolutionSize } from '../lib/exporter';

describe('keyboard shortcuts', () => {
  it('has a default for every action and no duplicates', () => {
    const values = Object.values(DEFAULT_SHORTCUTS);
    expect(values.length).toBeGreaterThan(0);
    expect(new Set(values).size).toBe(values.length);
    expect(DEFAULT_SHORTCUTS.split).toBe('s');
    expect(DEFAULT_SHORTCUTS.undo).toBe('ctrl+z');
    expect(DEFAULT_SHORTCUTS.togglePlay).toBe('space');
  });

  it('resolves a combo to its action', () => {
    expect(actionForCombo(DEFAULT_SHORTCUTS, 'ctrl+d')).toBe('duplicate');
    expect(actionForCombo(DEFAULT_SHORTCUTS, 'm')).toBe('addMarker');
    expect(actionForCombo(DEFAULT_SHORTCUTS, 'ctrl+q')).toBeNull();
  });

  it('Ctrl+A is select-all and selects all clips on all tracks (CapCut Web)', () => {
    expect(actionForCombo(DEFAULT_SHORTCUTS, 'ctrl+a')).toBe('selectAll');
    expect(SHORTCUT_LABELS.selectAll).toBe('Select all clips on all tracks');
  });

  it('normalises keyboard events to combos', () => {
    const e = { altKey: false, ctrlKey: true, key: 'z', metaKey: false, shiftKey: false } as KeyboardEvent;
    expect(eventToCombo(e)).toBe('ctrl+z');
    const space = { altKey: false, ctrlKey: false, key: ' ', metaKey: false, shiftKey: false } as KeyboardEvent;
    expect(eventToCombo(space)).toBe('space');
  });
});

describe('export helpers', () => {
  it('builds a safe export file name', () => {
    expect(exportFileName('My Project!', 'webm')).toBe('My-Project.webm');
    expect(exportFileName('', 'mp4')).toBe('vidora-export.mp4');
  });

  it('resolves export sizes', () => {
    expect(resolutionSize(480)).toEqual({ height: 480, width: 854 });
    expect(resolutionSize(1080)).toEqual({ height: 1080, width: 1920 });
  });

  it('returns null mime when MediaRecorder is unavailable (node test env)', () => {
    expect(pickMimeType('webm')).toBeNull();
  });
});
