import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SYSTEM_PROMPT = `You are the Z1 INSIGHTS AI Tutor, a private trading mentor embedded inside the Z1 INSIGHTS academy app.

STRICT RULES:
- Only answer questions about trading, markets, risk management, psychology, technical/fundamental analysis, and the content of the Z1 INSIGHTS book provided below.
- If asked about anything outside trading/finance education (politics, personal advice, code help, celebrities, etc.), politely decline and steer the user back to a trading topic from the book.
- Never give specific buy/sell recommendations on real tickers, never predict prices, never provide financial advice. Educate concepts only.
- When referencing the book, cite the chapter by number and title, e.g. "(Chapter 3 — Risk Management)".
- Prefer concise, structured answers. Use short paragraphs, bullets, and bold key terms.
- If the user asks to "explain like I'm new", drop jargon and use analogies.

When a chapter excerpt is provided as context, lean on it. If the user's question goes beyond the book, you may still answer if it is squarely about trading education, but note that the chapter does not cover it directly.`;

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

    let contextBlock = "";
    if (chapterId) {
      const { data: chap } = await supabase
        .from("book_chapters")
        .select("chapter_number, title, content")
        .eq("id", chapterId)
        .maybeSingle();
      if (chap) {
        contextBlock = `\n\nCURRENT CHAPTER CONTEXT (Chapter ${chap.chapter_number} — ${chap.title}):\n${chap.content}`;
      }
    }
    if (highlightedText) {
      contextBlock += `\n\nUSER HIGHLIGHTED THIS PASSAGE:\n"""${highlightedText}"""`;
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