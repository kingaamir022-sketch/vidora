import { useEffect, useState } from 'react';
import { useProjectStore } from '../store/projectStore';

/**
 * Onboarding tour (Phase 9, Section M — M-ONBOARD). Five short steps
 * on first launch. Esc or Skip ends it; Settings can replay it.
 */
const STEPS: { title: string; body: string }[] = [
  { title: 'Welcome to Vidora', body: 'This is your dashboard. Your projects live here. Click "New Project" to start editing.' },
  { title: 'Import your media', body: 'In the editor, the Media tab is where videos, photos and sound come in. Drag files in, or click Import.' },
  { title: 'The timeline is where you cut', body: 'Clips sit on tracks. Click a clip to select it, press S to split it, drag the edges to trim.' },
  { title: 'Preview on the right', body: 'The preview shows your video as you edit. Press Space to play or pause.' },
  { title: 'Export when you are done', body: 'Click Export at the top right, pick a size and format, and your video downloads. That is the whole app — have fun.' },
];

export default function OnboardingTour() {
  const show = useProjectStore((s) => s.showOnboarding);
  const dismiss = useProjectStore((s) => s.dismissOnboarding);
  const view = useProjectStore((s) => s.view);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!show) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [show, dismiss]);

  // The tour only auto-opens on the dashboard.
  if (!show || view !== 'dashboard') return null;

  const last = step === STEPS.length - 1;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="tour-heading">
      <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-5 text-zinc-100">
        <p className="text-xs text-zinc-500">
          Step {step + 1} of {STEPS.length}
        </p>
        <h2 id="tour-heading" className="mt-1 text-lg font-semibold">{STEPS[step].title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">{STEPS[step].body}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <button type="button" onClick={dismiss} className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs">
            Skip tour
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs disabled:opacity-40"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => (last ? dismiss() : setStep((s) => s + 1))}
              className="rounded-lg bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-1.5 text-xs font-semibold text-white"
            >
              {last ? 'Start editing' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
