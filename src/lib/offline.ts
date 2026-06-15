// Offline storage for chapters + audio narration.
// Uses IndexedDB (idb-keyval style minimal wrapper) for chapter records and the Cache API for audio blobs.

const DB_NAME = "z1-offline";
const STORE = "chapters";
const AUDIO_CACHE = "z1-chapter-audio-v1";

// Cached chapters auto-expire after 30 days unless re-downloaded. Prevents
// stale content lingering on devices indefinitely if a user never refreshes.
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

function openDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: "id" });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await openDB();
  return new Promise<T>((res, rej) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => res(req.result as T);
    req.onerror = () => rej(req.error);
  });
}

export interface OfflineChapter {
  id: string;
  chapter_number: number;
  title: string;
  subtitle?: string | null;
  content: string;
  estimated_minutes?: number | null;
  audio_url?: string | null;
  cover_image_url?: string | null;
  downloaded_at: string;
  audio_cached: boolean;
}

export async function getOffline(id: string): Promise<OfflineChapter | undefined> {
  const rec = await tx<OfflineChapter | undefined>("readonly", (s) => s.get(id));
  if (!rec) return undefined;
  const age = Date.now() - new Date(rec.downloaded_at).getTime();
  if (age > TTL_MS) {
    // Stale — purge in the background, return undefined so caller refetches.
    void removeChapter(rec.id, rec.audio_url);
    return undefined;
  }
  return rec;
}

export async function listOffline(): Promise<OfflineChapter[]> {
  const all = await tx<OfflineChapter[]>("readonly", (s) => s.getAll());
  const now = Date.now();
  const fresh: OfflineChapter[] = [];
  for (const rec of all) {
    if (now - new Date(rec.downloaded_at).getTime() > TTL_MS) {
      void removeChapter(rec.id, rec.audio_url);
    } else fresh.push(rec);
  }
  return fresh;
}

export async function saveOffline(c: OfflineChapter): Promise<void> {
  await tx<IDBValidKey>("readwrite", (s) => s.put(c));
}

export async function deleteOffline(id: string): Promise<void> {
  await tx<undefined>("readwrite", (s) => s.delete(id));
  // best-effort audio purge handled by caller
}

export type DownloadProgress = { stage: "text" | "audio" | "done"; loaded: number; total: number };

export async function downloadChapter(
  chapter: {
    id: string; chapter_number: number; title: string; subtitle?: string | null;
    content: string; estimated_minutes?: number | null;
    audio_url?: string | null; cover_image_url?: string | null;
  },
  onProgress?: (p: DownloadProgress) => void,
): Promise<void> {
  onProgress?.({ stage: "text", loaded: 0, total: chapter.audio_url ? 2 : 1 });

  let audioCached = false;
  if (chapter.audio_url) {
    onProgress?.({ stage: "audio", loaded: 1, total: 2 });
    try {
      const cache = await caches.open(AUDIO_CACHE);
      const res = await fetch(chapter.audio_url, { mode: "cors" });
      if (res.ok) {
        await cache.put(chapter.audio_url, res.clone());
        audioCached = true;
      }
    } catch (e) {
      console.warn("Audio cache failed", e);
    }
  }

  await saveOffline({
    id: chapter.id,
    chapter_number: chapter.chapter_number,
    title: chapter.title,
    subtitle: chapter.subtitle ?? null,
    content: chapter.content,
    estimated_minutes: chapter.estimated_minutes ?? null,
    audio_url: chapter.audio_url ?? null,
    cover_image_url: chapter.cover_image_url ?? null,
    downloaded_at: new Date().toISOString(),
    audio_cached: audioCached,
  });

  onProgress?.({ stage: "done", loaded: chapter.audio_url ? 2 : 1, total: chapter.audio_url ? 2 : 1 });
}

export async function removeChapter(id: string, audioUrl?: string | null): Promise<void> {
  if (audioUrl) {
    try {
      const cache = await caches.open(AUDIO_CACHE);
      await cache.delete(audioUrl);
    } catch {}
  }
  await deleteOffline(id);
}

export async function offlineAudioUrl(audioUrl: string): Promise<string | null> {
  try {
    const cache = await caches.open(AUDIO_CACHE);
    const res = await cache.match(audioUrl);
    if (!res) return null;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch { return null; }
}

export function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}