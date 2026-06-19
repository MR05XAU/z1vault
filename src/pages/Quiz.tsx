import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, X, Trophy, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MindsetCard } from "@/components/MindsetCard";

interface Q {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string;
}

export default function Quiz() {
  const { chapterId } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [chapter, setChapter] = useState<any>(null);
  const [qs, setQs] = useState<Q[]>([]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState(false);

  useEffect(() => {
    if (!chapterId) return;
    (async () => {
      const [ch, qz] = await Promise.all([
        supabase.from("book_chapters").select("title,chapter_number").eq("id", chapterId).maybeSingle(),
        supabase.from("quizzes").select("*").eq("chapter_id", chapterId).order("order_index"),
      ]);
      setChapter(ch.data);
      setQs((qz.data ?? []).map((q: any) => ({ ...q, options: q.options as string[] })));
      setLoading(false);
    })();
  }, [chapterId]);

  const current = qs[idx];
  const score = answers.reduce((s, a, i) => s + (a === qs[i]?.correct_answer ? 1 : 0), 0);

  const choose = (n: number) => {
    if (picked !== null) return;
    setPicked(n);
  };

  const next = async () => {
    if (picked === null) return;
    const updated = [...answers, picked];
    setAnswers(updated);
    setPicked(null);
    if (idx + 1 >= qs.length) {
      const final = updated.reduce((s, a, i) => s + (a === qs[i].correct_answer ? 1 : 0), 0);
      await supabase.from("quiz_results").insert({
        user_id: user!.id,
        chapter_id: chapterId!,
        score: final,
        total_questions: qs.length,
        answers: updated,
      });
      setDone(true);
    } else {
      setIdx(idx + 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] vault-bg grid place-items-center">
        <div className="size-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  if (!qs.length) {
    return (
      <div className="min-h-[100dvh] vault-bg grid place-items-center px-6 text-center">
        <div>
          <div className="text-sm text-muted-foreground">No quiz yet for this chapter.</div>
          <Button onClick={() => nav(-1)} variant="outline" className="mt-4">Back</Button>
        </div>
      </div>
    );
  }

  if (done) {
    const final = answers.reduce((s, a, i) => s + (a === qs[i].correct_answer ? 1 : 0), 0);
    const pct = Math.round((final / qs.length) * 100);
    if (review) {
      return (
        <div className="min-h-[100dvh] vault-bg flex justify-center">
          <div className="w-full max-w-md flex flex-col px-5 safe-top pb-10">
            <header className="flex items-center gap-3 mt-2">
              <button onClick={() => setReview(false)} className="size-9 grid place-items-center rounded-full glass press">
                <ArrowLeft className="size-4" />
              </button>
              <div className="flex-1">
                <div className="text-[10px] uppercase tracking-[0.32em] text-gold-bright">Review</div>
                <div className="text-sm font-medium">{chapter?.title}</div>
              </div>
              <div className="text-xs font-mono text-muted-foreground">{final}/{qs.length}</div>
            </header>
            <div className="mt-6 space-y-4">
              {qs.map((q, i) => {
                const userAns = answers[i];
                const correct = userAns === q.correct_answer;
                return (
                  <div key={q.id} className="glass rounded-2xl p-4">
                    <div className="flex items-start gap-2 mb-2">
                      <div className={`size-6 rounded-md grid place-items-center text-[10px] font-mono shrink-0 ${correct ? "bg-success text-background" : "bg-danger text-background"}`}>
                        {correct ? <Check className="size-3" strokeWidth={3} /> : <X className="size-3" strokeWidth={3} />}
                      </div>
                      <div className="text-sm font-medium flex-1">{q.question}</div>
                    </div>
                    <div className="space-y-1.5 mt-3">
                      {q.options.map((opt, j) => (
                        <div key={j} className={`text-xs rounded-lg px-3 py-2 border ${
                          j === q.correct_answer ? "bg-success/10 border-success/40 text-foreground"
                          : j === userAns ? "bg-danger/10 border-danger/40 text-foreground"
                          : "border-border/40 text-muted-foreground"
                        }`}>
                          <span className="font-mono mr-2">{String.fromCharCode(65 + j)}.</span>{opt}
                        </div>
                      ))}
                    </div>
                    {q.explanation && (
                      <p className="text-xs text-muted-foreground mt-3 italic leading-relaxed">{q.explanation}</p>
                    )}
                  </div>
                );
              })}
            </div>
            <Button onClick={() => nav("/library")} className="mt-6 h-14 rounded-2xl gold-fill press shadow-glow">
              Done
            </Button>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-[100dvh] vault-bg grid place-items-center px-6">
        <div className="text-center animate-fade-up max-w-sm">
          <div className="relative inline-grid place-items-center">
            <div className="absolute inset-0 -m-8 rounded-full bg-gold/20 blur-3xl animate-gold-pulse" />
            <div className="size-24 rounded-3xl gold-fill grid place-items-center shadow-glow-strong relative">
              <Trophy className="size-12" />
            </div>
          </div>
          <div className="text-[10px] uppercase tracking-[0.32em] text-gold-bright mt-6">Quiz complete</div>
          <h1 className="display text-5xl font-medium mt-3 gold-text">{pct}%</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {final} of {qs.length} correct
          </p>
          {pct < 70 && (
            <div className="mt-6 text-left">
              <MindsetCard mode="after-quiz-fail" compact />
            </div>
          )}
          <div className="flex gap-2 mt-8">
            <Button onClick={() => setReview(true)} variant="outline" className="flex-1 h-12 rounded-xl border-border-strong">
              Review answers
            </Button>
            <Button onClick={() => nav("/library")} className="flex-1 h-12 rounded-xl gold-fill press shadow-glow">
              Next chapter
            </Button>
          </div>
          <button onClick={() => nav(`/read/${chapterId}`)} className="mt-4 text-xs text-muted-foreground press">
            Re-read chapter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] vault-bg flex justify-center">
      <div className="w-full max-w-md flex flex-col px-5 safe-top pb-8">
        <header className="flex items-center gap-3 mt-2">
          <button onClick={() => nav(-1)} className="size-9 grid place-items-center rounded-full glass press">
            <ArrowLeft className="size-4" />
          </button>
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-[0.32em] text-gold-bright">Quiz</div>
            <div className="text-sm font-medium">{chapter?.title}</div>
          </div>
          <div className="text-xs text-muted-foreground font-mono">{idx + 1}/{qs.length}</div>
        </header>

        <div className="flex gap-1.5 mt-4">
          {qs.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i < idx ? "bg-gold" : i === idx ? "bg-gold/60" : "bg-foreground/10"}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 flex flex-col mt-8"
          >
            <h2 className="display text-2xl font-medium leading-snug">{current.question}</h2>
            <div className="mt-6 space-y-2.5">
              {current.options.map((opt, i) => {
                const isPicked = picked === i;
                const isCorrect = i === current.correct_answer;
                const reveal = picked !== null;
                return (
                  <button
                    key={i}
                    onClick={() => choose(i)}
                    disabled={reveal}
                    className={`w-full text-left rounded-2xl px-4 py-4 flex items-center gap-3 press border transition-all ${
                      reveal
                        ? isCorrect
                          ? "bg-success/10 border-success/40 text-foreground"
                          : isPicked
                          ? "bg-danger/10 border-danger/40 text-foreground"
                          : "glass opacity-60"
                        : "glass hover:shadow-glow border-border/60"
                    }`}
                  >
                    <div
                      className={`size-7 rounded-lg grid place-items-center text-xs font-mono shrink-0 ${
                        reveal && isCorrect
                          ? "bg-success text-background"
                          : reveal && isPicked
                          ? "bg-danger text-background"
                          : "bg-foreground/10"
                      }`}
                    >
                      {reveal && isCorrect ? <Check className="size-4" strokeWidth={3} /> :
                       reveal && isPicked ? <X className="size-4" strokeWidth={3} /> :
                       String.fromCharCode(65 + i)}
                    </div>
                    <span className="text-sm">{opt}</span>
                  </button>
                );
              })}
            </div>

            {picked !== null && current.explanation && (
              <div className="mt-5 glass rounded-2xl p-4 animate-fade-up">
                <div className="text-[10px] uppercase tracking-[0.28em] text-gold-bright mb-1.5">Explanation</div>
                <p className="text-sm text-foreground/85 leading-relaxed">{current.explanation}</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <Button
          onClick={next}
          disabled={picked === null}
          className="mt-6 h-14 rounded-2xl gold-fill font-medium shadow-glow press disabled:opacity-30 disabled:shadow-none"
        >
          {idx + 1 >= qs.length ? "Finish" : "Continue"}
        </Button>
      </div>
    </div>
  );
}