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
import { Pencil, Plus, Trash2, Upload, BookOpen, BrainCircuit, NotebookPen, FileAudio, ShieldCheck, Loader2, Mail, Users, Home } from "lucide-react";

type Tab = "chapters" | "quizzes" | "notebook" | "emails" | "users";

export default function Admin() {
  const { user, isAdmin, accessLoading } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>("chapters");
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
            {(["chapters", "quizzes", "notebook", "emails", "users"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 text-xs font-medium py-2 rounded-lg press capitalize whitespace-nowrap ${
                  tab === t ? "bg-gold text-gold-foreground" : "text-muted-foreground"
                }`}
              >
                {t === "chapters" && <BookOpen className="size-3 inline mr-1" />}
                {t === "quizzes" && <BrainCircuit className="size-3 inline mr-1" />}
                {t === "notebook" && <NotebookPen className="size-3 inline mr-1" />}
                {t === "emails" && <Mail className="size-3 inline mr-1" />}
                {t === "users" && <Users className="size-3 inline mr-1" />}
                {t}
              </button>
            ))}
          </div>
        </header>
      }
    >
      <div className="mt-4 pb-12">
        {tab === "chapters" && <ChaptersPanel />}
        {tab === "quizzes" && <QuizzesPanel />}
        {tab === "notebook" && <NotebookPanel />}
        {tab === "emails" && <EmailLogsPanel />}
        {tab === "users" && <UsersPanel />}
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
    <div className="px-5 space-y-3 pb-24">
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
    <div className="px-5 space-y-3 pb-24">
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
    <div className="px-5 space-y-3 pb-24">
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
  const toggle = async (userId: string, grant: boolean) => {
    const { error } = await sb.from("entitlements").upsert(
      { user_id: userId, has_access: grant, granted_by_admin: grant },
      { onConflict: "user_id" }
    );
    if (error) toast.error(error.message); else { toast.success(grant ? "Access granted" : "Access revoked"); refresh(); }
  };
  if (loading) return <FullSpinner />;
  return (
    <div className="px-5 space-y-2">
      <p className="text-[11px] text-muted-foreground">Toggle to comp test access. Paid users show with the dot.</p>
      {rows.map((r) => {
        const ent = Array.isArray(r.entitlements) ? r.entitlements[0] : r.entitlements;
        const hasAccess = ent?.has_access;
        const comped = ent?.granted_by_admin;
        return (
          <div key={r.id} className="glass rounded-xl p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{r.full_name || r.email}</div>
              <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1.5">
                {r.email}
                {hasAccess && <span className={`size-1.5 rounded-full ${comped ? "bg-gold-bright" : "bg-success"}`} />}
              </div>
            </div>
            <Button size="sm" variant={hasAccess ? "outline" : "default"}
              className={hasAccess ? "rounded-lg border-border-strong" : "rounded-lg gold-fill"}
              onClick={() => toggle(r.id, !hasAccess)}>
              {hasAccess ? "Revoke" : "Grant"}
            </Button>
          </div>
        );
      })}
    </div>
  );
}