// Raw SnapTrade REST client (no SDK — Deno edge runtime) + at-rest encryption
// for the per-user SnapTrade secret. Base URL and paths confirmed against
// SnapTrade's published OpenAPI spec: https://api.snaptrade.com, no /api/v1 prefix.

export const SNAPTRADE_PERSONAL_SECRET_SENTINEL = "__snaptrade_personal_key__";

function stringifyForSignature(value: unknown): string {
  const keys: string[] = [];
  const seen = new Set<string>();
  JSON.stringify(value, (key, v) => {
    if (!seen.has(key)) { keys.push(key); seen.add(key); }
    return v;
  });
  keys.sort();
  return JSON.stringify(value, keys);
}

async function hmacSha256Base64(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

function safeJson(text: string): unknown {
  try { return JSON.parse(text); } catch { return text; }
}

export async function snaptradeRequest<T>(
  path: string,
  init: { method?: string; query?: Record<string, string | number | undefined>; body?: unknown } = {},
): Promise<T> {
  const clientId = Deno.env.get("SNAPTRADE_CLIENT_ID");
  const consumerKey = Deno.env.get("SNAPTRADE_CONSUMER_KEY");
  if (!clientId || !consumerKey) throw new Error("SNAPTRADE_CLIENT_ID / SNAPTRADE_CONSUMER_KEY not set");

  const query = new URLSearchParams();
  query.set("clientId", clientId);
  query.set("timestamp", String(Math.floor(Date.now() / 1000)));
  for (const [k, v] of Object.entries(init.query ?? {})) if (v !== undefined) query.set(k, String(v));

  const body = init.body ?? null;
  const queryString = query.toString();
  const signaturePayload = stringifyForSignature({ content: body, path, query: queryString });
  const signature = await hmacSha256Base64(encodeURI(consumerKey), signaturePayload);

  const res = await fetch(`https://api.snaptrade.com${path}?${queryString}`, {
    method: init.method ?? "GET",
    headers: { Signature: signature, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) {
    throw new Error(`SnapTrade ${path} failed (${res.status}): ${typeof data === "string" ? data : JSON.stringify(data ?? text)}`);
  }
  return data as T;
}

async function encKey(): Promise<CryptoKey> {
  const raw = Deno.env.get("SNAPTRADE_ENC_KEY");
  if (!raw) throw new Error("SNAPTRADE_ENC_KEY not set");
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

// SnapTrade user secrets are stored ciphertext-only; SNAPTRADE_ENC_KEY never leaves this function.
export async function encrypt(plaintext: string): Promise<string> {
  const key = await encKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext)));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv, 0);
  out.set(ct, iv.length);
  return btoa(String.fromCharCode(...out));
}

export async function decrypt(stored: string): Promise<string> {
  const key = await encKey();
  const buf = Uint8Array.from(atob(stored), (c) => c.charCodeAt(0));
  const iv = buf.slice(0, 12);
  const ct = buf.slice(12);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(pt);
}
