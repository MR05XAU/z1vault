import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MobileShell } from "@/components/MobileShell";
import { BottomNav } from "@/components/BottomNav";
import { Layers, Check, X, RotateCcw, ArrowLeft } from "lucide-react";
import { buzz } from "@/lib/fx";

type Card = { id: string; question: string; answer: string; explanation: string | null; chapter: string };

// Leitner spaced repetition: correct promotes to a longer interval box,
// wrong resets to box 0 (due immediately). Intervals in days.
const INTERVALS = [0, 1, 3, 7, 16, 35];
const nextDue = (ease: number) => {
  const days = INTERVALS[Math.min(ease, INTERVALS.length - 1)];
  return new Date(Date.now() + days * 86400_000).toISOString();
};

export default function Flashcards() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const sb = supabase as any;
      const [{ data: quizzes }, { data: reviews }, { data: chapters }] = await Promise.all([
        sb.from("quizzes").select("id,chapter_id,question,options,correct_answer,explanation"),
        sb.from("flashcard_reviews").select("card_id,ease,due_at").eq("user_id", user.id),
        sb.from("book_chapters").select("id,chapter_number,title"),
      ]);
      const chapMap: Record<string, string> = {};
      for (const c of chapters ?? []) chapMap[c.id] = `Ch ${c.chapter_number}`;
      const dueMap = new Map<string, string>();
      for (const r of reviews ?? []) dueMap.set(r.card_id, r.due_at);
      const now = Date.now();
      const all: Card[] = (quizzes ?? []).map((q: any) => ({
        id: q.id,
        question: q.question,
        answer: (q.options as string[])[q.correct_answer],
        explanation: q.explanation,
        chapter: chapMap[q.chapter_id] ?? "",
      }));
      // Due = never reviewed, or due_at in the past. Shuffle for variety.
      const due = all.filter((c) => { const d = dueMap.get(c.id); return !d || new Date(d).getTime() <= now; });
      due.sort(() => Math.random() - 0.5);
      setCards(due.slice(0, 20));
      setLoading(false);
    })();
  }, [user]);

  const card = cards[idx];
  const progress = useMemo(() => (cards.length ? Math.round((reviewed / cards.length) * 100) : 0), [reviewed, cards.length]);

  const grade = async (correct: boolean) => {
    if (!user || !card) return;
    buzz(correct ? 12 : [20, 40, 20]);
    const sb = supabase as any;
    const { data: existing } = await sb.from("flashcard_reviews").select("ease").eq("user_id", user.id).eq("card_id", card.id).maybeSingle();
    const ease = correct ? Math.min((existing?.ease ?? 0) + 1, INTERVALS.length - 1) : 0;
    await sb.from("flashcard_reviews").upsert(
      { user_id: user.id, card_id: card.id, ease, due_at: nextDue(ease), updated_at: new Date().toISOString() },
      { onConflict: "user_id,card_id" },
    );
    setReviewed((n) => n + 1);
    setFlipped(false);
    setIdx((i) => i + 1);
  };

  return (
    <MobileShell
      bottomNav={<BottomNav />}
      header={
        <header className="px-5 pt-6 safe-top flex items-center gap-3">
          <button onClick={() => nav(-1)} aria-label="Back" className="size-9 grid place-items-center rounded-full glass press">
            <ArrowLeft className="size-4" />
          </button>
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-[0.3em] text-mint-bright">Review</div>
            <h1 className="display text-2xl font-medium flex items-center gap-2"><Layers className="size-5 text-mint-bright" /> Flashcards</h1>
          </div>
        </header>
      }
    >
      <div className="px-5 pt-6">
        {loading ? (
          <div className="grid place-items-center py-24"><div className="size-7 border-2 border-mint/30 border-t-mint rounded-full animate-spin" /></div>
        ) : cards.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center mt-8">
            <Check className="size-8 mx-auto text-mint-bright" />
            <div className="display text-lg font-medium mt-3">All caught up.</div>
            <p className="text-sm text-muted-foreground mt-1">No cards due for review right now. Read more chapters to unlock cards, and come back tomorrow.</p>
            <button onClick={() => nav("/library")} className="mt-5 rounded-xl mint-fill px-5 py-2.5 text-sm font-medium press">Back to the book</button>
          </div>
        ) : idx >= cards.length ? (
          <div className="glass rounded-2xl p-8 text-center mt-8 animate-fade-up">
            <Check className="size-8 mx-auto text-mint-bright" />
            <div className="display text-lg font-medium mt-3">Session complete!</div>
            <p className="text-sm text-muted-foreground mt-1">You reviewed {reviewed} card{reviewed === 1 ? "" : "s"}. Spaced repetition schedules the next review automatically.</p>
            <button onClick={() => { setIdx(0); setReviewed(0); }} className="mt-5 inline-flex items-center gap-1.5 rounded-xl mint-fill px-5 py-2.5 text-sm font-medium press">
              <RotateCcw className="size-4" /> Review again
            </button>
          </div>
        ) : (
          <>
            <div className="h-1 rounded-full bg-border/50 overflow-hidden">
              <div className="h-full mint-fill transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
              <span>{card?.chapter}</span>
              <span>{idx + 1} / {cards.length}</span>
            </div>

            <button
              onClick={() => setFlipped((f) => !f)}
              className="mt-4 w-full min-h-[240px] glass-strong rounded-3xl p-6 flex flex-col items-center justify-center text-center press mint-border"
            >
              <div className="text-[10px] uppercase tracking-[0.28em] text-mint-bright mb-3">{flipped ? "Answer" : "Question"}</div>
              <div className="text-lg font-medium leading-snug">{flipped ? card?.answer : card?.question}</div>
              {flipped && card?.explanation && (
                <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{card.explanation}</p>
              )}
              {!flipped && <div className="text-[11px] text-muted-foreground mt-4">Tap to reveal</div>}
            </button>

            {flipped ? (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button onClick={() => grade(false)} className="flex items-center justify-center gap-2 rounded-2xl border border-danger/40 bg-danger/10 py-4 text-sm font-medium text-danger press">
                  <X className="size-4" /> Missed it
                </button>
                <button onClick={() => grade(true)} className="flex items-center justify-center gap-2 rounded-2xl mint-fill py-4 text-sm font-medium press">
                  <Check className="size-4" /> Got it
                </button>
              </div>
            ) : (
              <button onClick={() => setFlipped(true)} className="mt-4 w-full rounded-2xl glass py-4 text-sm font-medium press">
                Reveal answer
              </button>
            )}
          </>
        )}
      </div>
    </MobileShell>
  );
}
