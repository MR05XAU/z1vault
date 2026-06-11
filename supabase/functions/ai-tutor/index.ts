import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SYSTEM_PROMPT = `You are the Z1 INSIGHTS AI Tutor — a private trading mentor who teaches from the Z1 INSIGHTS book provided in context.

RULES:

1. SOURCE OF TRUTH: The "BOOK CONTEXT" block below contains the full book. Ground every answer in it and cite chapters like "(Ch 5 — Market structure)".
2. You MAY briefly define basic trading terms (e.g. candle, ticker, broker) in plain language when needed to explain a book concept — but always tie the explanation back to the relevant chapter.
3. If a question is genuinely about topics the book never touches (e.g. a specific stock pick, tax law, unrelated subjects), say so briefly and suggest 2-3 relevant chapters they CAN ask about. Use this sparingly — make a real effort to answer from the book first.
4. NEVER predict prices, recommend specific tickers to buy/sell, or give financial advice. Educational concepts ONLY.
5. NEVER answer non-trading questions (politics, code help, celebrities, current events). Redirect to a book topic.
6. If a CURRENT CHAPTER is in context, anchor your answer to THAT chapter first.
7. Keep answers concise. Use short paragraphs, bullets, **bold** key terms. If the user asks "like I'm new", drop jargon and use a plain analogy.

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
    let contextBlock = "\n\n=== BOOK CONTEXT (the full Z1 INSIGHTS book) ===\n";

    const { data: allChapters } = await supabase
      .from("book_chapters")
      .select("id, chapter_number, title, content")
      .order("order_index");

    let currentChap: any = null;
    if (chapterId) currentChap = (allChapters ?? []).find((c) => c.id === chapterId);

    // The whole book is small enough to include in full.
    for (const c of allChapters ?? []) {
      contextBlock += `\n--- Ch ${c.chapter_number}: ${c.title} ---\n${c.content || ""}\n`;
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