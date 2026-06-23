import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MobileShell } from "@/components/MobileShell";
import { BottomNav } from "@/components/BottomNav";
import { Z1Logo } from "@/components/Z1Logo";
import { CheckCircle2, Download, RefreshCw, BookOpen, Library as LibraryIcon, Sparkles, Loader2 } from "lucide-react";
import { isLoaded, loadDictionary } from "@/lib/dictionary";
import {
  downloadChapter,
  listOffline,
  type OfflineChapter,
} from "@/lib/offline";
import { useChapters } from "@/hooks/useChapters";
import { TUTOR_FAQ } from "@/data/tutorFaq";
import { toast } from "sonner";

type Status = "pending" | "running" | "ok" | "error";

interface Step {
  status: Status;
  progress: number; // 0–100
  detail: string;
}

const initial: Step = { status: "pending", progress: 0, detail: "" };

export default function OfflineSync() {
  const nav = useNavigate();
  const { data: chapters = [], isLoading: chaptersLoading } = useChapters();

  const [dict, setDict] = useState<Step>({ ...initial });
  const [book, setBook] = useState<Step>({ ...initial });
  const [cached, setCached] = useState<OfflineChapter[]>([]);
  const [busy, setBusy] = useState(false);

  async function refreshCached() {
    try { setCached(await listOffline()); } catch { /* noop */ }
  }

  useEffect(() => {
    refreshCached();
    if (isLoaded()) setDict({ status: "ok", progress: 100, detail: "Cached on device" });
  }, []);

  const cachedById = useMemo(() => {
    const m = new Set(cached.map((c) => c.id));
    return m;
  }, [cached]);

  const allBookReady = chapters.length > 0 && chapters.every((c) => cachedById.has(c.id));
  const ready = dict.status === "ok" && allBookReady;

  async function syncAll() {
    if (busy) return;
    setBusy(true);

    // 1. Dictionary
    if (!isLoaded()) {
      setDict({ status: "running", progress: 0, detail: "Downloading ~9 MB…" });
      try {
        await loadDictionary((loaded, total) => {
          const pct = total ? Math.round((loaded / total) * 100) : 0;
          setDict({ status: "running", progress: pct, detail: `${pct}% · ${(loaded / 1024 / 1024).toFixed(1)} MB` });
        });
        setDict({ status: "ok", progress: 100, detail: "Cached on device" });
      } catch (e: any) {
        setDict({ status: "error", progress: 0, detail: e?.message || "Download failed" });
        setBusy(false);
        return;
      }
    } else {
      setDict({ status: "ok", progress: 100, detail: "Cached on device" });
    }

    // 2. Chapters — fetch text + audio for any missing.
    setBook({ status: "running", progress: 0, detail: "Preparing chapters…" });
    const { data, error } = await supabase
      .from("book_chapters")
      .select("*")
      .order("order_index");
    if (error || !data) {
      setBook({ status: "error", progress: 0, detail: error?.message || "Could not load chapters" });
      setBusy(false);
      return;
    }

    const current = new Set((await listOffline()).map((c) => c.id));
    const rows = data as any[];
    const todo = rows.filter((c) => !current.has(c.id));

    if (todo.length === 0) {
      setBook({ status: "ok", progress: 100, detail: `${data.length} chapters ready` });
    } else {
      let done = 0;
      for (const ch of todo) {
        setBook({
          status: "running",
          progress: Math.round((done / todo.length) * 100),
          detail: `Ch ${ch.chapter_number} · ${ch.title}`,
        });
        try {
          await downloadChapter({
            id: ch.id,
            chapter_number: ch.chapter_number,
            title: ch.title,
            subtitle: ch.subtitle ?? null,
            content: ch.content ?? "",
            estimated_minutes: ch.estimated_minutes ?? null,
            audio_url: ch.audio_url ?? null,
            cover_image_url: ch.cover_image_url ?? null,
          });
          done++;
        } catch (e) {
          console.warn("chapter cache failed", ch.id, e);
        }
      }
      setBook({
        status: "ok",
        progress: 100,
        detail: `${rows.length} chapters ready`,
      });
    }

    await refreshCached();
    setBusy(false);
    toast.success("Offline library is ready");
  }

  return (
    <MobileShell
      noPadding
      bottomNav={<BottomNav />}
      header={
        <header className="px-5 pt-6 pb-3 safe-top flex items-center gap-3 border-b border-border/40">
          <Z1Logo size={40} />
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-[0.3em] text-gold-bright">Offline library</div>
            <div className="text-sm font-medium">Sync for travel & flights</div>
          </div>
          <div className={`size-2 rounded-full ${ready ? "bg-success" : "bg-gold animate-pulse"}`} />
        </header>
      }
    >
      <div className="px-5 pt-5 pb-44 space-y-4">
        <section className="glass-strong rounded-3xl p-5 gold-border">
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-xl gold-fill grid place-items-center shadow-glow">
              {ready ? <CheckCircle2 className="size-5" /> : <Download className="size-5" />}
            </div>
            <div className="flex-1">
              <h2 className="display text-lg font-medium">
                {ready ? "Ready to tutor offline" : "Prepare for offline tutoring"}
              </h2>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Caches the dictionary, every chapter, and audio narration on this device so the Tutor works with no signal.
              </p>
            </div>
          </div>

          <button
            onClick={syncAll}
            disabled={busy || chaptersLoading}
            className="mt-4 w-full rounded-2xl gold-fill text-background font-medium text-sm py-3 press shadow-glow disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : ready ? <RefreshCw className="size-4" /> : <Download className="size-4" />}
            {busy ? "Syncing…" : ready ? "Re-sync now" : "Sync everything"}
          </button>

          {ready && !busy && (
            <button
              onClick={() => nav("/tutor")}
              className="mt-2 w-full rounded-2xl glass text-sm py-3 press"
            >
              Open Tutor →
            </button>
          )}
        </section>

        <StepCard
          icon={BookOpen}
          title="Offline dictionary"
          subtitle="~9 MB · Webster's, ~86k words"
          step={dict}
          fallbackOk={isLoaded()}
        />

        <StepCard
          icon={LibraryIcon}
          title="Book chapters"
          subtitle={
            chapters.length > 0
              ? `${cached.length}/${chapters.length} cached`
              : "Loading…"
          }
          step={
            book.status === "pending" && allBookReady && chapters.length > 0
              ? { status: "ok", progress: 100, detail: `${chapters.length} chapters ready` }
              : book
          }
          fallbackOk={allBookReady}
        />

        <section className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-gold-bright" />
            <div className="text-sm font-medium">Tutor knowledge base</div>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            {TUTOR_FAQ.length} curated answers bundled in the app. Always available, no download required.
          </p>
        </section>

        <p className="text-[11px] text-muted-foreground text-center pt-2">
          Cached content auto-refreshes after 30 days. Re-sync any time to pick up new chapters.
        </p>
      </div>
    </MobileShell>
  );
}

function StepCard({
  icon: Icon,
  title,
  subtitle,
  step,
  fallbackOk,
}: {
  icon: any;
  title: string;
  subtitle: string;
  step: Step;
  fallbackOk: boolean;
}) {
  const effective: Step =
    step.status === "pending" && fallbackOk
      ? { status: "ok", progress: 100, detail: "Cached on device" }
      : step;

  return (
    <section className="glass rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <div
          className={`size-9 rounded-xl grid place-items-center ${
            effective.status === "ok"
              ? "bg-success/15 text-success"
              : effective.status === "error"
              ? "bg-destructive/15 text-destructive"
              : "bg-gold/10 text-gold-bright"
          }`}
        >
          {effective.status === "ok" ? <CheckCircle2 className="size-4" /> : <Icon className="size-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{title}</div>
          <div className="text-[11px] text-muted-foreground truncate">{subtitle}</div>
        </div>
        <StatusBadge status={effective.status} />
      </div>

      {(effective.status === "running" || effective.status === "ok") && (
        <div className="mt-3">
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className={`h-full transition-all ${effective.status === "ok" ? "bg-success" : "gold-fill"}`}
              style={{ width: `${effective.status === "ok" ? 100 : effective.progress}%` }}
            />
          </div>
          {effective.detail && (
            <div className="text-[10px] text-muted-foreground mt-1.5">{effective.detail}</div>
          )}
        </div>
      )}

      {effective.status === "error" && (
        <div className="mt-2 text-[11px] text-destructive">{effective.detail || "Failed"}</div>
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: Status }) {
  if (status === "ok")
    return <span className="text-[10px] uppercase tracking-[0.18em] text-success">Ready</span>;
  if (status === "running")
    return <span className="text-[10px] uppercase tracking-[0.18em] text-gold-bright">Syncing</span>;
  if (status === "error")
    return <span className="text-[10px] uppercase tracking-[0.18em] text-destructive">Error</span>;
  return <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Pending</span>;
}