// Central LLM router with automatic failover. Every AI feature calls through
// here so a busy/rate-limited primary model transparently falls back to a
// backup instead of erroring. Providers are tried in order; a network error
// or a retryable HTTP status (429/500/502/503/529) advances to the next one.
//
// Order of preference (only providers whose key is set are tried):
//   1. Groq llama-3.3-70b    — primary: very fast, generous free tier
//   2. NVIDIA llama-3.3-70b  — backup, best NVIDIA model
//   3. NVIDIA llama-3.1-8b   — lighter, usually free when the 70b is saturated
//   4. Anthropic Claude      — highest quality backstop (if ANTHROPIC_API_KEY set)

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
export type LLMOpts = { maxTokens?: number; temperature?: number };

const RETRYABLE = new Set([429, 500, 502, 503, 529]);
// Per-attempt timeout so a queued/hung provider fails over to the next one
// fast, instead of eating the whole edge-function budget (which surfaces as
// a Supabase 546 worker-limit kill under concurrency).
const ATTEMPT_TIMEOUT_MS = 20_000;

function withTimeout(ms: number): { signal: AbortSignal; done: () => void } {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, done: () => clearTimeout(t) };
}

type Provider = {
  name: string;
  streams: boolean; // emits OpenAI-style SSE (choices[].delta.content)?
  run: (messages: ChatMessage[], opts: LLMOpts, stream: boolean, signal: AbortSignal) => Promise<Response>;
};

function openAiCompatible(name: string, url: string, key: string, model: string): Provider {
  return {
    name,
    streams: true,
    run: (messages, opts, stream, signal) =>
      fetch(url, {
        method: "POST",
        signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          stream,
          max_tokens: opts.maxTokens ?? 600,
          temperature: opts.temperature ?? 0.4,
          messages,
        }),
      }),
  };
}

function anthropicProvider(key: string): Provider {
  return {
    name: "anthropic",
    streams: false, // Anthropic's SSE shape differs — non-streaming only here
    run: async (messages, opts, _stream, signal) => {
      const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
      const rest = messages.filter((m) => m.role !== "system");
      return fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal,
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: opts.maxTokens ?? 600,
          temperature: opts.temperature ?? 0.4,
          system,
          messages: rest,
        }),
      });
    },
  };
}

function providers(): Provider[] {
  const out: Provider[] = [];
  const groq = Deno.env.get("GROQ_API_KEY");
  if (groq) out.push(openAiCompatible("groq", "https://api.groq.com/openai/v1/chat/completions", groq, "llama-3.3-70b-versatile"));
  const nvidia = Deno.env.get("NVIDIA_API_KEY");
  if (nvidia) {
    out.push(openAiCompatible("nvidia-70b", "https://integrate.api.nvidia.com/v1/chat/completions", nvidia, "meta/llama-3.3-70b-instruct"));
    out.push(openAiCompatible("nvidia-8b", "https://integrate.api.nvidia.com/v1/chat/completions", nvidia, "meta/llama-3.1-8b-instruct"));
  }
  const anthropic = Deno.env.get("ANTHROPIC_API_KEY");
  if (anthropic) out.push(anthropicProvider(anthropic));
  return out;
}

/** Non-streaming completion with failover. Returns the assistant text. */
export async function llmChat(messages: ChatMessage[], opts: LLMOpts = {}): Promise<string> {
  const chain = providers();
  if (chain.length === 0) throw new Error("No LLM provider configured");
  let lastErr = "no providers";
  for (const p of chain) {
    const { signal, done } = withTimeout(ATTEMPT_TIMEOUT_MS);
    try {
      const res = await p.run(messages, opts, false, signal);
      if (!res.ok) {
        lastErr = `${p.name} ${res.status}`;
        continue; // busy/erroring or non-retryable — try the next provider
      }
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content // OpenAI shape
        ?? data?.content?.find?.((c: { type: string }) => c.type === "text")?.text // Anthropic shape
        ?? "";
      if (text) return text;
      lastErr = `${p.name} empty`;
    } catch (e) {
      lastErr = `${p.name} ${(e as Error).name === "AbortError" ? "timeout" : (e as Error).message}`;
    } finally {
      done();
    }
  }
  throw new Error(`All LLM providers failed (${lastErr})`);
}

/**
 * Streaming completion with failover. Returns the first provider Response
 * whose body is a live OpenAI-style SSE stream, so the frontend's existing
 * chunk parser is unchanged. Anthropic is skipped here (different SSE shape).
 */
export async function llmStream(messages: ChatMessage[], opts: LLMOpts = {}): Promise<Response> {
  const chain = providers().filter((p) => p.streams);
  if (chain.length === 0) throw new Error("No streaming LLM provider configured");
  let lastStatus = 0;
  for (const p of chain) {
    // Timeout only bounds establishing the connection (fetch resolves on
    // response headers); once streaming begins we let it run.
    const { signal, done } = withTimeout(ATTEMPT_TIMEOUT_MS);
    try {
      const res = await p.run(messages, opts, true, signal);
      if (res.ok && res.body) { done(); return res; }
      lastStatus = res.status;
    } catch { /* timeout or network — try next */ } finally {
      done();
    }
  }
  throw new Error(`All streaming providers failed (last status ${lastStatus})`);
}

// Extract the outermost {...} JSON object from a model reply that may wrap it
// in prose or code fences.
export function extractJson(raw: string): string {
  const s = raw.indexOf("{");
  const e = raw.lastIndexOf("}");
  return s !== -1 && e > s ? raw.slice(s, e + 1) : raw;
}
