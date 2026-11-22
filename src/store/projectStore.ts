import { create } from 'zustand';
import {
  migrateProject,
  newId,
  parseProject,
  resolutionForRatio,
  SAMPLE_PROJECT,
  type AspectRatio,
  type Clip,
  type MediaItem,
  type TrackKind,
  type VidoraProject,
} from '../schema/project';
import { importFile } from '../lib/media';
import { DEFAULT_SHORTCUTS, loadShortcuts, saveShortcuts, type ShortcutAction } from '../lib/shortcuts';
import {
  deleteClip,
  duplicateClip,
  durationAtSpeed,
  findClip,
  groupClips,
  makeCompound,
  moveClip,
  projectDuration,
  rippleDeleteClip,
  splitClipAt,
  trimClip,
  ungroupClips,
  updateClip,
} from '../lib/timeline';

/**
 * Phase 1 store (Zustand). Command pattern is real now: every project
 * mutation pushes the previous document onto the undo stack. Autosave
 * runs every 3 s while dirty; crash recovery restores the newest autosave.
 */

export const LEFT_TABS = [
  'Media',
  'Audio',
  'Text',
  'Stickers',
  'Effects',
  'Transitions',
  'Captions',
  'Filters',
  'Adjustment',
  'Templates',
  'AI Tools',
] as const;
export type LeftTab = (typeof LEFT_TABS)[number];

export type View = 'dashboard' | 'editor';

const PROJECTS_KEY = 'vidora.projects.v1';
const LAST_OPEN_KEY = 'vidora.lastOpen.v1';
const autosaveKey = (id: string) => `vidora.autosave.${id}`;

function readProjects(): VidoraProject[] {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    if (!raw) return [structuredClone(SAMPLE_PROJECT)];
    const parsed = JSON.parse(raw) as unknown[];
    const projects = parsed.map((p) => migrateProject(p));
    return projects.length > 0 ? projects : [structuredClone(SAMPLE_PROJECT)];
  } catch {
    return [structuredClone(SAMPLE_PROJECT)];
  }
}

function writeProjects(projects: VidoraProject[]): void {
  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  } catch {
    // Storage full / unavailable: autosave still keeps the open project.
  }
}

function readAutosave(id: string): VidoraProject | null {
  try {
    const raw = localStorage.getItem(autosaveKey(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { project: unknown; savedAt: string };
    return migrateProject(parsed.project);
  } catch {
    return null;
  }
}

/** On load: if an autosave is newer than the saved project, recover it. */
function loadWithRecovery(): { projects: VidoraProject[]; recovered: string | null } {
  const projects = readProjects();
  let recovered: string | null = null;
  const merged = projects.map((p) => {
    const auto = readAutosave(p.id);
    if (auto && new Date(auto.updatedAt).getTime() > new Date(p.updatedAt).getTime()) {
      recovered = `Recovered unsaved changes for "${p.name}" from autosave.`;
      return auto;
    }
    return p;
  });
  if (recovered) writeProjects(merged);
  return { projects: merged, recovered };
}

const initial = loadWithRecovery();

interface ProjectState {
  activeTab: LeftTab;
  aspectRatio: AspectRatio;
  clipboard: Clip[] | null;
  customRatio: { height: number; width: number };
  dirty: boolean;
  exportOpen: boolean;
  lastSavedAt: string | null;
  magnetic: boolean;
  playhead: number;
  playing: boolean;
  project: VidoraProject | null;
  projects: VidoraProject[];
  recoveredNotice: string | null;
  redoStack: string[];
  ripple: boolean;
  selectedClipIds: string[];
  selectedTrackId: string | null;
  shortcuts: Record<ShortcutAction, string>;
  shortcutsOpen: boolean;
  theme: 'dark' | 'light';
  undoStack: string[];
  view: View;
  zoom: number;
  // dashboard / projects
  createProject: (name?: string) => void;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => void;
  openDashboard: () => void;
  openProject: (project: VidoraProject) => void;
  renameProject: (id: string, name: string) => void;
  // editing
  addMarker: (label?: string) => void;
  addMediaFiles: (files: FileList | File[], folderId?: string) => Promise<void>;
  addMediaToTimeline: (mediaId: string) => void;
  addTrack: (kind: TrackKind) => void;
  copySelected: () => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  freezeSelected: () => void;
  groupSelected: () => void;
  makeCompoundSelected: () => void;
  moveSelected: (newStart: number, trackId?: string) => void;
  pasteClipboard: () => void;
  removeMarker: (time: number) => void;
  reverseSelected: () => void;
  rippleDeleteSelected: () => void;
  selectClip: (clipId: string | null, additive?: boolean) => void;
  selectTrack: (trackId: string | null) => void;
  setClipSpeed: (speed: number) => void;
  setMagnetic: (v: boolean) => void;
  setPlayhead: (t: number) => void;
  setPlaying: (v: boolean) => void;
  setRipple: (v: boolean) => void;
  setTrackProp: (trackId: string, patch: Partial<{ hidden: boolean; locked: boolean; muted: boolean; name: string }>) => void;
  setZoom: (z: number) => void;
  splitAtPlayhead: () => void;
  trimSelected: (edge: 'start' | 'end', delta: number) => void;
  ungroupSelected: () => void;
  updateSelectedClip: (patch: Partial<Clip>) => void;
  // media library
  addFolder: (name: string) => void;
  // view / misc
  setActiveTab: (tab: LeftTab) => void;
  setAspectRatio: (ratio: AspectRatio) => void;
  setCustomRatio: (width: number, height: number) => void;
  setExportOpen: (v: boolean) => void;
  setShortcutsOpen: (v: boolean) => void;
  setShortcut: (action: ShortcutAction, combo: string) => void;
  resetShortcuts: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
  dismissRecovery: () => void;
  saveNow: () => void;
  undo: () => void;
  redo: () => void;
}

export const useProjectStore = create<ProjectState>()((set, get) => {
  const applyProject = (next: VidoraProject, pushUndo = true) => {
    const s = get();
    if (!s.project) return;
    const stamped: VidoraProject = { ...next, updatedAt: new Date().toISOString() };
    const undoStack = pushUndo ? [...s.undoStack, JSON.stringify(s.project)].slice(-100) : s.undoStack;
    const projects = s.projects.map((p) => (p.id === stamped.id ? stamped : p));
    set({ dirty: true, project: stamped, projects, redoStack: pushUndo ? [] : s.redoStack, undoStack });
  };

  const commit = (fn: (p: VidoraProject) => VidoraProject | null) => {
    const s = get();
    if (!s.project) return;
    const next = fn(s.project);
    if (next) applyProject(next);
  };

  return {
    activeTab: 'Media',
    aspectRatio: '16:9',
    clipboard: null,
    customRatio: { height: 1080, width: 1920 },
    dirty: false,
    exportOpen: false,
    lastSavedAt: null,
    magnetic: true,
    playhead: 0,
    playing: false,
    project: null,
    projects: initial.projects,
    recoveredNotice: initial.recovered,
    redoStack: [],
    ripple: false,
    selectedClipIds: [],
    selectedTrackId: null,
    shortcuts: loadShortcuts(),
    shortcutsOpen: false,
    theme: 'dark',
    undoStack: [],
    view: 'dashboard',
    zoom: 24,

    createProject: (name) => {
      const now = new Date().toISOString();
      const project: VidoraProject = {
        ...structuredClone(SAMPLE_PROJECT),
        createdAt: now,
        folders: [{ id: 'folder-all', name: 'All media' }],
        id: newId('project'),
        isDraft: true,
        markers: [],
        media: [],
        name: name?.trim() || 'Untitled Project',
        tracks: [
          { clips: [], hidden: false, id: newId('track'), kind: 'video', locked: false, muted: false, name: 'Video 1' },
          { clips: [], hidden: false, id: newId('track'), kind: 'audio', locked: false, muted: false, name: 'Audio 1' },
        ],
        updatedAt: now,
      };
      const projects = [project, ...get().projects];
      writeProjects(projects);
      set({ aspectRatio: '16:9', playhead: 0, project, projects, redoStack: [], selectedClipIds: [], undoStack: [], view: 'editor' });
    },
    deleteProject: (id) => {
      const projects = get().projects.filter((p) => p.id !== id);
      writeProjects(projects);
      try {
        localStorage.removeItem(autosaveKey(id));
      } catch {
        /* ignore */
      }
      set({ projects, project: get().project?.id === id ? null : get().project, view: get().project?.id === id ? 'dashboard' : get().view });
    },
    duplicateProject: (id) => {
      const src = get().projects.find((p) => p.id === id);
      if (!src) return;
      const now = new Date().toISOString();
      const copy: VidoraProject = { ...structuredClone(src), createdAt: now, id: newId('project'), name: `${src.name} copy`, updatedAt: now };
      const projects = [copy, ...get().projects];
      writeProjects(projects);
      set({ projects });
    },
    openDashboard: () => set({ playing: false, view: 'dashboard' }),
    openProject: (project) => {
      const migrated = migrateProject(project);
      set({
        aspectRatio: migrated.aspectRatio,
        customRatio: migrated.customRatio ?? { height: 1080, width: 1920 },
        playhead: 0,
        project: migrated,
        redoStack: [],
        selectedClipIds: [],
        undoStack: [],
        view: 'editor',
      });
      try {
        localStorage.setItem(LAST_OPEN_KEY, migrated.id);
      } catch {
        /* ignore */
      }
    },
    renameProject: (id, name) => {
      const clean = name.trim().slice(0, 120);
      if (!clean) return;
      const projects = get().projects.map((p) => (p.id === id ? { ...p, name: clean, updatedAt: new Date().toISOString() } : p));
      writeProjects(projects);
      set({ project: get().project?.id === id ? { ...get().project!, name: clean } : get().project, projects });
    },

    addMarker: (label) => {
      const s = get();
      if (!s.project) return;
      const marker = { color: '#06B6D4', label: label ?? `Marker ${s.project.markers.length + 1}`, time: Math.round(s.playhead * 100) / 100 };
      applyProject({ ...s.project, markers: [...s.project.markers, marker].sort((a, b) => a.time - b.time) });
    },
    addMediaFiles: async (files, folderId = 'folder-all') => {
      const s = get();
      if (!s.project) return;
      const items: MediaItem[] = [];
      for (const file of Array.from(files)) {
        const item = await importFile(file, folderId);
        if (item) items.push(item);
      }
      if (items.length === 0) return;
      const project = get().project;
      if (!project) return;
      applyProject({ ...project, media: [...project.media, ...items] });
    },
    addMediaToTimeline: (mediaId) => {
      const s = get();
      if (!s.project) return;
      const media = s.project.media.find((m) => m.id === mediaId);
      if (!media) return;
      const kind: TrackKind = media.kind === 'audio' ? 'audio' : 'video';
      let tracks = s.project.tracks;
      let track = tracks.find((t) => t.kind === kind && !t.locked);
      if (!track) {
        track = { clips: [], hidden: false, id: newId('track'), kind, locked: false, muted: false, name: `${kind === 'audio' ? 'Audio' : 'Video'} ${tracks.filter((t) => t.kind === kind).length + 1}` };
        tracks = [...tracks, track];
      }
      const duration = media.kind === 'image' || media.kind === 'gif' ? 5 : media.duration && media.duration > 0 ? media.duration : 5;
      const start = Math.max(0, ...track.clips.map((c) => c.start + c.duration));
      const clip: Clip = {
        duration,
        effects: [],
        fit: 'fit',
        flipH: false,
        flipV: false,
        frozen: false,
        id: newId('clip'),
        isCompound: false,
        keyframes: [],
        mediaId: media.id,
        name: media.name,
        opacity: 1,
        pitchPreserved: true,
        positionX: 0,
        positionY: 0,
        reversed: false,
        rotation: 0,
        scale: 1,
        sourceDuration: duration,
        sourceStart: 0,
        speed: 1,
        src: media.src,
        start,
        trackId: track.id,
        type: media.kind === 'audio' ? 'audio' : media.kind === 'image' || media.kind === 'gif' ? 'image' : 'video',
        volume: 1,
      };
      applyProject({
        ...s.project,
        tracks: tracks.map((t) => (t.id === track!.id ? { ...t, clips: [...t.clips, clip] } : t)),
      });
      set({ selectedClipIds: [clip.id], selectedTrackId: track.id });
    },
    addTrack: (kind) => {
      const s = get();
      if (!s.project) return;
      const count = s.project.tracks.filter((t) => t.kind === kind).length + 1;
      const track = { clips: [], hidden: false, id: newId('track'), kind, locked: false, muted: false, name: `${kind === 'video' ? 'Video' : kind === 'audio' ? 'Audio' : 'Text'} ${count}` };
      applyProject({ ...s.project, tracks: [...s.project.tracks, track] });
    },
    copySelected: () => {
      const s = get();
      if (!s.project || s.selectedClipIds.length === 0) return;
      const clips = s.selectedClipIds.map((id) => findClip(s.project!, id)?.clip).filter((c): c is Clip => Boolean(c));
      set({ clipboard: clips });
    },
    deleteSelected: () => {
      const s = get();
      if (!s.project) return;
      let next = s.project;
      for (const id of s.selectedClipIds) next = deleteClip(next, id);
      applyProject(next);
      set({ selectedClipIds: [] });
    },
    duplicateSelected: () => {
      const s = get();
      if (!s.project || s.selectedClipIds.length === 0) return;
      let next = s.project;
      for (const id of s.selectedClipIds) {
        const dup = duplicateClip(next, id);
        if (dup) next = dup;
      }
      applyProject(next);
    },
    freezeSelected: () => {
      const s = get();
      if (!s.project || s.selectedClipIds.length === 0) return;
      const id = s.selectedClipIds[0];
      const clip = findClip(s.project, id)?.clip;
      if (clip) commit((p) => updateClip(p, id, { frozen: !clip.frozen }));
    },
    groupSelected: () => {
      const s = get();
      if (!s.project || s.selectedClipIds.length < 2) return;
      const { project } = groupClips(s.project, s.selectedClipIds);
      applyProject(project);
    },
    makeCompoundSelected: () => {
      const s = get();
      if (!s.project || s.selectedClipIds.length < 2) return;
      const next = makeCompound(s.project, s.selectedClipIds, `Compound ${s.selectedClipIds.length} clips`);
      if (next) {
        applyProject(next);
        set({ selectedClipIds: [] });
      }
    },
    moveSelected: (newStart, trackId) => {
      const s = get();
      if (!s.project || s.selectedClipIds.length === 0) return;
      const next = moveClip(s.project, s.selectedClipIds[0], newStart, trackId);
      if (next) applyProject(next, false);
    },
    pasteClipboard: () => {
      const s = get();
      if (!s.project || !s.clipboard || s.clipboard.length === 0) return;
      let next = s.project;
      const newIds: string[] = [];
      for (const src of s.clipboard) {
        const track = next.tracks.find((t) => t.id === src.trackId) ?? next.tracks[0];
        if (!track) continue;
        const end = Math.max(0, ...track.clips.map((c) => c.start + c.duration));
        const copy: Clip = { ...src, id: newId('clip'), name: `${src.name} copy`, start: end, trackId: track.id };
        newIds.push(copy.id);
        next = { ...next, tracks: next.tracks.map((t) => (t.id === track.id ? { ...t, clips: [...t.clips, copy] } : t)) };
      }
      applyProject(next);
      set({ selectedClipIds: newIds });
    },
    removeMarker: (time) => {
      const s = get();
      if (!s.project) return;
      applyProject({ ...s.project, markers: s.project.markers.filter((m) => m.time !== time) });
    },
    reverseSelected: () => {
      const s = get();
      if (!s.project || s.selectedClipIds.length === 0) return;
      const id = s.selectedClipIds[0];
      const clip = findClip(s.project, id)?.clip;
      if (clip) commit((p) => updateClip(p, id, { reversed: !clip.reversed }));
    },
    rippleDeleteSelected: () => {
      const s = get();
      if (!s.project) return;
      let next = s.project;
      for (const id of s.selectedClipIds) next = rippleDeleteClip(next, id);
      applyProject(next);
      set({ selectedClipIds: [] });
    },
    selectClip: (clipId, additive) => {
      if (!clipId) return set({ selectedClipIds: [] });
      const s = get();
      set({ selectedClipIds: additive ? [...new Set([...s.selectedClipIds, clipId])] : [clipId] });
    },
    selectTrack: (trackId) => set({ selectedTrackId: trackId }),
    setClipSpeed: (speed) => {
      const s = get();
      if (!s.project || s.selectedClipIds.length === 0) return;
      const id = s.selectedClipIds[0];
      const clip = findClip(s.project, id)?.clip;
      if (!clip) return;
      const clamped = Math.min(100, Math.max(0.1, speed));
      const source = clip.sourceDuration ?? clip.duration * clip.speed;
      commit((p) => updateClip(p, id, { duration: durationAtSpeed(source, clamped), sourceDuration: source, speed: clamped }));
    },
    setMagnetic: (v) => set({ magnetic: v }),
    setPlayhead: (t) => set({ playhead: Math.max(0, t) }),
    setPlaying: (v) => set({ playing: v }),
    setRipple: (v) => set({ ripple: v }),
    setTrackProp: (trackId, patch) => {
      const s = get();
      if (!s.project) return;
      applyProject({ ...s.project, tracks: s.project.tracks.map((t) => (t.id === trackId ? { ...t, ...patch } : t)) });
    },
    setZoom: (z) => set({ zoom: Math.min(120, Math.max(8, z)) }),
    splitAtPlayhead: () => {
      const s = get();
      if (!s.project || s.selectedClipIds.length === 0) return;
      const next = splitClipAt(s.project, s.selectedClipIds[0], s.playhead);
      if (next) applyProject(next);
    },
    trimSelected: (edge, delta) => {
      const s = get();
      if (!s.project || s.selectedClipIds.length === 0) return;
      const next = trimClip(s.project, s.selectedClipIds[0], edge, delta);
      if (next) applyProject(next, false);
    },
    ungroupSelected: () => {
      const s = get();
      if (!s.project || s.selectedClipIds.length === 0) return;
      const clip = findClip(s.project, s.selectedClipIds[0])?.clip;
      if (!clip?.groupId) return;
      applyProject(ungroupClips(s.project, clip.groupId));
    },
    updateSelectedClip: (patch) => {
      const s = get();
      if (!s.project || s.selectedClipIds.length === 0) return;
      commit((p) => updateClip(p, s.selectedClipIds[0], patch));
    },

    addFolder: (name) => {
      const s = get();
      if (!s.project || !name.trim()) return;
      applyProject({ ...s.project, folders: [...s.project.folders, { id: newId('folder'), name: name.trim().slice(0, 80) }] });
    },

    setActiveTab: (tab) => set({ activeTab: tab }),
    setAspectRatio: (ratio) => {
      const s = get();
      if (!s.project) return set({ aspectRatio: ratio });
      const resolution = resolutionForRatio(ratio, s.customRatio);
      applyProject({ ...s.project, aspectRatio: ratio, resolution });
      set({ aspectRatio: ratio });
    },
    setCustomRatio: (width, height) => {
      const s = get();
      const customRatio = { height: Math.max(1, height), width: Math.max(1, width) };
      set({ customRatio });
      if (!s.project) return;
      applyProject({ ...s.project, aspectRatio: 'custom', customRatio, resolution: customRatio });
      set({ aspectRatio: 'custom' });
    },
    setExportOpen: (v) => set({ exportOpen: v }),
    setShortcutsOpen: (v) => set({ shortcutsOpen: v }),
    setShortcut: (action, combo) => {
      const shortcuts = { ...get().shortcuts, [action]: combo };
      saveShortcuts(shortcuts);
      set({ shortcuts });
    },
    resetShortcuts: () => {
      saveShortcuts({ ...DEFAULT_SHORTCUTS });
      set({ shortcuts: { ...DEFAULT_SHORTCUTS } });
    },
    setTheme: (theme) => set({ theme }),
    dismissRecovery: () => set({ recoveredNotice: null }),
    saveNow: () => {
      const s = get();
      if (!s.project) return;
      writeProjects(s.projects);
      try {
        localStorage.setItem(autosaveKey(s.project.id), JSON.stringify({ project: s.project, savedAt: new Date().toISOString() }));
      } catch {
        /* ignore */
      }
      set({ dirty: false, lastSavedAt: new Date().toISOString() });
    },
    undo: () => {
      const s = get();
      if (s.undoStack.length === 0 || !s.project) return;
      const prev = s.undoStack[s.undoStack.length - 1];
      const project = parseProject(JSON.parse(prev) as unknown);
      const projects = s.projects.map((p) => (p.id === project.id ? project : p));
      set({ project, projects, redoStack: [...s.redoStack, JSON.stringify(s.project)], undoStack: s.undoStack.slice(0, -1), dirty: true });
    },
    redo: () => {
      const s = get();
      if (s.redoStack.length === 0 || !s.project) return;
      const nextRaw = s.redoStack[s.redoStack.length - 1];
      const project = parseProject(JSON.parse(nextRaw) as unknown);
      const projects = s.projects.map((p) => (p.id === project.id ? project : p));
      set({ project, projects, redoStack: s.redoStack.slice(0, -1), undoStack: [...s.undoStack, JSON.stringify(s.project)], dirty: true });
    },
  };
});

/** Autosave loop: call once from App. Saves every 3 s while dirty. */
export function startAutosave(): () => void {
  const timer = window.setInterval(() => {
    const s = useProjectStore.getState();
    if (s.dirty && s.project) s.saveNow();
  }, 3000);
  return () => window.clearInterval(timer);
}

export function projectDurationNow(): number {
  const p = useProjectStore.getState().project;
  return p ? projectDuration(p) : 0;
}
