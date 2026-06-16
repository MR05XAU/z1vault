import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const raw = String(body.word ?? "").trim().toLowerCase();
    const word = raw.replace(/[^a-z\-']/g, "");
    if (!word || word.length > 40) return json({ error: "Invalid word" }, 400);

    // 1. cache hit
    const { data: cached } = await supabase
      .from("definitions_cache").select("definition,source").eq("word", word).maybeSingle();
    if (cached) return json({ word, definition: cached.definition, source: cached.source });

    // 2. free dictionary API
    let definition = "";
    let source = "dictionary";
    try {
      const r = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
      if (r.ok) {
        const d = await r.json();
        const def = d?.[0]?.meanings?.[0]?.definitions?.[0]?.definition;
        const pos = d?.[0]?.meanings?.[0]?.partOfSpeech;
        if (def) definition = pos ? `(${pos}) ${def}` : def;
      }
    } catch {}

    // 3. AI fallback for trading jargon
    if (!definition) {
      const apiKey = Deno.env.get("LOVABLE_API_KEY");
      if (!apiKey) return json({ error: "Definition not found" }, 404);
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          max_tokens: 80,
          messages: [
            { role: "system", content: "Give a one-sentence definition of the trading/finance term. Plain English. Under 25 words. No preamble." },
            { role: "user", content: word },
          ],
        }),
      });
      if (!r.ok) return json({ error: "Definition not found" }, 404);
      const j = await r.json();
      definition = j?.choices?.[0]?.message?.content?.trim() ?? "";
      source = "ai";
    }

    if (!definition) return json({ error: "Definition not found" }, 404);

    // Cache it (service role via upsert from authenticated user fails RLS — call via fetch)
    const adminSb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    await adminSb.from("definitions_cache").upsert({ word, definition, source });

    return json({ word, definition, source });
  } catch (e) {
    console.error("word-lookup error", e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}