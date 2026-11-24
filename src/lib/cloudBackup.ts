/**
 * Cloud backup (Phase 8, Section L — L-CLOUD).
 *
 * Vidora has no server and the user's budget is zero, so there is no
 * account sync. The honest local-first equivalent: a backup is a
 * `.vidora` bundle FILE (project JSON + comments + shared-with list +
 * media metadata). The user saves it into their Google Drive
 * `All softwares / Vidora` folder — Drive IS the cloud. Media FILES are
 * not inside the bundle (they are large); after a restore the user
 * re-imports the same files and clips re-link automatically by file
 * name + size.
 */

import type { MediaItem, VidoraProject } from '../schema/project';

export const BUNDLE_VERSION = '0.9.0';

export interface BundleMediaEntry {
  duration?: number;
  id: string;
  kind: string;
  mime: string;
  name: string;
  size: number;
}

export interface VidoraBundle {
  exportedAt: string;
  kind: 'vidora-bundle';
  media: BundleMediaEntry[];
  project: VidoraProject;
  version: string;
}

export function buildBundle(project: VidoraProject): VidoraBundle {
  return {
    exportedAt: new Date().toISOString(),
    kind: 'vidora-bundle',
    media: project.media.map((m) => ({
      duration: m.duration,
      id: m.id,
      kind: m.kind,
      mime: m.mime,
      name: m.name,
      size: m.size,
    })),
    project: structuredClone(project),
    version: BUNDLE_VERSION,
  };
}

export function bundleFileName(project: VidoraProject): string {
  const safe = project.name.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'vidora-project';
  const date = new Date().toISOString().slice(0, 10);
  return `${safe}-${date}.vidora`;
}

export function bundleToText(bundle: VidoraBundle): string {
  return JSON.stringify(bundle, null, 2);
}

/** True when `a` is a newer semver than `b` (numeric parts compared). */
export function isNewerVersion(a: string, b: string): boolean {
  const pa = a.split('.').map((x) => Number.parseInt(x, 10) || 0);
  const pb = b.split('.').map((x) => Number.parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x > y;
  }
  return false;
}

/** Parse + validate a bundle file. Throws a readable error otherwise. */
export function parseBundle(text: string): VidoraBundle {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('This is not a Vidora backup file (not JSON).');
  }
  const b = parsed as Partial<VidoraBundle>;
  if (b?.kind !== 'vidora-bundle' || typeof b.project !== 'object' || !b.project) {
    throw new Error('This is not a Vidora backup file.');
  }
  if (typeof b.version === 'string' && isNewerVersion(b.version, BUNDLE_VERSION)) {
    throw new Error(`This backup was made by a newer Vidora (v${b.version}) — update Vidora first.`);
  }
  return b as VidoraBundle;
}

/**
 * Re-link media after a restore: for every media entry in the bundle,
 * find a file in the current session with the same name AND size and
 * point the restored project's clips at it (by mediaId → src).
 * Returns the relinked project plus the names that linked / are missing.
 */
export function relinkMedia(
  project: VidoraProject,
  sessionMedia: MediaItem[],
): { missing: string[]; project: VidoraProject; relinked: string[] } {
  const byNameSize = new Map(sessionMedia.map((m) => [`${m.name}|${m.size}`, m]));
  const relinked: string[] = [];
  const missing: string[] = [];
  const next: VidoraProject = structuredClone(project);
  const mediaById = new Map(next.media.map((m) => [m.id, m]));
  for (const entry of next.media) {
    const match = byNameSize.get(`${entry.name}|${entry.size}`);
    if (match) {
      entry.src = match.src;
      if (match.thumbnail && !entry.thumbnail) entry.thumbnail = match.thumbnail;
      if (match.peaks) entry.peaks = match.peaks;
      relinked.push(entry.name);
    } else {
      missing.push(entry.name);
    }
  }
  // Clips carry their own src copy — point them at the matched media too.
  for (const track of next.tracks) {
    for (const clip of track.clips) {
      if (!clip.mediaId) continue;
      const media = mediaById.get(clip.mediaId);
      if (media?.src && clip.src !== media.src) clip.src = media.src;
    }
  }
  return { missing: [...new Set(missing)], project: next, relinked: [...new Set(relinked)] };
}

export interface BackupRecord {
  createdAt: string;
  id: string;
  projectId: string;
  projectName: string;
  size: number;
}

const BACKUPS_KEY = 'vidora.backups.v1';

export function loadBackupRecords(): BackupRecord[] {
  try {
    const raw = localStorage.getItem(BACKUPS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BackupRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveBackupRecords(records: BackupRecord[]): void {
  try {
    localStorage.setItem(BACKUPS_KEY, JSON.stringify(records.slice(0, 50)));
  } catch {
    // Storage full — backups still work, the list just is not kept.
  }
}

/** Remove one backup record (the .vidora file itself is the user's to keep). */
export function deleteBackupRecord(id: string): BackupRecord[] {
  const next = loadBackupRecords().filter((r) => r.id !== id);
  saveBackupRecords(next);
  return next;
}
