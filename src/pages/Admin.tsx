import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
const sb = supabase as any; // types regen after migration runs
import { useAuth } from "@/hooks/useAuth";
import { MobileShell } from "@/components/MobileShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Upload, BookOpen, BrainCircuit, NotebookPen, FileAudio, ShieldCheck, Loader2, Mail, Users, Home, BarChart3, Megaphone, Ticket, Copy } from "lucide-react";

type Tab = "stats" | "chapters" | "quizzes" | "notebook" | "emails" | "users" | "broadcast" | "discounts";

export default function Admin() {
  const { user, isAdmin, accessLoading } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>("stats");
  const [bootstrapping, setBootstrapping] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [regenQuiz, setRegenQuiz] = useState(false);

  if (accessLoading) return <FullSpinner />;
  if (!user) return <Navigate to="/auth" replace />;

  const bootstrap = async () => {
    setBootstrapping(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-bootstrap`;
      const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${session?.access_token}` } });
      const j = await res.json();
      if (!res.ok) toast.error(j.error || "Bootstrap failed");
      else { toast.success("You are now admin. Reloading…"); setTimeout(() => location.reload(), 800); }
    } finally { setBootstrapping(false); }
  };

  const seedBook = async () => {
    if (!confirm("Replace ALL current chapters with the parsed PDF chapters?")) return;
    setSeeding(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-seed-book`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ replace: true }),
      });
      const j = await res.json();
      if (!res.ok) toast.error(j.error || "Seed failed");
      else toast.success(`Loaded ${j.inserted} chapters from PDF.`);
    } finally { setSeeding(false); }
  };

  const regenerateQuizzes = async () => {
    if (!confirm("Regenerate ALL quizzes via AI (4 harder questions per chapter)? This replaces existing questions and may take 1-2 minutes.")) return;
    setRegenQuiz(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-regenerate-quizzes`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({}),
      });
      const j = await res.json();
      if (!res.ok) toast.error(j.error || "Regenerate failed");
      else {
        const fails = j.failures?.length ? ` (${j.failures.length} chapters failed)` : "";
        toast.success(`Generated ${j.totalGenerated} questions across ${j.chapters} chapters${fails}.`);
      }
    } finally { setRegenQuiz(false); }
  };

  if (!isAdmin) {
    return (
      <MobileShell>
        <div className="min-h-[60dvh] flex flex-col items-center justify-center text-center px-6">
          <ShieldCheck className="size-12 text-gold-bright mb-3" />
          <h1 className="display text-2xl font-medium">Admin access</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xs">
            If you are the first admin for this app, claim the role below. After the first admin is set, only existing admins can grant new ones.
          </p>
          <Button onClick={bootstrap} disabled={bootstrapping} className="mt-6 gold-fill h-12 px-6 rounded-xl">
            {bootstrapping ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            Claim first-admin role
          </Button>
          <button onClick={() => nav("/vault")} className="text-xs text-muted-foreground mt-4 press">
            Back to vault
          </button>
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell
      header={
        <header className="px-5 pt-6 safe-top">
          <div className="text-[10px] uppercase tracking-[0.3em] text-gold-bright">Admin</div>
          <h1 className="display text-3xl font-medium mt-1">Content control.</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage chapters, quizzes, and notebook pages. Changes go live instantly.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={seedBook} disabled={seeding} variant="outline" className="rounded-xl border-border-strong">
              {seeding ? <Loader2 className="size-3 animate-spin mr-1.5" /> : <Upload className="size-3 mr-1.5" />}
              Reseed from PDF
            </Button>
            <Button size="sm" onClick={regenerateQuizzes} disabled={regenQuiz} variant="outline" className="rounded-xl border-border-strong">
              {regenQuiz ? <Loader2 className="size-3 animate-spin mr-1.5" /> : <BrainCircuit className="size-3 mr-1.5" />}
              Regenerate quizzes
            </Button>
            <Button size="sm" onClick={() => nav("/vault")} variant="ghost" className="rounded-xl text-xs">
              <Home className="size-3 mr-1" /> Home
            </Button>
          </div>

          <div className="mt-4 flex gap-1 bg-surface-elevated/60 rounded-xl p-1 overflow-x-auto">
            {(["stats", "users", "broadcast", "discounts", "emails", "chapters", "quizzes", "notebook"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 text-xs font-medium py-2 rounded-lg press capitalize whitespace-nowrap ${
                  tab === t ? "bg-gold text-gold-foreground" : "text-muted-foreground"
                }`}
              >
                {t === "stats" && <BarChart3 className="size-3 inline mr-1" />}
                {t === "chapters" && <BookOpen className="size-3 inline mr-1" />}
                {t === "quizzes" && <BrainCircuit className="size-3 inline mr-1" />}
                {t === "notebook" && <NotebookPen className="size-3 inline mr-1" />}
                {t === "emails" && <Mail className="size-3 inline mr-1" />}
                {t === "users" && <Users className="size-3 inline mr-1" />}
                {t === "broadcast" && <Megaphone className="size-3 inline mr-1" />}
                {t === "discounts" && <Ticket className="size-3 inline mr-1" />}
                {t}
              </button>
            ))}
          </div>
        </header>
      }
    >
      <div className="mt-4 pb-12">
        {tab === "stats" && <StatsPanel />}
        {tab === "chapters" && <ChaptersPanel />}
        {tab === "quizzes" && <QuizzesPanel />}
        {tab === "notebook" && <NotebookPanel />}
        {tab === "emails" && <EmailLogsPanel />}
        {tab === "users" && <UsersPanel />}
        {tab === "broadcast" && <BroadcastPanel />}
        {tab === "discounts" && <DiscountsPanel />}
      </div>
    </MobileShell>
  );
}

function FullSpinner() {
  return <div className="min-h-[100dvh] vault-bg grid place-items-center"><Loader2 className="size-6 text-gold animate-spin" /></div>;
}

/* ---------- CHAPTERS ---------- */
function ChaptersPanel() {
  const [chapters, setChapters] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);

  const refresh = async () => {
    const { data } = await sb.from("book_chapters").select("*").order("order_index");
    setChapters(data ?? []);
  };
  useEffect(() => { refresh(); }, []);

  const remove = async (id: string) => {
    if (!confirm("Delete this chapter and all its quizzes/progress?")) return;
    const { error } = await supabase.from("book_chapters").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); refresh(); }
  };

  if (editing) return <ChapterEditor chapter={editing} onDone={() => { setEditing(null); refresh(); }} />;

  return (
    <div className="space-y-3 px-5">
      <Button onClick={() => setEditing({ chapter_number: (chapters.at(-1)?.chapter_number ?? 0) + 1, title: "", subtitle: "", content: "", estimated_minutes: 5, order_index: chapters.length + 1, published: true })}
        className="w-full gold-fill h-11 rounded-xl">
        <Plus className="size-4 mr-1.5" /> New chapter
      </Button>
      {chapters.map((c) => (
        <div key={c.id} className="glass rounded-2xl p-4 flex items-center gap-3">
          <div className="size-10 grid place-items-center rounded-lg bg-surface-elevated display gold-text font-medium text-sm">
            {String(c.chapter_number).padStart(2, "0")}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{c.title}</div>
            <div className="text-[11px] text-muted-foreground flex gap-2">
              <span>{c.content?.length ?? 0} chars</span>
              {c.audio_url && <span className="text-success">· audio</span>}
              {!c.published && <span className="text-danger">· draft</span>}
            </div>
          </div>
          <button onClick={() => setEditing(c)} className="size-8 grid place-items-center rounded-lg glass press"><Pencil className="size-3.5" /></button>
          <button onClick={() => remove(c.id)} className="size-8 grid place-items-center rounded-lg glass press text-danger"><Trash2 className="size-3.5" /></button>
        </div>
      ))}
    </div>
  );
}

function ChapterEditor({ chapter, onDone }: { chapter: any; onDone: () => void }) {
  const [c, setC] = useState({ ...chapter });
  const [saving, setSaving] = useState(false);
  const [audioUploading, setAudioUploading] = useState(false);

  const save = async () => {
    setSaving(true);
    const payload = {
      chapter_number: Number(c.chapter_number),
      title: c.title, subtitle: c.subtitle ?? "", content: c.content,
      estimated_minutes: Number(c.estimated_minutes) || 5,
      order_index: Number(c.order_index) || c.chapter_number,
      audio_url: c.audio_url || null, cover_image_url: c.cover_image_url || null,
      published: c.published !== false,
    };
    const op = c.id
      ? sb.from("book_chapters").update(payload).eq("id", c.id)
      : sb.from("book_chapters").insert(payload);
    const { error } = await op;
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Saved"); onDone(); }
  };

  const uploadAudio = async (file: File) => {
    setAudioUploading(true);
    const path = `ch-${c.chapter_number}-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("chapter-audio").upload(path, file, { contentType: file.type, upsert: true });
    if (error) { toast.error(error.message); setAudioUploading(false); return; }
    const { data } = await supabase.storage.from("chapter-audio").createSignedUrl(path, 60 * 60 * 24 * 365);
    setC({ ...c, audio_url: data?.signedUrl ?? null });
    setAudioUploading(false);
    toast.success("Audio uploaded — remember to Save.");
  };

  return (
    <div className="px-5 space-y-3 pb-nav">
      <Button variant="ghost" onClick={onDone} className="text-xs">← Back</Button>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Chapter #"><Input type="number" value={c.chapter_number} onChange={(e) => setC({ ...c, chapter_number: e.target.value })} /></Field>
        <Field label="Order"><Input type="number" value={c.order_index ?? c.chapter_number} onChange={(e) => setC({ ...c, order_index: e.target.value })} /></Field>
      </div>
      <Field label="Title"><Input value={c.title ?? ""} onChange={(e) => setC({ ...c, title: e.target.value })} /></Field>
      <Field label="Subtitle"><Input value={c.subtitle ?? ""} onChange={(e) => setC({ ...c, subtitle: e.target.value })} /></Field>
      <Field label="Estimated minutes"><Input type="number" value={c.estimated_minutes ?? 5} onChange={(e) => setC({ ...c, estimated_minutes: e.target.value })} /></Field>
      <Field label="Content (Markdown)">
        <Textarea value={c.content ?? ""} onChange={(e) => setC({ ...c, content: e.target.value })} className="min-h-[420px] font-mono text-xs" />
      </Field>
      <Field label="Audio narration (MP3)">
        <div className="flex items-center gap-2">
          <label className="glass rounded-xl px-3 py-2 text-xs cursor-pointer press flex items-center gap-1.5">
            {audioUploading ? <Loader2 className="size-3 animate-spin" /> : <FileAudio className="size-3" />}
            Upload
            <input type="file" accept="audio/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAudio(f); }} />
          </label>
          {c.audio_url ? <audio src={c.audio_url} controls className="h-8 flex-1" /> : <span className="text-xs text-muted-foreground">No audio yet</span>}
        </div>
      </Field>
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={c.published !== false} onChange={(e) => setC({ ...c, published: e.target.checked })} />
        Published (visible to readers)
      </label>
      <Button onClick={save} disabled={saving} className="w-full gold-fill h-12 rounded-xl">
        {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}Save chapter
      </Button>
    </div>
  );
}

/* ---------- QUIZZES ---------- */
function QuizzesPanel() {
  const [chapters, setChapters] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [chapterId, setChapterId] = useState<string>("");
  const [editing, setEditing] = useState<any | null>(null);

  const refresh = async () => {
    const [c, q] = await Promise.all([
      supabase.from("book_chapters").select("id, chapter_number, title").order("order_index"),
      chapterId ? supabase.from("quizzes").select("*").eq("chapter_id", chapterId).order("order_index") : Promise.resolve({ data: [] }),
    ]);
    setChapters(c.data ?? []);
    setQuizzes(q.data ?? []);
  };
  useEffect(() => { refresh(); }, [chapterId]);

  const remove = async (id: string) => {
    if (!confirm("Delete this quiz question?")) return;
    const { error } = await supabase.from("quizzes").delete().eq("id", id);
    if (error) toast.error(error.message); else refresh();
  };

  if (editing) return <QuizEditor q={editing} onDone={() => { setEditing(null); refresh(); }} />;

  return (
    <div className="px-5 space-y-3">
      <select value={chapterId} onChange={(e) => setChapterId(e.target.value)}
        className="w-full bg-surface-elevated border border-border-strong rounded-xl px-3 py-2.5 text-sm">
        <option value="">— Select a chapter —</option>
        {chapters.map((c) => <option key={c.id} value={c.id}>Ch {c.chapter_number}: {c.title}</option>)}
      </select>
      {chapterId && (
        <Button onClick={() => setEditing({ chapter_id: chapterId, question: "", options: ["", "", "", ""], correct_answer: 0, explanation: "", order_index: quizzes.length + 1, published: true })}
          className="w-full gold-fill h-11 rounded-xl"><Plus className="size-4 mr-1.5" />New question</Button>
      )}
      {quizzes.map((q, i) => (
        <div key={q.id} className="glass rounded-2xl p-4">
          <div className="text-[10px] uppercase tracking-[0.28em] text-gold-bright">Q{i + 1}</div>
          <div className="text-sm mt-1 font-medium">{q.question}</div>
          <div className="text-xs text-muted-foreground mt-1">
            ✓ {Array.isArray(q.options) ? q.options[q.correct_answer] : "—"}
          </div>
          <div className="flex gap-2 mt-3">
            <Button size="sm" variant="outline" onClick={() => setEditing(q)} className="rounded-lg"><Pencil className="size-3" /></Button>
            <Button size="sm" variant="outline" onClick={() => remove(q.id)} className="rounded-lg text-danger border-danger/40"><Trash2 className="size-3" /></Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function QuizEditor({ q, onDone }: { q: any; onDone: () => void }) {
  const [v, setV] = useState({ ...q, options: Array.isArray(q.options) ? q.options : ["", "", "", ""] });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const payload = {
      chapter_id: v.chapter_id, question: v.question, options: v.options.filter((o: string) => o.trim().length),
      correct_answer: Number(v.correct_answer), explanation: v.explanation ?? "",
      order_index: Number(v.order_index) || 1, published: v.published !== false,
    };
    const op = v.id
      ? sb.from("quizzes").update(payload).eq("id", v.id)
      : sb.from("quizzes").insert(payload);
    const { error } = await op;
    setSaving(false);
    if (error) toast.error(error.message); else { toast.success("Saved"); onDone(); }
  };

  return (
    <div className="px-5 space-y-3 pb-nav">
      <Button variant="ghost" onClick={onDone} className="text-xs">← Back</Button>
      <Field label="Question"><Textarea value={v.question} onChange={(e) => setV({ ...v, question: e.target.value })} className="min-h-20" /></Field>
      {v.options.map((opt: string, i: number) => (
        <Field key={i} label={`Option ${i + 1}${v.correct_answer === i ? " ✓" : ""}`}>
          <div className="flex gap-2 items-center">
            <input type="radio" checked={v.correct_answer === i} onChange={() => setV({ ...v, correct_answer: i })} />
            <Input value={opt} onChange={(e) => { const o = [...v.options]; o[i] = e.target.value; setV({ ...v, options: o }); }} />
          </div>
        </Field>
      ))}
      <Field label="Explanation"><Textarea value={v.explanation ?? ""} onChange={(e) => setV({ ...v, explanation: e.target.value })} /></Field>
      <Button onClick={save} disabled={saving} className="w-full gold-fill h-12 rounded-xl">
        {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}Save question
      </Button>
    </div>
  );
}

/* ---------- NOTEBOOK ---------- */
function NotebookPanel() {
  const [pages, setPages] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);

  const refresh = async () => {
    const { data } = await sb.from("notebook_pages").select("*").order("order_index");
    setPages(data ?? []);
  };
  useEffect(() => { refresh(); }, []);

  const remove = async (id: string) => {
    if (!confirm("Delete this page?")) return;
    const { error } = await sb.from("notebook_pages").delete().eq("id", id);
    if (error) toast.error(error.message); else refresh();
  };

  if (editing) {
    return (
      <NotebookEditor
        page={editing}
        onDone={() => { setEditing(null); refresh(); }}
      />
    );
  }

  return (
    <div className="px-5 space-y-3">
      <Button onClick={() => setEditing({ slug: "", title: "", content: "", order_index: pages.length + 1, published: true })}
        className="w-full gold-fill h-11 rounded-xl"><Plus className="size-4 mr-1.5" />New notebook page</Button>
      {pages.map((p) => (
        <div key={p.id} className="glass rounded-2xl p-4 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{p.title}</div>
            <div className="text-[11px] text-muted-foreground">/{p.slug}</div>
          </div>
          <button onClick={() => setEditing(p)} className="size-8 grid place-items-center rounded-lg glass press"><Pencil className="size-3.5" /></button>
          <button onClick={() => remove(p.id)} className="size-8 grid place-items-center rounded-lg glass press text-danger"><Trash2 className="size-3.5" /></button>
        </div>
      ))}
    </div>
  );
}

function NotebookEditor({ page, onDone }: { page: any; onDone: () => void }) {
  const [p, setP] = useState({ ...page });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const payload = {
      slug: p.slug, title: p.title, content: p.content,
      order_index: Number(p.order_index) || 1, published: p.published !== false,
    };
    const op = p.id
      ? sb.from("notebook_pages").update(payload).eq("id", p.id)
      : sb.from("notebook_pages").insert(payload);
    const { error } = await op;
    setSaving(false);
    if (error) toast.error(error.message); else { toast.success("Saved"); onDone(); }
  };

  return (
    <div className="px-5 space-y-3 pb-nav">
      <Button variant="ghost" onClick={onDone} className="text-xs">← Back</Button>
      <Field label="Slug"><Input value={p.slug} onChange={(e) => setP({ ...p, slug: e.target.value })} /></Field>
      <Field label="Title"><Input value={p.title} onChange={(e) => setP({ ...p, title: e.target.value })} /></Field>
      <Field label="Content (Markdown)">
        <Textarea value={p.content ?? ""} onChange={(e) => setP({ ...p, content: e.target.value })} className="min-h-[300px] font-mono text-xs" />
      </Field>
      <Button onClick={save} disabled={saving} className="w-full gold-fill h-12 rounded-xl">
        {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}Save page
      </Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

/* ---------- EMAIL LOGS ---------- */
function EmailLogsPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await sb.from("email_send_log").select("*").order("created_at", { ascending: false }).limit(100);
      setRows(data ?? []);
      setLoading(false);
    })();
  }, []);
  if (loading) return <FullSpinner />;
  return (
    <div className="px-5 space-y-2">
      {rows.length === 0 && <div className="text-xs text-muted-foreground text-center py-8">No emails sent yet.</div>}
      {rows.map((r) => (
        <div key={r.id} className="glass rounded-xl p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium truncate">{r.template_name || r.subject || "—"}</div>
            <div className={`text-[10px] px-2 py-0.5 rounded-full ${r.status === "sent" ? "bg-success/20 text-success" : r.status === "failed" || r.status === "dlq" ? "bg-danger/20 text-danger" : "bg-secondary text-muted-foreground"}`}>{r.status}</div>
          </div>
          <div className="text-[11px] text-muted-foreground mt-1 truncate">{r.recipient_email}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{new Date(r.created_at).toLocaleString()}</div>
          {r.error_message && <div className="text-[11px] text-danger mt-1">{r.error_message}</div>}
        </div>
      ))}
    </div>
  );
}

/* ---------- USERS / ENTITLEMENTS ---------- */
function UsersPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [nu, setNu] = useState({ email: "", password: "", full_name: "", grant_access: true });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "paid" | "abandoned">("all");
  const [emailingUser, setEmailingUser] = useState<any | null>(null);

  const refresh = async () => {
    const { data } = await sb
      .from("profiles")
      .select("id, email, full_name, created_at, entitlements(has_access, granted_by_admin)")
      .order("created_at", { ascending: false })
      .limit(200);
    setRows(data ?? []);
    setLoading(false);
  };
  useEffect(() => { refresh(); }, []);

  const callAdmin = async (body: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify(body),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
    return j;
  };

  const toggle = async (userId: string, grant: boolean) => {
    setBusyId(userId);
    try {
      await callAdmin({ action: grant ? "grant_access" : "revoke_access", user_id: userId });
      toast.success(grant ? "Access granted" : "Access revoked");
      refresh();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusyId(null); }
  };

  const createUser = async () => {
    if (!nu.email || nu.password.length < 6) return toast.error("Email and 6+ char password required");
    setCreating(true);
    try {
      await callAdmin({ action: "create", ...nu });
      toast.success(`Created ${nu.email}`);
      setNu({ email: "", password: "", full_name: "", grant_access: true });
      setShowNew(false);
      refresh();
    } catch (e: any) { toast.error(e.message); }
    finally { setCreating(false); }
  };

  const resetPw = async (email: string) => {
    if (!confirm(`Send a password-reset email to ${email}?`)) return;
    try {
      await callAdmin({ action: "reset_password", email, redirect_to: `${location.origin}/reset-password` });
      toast.success("Reset email sent");
    } catch (e: any) { toast.error(e.message); }
  };

  const removeUser = async (id: string, email: string) => {
    if (!confirm(`Delete user ${email}? This cannot be undone.`)) return;
    setBusyId(id);
    try {
      await callAdmin({ action: "delete", user_id: id });
      toast.success("User deleted");
      refresh();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusyId(null); }
  };

  const filtered = rows.filter((r) => {
    const needle = q.trim().toLowerCase();
    const ent = Array.isArray(r.entitlements) ? r.entitlements[0] : r.entitlements;
    const paid = !!ent?.has_access;
    if (filter === "paid" && !paid) return false;
    if (filter === "abandoned" && paid) return false;
    if (!needle) return true;
    return (r.email || "").toLowerCase().includes(needle) || (r.full_name || "").toLowerCase().includes(needle);
  });

  const abandonedCount = rows.filter((r) => {
    const ent = Array.isArray(r.entitlements) ? r.entitlements[0] : r.entitlements;
    return !ent?.has_access;
  }).length;

  if (loading) return <FullSpinner />;
  if (emailingUser) {
    return <SingleEmailComposer user={emailingUser} onDone={() => setEmailingUser(null)} />;
  }
  return (
    <div className="px-5 space-y-2">
      <div className="flex gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email" className="h-10 rounded-xl" />
        <Button onClick={() => setShowNew((v) => !v)} className="rounded-xl gold-fill h-10 px-3">
          <Plus className="size-4 mr-1" /> New
        </Button>
      </div>
      <div className="flex gap-1 bg-surface-elevated/60 rounded-xl p-1">
        {(["all", "paid", "abandoned"] as const).map((t) => (
          <button key={t} onClick={() => setFilter(t)}
            className={`flex-1 text-xs py-2 rounded-lg press capitalize ${filter === t ? "bg-gold text-gold-foreground" : "text-muted-foreground"}`}>
            {t}{t === "abandoned" && abandonedCount ? ` (${abandonedCount})` : ""}
          </button>
        ))}
      </div>
      {showNew && (
        <div className="glass rounded-2xl p-3 space-y-2">
          <Input placeholder="Email" value={nu.email} onChange={(e) => setNu({ ...nu, email: e.target.value })} />
          <Input placeholder="Full name (optional)" value={nu.full_name} onChange={(e) => setNu({ ...nu, full_name: e.target.value })} />
          <Input type="text" placeholder="Temporary password (6+ chars)" value={nu.password} onChange={(e) => setNu({ ...nu, password: e.target.value })} />
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={nu.grant_access} onChange={(e) => setNu({ ...nu, grant_access: e.target.checked })} />
            Grant lifetime access immediately
          </label>
          <div className="flex gap-2">
            <Button onClick={createUser} disabled={creating} className="flex-1 rounded-xl gold-fill h-10">
              {creating ? <Loader2 className="size-4 animate-spin" /> : "Create user"}
            </Button>
            <Button variant="outline" onClick={() => setShowNew(false)} className="rounded-xl h-10">Cancel</Button>
          </div>
          <p className="text-[10px] text-muted-foreground">User is created with email already confirmed. Share the temp password with them; they can change it from Account.</p>
        </div>
      )}
      <p className="text-[11px] text-muted-foreground pt-2">{filtered.length} of {rows.length} users · gold dot = comped, green dot = paid.</p>
      {filtered.map((r) => {
        const ent = Array.isArray(r.entitlements) ? r.entitlements[0] : r.entitlements;
        const hasAccess = ent?.has_access;
        const comped = ent?.granted_by_admin;
        const busy = busyId === r.id;
        return (
          <div key={r.id} className="glass rounded-xl p-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{r.full_name || r.email}</div>
                <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1.5">
                  {r.email}
                  {hasAccess && <span className={`size-1.5 rounded-full ${comped ? "bg-gold-bright" : "bg-success"}`} />}
                </div>
                <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                  Joined {new Date(r.created_at).toLocaleDateString()}
                </div>
              </div>
              <Button size="sm" variant={hasAccess ? "outline" : "default"}
                disabled={busy}
                className={hasAccess ? "rounded-lg border-border-strong" : "rounded-lg gold-fill"}
                onClick={() => toggle(r.id, !hasAccess)}>
                {busy ? <Loader2 className="size-3 animate-spin" /> : hasAccess ? "Revoke" : "Grant"}
              </Button>
            </div>
            <div className="flex gap-2 mt-2">
              <Button size="sm" variant="outline" onClick={() => setEmailingUser(r)} className="rounded-lg text-[11px] h-8">
                <Mail className="size-3 mr-1" /> Email
              </Button>
              <Button size="sm" variant="outline" onClick={() => resetPw(r.email)} className="rounded-lg text-[11px] h-8">
                Reset PW
              </Button>
              <Button size="sm" variant="outline" onClick={() => removeUser(r.id, r.email)} disabled={busy} className="rounded-lg text-[11px] h-8 text-danger border-danger/40 ml-auto">
                <Trash2 className="size-3 mr-1" /> Delete
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- SINGLE-USER EMAIL COMPOSER ---------- */
function SingleEmailComposer({ user, onDone }: { user: any; onDone: () => void }) {
  const ent = Array.isArray(user.entitlements) ? user.entitlements[0] : user.entitlements;
  const paid = !!ent?.has_access;
  const preset = paid
    ? { subject: "A quick note from Z1", heading: `Hi ${user.full_name?.split(" ")[0] || "there"},`, body: "Just checking in — is there anything I can help with inside the vault?\n\nReply to this email any time." }
    : { subject: "Still thinking it over?", heading: `Hi ${user.full_name?.split(" ")[0] || "there"},`, body: "Noticed you signed up but haven't unlocked the vault yet.\n\nIf price is the blocker, reply to this email and I'll send you a discount code.\n\nOtherwise — what's holding you back? Genuinely curious." };
  const [subject, setSubject] = useState(preset.subject);
  const [heading, setHeading] = useState(preset.heading);
  const [bodyText, setBodyText] = useState(preset.body);
  const [ctaLabel, setCtaLabel] = useState(paid ? "" : "Unlock the vault");
  const [ctaUrl, setCtaUrl] = useState(paid ? "" : "https://mr05xau.co.uk/paywall");
  const [promoCode, setPromoCode] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!subject.trim() || !heading.trim() || !bodyText.trim()) return toast.error("Subject, heading and body required");
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          audience: "all", subject, heading, body: bodyText,
          ctaLabel: ctaLabel || undefined, ctaUrl: ctaUrl || undefined,
          promoCode: promoCode || undefined,
          test: user.email, // single-recipient mode
        }),
      });
      const j = await res.json();
      if (!res.ok) toast.error(j.error || "Send failed");
      else { toast.success(`Email sent to ${user.email}`); onDone(); }
    } finally { setBusy(false); }
  };

  return (
    <div className="px-5 space-y-3 pb-nav">
      <Button variant="ghost" onClick={onDone} className="text-xs">← Back to users</Button>
      <div className="glass rounded-2xl p-3">
        <div className="text-[10px] uppercase tracking-[0.28em] text-gold-bright">Sending to</div>
        <div className="text-sm font-medium mt-1">{user.full_name || user.email}</div>
        <div className="text-[11px] text-muted-foreground">{user.email} · {paid ? "paid user" : "abandoned signup"}</div>
      </div>
      <Field label="Subject"><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
      <Field label="Heading"><Input value={heading} onChange={(e) => setHeading(e.target.value)} /></Field>
      <Field label="Body"><Textarea value={bodyText} onChange={(e) => setBodyText(e.target.value)} className="min-h-[180px]" /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="CTA label"><Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} /></Field>
        <Field label="CTA URL"><Input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} /></Field>
      </div>
      <Field label="Promo code (optional)"><Input value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())} placeholder="VIP20" /></Field>
      <Button onClick={send} disabled={busy} className="w-full gold-fill h-12 rounded-xl">
        {busy ? <Loader2 className="size-4 animate-spin mr-2" /> : <Mail className="size-4 mr-2" />}
        Send to {user.email}
      </Button>
    </div>
  );
}

/* ---------- STATS ---------- */
function StatsPanel() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({});
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const since7 = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
      const since30 = new Date(Date.now() - 30 * 24 * 3600_000).toISOString();
      const [
        usersTotal,
        usersNew7,
        paid,
        comped,
        purchases30,
        emails7,
        latestUsers,
      ] = await Promise.all([
        sb.from("profiles").select("id", { count: "exact", head: true }),
        sb.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since7),
        sb.from("entitlements").select("user_id", { count: "exact", head: true }).eq("has_access", true),
        sb.from("entitlements").select("user_id", { count: "exact", head: true }).eq("has_access", true).eq("granted_by_admin", true),
        sb.from("purchases").select("amount, currency, created_at").gte("created_at", since30),
        sb.from("email_send_log").select("status, message_id, created_at").gte("created_at", since7),
        sb.from("profiles").select("id, email, full_name, created_at").order("created_at", { ascending: false }).limit(8),
      ]);
      const revenue30 = (purchases30.data ?? []).reduce(
        (acc: Record<string, number>, p: any) => {
          const cur = (p.currency ?? "usd").toUpperCase();
          acc[cur] = (acc[cur] ?? 0) + Number(p.amount ?? 0);
          return acc;
        }, {} as Record<string, number>);
      // dedupe email_send_log by message_id, keep latest status
      const byMsg = new Map<string, string>();
      (emails7.data ?? []).forEach((r: any) => {
        if (r.message_id) byMsg.set(r.message_id, r.status);
      });
      const emailStatusCounts: Record<string, number> = {};
      byMsg.forEach((s) => { emailStatusCounts[s] = (emailStatusCounts[s] ?? 0) + 1; });
      setStats({
        usersTotal: usersTotal.count ?? 0,
        usersNew7: usersNew7.count ?? 0,
        paid: paid.count ?? 0,
        comped: comped.count ?? 0,
        purchases30Count: (purchases30.data ?? []).length,
        revenue30,
        emailStatusCounts,
      });
      setRecent(latestUsers.data ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <FullSpinner />;
  const conv = stats.usersTotal ? ((stats.paid / stats.usersTotal) * 100).toFixed(1) : "0";
  const fmt = (cur: string, minor: number) => {
    try {
      return new Intl.NumberFormat("en-GB", { style: "currency", currency: cur }).format(minor / 100);
    } catch { return `${(minor / 100).toFixed(2)} ${cur}`; }
  };

  return (
    <div className="px-5 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Total users" value={stats.usersTotal} />
        <Stat label="New (7d)" value={stats.usersNew7} />
        <Stat label="Paid users" value={stats.paid} sub={`${conv}% conversion`} />
        <Stat label="Comped" value={stats.comped} />
      </div>
      <div className="glass rounded-2xl p-4">
        <div className="text-[10px] uppercase tracking-[0.28em] text-gold-bright">Revenue · 30d</div>
        <div className="text-2xl font-medium mt-1 display">
          {Object.keys(stats.revenue30).length === 0 ? "—" :
            Object.entries(stats.revenue30).map(([cur, v]: any) => fmt(cur, v)).join(" · ")}
        </div>
        <div className="text-xs text-muted-foreground mt-1">{stats.purchases30Count} purchase{stats.purchases30Count === 1 ? "" : "s"}</div>
      </div>
      <div className="glass rounded-2xl p-4">
        <div className="text-[10px] uppercase tracking-[0.28em] text-gold-bright">Email delivery · 7d</div>
        <div className="flex gap-3 mt-2 flex-wrap text-sm">
          {Object.keys(stats.emailStatusCounts).length === 0 && <span className="text-muted-foreground text-xs">No emails yet.</span>}
          {Object.entries(stats.emailStatusCounts).map(([s, n]: any) => (
            <span key={s} className={`px-2 py-1 rounded-lg ${s === "sent" ? "bg-success/20 text-success" : s === "dlq" || s === "failed" ? "bg-danger/20 text-danger" : "bg-secondary text-muted-foreground"}`}>
              {s}: {n}
            </span>
          ))}
        </div>
      </div>
      <div className="glass rounded-2xl p-4">
        <div className="text-[10px] uppercase tracking-[0.28em] text-gold-bright mb-2">Latest signups</div>
        {recent.length === 0 && <div className="text-xs text-muted-foreground">No users yet.</div>}
        {recent.map((u) => (
          <div key={u.id} className="flex items-center justify-between py-1.5 border-b border-border-strong/40 last:border-0">
            <div className="min-w-0">
              <div className="text-sm truncate">{u.full_name || u.email}</div>
              <div className="text-[10px] text-muted-foreground truncate">{u.email}</div>
            </div>
            <div className="text-[10px] text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: any; sub?: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="text-[10px] uppercase tracking-[0.28em] text-gold-bright">{label}</div>
      <div className="text-2xl font-medium display mt-1">{value ?? 0}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

/* ---------- BROADCAST ---------- */
function BroadcastPanel() {
  const [audience, setAudience] = useState<"all" | "paid" | "free">("all");
  const [subject, setSubject] = useState("");
  const [heading, setHeading] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoNote, setPromoNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [audienceCount, setAudienceCount] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await sb
        .from("profiles")
        .select("id, entitlements(has_access)")
        .not("email", "is", null);
      const rows = data ?? [];
      const n = rows.filter((p: any) => {
        const ent = Array.isArray(p.entitlements) ? p.entitlements[0] : p.entitlements;
        const paid = !!ent?.has_access;
        if (audience === "paid") return paid;
        if (audience === "free") return !paid;
        return true;
      }).length;
      setAudienceCount(n);
    })();
  }, [audience]);

  const call = async (test: boolean | string) => {
    if (!subject.trim() || !heading.trim() || !bodyText.trim()) {
      toast.error("Subject, heading, and body are all required.");
      return;
    }
    const realRecipients = audienceCount ?? 0;
    if (test === false && realRecipients > 0) {
      if (!confirm(`Send to ${realRecipients} ${audience} user${realRecipients === 1 ? "" : "s"}? This cannot be undone.`)) return;
    }
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          audience, subject, heading, body: bodyText,
          ctaLabel: ctaLabel || undefined, ctaUrl: ctaUrl || undefined,
          promoCode: promoCode || undefined, promoNote: promoNote || undefined,
          test,
        }),
      });
      const j = await res.json();
      if (!res.ok) toast.error(j.error || "Send failed");
      else toast.success(`${j.queued}/${j.total} email${j.total === 1 ? "" : "s"} queued${j.failed ? ` · ${j.failed} failed` : ""}.`);
    } finally { setBusy(false); }
  };

  return (
    <div className="px-5 space-y-3 pb-nav">
      <div className="glass rounded-2xl p-3">
        <Field label="Audience">
          <div className="flex gap-1 bg-surface-elevated/60 rounded-xl p-1">
            {(["all", "paid", "free"] as const).map((a) => (
              <button key={a} onClick={() => setAudience(a)} className={`flex-1 text-xs py-2 rounded-lg press capitalize ${audience === a ? "bg-gold text-gold-foreground" : "text-muted-foreground"}`}>
                {a}
              </button>
            ))}
          </div>
          <div className="text-[10px] text-muted-foreground mt-1.5">
            {audienceCount === null ? "…" : `${audienceCount} recipient${audienceCount === 1 ? "" : "s"} will receive this`}
          </div>
        </Field>
      </div>
      <Field label="Subject (inbox preview)"><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="A gift for you — 20% off lifetime" /></Field>
      <Field label="Heading (top of email)"><Input value={heading} onChange={(e) => setHeading(e.target.value)} placeholder="A gift for you." /></Field>
      <Field label="Body (blank lines = paragraphs)">
        <Textarea value={bodyText} onChange={(e) => setBodyText(e.target.value)} className="min-h-[160px]" placeholder={"Hi there,\n\nUse the code below for 20% off lifetime access.\n\nValid for 7 days."} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="CTA label (optional)"><Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="Claim your vault" /></Field>
        <Field label="CTA URL (optional)"><Input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://mr05xau.co.uk/paywall" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Promo code (optional)"><Input value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())} placeholder="VIP20" /></Field>
        <Field label="Promo note (optional)"><Input value={promoNote} onChange={(e) => setPromoNote(e.target.value)} placeholder="Apply at checkout. 7 days." /></Field>
      </div>
      <div className="flex gap-2 pt-2">
        <Button onClick={() => call(true)} disabled={busy} variant="outline" className="flex-1 rounded-xl h-11 border-border-strong">
          {busy ? <Loader2 className="size-4 animate-spin" /> : "Send test to me"}
        </Button>
        <Button onClick={() => call(false)} disabled={busy || !audienceCount} className="flex-1 rounded-xl gold-fill h-11">
          {busy ? <Loader2 className="size-4 animate-spin" /> : `Send to ${audienceCount ?? 0}`}
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Sends use the branded "Announcement" template. Suppressed/unsubscribed addresses are skipped automatically.
      </p>
    </div>
  );
}

/* ---------- DISCOUNTS / STRIPE PROMOS ---------- */
function DiscountsPanel() {
  const [env, setEnv] = useState<"live" | "sandbox">("live");
  const [promos, setPromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [emailingId, setEmailingId] = useState<string | null>(null);
  const [emailAudience, setEmailAudience] = useState<"all" | "paid" | "free">("free");
  const [f, setF] = useState({
    code: "", name: "", percent_off: 20, amount_off: "", currency: "gbp",
    duration: "once" as "once" | "forever" | "repeating",
    duration_in_months: 3,
    max_redemptions: "", expires_in_days: 7,
    mode: "percent" as "percent" | "amount",
  });

  const call = async (payload: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-stripe-promo`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ environment: env, ...payload }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
    return j;
  };

  const refresh = async () => {
    setLoading(true);
    try {
      const j = await call({ action: "list" });
      setPromos(j.promos ?? []);
    } catch (e: any) {
      toast.error(e.message);
      setPromos([]);
    } finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, [env]);

  const create = async () => {
    if (!f.code.trim()) return toast.error("Code required");
    setBusy(true);
    try {
      const payload: any = {
        action: "create",
        code: f.code,
        name: f.name || undefined,
        duration: f.duration,
        max_redemptions: f.max_redemptions ? Number(f.max_redemptions) : undefined,
        expires_in_days: f.expires_in_days ? Number(f.expires_in_days) : undefined,
      };
      if (f.mode === "percent") payload.percent_off = Number(f.percent_off);
      else { payload.amount_off = Math.round(Number(f.amount_off) * 100); payload.currency = f.currency; }
      if (f.duration === "repeating") payload.duration_in_months = Number(f.duration_in_months);
      await call(payload);
      toast.success(`Created code ${f.code.toUpperCase()}`);
      setShowNew(false);
      setF({ ...f, code: "", name: "" });
      refresh();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const deactivate = async (id: string, code: string) => {
    if (!confirm(`Deactivate code ${code}? Customers can no longer use it.`)) return;
    try { await call({ action: "deactivate", promo_id: id }); toast.success("Deactivated"); refresh(); }
    catch (e: any) { toast.error(e.message); }
  };

  const copy = (code: string) => {
    navigator.clipboard.writeText(code).then(() => toast.success(`Copied ${code}`));
  };

  /**
   * One-tap "email this code" — sends a short branded blast to the chosen
   * audience with a fixed, friendly body. No copywriting required.
   */
  const emailCode = async (p: any) => {
    const c = p.coupon ?? {};
    const value = c.percent_off
      ? `${c.percent_off}% off`
      : c.amount_off
      ? `${(c.amount_off / 100).toFixed(2)} ${(c.currency ?? "").toUpperCase()} off`
      : "a discount";
    const code = p.code as string;
    if (!confirm(`Email code ${code} (${value}) to all ${emailAudience} users?`)) return;
    setEmailingId(p.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          audience: emailAudience,
          subject: `Here's ${value} 🎁`,
          heading: `Hi — here's ${value}.`,
          body: `Use the code below at checkout to claim ${value} on your vault.`,
          ctaLabel: "Claim your vault",
          ctaUrl: "https://mr05xau.co.uk/paywall",
          promoCode: code,
          promoNote: p.expires_at
            ? `Expires ${new Date(p.expires_at * 1000).toLocaleDateString()}.`
            : "Apply at checkout.",
          test: false,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) toast.error(j.error || "Send failed");
      else toast.success(`${j.queued}/${j.total} email${j.total === 1 ? "" : "s"} queued`);
    } catch (e: any) {
      toast.error(e.message || "Send failed");
    } finally {
      setEmailingId(null);
    }
  };

  return (
    <div className="px-5 space-y-3 pb-nav">
      <div className="flex gap-1 bg-surface-elevated/60 rounded-xl p-1">
        {(["live", "sandbox"] as const).map((e) => (
          <button key={e} onClick={() => setEnv(e)} className={`flex-1 text-xs py-2 rounded-lg press capitalize ${env === e ? "bg-gold text-gold-foreground" : "text-muted-foreground"}`}>
            {e}
          </button>
        ))}
      </div>
      <div className="glass rounded-2xl p-3">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5">Email audience</div>
        <div className="flex gap-1 bg-surface-elevated/60 rounded-xl p-1">
          {(["all", "paid", "free"] as const).map((a) => (
            <button
              key={a}
              onClick={() => setEmailAudience(a)}
              className={`flex-1 text-xs py-2 rounded-lg press capitalize ${emailAudience === a ? "bg-gold text-gold-foreground" : "text-muted-foreground"}`}
            >
              {a}
            </button>
          ))}
        </div>
        <div className="text-[10px] text-muted-foreground mt-1.5">
          "Email code" on any promo sends a short branded blast with a fixed "Hi — here's X% off" message.
        </div>
      </div>
      <Button onClick={() => setShowNew((v) => !v)} className="w-full gold-fill h-11 rounded-xl">
        <Plus className="size-4 mr-1.5" /> {showNew ? "Cancel" : "New promo code"}
      </Button>

      {showNew && (
        <div className="glass rounded-2xl p-3 space-y-3">
          <Field label="Customer-facing code"><Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} placeholder="VIP20" /></Field>
          <Field label="Internal name (optional)"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Launch week 20% off" /></Field>
          <div className="flex gap-1 bg-surface-elevated/60 rounded-xl p-1">
            {(["percent", "amount"] as const).map((m) => (
              <button key={m} onClick={() => setF({ ...f, mode: m })} className={`flex-1 text-xs py-2 rounded-lg press capitalize ${f.mode === m ? "bg-gold text-gold-foreground" : "text-muted-foreground"}`}>
                {m === "percent" ? "% off" : "Fixed amount off"}
              </button>
            ))}
          </div>
          {f.mode === "percent" ? (
            <Field label="Percent off (1-100)"><Input type="number" min={1} max={100} value={f.percent_off} onChange={(e) => setF({ ...f, percent_off: Number(e.target.value) })} /></Field>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Field label="Amount off (major units)"><Input type="number" step="0.01" value={f.amount_off} onChange={(e) => setF({ ...f, amount_off: e.target.value })} placeholder="20.00" /></Field>
              <Field label="Currency"><Input value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value.toLowerCase() })} placeholder="gbp" /></Field>
            </div>
          )}
          <Field label="Duration">
            <div className="flex gap-1 bg-surface-elevated/60 rounded-xl p-1">
              {(["once", "repeating", "forever"] as const).map((d) => (
                <button key={d} onClick={() => setF({ ...f, duration: d })} className={`flex-1 text-xs py-2 rounded-lg press capitalize ${f.duration === d ? "bg-gold text-gold-foreground" : "text-muted-foreground"}`}>{d}</button>
              ))}
            </div>
          </Field>
          {f.duration === "repeating" && (
            <Field label="Repeats for N months"><Input type="number" min={1} value={f.duration_in_months} onChange={(e) => setF({ ...f, duration_in_months: Number(e.target.value) })} /></Field>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Field label="Max redemptions (blank = unlimited)"><Input type="number" value={f.max_redemptions} onChange={(e) => setF({ ...f, max_redemptions: e.target.value })} /></Field>
            <Field label="Expires in N days (blank = never)"><Input type="number" value={f.expires_in_days} onChange={(e) => setF({ ...f, expires_in_days: Number(e.target.value) })} /></Field>
          </div>
          <Button onClick={create} disabled={busy} className="w-full gold-fill h-11 rounded-xl">
            {busy ? <Loader2 className="size-4 animate-spin mr-2" /> : null}Create on Stripe ({env})
          </Button>
          <p className="text-[10px] text-muted-foreground">
            Customers enter the code at Stripe checkout. The code becomes active immediately on the {env} account.
          </p>
        </div>
      )}

      {loading ? <FullSpinner /> : (
        <>
          {promos.length === 0 && <div className="text-xs text-muted-foreground text-center py-6">No promo codes on the {env} account yet.</div>}
          {promos.map((p) => {
            const c = p.coupon ?? {};
            const value = c.percent_off ? `${c.percent_off}% off` :
              c.amount_off ? `${(c.amount_off / 100).toFixed(2)} ${(c.currency ?? "").toUpperCase()} off` : "—";
            return (
              <div key={p.id} className={`glass rounded-2xl p-3 ${!p.active ? "opacity-50" : ""}`}>
                <div className="flex items-center gap-2">
                  <div className="font-mono text-sm font-medium tracking-wider">{p.code}</div>
                  <button onClick={() => copy(p.code)} className="size-6 grid place-items-center rounded-md glass press"><Copy className="size-3" /></button>
                  <div className={`ml-auto text-[10px] px-2 py-0.5 rounded-full ${p.active ? "bg-success/20 text-success" : "bg-secondary text-muted-foreground"}`}>
                    {p.active ? "active" : "inactive"}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {value} · {c.duration}{c.duration === "repeating" ? ` (${c.duration_in_months}mo)` : ""}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Redeemed {p.times_redeemed}{p.max_redemptions ? `/${p.max_redemptions}` : ""}
                  {p.expires_at ? ` · expires ${new Date(p.expires_at * 1000).toLocaleDateString()}` : ""}
                </div>
                {p.active && (
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      onClick={() => emailCode(p)}
                      disabled={emailingId === p.id}
                      className="flex-1 rounded-lg text-[11px] h-8 gold-fill"
                    >
                      {emailingId === p.id ? (
                        <Loader2 className="size-3 animate-spin mr-1" />
                      ) : (
                        <Mail className="size-3 mr-1" />
                      )}
                      Email code
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deactivate(p.id, p.code)}
                      className="rounded-lg text-[11px] h-8 text-danger border-danger/40"
                    >
                      Deactivate
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}