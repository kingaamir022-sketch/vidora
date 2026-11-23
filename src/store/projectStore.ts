import { create } from 'zustand';
import {
  defaultAdjustment,
  migrateProject,
  newId,
  parseProject,
  resolutionForRatio,
  SAMPLE_PROJECT,
  type Adjustment,
  type AnimationKind,
  type AspectRatio,
  type Clip,
  type ClipBackground,
  type ClipMask,
  type ClipTransition,
  type Keyframe,
  type LayoutMode,
  type Lut,
  type MediaItem,
  type TrackKind,
  type VidoraProject,
} from '../schema/project';
import { importFile } from '../lib/media';
import { addKeyframe, removeKeyframe, updateKeyframe } from '../lib/keyframes';
import { anyEffectDef, defaultEffectParams } from '../lib/effects';
import { BUILTIN_LUTS, parseCube } from '../lib/lut';
import { DEFAULT_SHORTCUTS, loadShortcuts, saveShortcuts, type ShortcutAction } from '../lib/shortcuts';
import {
  allClipIds,
  addClipToAudioTrack,
  addClipToTextTrack,
  deleteClip,
  detachAudio,
  duplicateClip,
  durationAtSpeed,
  findClip,
  groupClips,
  makeCompound,
  moveClip,
  projectDuration,
  rippleDeleteClip,
  speedForDuration,
  splitClipAt,
  splitClipAtTimes,
  trimClip,
  ungroupClips,
  updateClip,
} from '../lib/timeline';
import { defaultTextStyle, type TextStyle } from '../schema/project';
import { TEXT_STYLE_PRESETS } from '../lib/text';
import { shapeSvg, stickerById } from '../lib/stickers';
import { backgroundDef } from '../lib/backgrounds';
import { applyTemplate } from '../lib/templates';
import { normalizeGain } from '../lib/audio';
import {
  parseCaptionFile,
  retimeWords,
  serializeSrt,
  serializeVtt,
  splitCue,
  transcriptToCues,
} from '../lib/captions';

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

/** Base clip for Phase 3 text/sticker/drawing clips (3s at the playhead by default). */
function baseClip(type: Clip['type'], name: string, duration: number, start: number): Clip {
  return {
    adjustment: defaultAdjustment(),
    animationIn: { duration: 0.5, kind: 'none' },
    animationLoop: { duration: 2, kind: 'none' },
    animationOut: { duration: 0.5, kind: 'none' },
    audioDetached: false,
    audioRole: 'music',
    background: { color: '#000000', gradient: 'linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)', type: 'blur' },
    chromaKey: { color: '#00FF00', enabled: false, smoothness: 0.2, tolerance: 0.3 },
    duration,
    effects: [],
    eq: { high: 0, low: 0, mid: 0 },
    fadeIn: 0,
    fadeOut: 0,
    fit: 'fit',
    flipH: false,
    flipV: false,
    frozen: false,
    id: newId('clip'),
    isCompound: false,
    keyframes: [],
    layoutMode: 'full',
    layoutSlot: 0,
    name,
    muted: false,
    noiseReduction: false,
    opacity: 1,
    pitchPreserved: true,
    positionX: 0,
    positionY: 0,
    reversed: false,
    rotation: 0,
    scale: 1,
    smoothSlowMo: false,
    sourceDuration: duration,
    sourceStart: 0,
    speed: 1,
    start: Math.max(0, start),
    trackId: '',
    type,
    voice: 'none',
    volume: 1,
  };
}

/** Append a clip to the first unlocked text track (creating one if needed). */
interface ProjectState {
  activeTab: LeftTab;
  aspectRatio: AspectRatio;
  clipboard: Clip[] | null;
  customRatio: { height: number; width: number };
  dirty: boolean;
  exportOpen: boolean;
  lastSavedAt: string | null;
  magnetic: boolean;
  maskEditing: boolean;
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
  // Phase 3 — drawing / tracking modes (read by PreviewArea)
  drawMode: boolean;
  drawColor: string;
  drawWidth: number;
  trackingMode: boolean;
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
  selectAllClips: () => void;
  selectTrack: (trackId: string | null) => void;
  setClipSpeed: (speed: number) => void;
  setClipDuration: (seconds: number) => void;
  setMagnetic: (v: boolean) => void;
  setPlayhead: (t: number) => void;
  setPlaying: (v: boolean) => void;
  setRipple: (v: boolean) => void;
  setTrackProp: (trackId: string, patch: Partial<{ hidden: boolean; locked: boolean; muted: boolean; name: string; solo: boolean; volume: number }>) => void;
  setZoom: (z: number) => void;
  splitAtPlayhead: () => void;
  trimSelected: (edge: 'start' | 'end', delta: number) => void;
  ungroupSelected: () => void;
  updateSelectedClip: (patch: Partial<Clip>) => void;
  // Phase 2 — keyframes & animation
  addKeyframeAtPlayhead: (property: string) => void;
  updateKeyframe: (id: string, patch: Partial<Keyframe>) => void;
  removeKeyframe: (id: string) => void;
  setAnimation: (phase: 'in' | 'out', kind: AnimationKind, duration: number) => void;
  // Phase 2 — effects / transitions / LUT
  addEffect: (name: string) => void;
  removeEffect: (id: string) => void;
  updateEffect: (id: string, patch: Partial<{ intensity: number; params: Record<string, number | string | boolean> }>) => void;
  setTransition: (transition: ClipTransition | null) => void;
  setLut: (lut: Lut | null) => void;
  setBuiltinLut: (name: string) => void;
  importLutFile: (file: File) => Promise<string | null>;
  // Phase 2 — colour & adjustment
  updateAdjustment: (patch: Partial<Adjustment>) => void;
  // Phase 2 — masks / chroma / layout / background
  setMask: (mask: ClipMask | null) => void;
  updateMask: (patch: Partial<ClipMask>) => void;
  updateChromaKey: (patch: Partial<{ color: string; enabled: boolean; smoothness: number; tolerance: number }>) => void;
  setLayout: (mode: LayoutMode, slot?: number) => void;
  setBackground: (patch: Partial<ClipBackground>) => void;
  setMaskEditing: (v: boolean) => void;
  addPenPoint: (x: number, y: number) => void;
  clearPenPoints: () => void;
  // Phase 3 — text & graphics
  addTextClip: (presetId?: string) => void;
  updateTextStyle: (patch: Partial<TextStyle>) => void;
  applyTextStyleToAll: () => void;
  addStickerClip: (stickerId: string) => void;
  addShapeClip: (shapeId: string, fill: string) => void;
  // Phase 5 — procedural backgrounds + templates (Section N)
  addBackgroundClip: (backgroundId: string) => void;
  useTemplate: (templateId: string) => void;
  setDrawMode: (v: boolean) => void;
  setDrawColor: (color: string) => void;
  setDrawWidth: (w: number) => void;
  addDrawingStroke: (points: { x: number; y: number }[]) => void;
  clearDrawing: () => void;
  setTracking: (targetClipId: string | null) => void;
  setTrackingMode: (v: boolean) => void;
  addTrackPoint: (x: number, y: number) => void;
  clearTrackPoints: () => void;
  // Phase 3 — captions & speech
  addCaptionCue: () => void;
  updateCaptionCue: (id: string, patch: Partial<{ end: number; start: number; styleId: string; text: string }>) => void;
  deleteCaptionCue: (id: string) => void;
  deleteAllCaptions: () => void;
  splitCaptionCueAtPlayhead: () => void;
  setCaptionStyle: (styleId: string) => void;
  importCaptionsFile: (file: File) => Promise<string | null>;
  exportCaptions: (format: 'srt' | 'vtt') => string;
  generateCaptionsFromTranscript: (transcript: string, language: string) => void;
  translateCaptionCue: (id: string, language: string, text: string) => void;
  addTtsNarration: (text: string, voice: string, rate: number, pitch: number) => void;
  // Phase 4 — audio (Section J)
  detachAudio: () => void;
  setMixer: (patch: Partial<{ duckAmountDb: number; ducking: boolean; masterVolume: number }>) => void;
  normalizeSelectedClip: () => number | null;
  applyVoiceToAll: (voiceId: string) => void;
  addBeatMarkers: (times: number[]) => void;
  splitSelectedAtTimes: (times: number[]) => void;
  addVoiceoverClip: (blob: Blob, name: string, durationSeconds?: number) => Promise<void>;
  addAudioClip: (mediaId: string, start?: number) => void;
  addMediaItem: (item: MediaItem) => void;
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
  snapshot: () => void;
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
    drawColor: '#FFFFFF',
    drawMode: false,
    drawWidth: 4,
    exportOpen: false,
    lastSavedAt: null,
    magnetic: true,
    maskEditing: false,
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
    trackingMode: false,
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
          { clips: [], hidden: false, id: newId('track'), kind: 'video', locked: false, muted: false, name: 'Video 1', solo: false, volume: 1 },
          { clips: [], hidden: false, id: newId('track'), kind: 'audio', locked: false, muted: false, name: 'Audio 1', solo: false, volume: 1 },
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
        track = { clips: [], hidden: false, id: newId('track'), kind, locked: false, muted: false, name: `${kind === 'audio' ? 'Audio' : 'Video'} ${tracks.filter((t) => t.kind === kind).length + 1}`, solo: false, volume: 1 };
        tracks = [...tracks, track];
      }
      const duration = media.kind === 'image' || media.kind === 'gif' ? 5 : media.duration && media.duration > 0 ? media.duration : 5;
      const start = Math.max(0, ...track.clips.map((c) => c.start + c.duration));
      const clip: Clip = {
        adjustment: defaultAdjustment(),
        animationIn: { duration: 0.5, kind: 'none' },
        animationLoop: { duration: 2, kind: 'none' },
        animationOut: { duration: 0.5, kind: 'none' },
        audioDetached: false,
        audioRole: 'music',
        background: { color: '#000000', gradient: 'linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)', type: 'blur' },
        chromaKey: { color: '#00FF00', enabled: false, smoothness: 0.2, tolerance: 0.3 },
        duration,
        effects: [],
        eq: { high: 0, low: 0, mid: 0 },
        fadeIn: 0,
        fadeOut: 0,
        fit: 'fit',
        flipH: false,
        flipV: false,
        frozen: false,
        id: newId('clip'),
        isCompound: false,
        keyframes: [],
        layoutMode: 'full',
        layoutSlot: 0,
        mediaId: media.id,
        name: media.name,
        muted: false,
        noiseReduction: false,
        opacity: 1,
        pitchPreserved: true,
        positionX: 0,
        positionY: 0,
        reversed: false,
        rotation: 0,
        scale: 1,
        smoothSlowMo: false,
        sourceDuration: duration,
        sourceStart: 0,
        speed: 1,
        src: media.src,
        start,
        trackId: track.id,
        type: media.kind === 'audio' ? 'audio' : media.kind === 'image' || media.kind === 'gif' ? 'image' : 'video',
        voice: 'none',
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
      const track = { clips: [], hidden: false, id: newId('track'), kind, locked: false, muted: false, name: `${kind === 'video' ? 'Video' : kind === 'audio' ? 'Audio' : 'Text'} ${count}`, solo: false, volume: 1 };
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
    selectAllClips: () => {
      const s = get();
      if (!s.project) return;
      set({ selectedClipIds: allClipIds(s.project) });
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
    setClipDuration: (seconds) => {
      const s = get();
      if (!s.project || s.selectedClipIds.length === 0) return;
      const id = s.selectedClipIds[0];
      const clip = findClip(s.project, id)?.clip;
      if (!clip) return;
      const source = clip.sourceDuration ?? clip.duration * clip.speed;
      const speed = speedForDuration(source, seconds);
      commit((p) => updateClip(p, id, { duration: durationAtSpeed(source, speed), sourceDuration: source, speed }));
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

    // ---- Phase 2: keyframes & animation (all undo-covered via commit) ----
    addKeyframeAtPlayhead: (property) => {
      const s = get();
      if (!s.project || s.selectedClipIds.length === 0) return;
      const id = s.selectedClipIds[0];
      const clip = findClip(s.project, id)?.clip;
      if (!clip) return;
      const local = Math.max(0, Math.min(clip.duration, s.playhead - clip.start));
      const fallback =
        property === 'positionX' ? clip.positionX
        : property === 'positionY' ? clip.positionY
        : property === 'scale' ? clip.scale
        : property === 'rotation' ? clip.rotation
        : property === 'opacity' ? clip.opacity
        : property === 'volume' ? clip.volume
        : property === 'brightness' ? clip.adjustment.brightness
        : property === 'maskFeather' ? clip.mask?.feather ?? 0
        : 0;
      commit((p) => updateClip(p, id, { keyframes: addKeyframe(clip.keyframes, property, local, fallback) }));
    },
    updateKeyframe: (kfId, patch) => {
      const s = get();
      if (!s.project || s.selectedClipIds.length === 0) return;
      const id = s.selectedClipIds[0];
      const clip = findClip(s.project, id)?.clip;
      if (!clip) return;
      commit((p) => updateClip(p, id, { keyframes: updateKeyframe(clip.keyframes, kfId, patch) }));
    },
    removeKeyframe: (kfId) => {
      const s = get();
      if (!s.project || s.selectedClipIds.length === 0) return;
      const id = s.selectedClipIds[0];
      const clip = findClip(s.project, id)?.clip;
      if (!clip) return;
      commit((p) => updateClip(p, id, { keyframes: removeKeyframe(clip.keyframes, kfId) }));
    },
    setAnimation: (phase, kind, duration) => {
      const s = get();
      if (!s.project || s.selectedClipIds.length === 0) return;
      const id = s.selectedClipIds[0];
      commit((p) => updateClip(p, id, phase === 'in' ? { animationIn: { duration, kind } } : { animationOut: { duration, kind } }));
    },

    // ---- Phase 2: effects / transitions / LUT ----
    addEffect: (name) => {
      const s = get();
      if (!s.project || s.selectedClipIds.length === 0) return;
      const def = anyEffectDef(name);
      if (!def) return;
      const id = s.selectedClipIds[0];
      const clip = findClip(s.project, id)?.clip;
      if (!clip || clip.effects.some((e) => e.name === name)) return;
      const effect = { id: newId('fx'), intensity: 1, name, params: defaultEffectParams(def) };
      commit((p) => updateClip(p, id, { effects: [...clip.effects, effect] }));
    },
    removeEffect: (fxId) => {
      const s = get();
      if (!s.project || s.selectedClipIds.length === 0) return;
      const id = s.selectedClipIds[0];
      const clip = findClip(s.project, id)?.clip;
      if (!clip) return;
      commit((p) => updateClip(p, id, { effects: clip.effects.filter((e) => e.id !== fxId) }));
    },
    updateEffect: (fxId, patch) => {
      const s = get();
      if (!s.project || s.selectedClipIds.length === 0) return;
      const id = s.selectedClipIds[0];
      const clip = findClip(s.project, id)?.clip;
      if (!clip) return;
      commit((p) =>
        updateClip(p, id, {
          effects: clip.effects.map((e) => (e.id === fxId ? { ...e, ...patch, params: { ...e.params, ...(patch.params ?? {}) } } : e)),
        }),
      );
    },
    setTransition: (transition) => {
      const s = get();
      if (!s.project || s.selectedClipIds.length === 0) return;
      const id = s.selectedClipIds[0];
      commit((p) => updateClip(p, id, transition ? { transitionIn: transition } : { transitionIn: undefined }));
    },
    setLut: (lut) => {
      const s = get();
      if (!s.project || s.selectedClipIds.length === 0) return;
      const id = s.selectedClipIds[0];
      commit((p) => updateClip(p, id, lut ? { lut } : { lut: undefined }));
    },
    setBuiltinLut: (name) => {
      const s = get();
      if (!s.project || s.selectedClipIds.length === 0) return;
      const found = BUILTIN_LUTS.find((l) => l.name === name);
      if (!found) return;
      const id = s.selectedClipIds[0];
      commit((p) => updateClip(p, id, { lut: { data: found.data, intensity: 1, name: found.name, size: found.size, source: 'builtin' } }));
    },
    importLutFile: async (file) => {
      const s = get();
      if (!s.project || s.selectedClipIds.length === 0) return 'Select a clip first.';
      let parsed;
      try {
        parsed = parseCube(await file.text());
      } catch (err) {
        return err instanceof Error ? err.message : 'Could not parse this .cube file.';
      }
      const id = s.selectedClipIds[0];
      commit((p) =>
        updateClip(p, id, { lut: { data: parsed.data, intensity: 1, name: parsed.title, size: parsed.size, source: 'imported' } }),
      );
      return null;
    },

    // ---- Phase 2: colour & adjustment ----
    updateAdjustment: (patch) => {
      const s = get();
      if (!s.project || s.selectedClipIds.length === 0) return;
      const id = s.selectedClipIds[0];
      const clip = findClip(s.project, id)?.clip;
      if (!clip) return;
      const adjustment = { ...clip.adjustment, ...patch };
      commit((p) => updateClip(p, id, { adjustment }));
    },

    // ---- Phase 2: masks / chroma / layout / background ----
    setMask: (mask) => {
      const s = get();
      if (!s.project || s.selectedClipIds.length === 0) return;
      const id = s.selectedClipIds[0];
      commit((p) => updateClip(p, id, mask ? { mask } : { mask: undefined }));
    },
    updateMask: (patch) => {
      const s = get();
      if (!s.project || s.selectedClipIds.length === 0) return;
      const id = s.selectedClipIds[0];
      const clip = findClip(s.project, id)?.clip;
      if (!clip?.mask) return;
      commit((p) => updateClip(p, id, { mask: { ...clip.mask!, ...patch } }));
    },
    updateChromaKey: (patch) => {
      const s = get();
      if (!s.project || s.selectedClipIds.length === 0) return;
      const id = s.selectedClipIds[0];
      const clip = findClip(s.project, id)?.clip;
      if (!clip) return;
      commit((p) => updateClip(p, id, { chromaKey: { ...clip.chromaKey, ...patch } }));
    },
    setLayout: (mode, slot = 0) => {
      const s = get();
      if (!s.project || s.selectedClipIds.length === 0) return;
      const id = s.selectedClipIds[0];
      commit((p) => updateClip(p, id, { layoutMode: mode, layoutSlot: slot }));
    },
    setBackground: (patch) => {
      const s = get();
      if (!s.project || s.selectedClipIds.length === 0) return;
      const id = s.selectedClipIds[0];
      const clip = findClip(s.project, id)?.clip;
      if (!clip) return;
      commit((p) => updateClip(p, id, { background: { ...clip.background, ...patch } }));
    },
    setMaskEditing: (v) => set({ maskEditing: v }),
    addPenPoint: (x, y) => {
      const s = get();
      if (!s.project || s.selectedClipIds.length === 0) return;
      const id = s.selectedClipIds[0];
      const clip = findClip(s.project, id)?.clip;
      if (!clip?.mask || clip.mask.shape !== 'pen') return;
      commit((p) => updateClip(p, id, { mask: { ...clip.mask!, points: [...clip.mask!.points, { x, y }] } }));
    },
    clearPenPoints: () => {
      const s = get();
      if (!s.project || s.selectedClipIds.length === 0) return;
      const id = s.selectedClipIds[0];
      const clip = findClip(s.project, id)?.clip;
      if (!clip?.mask) return;
      commit((p) => updateClip(p, id, { mask: { ...clip.mask!, points: [] } }));
    },

    // ---- Phase 3: text & graphics (all undo-covered via commit) ----
    addTextClip: (presetId) => {
      const s = get();
      if (!s.project) return;
      const preset = presetId ? TEXT_STYLE_PRESETS.find((p) => p.id === presetId) : undefined;
      const style = preset ? { ...preset.style, content: preset.style.content } : defaultTextStyle('Heading');
      const base = baseClip('text', preset?.name ?? 'Text', 3, s.playhead);
      const clip: Clip = { ...base, text: { content: style.content, style, tts: null } };
      commit((p) => addClipToTextTrack(p, clip));
      set({ selectedClipIds: [clip.id] });
    },
    updateTextStyle: (patch) => {
      const s = get();
      if (!s.project || s.selectedClipIds.length === 0) return;
      const id = s.selectedClipIds[0];
      const clip = findClip(s.project, id)?.clip;
      if (!clip?.text) return;
      const style = { ...clip.text.style, ...patch };
      commit((p) => updateClip(p, id, { text: { ...clip.text!, content: style.content, style } }));
    },
    applyTextStyleToAll: () => {
      const s = get();
      if (!s.project || s.selectedClipIds.length === 0) return;
      const src = findClip(s.project, s.selectedClipIds[0])?.clip;
      if (!src?.text) return;
      const { content: _content, ...styleOnly } = src.text.style;
      void _content;
      let next = s.project;
      for (const track of next.tracks) {
        for (const c of track.clips) {
          if (c.type === 'text' && c.text) {
            next = updateClip(next, c.id, { text: { ...c.text, style: { ...styleOnly, content: c.text.style.content } } });
          }
        }
      }
      applyProject(next);
    },
    addStickerClip: (stickerId) => {
      const s = get();
      if (!s.project) return;
      const def = stickerById(stickerId);
      if (!def) return;
      const base = baseClip('sticker', def.name, 3, s.playhead);
      const clip: Clip = { ...base, sticker: { category: def.category, id: def.id, kind: 'sticker', svg: def.svg } };
      commit((p) => addClipToTextTrack(p, clip));
      set({ selectedClipIds: [clip.id] });
    },
    addShapeClip: (shapeId, fill) => {
      const s = get();
      if (!s.project) return;
      const base = baseClip('sticker', shapeId, 3, s.playhead);
      const clip: Clip = { ...base, sticker: { category: 'Shapes', id: `shape-${shapeId}`, kind: 'shape', svg: shapeSvg(shapeId, fill) } };
      commit((p) => addClipToTextTrack(p, clip));
      set({ selectedClipIds: [clip.id] });
    },
    // ---- Phase 5: procedural backgrounds + templates (Section N) ----
    addBackgroundClip: (backgroundId) => {
      const s = get();
      if (!s.project) return;
      const def = backgroundDef(backgroundId);
      if (!def) return;
      const base = baseClip('sticker', def.name, 5, s.playhead);
      const clip: Clip = { ...base, sticker: { category: 'Backgrounds', id: `bg-${def.id}`, kind: 'sticker', svg: def.svg } };
      commit((p) => addClipToTextTrack(p, clip));
      set({ selectedClipIds: [clip.id] });
    },
    useTemplate: (templateId) => {
      let base = get().project;
      if (!base) {
        get().createProject('Untitled Project');
        base = get().project;
      }
      if (!base) return;
      const next = applyTemplate(base, templateId);
      if (!next) return;
      const projects = [next, ...get().projects.filter((p) => p.id !== next.id)];
      writeProjects(projects);
      set({ aspectRatio: next.aspectRatio, playhead: 0, project: next, projects, redoStack: [], selectedClipIds: [], undoStack: [], view: 'editor' });
    },
    setDrawMode: (v) => set({ drawMode: v }),
    setDrawColor: (color) => set({ drawColor: color }),
    setDrawWidth: (w) => set({ drawWidth: Math.min(40, Math.max(1, w)) }),
    addDrawingStroke: (points) => {
      const s = get();
      if (!s.project || points.length < 2) return;
      const stroke = { color: s.drawColor, points, width: s.drawWidth };
      const selected = s.selectedClipIds.length > 0 ? findClip(s.project, s.selectedClipIds[0])?.clip : undefined;
      if (selected?.drawing) {
        const id = selected.id;
        commit((p) => updateClip(p, id, { drawing: { strokes: [...selected.drawing!.strokes, stroke] } }));
        return;
      }
      const base = baseClip('sticker', 'Drawing', 5, s.playhead);
      const clip: Clip = { ...base, drawing: { strokes: [stroke] } };
      commit((p) => addClipToTextTrack(p, clip));
      set({ selectedClipIds: [clip.id] });
    },
    clearDrawing: () => {
      const s = get();
      if (!s.project || s.selectedClipIds.length === 0) return;
      const id = s.selectedClipIds[0];
      const clip = findClip(s.project, id)?.clip;
      if (!clip?.drawing) return;
      commit((p) => updateClip(p, id, { drawing: { strokes: [] } }));
    },
    setTracking: (targetClipId) => {
      const s = get();
      if (!s.project || s.selectedClipIds.length === 0) return;
      const id = s.selectedClipIds[0];
      const clip = findClip(s.project, id)?.clip;
      if (!clip) return;
      if (!targetClipId) {
        commit((p) => updateClip(p, id, { tracking: undefined }));
        return;
      }
      const target = findClip(s.project, targetClipId)?.clip;
      if (!target || target.id === id) return;
      commit((p) => updateClip(p, id, { tracking: { points: clip.tracking?.points ?? [], targetClipId } }));
    },
    setTrackingMode: (v) => set({ trackingMode: v }),
    addTrackPoint: (x, y) => {
      const s = get();
      if (!s.project || s.selectedClipIds.length === 0) return;
      const id = s.selectedClipIds[0];
      const clip = findClip(s.project, id)?.clip;
      if (!clip?.tracking) return;
      const time = Math.round(s.playhead * 100) / 100;
      const points = clip.tracking.points.filter((pt) => Math.abs(pt.time - time) > 0.05);
      points.push({ time, x, y });
      points.sort((a, b) => a.time - b.time);
      commit((p) => updateClip(p, id, { tracking: { ...clip.tracking!, points } }));
    },
    clearTrackPoints: () => {
      const s = get();
      if (!s.project || s.selectedClipIds.length === 0) return;
      const id = s.selectedClipIds[0];
      const clip = findClip(s.project, id)?.clip;
      if (!clip?.tracking) return;
      commit((p) => updateClip(p, id, { tracking: { ...clip.tracking!, points: [] } }));
    },

    // ---- Phase 3: captions & speech ----
    addCaptionCue: () => {
      const s = get();
      if (!s.project) return;
      const start = Math.round(s.playhead * 100) / 100;
      const cue = { end: start + 2, id: newId('cue'), start, text: 'New caption', translations: {}, words: retimeWords('New caption', start, start + 2) };
      applyProject({ ...s.project, captions: [...s.project.captions, cue].sort((a, b) => a.start - b.start) });
    },
    updateCaptionCue: (id, patch) => {
      const s = get();
      if (!s.project) return;
      const cue = s.project.captions.find((c) => c.id === id);
      if (!cue) return;
      const next = { ...cue, ...patch };
      if (patch.text !== undefined || patch.start !== undefined || patch.end !== undefined) {
        next.words = retimeWords(next.text, next.start, next.end);
      }
      applyProject({ ...s.project, captions: s.project.captions.map((c) => (c.id === id ? next : c)).sort((a, b) => a.start - b.start) });
    },
    deleteCaptionCue: (id) => {
      const s = get();
      if (!s.project) return;
      applyProject({ ...s.project, captions: s.project.captions.filter((c) => c.id !== id) });
    },
    deleteAllCaptions: () => {
      const s = get();
      if (!s.project) return;
      applyProject({ ...s.project, captions: [] });
    },
    splitCaptionCueAtPlayhead: () => {
      const s = get();
      if (!s.project) return;
      const cue = s.project.captions.find((c) => s.playhead > c.start && s.playhead < c.end);
      if (!cue) return;
      const halves = splitCue(cue, s.playhead);
      if (!halves) return;
      applyProject({
        ...s.project,
        captions: [...s.project.captions.filter((c) => c.id !== cue.id), halves[0], halves[1]].sort((a, b) => a.start - b.start),
      });
    },
    setCaptionStyle: (styleId) => {
      const s = get();
      if (!s.project) return;
      applyProject({ ...s.project, captionStyleId: styleId });
    },
    importCaptionsFile: async (file) => {
      const s = get();
      if (!s.project) return 'No project is open.';
      let cues;
      try {
        cues = parseCaptionFile(file.name, await file.text());
      } catch (err) {
        return err instanceof Error ? err.message : 'Could not parse this caption file.';
      }
      const project = get().project;
      if (!project) return 'No project is open.';
      const merged = [...project.captions, ...cues].sort((a, b) => a.start - b.start);
      applyProject({ ...project, captions: merged });
      return null;
    },
    exportCaptions: (format) => {
      const s = get();
      if (!s.project) return '';
      return format === 'srt' ? serializeSrt(s.project.captions) : serializeVtt(s.project.captions);
    },
    generateCaptionsFromTranscript: (transcript, _language) => {
      const s = get();
      if (!s.project) return;
      void _language; // language is a UI choice for now; cues store text only (Whisper STT is Phase 7)
      const selected = s.selectedClipIds.length > 0 ? findClip(s.project, s.selectedClipIds[0])?.clip : undefined;
      const start = selected ? selected.start : 0;
      const end = selected ? selected.start + selected.duration : Math.max(5, projectDuration(s.project));
      const cues = transcriptToCues(transcript, start, end);
      if (cues.length === 0) return;
      applyProject({ ...s.project, captions: [...s.project.captions, ...cues].sort((a, b) => a.start - b.start) });
    },
    translateCaptionCue: (id, language, text) => {
      const s = get();
      if (!s.project) return;
      applyProject({
        ...s.project,
        captions: s.project.captions.map((c) => (c.id === id ? { ...c, translations: { ...c.translations, [language]: text } } : c)),
      });
    },
    addTtsNarration: (text, voice, rate, pitch) => {
      const s = get();
      if (!s.project || !text.trim()) return;
      const words = text.trim().split(/\s+/).length;
      const duration = Math.min(30, Math.max(3, Math.round(words * 0.45)));
      const style = defaultTextStyle(text.trim());
      const base = baseClip('text', 'Narration', duration, s.playhead);
      const clip: Clip = {
        ...base,
        text: { content: text.trim(), style: { ...style, fontSize: 20 }, tts: { pitch, rate, voice } },
      };
      commit((p) => addClipToTextTrack(p, clip));
      set({ selectedClipIds: [clip.id] });
    },

    // Phase 4 — audio (Section J)
    detachAudio: () => {
      const s = get();
      if (!s.project || s.selectedClipIds.length === 0) return;
      const id = s.selectedClipIds[0];
      let audioClipId: string | null = null;
      commit((p) => {
        const result = detachAudio(p, id);
        if (!result) return null;
        audioClipId = result.audioClipId;
        return result.project;
      });
      if (audioClipId) set({ selectedClipIds: [audioClipId] });
    },
    setMixer: (patch) => {
      const s = get();
      if (!s.project) return;
      applyProject({ ...s.project, mixer: { ...s.project.mixer, ...patch } });
    },
    normalizeSelectedClip: () => {
      const s = get();
      if (!s.project || s.selectedClipIds.length === 0) return null;
      const found = findClip(s.project, s.selectedClipIds[0]);
      if (!found || found.clip.type !== 'audio') return null;
      const media = s.project.media.find((m) => m.id === found.clip.mediaId);
      const gain = normalizeGain(media?.peakLevel);
      if (gain === null) return null;
      commit((p) => updateClip(p, found.clip.id, { volume: gain }));
      return gain;
    },
    applyVoiceToAll: (voiceId) => {
      const s = get();
      if (!s.project) return;
      commit((p) => ({
        ...p,
        tracks: p.tracks.map((t) => ({ ...t, clips: t.clips.map((c) => (c.type === 'audio' ? { ...c, voice: voiceId } : c)) })),
      }));
    },
    addBeatMarkers: (times) => {
      const s = get();
      if (!s.project || times.length === 0) return;
      const markers = times.map((t) => ({ color: '#A855F7', label: 'Beat', time: t }));
      applyProject({ ...s.project, markers: [...s.project.markers, ...markers].sort((a, b) => a.time - b.time) });
    },
    splitSelectedAtTimes: (times) => {
      const s = get();
      if (!s.project || s.selectedClipIds.length === 0 || times.length === 0) return;
      commit((p) => splitClipAtTimes(p, s.selectedClipIds[0], times));
    },
    addVoiceoverClip: async (blob, name, durationSeconds) => {
      const s = get();
      if (!s.project) return;
      const file = new File([blob], name, { type: blob.type || 'audio/webm' });
      const item = await importFile(file);
      if (!item) return;
      // MediaRecorder webm often reports no (finite) duration — fall back
      // to the seconds actually recorded, so a real recording never vanishes.
      const duration = item.duration && item.duration > 0 ? item.duration : durationSeconds;
      if (!duration || duration <= 0) return;
      const timedItem = { ...item, duration };
      const state = get();
      if (!state.project) return;
      const base = baseClip('audio', timedItem.name, timedItem.duration, state.playhead);
      const clip: Clip = { ...base, mediaId: timedItem.id, src: timedItem.src, sourceDuration: timedItem.duration };
      commit((p) => addClipToAudioTrack({ ...p, media: [...p.media, timedItem] }, clip));
      set({ selectedClipIds: [clip.id] });
    },
    addAudioClip: (mediaId, start) => {
      const s = get();
      if (!s.project) return;
      const media = s.project.media.find((m) => m.id === mediaId);
      if (!media || media.kind !== 'audio') return;
      const duration = media.duration && media.duration > 0 ? media.duration : 5;
      const base = baseClip('audio', media.name, duration, start ?? s.playhead);
      const clip: Clip = { ...base, mediaId: media.id, src: media.src, sourceDuration: duration };
      commit((p) => addClipToAudioTrack(p, clip));
      set({ selectedClipIds: [clip.id] });
    },
    addMediaItem: (item) => {
      const s = get();
      if (!s.project) return;
      if (s.project.media.some((m) => m.id === item.id)) return;
      applyProject({ ...s.project, media: [...s.project.media, item] });
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
    snapshot: () => {
      const s = get();
      if (!s.project) return;
      set({ redoStack: [], undoStack: [...s.undoStack, JSON.stringify(s.project)].slice(-100) });
    },
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
