import { useEffect } from 'react';
import { useProjectStore } from '../store/projectStore';

/**
 * User guide (Phase 9, Section M — M-DOCS). Plain-language steps for
 * the whole app. Opened from Settings → Help and from the "…" menu.
 */
const STEPS: { title: string; body: string }[] = [
  { title: '1. Start a project', body: 'On the dashboard, type a name (or leave it blank) and click "New Project". Your projects autosave every few seconds — you never need to press Save.' },
  { title: '2. Add video, photos or sound', body: 'In the Media tab, click "Import" and pick files, or drag them in. Click "Add to timeline" on a file to put it on the timeline.' },
  { title: '3. Cut on the timeline', body: 'Click a clip to select it. Press S to split it at the playhead. Drag the edges to trim. Drag a clip to move it. Ctrl+Z undoes, Ctrl+Shift+Z redoes.' },
  { title: '4. Make it look good', body: 'Use the left tabs: Text for titles, Stickers for shapes, Effects for looks, Adjustment for brightness and colour, Transitions between clips.' },
  { title: '5. Add sound', body: 'The Audio tab has music and sound effects. The Mixer (in the Audio panel) sets the volume. Voiceover records your voice onto the timeline.' },
  { title: '6. Captions', body: 'The Captions tab writes captions from a transcript you paste, or imports .srt, .vtt or .ass files. Click a word in the transcript to jump to that moment.' },
  { title: '7. AI tools', body: 'The AI Tools tab has the AI library (music, clips, images, voices) and Tools: auto captions, Smart Cut, Auto Reframe, background removal, stabilize and more. Tools that use a simple method instead of real AI say so on the panel.' },
  { title: '8. Export your video', body: 'Click Export (top right). Pick a size (480p–4K), speed (24–60fps) and format (MP4, MOV or WebM), then Export. The file downloads when it is ready. Export includes the sound mix.' },
  { title: '9. Keep a copy', body: 'On the dashboard, Backups saves your project as a .vidora file. Keep that file in your Drive folder — that is your cloud copy. Import it later to restore the project.' },
  { title: '10. Accounts', body: 'On the dashboard, Account lets you create a local account. The first account is the Owner; later accounts are Customers and can only watch (read-only). Accounts live only on this computer.' },
];

export default function UserGuideDialog() {
  const open = useProjectStore((s) => s.guideOpen);
  const setOpen = useProjectStore((s) => s.setGuideOpen);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="guide-heading" onClick={() => setOpen(false)}>
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 p-5 text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="guide-heading" className="text-lg font-semibold">Vidora — quick guide</h2>
          <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-zinc-700 px-2 py-1 text-xs" aria-label="Close">
            ✕ Close
          </button>
        </div>
        <p className="mt-2 text-sm text-zinc-400">Vidora is a video editor: cut clips, add text and sound, then export a video. Everything below takes one minute to read.</p>
        <ol className="mt-4 space-y-3 text-sm">
          {STEPS.map((s) => (
            <li key={s.title} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <p className="font-semibold">{s.title}</p>
              <p className="mt-1 leading-relaxed text-zinc-400">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
