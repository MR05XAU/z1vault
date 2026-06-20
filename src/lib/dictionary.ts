import dictAsset from "@/assets/dict-en.json.asset.json";

// Offline English dictionary (Webster's 1913, ~86k entries, ~8.6 MB JSON).
// Loaded once on first use, cached in-memory and in the browser Cache Storage
// so a returning user pays zero network cost.

const CACHE_NAME = "z1-dict-v1";
const URL = dictAsset.url;

let mem: Record<string, string> | null = null;
let loading: Promise<Record<string, string>> | null = null;

export function isLoaded() {
  return mem !== null;
}

export async function loadDictionary(
  onProgress?: (loaded: number, total: number) => void
): Promise<Record<string, string>> {
  if (mem) return mem;
  if (loading) return loading;
  loading = (async () => {
    let response: Response | undefined;
    try {
      const cache = await caches.open(CACHE_NAME);
      const hit = await cache.match(URL);
      if (hit) response = hit;
      else {
        const fresh = await fetch(URL);
        if (fresh.ok) {
          await cache.put(URL, fresh.clone());
          response = fresh;
        }
      }
    } catch {
      // Cache API unavailable (private mode, etc.) — fall back to plain fetch
    }
    if (!response) response = await fetch(URL);
    if (!response.ok) throw new Error("Dictionary download failed");

    const total = Number(response.headers.get("content-length")) || 0;
    if (onProgress && total && response.body) {
      const reader = response.body.getReader();
      const chunks: BlobPart[] = [];
      let loaded = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        chunks.push(new Uint8Array(value).buffer);
        loaded += value.length;
        onProgress(loaded, total);
      }
      mem = JSON.parse(await new Blob(chunks).text());
    } else {
      mem = await response.json();
    }
    return mem!;
  })();
  try {
    return await loading;
  } finally {
    loading = null;
  }
}

export async function lookup(word: string): Promise<string | null> {
  const dict = await loadDictionary();
  const w = word.toLowerCase().trim();
  if (dict[w]) return dict[w];
  // try singularising basic plurals / verb forms
  const fallbacks = [
    w.replace(/ies$/, "y"),
    w.replace(/es$/, ""),
    w.replace(/s$/, ""),
    w.replace(/ing$/, ""),
    w.replace(/ing$/, "e"),
    w.replace(/ed$/, ""),
    w.replace(/ed$/, "e"),
  ];
  for (const f of fallbacks) {
    if (f !== w && dict[f]) return dict[f];
  }
  return null;
}

/** Cheap prefix/contains search over headwords — used by the Tutor lookup screen. */
export async function search(query: string, limit = 25): Promise<string[]> {
  const dict = await loadDictionary();
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const keys = Object.keys(dict);
  const starts: string[] = [];
  const contains: string[] = [];
  for (const k of keys) {
    if (k === q) starts.unshift(k);
    else if (k.startsWith(q)) starts.push(k);
    else if (k.includes(q)) contains.push(k);
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit);
}