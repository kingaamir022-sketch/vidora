import { useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { findClip } from '../lib/timeline';
import { LOOP_ANIMATION_LABELS, TEXT_PRESET_CATEGORIES, TEXT_STYLE_PRESETS } from '../lib/text';
import { animationKindSchema, type LoopAnimationKind } from '../schema/project';

/**
 * Text panel (Phase 3, SPEC H — H-TEXT, H-TEXTSTYLE, H-TEXTANIM).
 * Reference: WEB-CHECK-2026-11-23 §2 (no desktop screenshot of the Text
 * tab exists) + FULL-WALKTHROUGH-2026-11-23 (third sub-tab "AI text FX":
 * no items until a text clip is selected) — Templates/Effects/AI text FX
 * sub-tabs, "Add heading" + "Add body text", template rows by category,
 * inspector Presets/Basic/TTS/AI avatars/Animation (In/Out/Loop). All
 * style and animation names here are ORIGINAL Vidora names.
 */
export default function TextPanel() {
  const project = useProjectStore((s) => s.project);
  const selectedClipIds = useProjectStore((s) => s.selectedClipIds);
  const addTextClip = useProjectStore((s) => s.addTextClip);
  const setAnimation = useProjectStore((s) => s.setAnimation);
  const updateSelectedClip = useProjectStore((s) => s.updateSelectedClip);
  const [subTab, setSubTab] = useState<'templates' | 'effects' | 'ai-text-fx'>('templates');

  const clip = project && selectedClipIds.length > 0 ? findClip(project, selectedClipIds[0])?.clip ?? null : null;
  const isText = clip?.type === 'text';

  const applyPreset = (presetId: string) => {
    if (isText) {
      const preset = TEXT_STYLE_PRESETS.find((p) => p.id === presetId);
      if (!preset || !clip?.text) return;
      updateSelectedClip({ text: { ...clip.text, style: { ...preset.style, content: clip.text.style.content } } });
    } else {
      addTextClip(presetId);
    }
  };

  const loopKind = (clip?.animationLoop?.kind ?? 'none') as LoopAnimationKind;

  return (
    <div className="w-72 shrink-0 overflow-y-auto border-r border-zinc-800 bg-zinc-950 p-4 text-zinc-100" aria-label="Text panel">
      <h2 className="text-sm font-semibold">Text</h2>
      <div className="mt-2 flex gap-1" role="tablist" aria-label="Text sub-tabs">
        {(['templates', 'effects', 'ai-text-fx'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={subTab === tab}
            onClick={() => setSubTab(tab)}
            className={`rounded-md border px-2 py-0.5 text-[11px] ${subTab === tab ? 'border-violet-500 bg-violet-600/20' : 'border-zinc-700'}`}
          >
            {tab === 'ai-text-fx' ? 'AI text FX' : tab[0].toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {subTab === 'ai-text-fx' ? (
        <section className="mt-3 space-y-2">
          <h3 className="text-xs font-semibold text-zinc-300">AI text FX</h3>
          <p className="text-[11px] leading-relaxed text-zinc-500">
            {isText
              ? 'AI text effects are generated from the selected text clip — Phase 7. The reference generates effects here; Vidora does not fake them yet.'
              : 'Select a text clip to generate AI text effects. AI-generated text effects are Phase 7 work — nothing is generated in this build.'}
          </p>
        </section>
      ) : (
        <>
      <section className="mt-3 space-y-2">
        <h3 className="text-xs font-semibold text-zinc-300">Basic</h3>
        <div className="flex gap-2">
          <button type="button" onClick={() => addTextClip('bold-title')} className="flex-1 rounded-md border border-zinc-700 px-2 py-1.5 text-xs hover:border-zinc-500">
            Add heading
          </button>
          <button type="button" onClick={() => addTextClip('clean-subtitle')} className="flex-1 rounded-md border border-zinc-700 px-2 py-1.5 text-xs hover:border-zinc-500">
            Add body text
          </button>
        </div>
        <p className="text-[11px] leading-relaxed text-zinc-500">
          Adds a 3-second text clip at the playhead, centred on the preview. Select it to edit the text in the right panel.
        </p>
      </section>

      <section className="mt-4 space-y-3 border-t border-zinc-800 pt-3">
        <h3 className="text-xs font-semibold text-zinc-300">{subTab === 'templates' ? 'Text templates' : 'Text styles'}</h3>
        {TEXT_PRESET_CATEGORIES.map((category) => (
          <div key={category}>
            <p className="text-[11px] font-semibold text-zinc-400">{category}</p>
            <div className="mt-1 space-y-1">
              {TEXT_STYLE_PRESETS.filter((p) => p.category === category).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  title={preset.description}
                  className="block w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-left hover:border-zinc-600"
                >
                  <span className="block text-xs font-semibold" style={{ color: preset.style.fill === 'transparent' ? '#fff' : preset.style.fill }}>
                    {preset.name}
                  </span>
                  <span className="block text-[11px] text-zinc-500">{preset.description}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
        <p className="text-[11px] text-zinc-500">Click a style to apply it to the selected text clip — or to add a new text clip with that style when nothing is selected. All styles are original Vidora designs.</p>
      </section>

      {isText && clip && (
        <section className="mt-4 space-y-2 border-t border-zinc-800 pt-3">
          <h3 className="text-xs font-semibold text-zinc-300">Animation</h3>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-[11px] text-zinc-400">
              In
              <select
                value={clip.animationIn.kind}
                onChange={(e) => setAnimation('in', e.target.value as never, clip.animationIn.duration)}
                className="mt-0.5 w-full rounded-md border border-zinc-700 bg-zinc-900 px-1.5 py-1 text-xs"
                aria-label="Animation in kind"
              >
                {animationKindSchema.options.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </label>
            <label className="block text-[11px] text-zinc-400">
              Out
              <select
                value={clip.animationOut.kind}
                onChange={(e) => setAnimation('out', e.target.value as never, clip.animationOut.duration)}
                className="mt-0.5 w-full rounded-md border border-zinc-700 bg-zinc-900 px-1.5 py-1 text-xs"
                aria-label="Animation out kind"
              >
                {animationKindSchema.options.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-[11px] text-zinc-400">
            Loop animation
            <select
              value={loopKind}
              onChange={(e) => updateSelectedClip({ animationLoop: { duration: clip.animationLoop?.duration ?? 2, kind: e.target.value as LoopAnimationKind } })}
              className="mt-0.5 w-full rounded-md border border-zinc-700 bg-zinc-900 px-1.5 py-1 text-xs"
              aria-label="Loop animation kind"
            >
              {(Object.keys(LOOP_ANIMATION_LABELS) as LoopAnimationKind[]).map((k) => (
                <option key={k} value={k}>{LOOP_ANIMATION_LABELS[k]}</option>
              ))}
            </select>
          </label>
          {loopKind !== 'none' && (
            <label className="flex items-center gap-2 text-xs">
              Loop duration (s)
              <input
                type="number"
                min={0.2}
                max={10}
                step={0.1}
                value={clip.animationLoop?.duration ?? 2}
                onChange={(e) => updateSelectedClip({ animationLoop: { duration: Number(e.target.value) || 2, kind: loopKind } })}
                className="w-20 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
                aria-label="Loop animation duration"
              />
            </label>
          )}
          <p className="text-[11px] leading-relaxed text-zinc-500">Loop animations run for the whole clip and are evaluated per frame in the preview.</p>
        </section>
      )}
        </>
      )}
    </div>
  );
}
