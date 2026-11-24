/**
 * Vidora caches (Phase 9, Section M — M-PERF).
 * Media thumbnails + probe results are generated once and reused: an
 * LRU cache (default 200 entries). A failed generation is never
 * cached as failed — the next import retries.
 */

export interface LruCache<T> {
  clear: () => void;
  get: (key: string) => T | undefined;
  has: (key: string) => boolean;
  set: (key: string, value: T) => void;
  size: () => number;
}

const MAX_ENTRIES = 200;

export function createLruCache<T>(maxEntries = MAX_ENTRIES): LruCache<T> {
  const map = new Map<string, T>();
  return {
    clear: () => map.clear(),
    get: (key) => {
      const value = map.get(key);
      if (value !== undefined) {
        // LRU touch: re-insert so it becomes most-recently-used.
        map.delete(key);
        map.set(key, value);
      }
      return value;
    },
    has: (key) => map.has(key),
    set: (key, value) => {
      if (map.has(key)) map.delete(key);
      map.set(key, value);
      while (map.size > maxEntries) {
        const oldest = map.keys().next().value;
        if (oldest === undefined) break;
        map.delete(oldest);
      }
    },
    size: () => map.size,
  };
}

/** Thumbnail data URLs, keyed by media id. */
export const thumbnailCache = createLruCache<string>();

/** Probe results (duration/dimensions/thumbnail), keyed by `name:size`. */
export interface ProbeResult {
  duration?: number;
  height?: number;
  thumbnail?: string;
  width?: number;
}
export const probeCache = createLruCache<ProbeResult>();

/** Backwards-compatible name for the thumbnail cache type. */
export type ThumbnailCache = LruCache<string>;
