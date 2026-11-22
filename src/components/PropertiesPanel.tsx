import { useProjectStore } from '../store/projectStore';

/**
 * Right contextual properties panel (SPEC Section 3).
 * Phase 0 shows the active tab's panel with its real Phase 1 scope note —
 * no controls are faked as working.
 */
const PANEL_NOTES: Record<string, string> = {
  'AI Tools': 'Background removal, auto reframe and smart cut arrive in Phase 7.',
  Adjustment: 'Brightness, contrast, saturation, curves and scopes arrive in Phase 2.',
  Audio: 'Mixer, fades, voiceover and beat detection arrive in Phase 4.',
  Captions: 'Auto captions, styles and SRT/VTT import/export arrive in Phase 3.',
  Effects: 'GLSL effects with parameters arrive in Phase 2; the procedural library in Phase 5.',
  Filters: 'LUT filters with intensity arrive in Phase 2; procedural looks in Phase 5.',
  Media: 'Import video, image, audio and GIF, folders and search arrive in Phase 1.',
  Stickers: 'SVG stickers, shapes and GIFs arrive in Phase 3; the procedural library in Phase 5.',
  Templates: 'The template system arrives in Phase 8; procedural templates in Phase 5.',
  Text: 'Text tool, fonts, presets and animations arrive in Phase 3.',
  Transitions: 'Transitions with duration control arrive in Phase 2; procedural transitions in Phase 5.',
};

export default function PropertiesPanel() {
  const activeTab = useProjectStore((s) => s.activeTab);
  const project = useProjectStore((s) => s.project);

  return (
    <aside className="w-72 shrink-0 overflow-y-auto border-l border-zinc-800 bg-zinc-950 p-4 text-zinc-100" aria-label="Properties">
      <h2 className="text-sm font-semibold">{activeTab}</h2>
      <p className="mt-1 text-xs leading-relaxed text-zinc-400">{PANEL_NOTES[activeTab]}</p>
      <div className="mt-4 space-y-2 border-t border-zinc-800 pt-4 text-xs text-zinc-400">
        <p>
          <span className="text-zinc-200">Project:</span> {project?.name ?? 'Untitled Project'}
        </p>
        <p>
          <span className="text-zinc-200">Tracks:</span> {project?.tracks.length ?? 0}
        </p>
        <p>
          <span className="text-zinc-200">Frame rate:</span> {project?.fps ?? 30} fps
        </p>
        <p>
          <span className="text-zinc-200">Resolution:</span> {project?.resolution.width ?? 1920} x{' '}
          {project?.resolution.height ?? 1080}
        </p>
      </div>
    </aside>
  );
}
