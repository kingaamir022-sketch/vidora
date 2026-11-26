import { useState } from 'react';

/**
 * Help Center (CapCut-fix 2026-11-25, B5). Replaces the 10-step user
 * guide dialog (Y2). Topics + "What's new" (v1.0.2 changes, S7).
 * Rendered by App when the Help menu entry is used.
 */
const TOPICS: { body: string; title: string }[] = [
  {
    body: 'Import media from the Media tab, then click a clip (or press +) to add it to the timeline. Split with Ctrl+B, delete with Backspace, undo with Ctrl+Z.',
    title: 'Start a project',
  },
  {
    body: 'The 11 tabs on the left hold everything: Media, Audio, Text, Stickers, Effects, Transitions, Captions, Filters, Adjustment, Templates and AI avatar. Each tab has its own sections on the left.',
    title: 'The editor tabs',
  },
  {
    body: 'Select a clip to open the Details panel on the right: Basic (colour, transform, mask), Background, Smart tools, Audio, Animation and Speed.',
    title: 'Edit a clip',
  },
  {
    body: 'Export opens a menu: Download (resolution, quality, frame rate, format), Share for review, Share as presentation, or Share on social.',
    title: 'Export your video',
  },
  {
    body: 'Press the keyboard icon at the bottom-left of the editor to see every shortcut. Split is Ctrl+B, Attach is N, Preview axis is S, Zoom to fit is Shift+F.',
    title: 'Keyboard shortcuts',
  },
  {
    body: 'Projects save automatically on this computer (the cloud icon in the top bar). There are no accounts — your projects stay on this computer.',
    title: 'Saving and privacy',
  },
];

const WHATS_NEW: string[] = [
  'The preview is now clean like CapCut’s — no floating toolbar above it. Crop lives in the Details panel (Basic tab) and in the right-click menu on a clip; Smart tools (Auto reframe, Retouch, Remove background…) live in the Details panel’s Smart tools tab.',
  'The “Full” button now fills the whole preview area, and “Fit” brings it back. The Ratio menu lists every size (16:9, 9:16, 1:1, 4:3 and more) and your choice is saved, even if you reload right away.',
  'Export really works end to end: an empty project tells you it cannot be exported, and a project with a clip exports to a real video file you can download.',
  'Effect, filter and transition tiles are now big photo previews (two columns), like CapCut on desktop — with the effect actually applied to the photo, and a download button on every tile.',
  'Every button now does its job — preview tools, Export, Ratio and the tiles were all checked end to end at normal 100% zoom.',
];

export default function HelpCenter({ onClose }: { onClose: () => void }) {
  const [topic, setTopic] = useState<string | null>(null);
  return (
    <div role="dialog" aria-modal="true" aria-label="Help Center" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg border border-[#3D3D3D] bg-[#1E1E1E] p-4 text-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Help Center</h2>
          <button type="button" onClick={onClose} aria-label="Close Help Center" className="rounded-md border border-[#3D3D3D] px-2 py-0.5 text-[#A8A8A8] hover:text-[#F2F2F2]">×</button>
        </div>
        <h3 className="mt-4 text-xs font-semibold text-[#00D9D9]">What’s new in v1.0.4</h3>
        <ul className="mt-1 list-disc space-y-1 pl-4 text-[13px] leading-relaxed text-[#A8A8A8]">
          {WHATS_NEW.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <h3 className="mt-4 text-xs font-semibold text-[#00D9D9]">Topics</h3>
        <div className="mt-1 space-y-1">
          {TOPICS.map((t) => (
            <div key={t.title} className="rounded-md border border-[#2E2E2E]">
              <button type="button" onClick={() => setTopic(topic === t.title ? null : t.title)} aria-expanded={topic === t.title} className="block w-full px-3 py-2 text-left font-semibold">
                {t.title}
              </button>
              {topic === t.title && <p className="px-3 pb-2 text-[13px] leading-relaxed text-[#A8A8A8]">{t.body}</p>}
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <button type="button" onClick={onClose} className="rounded-md bg-[#00D9D9] px-4 py-1.5 font-semibold text-[#062A2A]">Close</button>
        </div>
      </div>
    </div>
  );
}
