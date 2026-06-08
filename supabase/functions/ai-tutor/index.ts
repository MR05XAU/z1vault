import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SYSTEM_PROMPT = `You are the Z1 INSIGHTS AI Tutor — a private trading mentor that ONLY teaches from the Z1 INSIGHTS book provided to you in context.

ABSOLUTE RULES (never break these):

1. SOURCE OF TRUTH: The "BOOK CONTEXT" block below is your ONLY source of factual knowledge. Treat it as the entire universe of allowed material.
2. NEVER answer from outside the book. If the user asks something the book does not cover — even basic trading definitions — you must reply:
   "That isn't covered in the chapters you have access to. Try asking about: [list 2-3 relevant chapter titles from BOOK CONTEXT]."
3. NEVER reference outside sources, other authors, news, web information, or your own training data. No "in general", no "common wisdom", no "studies show".
4. NEVER predict prices, recommend tickers, or give financial advice. Educational concepts ONLY.
5. NEVER answer non-trading questions (politics, code help, personal advice, celebrities, current events). Redirect to a book topic.
6. CITE every claim with the exact chapter, e.g. "(Ch 5 — Market structure)". If you cannot cite, do not say it.
7. If a CURRENT CHAPTER is in context, anchor your answer to THAT chapter first. Only reference other provided chapters by name if directly relevant.
8. Keep answers concise. Use short paragraphs, bullets, **bold** key terms. If the user asks "like I'm new", drop jargon and use a plain analogy from the book.

If asked who you are: "I'm the Z1 INSIGHTS tutor — I only teach from your Z1 chapters."`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: ent } = await supabase
      .from("entitlements")
      .select("has_access")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!ent?.has_access) {
      return new Response(JSON.stringify({ error: "No active access" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, chapterId, highlightedText } = await req.json();

    // Build BOOK CONTEXT — always include every chapter title so the tutor can route,
    // and the FULL TEXT of the current chapter (if any) plus the most relevant other chapters
    // chosen by simple keyword overlap with the latest user message.
    let contextBlock = "\n\n=== BOOK CONTEXT (your ONLY source of truth) ===\n";

    const { data: allChapters } = await supabase
      .from("book_chapters")
      .select("id, chapter_number, title, content")
      .eq("published", true)
      .order("order_index");

    const lastUserMsg = [...(messages ?? [])].reverse().find((m: any) => m.role === "user")?.content ?? "";
    const tokens = (lastUserMsg as string).toLowerCase().split(/\W+/).filter((t) => t.length > 3);

    let currentChap: any = null;
    if (chapterId) currentChap = (allChapters ?? []).find((c) => c.id === chapterId);

    // Score chapters by overlap with the user message
    const scored = (allChapters ?? []).map((c) => {
      if (currentChap && c.id === currentChap.id) return { c, score: 1e9 };
      const hay = (c.title + " " + c.content).toLowerCase();
      let s = 0;
      for (const t of tokens) if (hay.includes(t)) s += 1;
      return { c, score: s };
    }).sort((a, b) => b.score - a.score);

    contextBlock += "\nAVAILABLE CHAPTERS:\n";
    for (const c of allChapters ?? []) {
      contextBlock += `- Ch ${c.chapter_number} — ${c.title}\n`;
    }

    // Include up to 3 chapters worth of content (current + top 2 relevant), cap each at 6000 chars
    const picked = scored.slice(0, 3).filter((x) => x.score > 0 || (currentChap && x.c.id === currentChap.id));
    for (const { c } of picked) {
      const text = (c.content || "").slice(0, 6000);
      contextBlock += `\n--- Ch ${c.chapter_number}: ${c.title} ---\n${text}\n`;
    }
    contextBlock += "\n=== END BOOK CONTEXT ===\n";

    if (currentChap) {
      contextBlock += `\nThe reader is currently on Ch ${currentChap.chapter_number} — ${currentChap.title}. Anchor your answer there first.`;
    }
    if (highlightedText) {
      contextBlock += `\n\nUSER HIGHLIGHTED THIS PASSAGE FROM THE CURRENT CHAPTER:\n"""${highlightedText}"""\nExplain this passage using only the book context above.`;
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "raw",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        stream: true,
        messages: [
          { role: "system", content: SYSTEM_PROMPT + contextBlock },
          ...messages,
        ],
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit — try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact support." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: text }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(aiRes.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (e) {
    console.error("ai-tutor error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});