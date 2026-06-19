import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Z1Logo } from "@/components/Z1Logo";
import { BookOpen, Sparkles, Trophy, ArrowRight } from "lucide-react";

const slides = [
  {
    badge: "Welcome",
    title: "A private trading vault.",
    body: "Z1 INSIGHTS is the elite trading academy that lives in your pocket — an interactive book, an AI mentor, and a quiz engine, all in one premium experience.",
    visual: (
      <div className="relative">
        <div className="absolute inset-0 -m-10 rounded-full bg-gold/20 blur-3xl animate-gold-pulse" />
        <Z1Logo size={110} className="relative" />
      </div>
    ),
  },
  {
    badge: "What's inside",
    title: "Read. Ask. Master.",
    body: "Swipe through a beautifully typeset trading book, highlight passages, then ask the AI tutor to explain anything — restricted to the book, never to noise.",
    visual: (
      <div className="relative grid grid-cols-3 gap-3 w-[260px]">
        {[
          { icon: BookOpen, label: "Book" },
          { icon: Sparkles, label: "AI Tutor" },
          { icon: Trophy, label: "Quizzes" },
        ].map(({ icon: Icon, label }, i) => (
          <div
            key={label}
            className="glass aspect-square rounded-2xl grid place-items-center animate-fade-up"
            style={{ animationDelay: `${i * 120}ms` }}
          >
            <Icon className="size-7 text-gold-bright mb-1" />
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {label}
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    badge: "Lifetime access",
    title: "One payment. Forever.",
    body: "No subscriptions. No renewals. Unlock the entire vault — the book, the AI tutor, the quizzes, the analytics — once. Yours for life.",
    visual: (
      <div className="glass rounded-3xl p-6 w-[280px] text-center gold-border">
        <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Lifetime access</div>
        <div className="display gold-text text-5xl font-medium mt-2">$197</div>
        <div className="text-xs text-muted-foreground mt-1">One-time payment</div>
      </div>
    ),
  },
];

const ONBOARD_KEY = "z1.onboardingDone";

export default function Onboarding() {
  const [i, setI] = useState(0);
  const nav = useNavigate();
  const finish = () => { try { localStorage.setItem(ONBOARD_KEY, "1"); } catch {} ; nav("/auth"); };
  const next = () => (i < slides.length - 1 ? setI(i + 1) : finish());
  const slide = slides[i];

  return (
    <div className="min-h-[100dvh] vault-bg flex justify-center">
      <div className="w-full max-w-md min-h-[100dvh] flex flex-col safe-top px-6 pb-[max(env(safe-area-inset-bottom),1.25rem)]">
        <div className="flex items-center justify-between pt-4">
          <div className="flex gap-1.5">
            {slides.map((_, idx) => (
              <div
                key={idx}
                className={`h-1 rounded-full transition-all duration-500 ${
                  idx === i ? "w-8 bg-gold" : idx < i ? "w-4 bg-gold/60" : "w-4 bg-foreground/10"
                }`}
              />
            ))}
          </div>
          <button
            onClick={finish}
            className="text-xs text-muted-foreground tracking-wide hover:text-foreground transition-colors"
          >
            Skip
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center"
            >
              <div className="my-6">{slide.visual}</div>
              <div className="text-[10px] uppercase tracking-[0.32em] text-gold-bright mb-3">
                {slide.badge}
              </div>
              <h1 className="display text-4xl font-medium leading-[1.05] mb-4 px-4">
                {slide.title}
              </h1>
              <p className="text-[15px] leading-relaxed text-muted-foreground max-w-xs">
                {slide.body}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <Button
          onClick={next}
          className="h-14 rounded-2xl gold-fill text-base font-medium tracking-wide shadow-glow press hover:shadow-glow-strong group"
        >
          {i === slides.length - 1 ? "Get started" : "Continue"}
          <ArrowRight className="ml-2 size-5 transition-transform group-hover:translate-x-0.5" />
        </Button>
      </div>
    </div>
  );
}