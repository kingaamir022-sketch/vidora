/**
 * Collaboration (Phase 8, Section L — L-COLLAB).
 *
 * Timecoded comments + a "shared with" record, local-first: comments
 * travel inside the shared `.vidora` bundle file, not through a server.
 * Two people pass the file back and forth; importing merges comments
 * by id (no duplicates). "Shared with" is only a record of who
 * received the file — Vidora sends nothing itself.
 */

export interface ProjectComment {
  author: string;
  createdAt: string;
  id: string;
  resolved: boolean;
  text: string;
  time: number;
}

export function newCommentId(): string {
  return `cmt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function addComment(
  comments: ProjectComment[],
  author: string,
  time: number,
  text: string,
): ProjectComment[] {
  const trimmed = text.trim();
  if (!trimmed) return comments;
  return [
    ...comments,
    {
      author: author.trim() || 'You',
      createdAt: new Date().toISOString(),
      id: newCommentId(),
      resolved: false,
      text: trimmed,
      time: Math.max(0, Math.round(time * 100) / 100),
    },
  ].sort((a, b) => a.time - b.time);
}

export function setCommentResolved(comments: ProjectComment[], id: string, resolved: boolean): ProjectComment[] {
  return comments.map((c) => (c.id === id ? { ...c, resolved } : c));
}

export function sortComments(comments: ProjectComment[]): ProjectComment[] {
  return [...comments].sort((a, b) => a.time - b.time);
}

/** Merge imported comments into the existing list, deduped by id.
 * Returns the merged list and the comments that were new. */
export function mergeComments(
  existing: ProjectComment[],
  incoming: ProjectComment[],
): { added: ProjectComment[]; merged: ProjectComment[] } {
  const seen = new Set(existing.map((c) => c.id));
  const added = incoming.filter((c) => c.id && !seen.has(c.id));
  return { added, merged: sortComments([...existing, ...added]) };
}

export function formatCommentTime(time: number): string {
  const m = Math.floor(time / 60);
  const s = Math.floor(time % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
