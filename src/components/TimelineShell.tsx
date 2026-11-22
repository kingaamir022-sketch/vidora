import { useProjectStore } from '../store/projectStore';

/** Bottom multi-track timeline shell (SPEC Section 3). Tracks render from the project document; editing lands in Phase 1. */
export default function TimelineShell() {
  const project = useProjectStore((s) => s.project);
  const tracks = project?.tracks ?? [];

  return (
    <section className="flex h-56 shrink-0 flex-col border-t border-zinc-800 bg-zinc-950 text-zinc-100" aria-label="Timeline">
      <div className="flex h-9 items-center gap-3 border-b border-zinc-800 px-3 text-xs text-zinc-400">
        <span className="font-semibold text-zinc-200">Timeline</span>
        <span>Zoom, snapping and ripple editing arrive in Phase 1.</span>
        <span className="ml-auto font-mono">00:00:00:00</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {tracks.length === 0 ? (
          <p className="p-4 text-sm text-zinc-500">
            No tracks yet. Create a project and add media in Phase 1.
          </p>
        ) : (
          tracks.map((track) => (
            <div key={track.id} className="flex h-14 items-stretch border-b border-zinc-800/70">
              <div className="flex w-36 shrink-0 flex-col justify-center border-r border-zinc-800 px-3">
                <span className="text-xs font-medium">{track.name}</span>
                <span className="text-[10px] uppercase tracking-wide text-zinc-500">{track.kind}</span>
              </div>
              <div className="relative flex-1">
                {track.clips.map((clip) => (
                  <div
                    key={clip.id}
                    className="absolute top-2 bottom-2 flex items-center overflow-hidden rounded-md bg-violet-600/70 px-2 text-xs"
                    style={{ left: `${clip.start * 8}%`, width: `${Math.max(clip.duration * 8, 6)}%` }}
                    title={clip.name}
                  >
                    {clip.name}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
