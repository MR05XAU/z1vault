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

    // Build BOOK CONTEXT — chapter titles always shown for routing; FULL TEXT
    // only for the current chapter and the top-N chapters scored by keyword
    // overlap with the latest user message. Cuts token usage ~90% vs whole book.
    const { data: allChapters } = await supabase
      .from("book_chapters")
      .select("id, chapter_number, title, subtitle, content")
      .order("order_index");

    const chapters = allChapters ?? [];
    const currentChap = chapterId ? chapters.find((c) => c.id === chapterId) : null;
    const latestUserMsg: string =
      [...messages].reverse().find((m: any) => m.role === "user")?.content ?? "";
    const query = `${latestUserMsg} ${highlightedText ?? ""}`.toLowerCase();

    const STOP = new Set([
      "the","a","an","and","or","but","is","are","was","were","be","been","being","of","to","in","on",
      "at","by","for","with","from","as","it","its","this","that","these","those","i","you","we","they",
      "me","my","your","our","their","do","does","did","what","why","how","when","where","which","who",
      "can","could","should","would","will","just","like","about","into","over","than","then","so","not",
      "no","yes","more","most","some","any","all","one","two","very","really","mean","explain","tell",
    ]);
    const tokens = Array.from(
      new Set(
        query
          .replace(/[^a-z0-9\s']/g, " ")
          .split(/\s+/)
          .filter((w) => w.length > 2 && !STOP.has(w)),
      ),
    );

    // Score chapters: keyword hits in title (x5) + body (x1).
    const scored = chapters.map((c) => {
      const titleLc = (c.title + " " + (c.subtitle ?? "")).toLowerCase();
      const bodyLc = (c.content ?? "").toLowerCase();
      let score = 0;
      for (const t of tokens) {
        if (titleLc.includes(t)) score += 5;
        const m = bodyLc.match(new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g"));
        if (m) score += m.length;
      }
      return { c, score };
    });

    // Selection: current chapter (if any) + top 2 scored chapters (excluding current).
    const picked = new Map<string, any>();
    if (currentChap) picked.set(currentChap.id, currentChap);
    scored
      .filter((s) => s.score > 0 && !picked.has(s.c.id))
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .forEach((s) => picked.set(s.c.id, s.c));

    // Fallback: if nothing matched and no current chapter, include first 2 chapters
    // so the tutor isn't blind.
    if (picked.size === 0) {
      chapters.slice(0, 2).forEach((c) => picked.set(c.id, c));
    }

    let contextBlock = "\n\n=== BOOK CHAPTERS (titles only — full text below for selected) ===\n";
    for (const c of chapters) {
      contextBlock += `Ch ${c.chapter_number}: ${c.title}${c.subtitle ? ` — ${c.subtitle}` : ""}\n`;
    }
    contextBlock += "\n=== RELEVANT CHAPTER TEXT ===\n";
    for (const c of picked.values()) {
      contextBlock += `\n--- Ch ${c.chapter_number}: ${c.title} ---\n${c.content || ""}\n`;
    }
    contextBlock += "\n=== END BOOK CONTEXT ===\n";

    if (currentChap) {
      contextBlock += `\nThe reader is currently on Ch ${currentChap.chapter_number} — ${currentChap.title}. Anchor your answer there first.`;
    }
    if (highlightedText) {
      contextBlock += `\n\nUSER HIGHLIGHTED THIS PASSAGE FROM THE CURRENT CHAPTER:\n"""${highlightedText}"""\nExplain this passage using only the book context above.`;
    }
    contextBlock += `\n\nNOTE: If the question asks about a chapter whose full text is NOT included above, say so briefly and suggest the user open that chapter, then answer from the chapter titles you can see.`;

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