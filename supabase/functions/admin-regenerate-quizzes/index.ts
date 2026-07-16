import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Regenerates a 4-question multiple-choice quiz for every chapter using
// Lovable AI, with deliberate distractor design. Admin only.

interface AIQuestion {
  question: string;
  options: string[]; // exactly 4
  correct_answer: number; // 0..3
  explanation: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("NVIDIA_API_KEY");
    if (!apiKey) return json({ error: "AI not configured" }, 500);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: u } = await userClient.auth.getUser();
    if (!u.user) return json({ error: "Unauthorized" }, 401);
    const isAdmin = await userClient.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    if (!isAdmin.data) return json({ error: "Admin only" }, 403);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const onlyChapterId: string | undefined = body.chapterId;

    const q = admin.from("book_chapters").select("id, chapter_number, title, content, is_background").order("order_index");
    const { data: chapters } = onlyChapterId ? await q.eq("id", onlyChapterId) : await q;
    if (!chapters?.length) return json({ error: "No chapters" }, 404);

    let totalGenerated = 0;
    const failures: { chapter: number; reason: string }[] = [];

    for (const ch of chapters) {
      if (ch.is_background) continue;
      try {
        const aiRes = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: "meta/llama-3.3-70b-instruct",
            max_tokens: 2000,
            messages: [
              {
                role: "system",
                content: `You write challenging multiple-choice quiz questions for a trading curriculum. Output ONLY valid JSON — no prose, no markdown fences.

Rules:
- Exactly 4 questions per chapter.
- Each question has exactly 4 options.
- Test understanding, not memorization. Questions should require the reader to apply concepts.
- Distractors must be PLAUSIBLE — common misconceptions, near-misses, partial truths. Never obviously wrong throwaway options.
- The correct answer's position should be randomized across the 4 questions (not always option A).
- Each "explanation" cites the chapter concept that makes the right answer correct.
- Keep questions and options under 220 chars each.
- Do not invent facts not in the chapter.`,
              },
              {
                role: "user",
                content: `Generate quiz JSON for Chapter ${ch.chapter_number}: ${ch.title}.\n\nCHAPTER:\n${ch.content}\n\nRespond with: {"questions":[{"question":"...","options":["A","B","C","D"],"correct_answer":0,"explanation":"..."}, ...4 items]}`,
              },
            ],
          }),
        });
        if (!aiRes.ok) { failures.push({ chapter: ch.chapter_number, reason: `AI ${aiRes.status}` }); continue; }
        const aiJson = await aiRes.json();
        const content: string | undefined = aiJson?.choices?.[0]?.message?.content;
        if (!content) { failures.push({ chapter: ch.chapter_number, reason: "empty" }); continue; }
        // Models sometimes wrap JSON in prose/fences — extract the outermost object.
        const start = content.indexOf("{");
        const end = content.lastIndexOf("}");
        if (start === -1 || end <= start) { failures.push({ chapter: ch.chapter_number, reason: "bad json" }); continue; }
        let parsed: { questions: AIQuestion[] };
        try { parsed = JSON.parse(content.slice(start, end + 1)); } catch { failures.push({ chapter: ch.chapter_number, reason: "bad json" }); continue; }
        const questions = (parsed.questions ?? []).filter(
          (q) => q && typeof q.question === "string" && Array.isArray(q.options) && q.options.length === 4 && typeof q.correct_answer === "number"
        );
        if (questions.length === 0) { failures.push({ chapter: ch.chapter_number, reason: "no valid Qs" }); continue; }

        // Wipe + insert
        await admin.from("quizzes").delete().eq("chapter_id", ch.id);
        const rows = questions.slice(0, 4).map((q, i) => ({
          chapter_id: ch.id,
          question: q.question,
          options: q.options,
          correct_answer: Math.max(0, Math.min(3, q.correct_answer)),
          explanation: q.explanation ?? "",
          order_index: i + 1,
          published: true,
        }));
        const { error } = await admin.from("quizzes").insert(rows);
        if (error) { failures.push({ chapter: ch.chapter_number, reason: error.message }); continue; }
        totalGenerated += rows.length;
      } catch (e) {
        failures.push({ chapter: ch.chapter_number, reason: (e as Error).message });
      }
    }

    return json({ ok: true, totalGenerated, chapters: chapters.length, failures });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}