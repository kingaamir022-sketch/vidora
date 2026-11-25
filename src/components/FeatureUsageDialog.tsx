import { useMemo, useState } from 'react';
import { useProjectStore } from '../store/projectStore';

/**
 * Feature usage dialog (CapCut-fix 2026-11-25, B5). Opened from the
 * "…" menu → "Feature usage". Two tabs — Pro and Commercial — listing
 * which Pro or commercial features this project uses, counted from the
 * project itself. When the project used none, it says so. Pro features
 * are included in this build; nothing is charged. Everything in Vidora
 * is original or openly licensed, so no commercial licence is needed
 * for anything listed here.
 */
export default function FeatureUsageDialog({ onClose }: { onClose: () => void }) {
  const project = useProjectStore((s) => s.project);
  const [tab, setTab] = useState<'pro' | 'commercial'>('pro');

  const usage = useMemo(() => {
    const clips = (project?.tracks ?? []).flatMap((t) => t.clips);
    const mediaById = new Map((project?.media ?? []).map((m) => [m.id, m]));
    let aiMedia = 0;
    let aiAvatar = 0;
    for (const clip of clips) {
      const media = clip.mediaId ? mediaById.get(clip.mediaId) : undefined;
      if (!media) continue;
      if (media.src.includes('ai-library') || media.src.startsWith('data:')) aiMedia += 1;
      if (media.kind === 'image' && (media.name.toLowerCase().includes('avatar') || media.name.toLowerCase().includes('dialogue'))) aiAvatar += 1;
    }
    return {
      aiAvatar,
      aiMedia,
      captionCues: project?.captions?.length ?? 0,
      effects: clips.reduce((n, c) => n + (c.effects?.length ?? 0), 0),
      textClips: clips.filter((c) => c.type === 'text').length,
      transitions: clips.filter((c) => c.transitionIn).length,
    };
  }, [project]);

  const proRows: { count: number; label: string }[] = [
    { count: usage.aiAvatar, label: 'AI avatar clips' },
    { count: usage.aiMedia, label: 'AI-generated media clips' },
    { count: usage.effects, label: 'Effects applied' },
    { count: usage.transitions, label: 'Transitions applied' },
  ];
  const commercialRows: { count: number; label: string }[] = [
    { count: usage.captionCues, label: 'Caption cues' },
    { count: usage.textClips, label: 'Text clips' },
  ];
  const rows = tab === 'pro' ? proRows : commercialRows;
  const total = rows.reduce((n, r) => n + r.count, 0);

  return (
    <div role="dialog" aria-modal="true" aria-label="Feature usage" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg border border-[#3D3D3D] bg-[#1E1E1E] p-4 text-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Feature usage</h2>
          <button type="button" onClick={onClose} aria-label="Close feature usage" className="rounded-md border border-[#3D3D3D] px-2 py-0.5 text-[#A8A8A8] hover:text-[#F2F2F2]">×</button>
        </div>
        <p className="mt-1 text-[13px] text-[#A8A8A8]">Project: {project?.name ?? 'Untitled Project'}</p>
        <div className="mt-3 flex gap-1" role="tablist" aria-label="Feature usage tabs">
          {(['pro', 'commercial'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`rounded-md border px-3 py-1.5 text-xs capitalize ${tab === t ? 'border-[#00D9D9] bg-[#00D9D9]/10 text-[#00D9D9]' : 'border-[#3D3D3D] text-[#A8A8A8]'}`}
            >
              {t === 'pro' ? 'Pro' : 'Commercial'}
            </button>
          ))}
        </div>
        {total === 0 ? (
          <p className="mt-4 text-[13px] leading-relaxed text-[#A8A8A8]">This project used no {tab === 'pro' ? 'Pro' : 'commercial'} features.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {rows.map((r) => (
              <li key={r.label} className="flex items-center justify-between rounded-md border border-[#2E2E2E] bg-[#242424] px-3 py-2">
                <span>{r.label}</span>
                <span className="font-mono font-semibold">{r.count}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[12px] leading-relaxed text-[#6E6E6E]">
          {tab === 'pro'
            ? 'Pro features are included in this build. Nothing is charged.'
            : 'Everything in Vidora is original or openly licensed — no commercial licence is needed for anything in this project.'}
        </p>
        <div className="mt-4 flex justify-end">
          <button type="button" onClick={onClose} className="rounded-md bg-[#00D9D9] px-4 py-1.5 font-semibold text-[#062A2A]">Close</button>
        </div>
      </div>
    </div>
  );
}
