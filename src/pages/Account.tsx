import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Z1Logo } from "@/components/Z1Logo";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, LogOut, Receipt, Mail, Lock, Trash2, LifeBuoy, Loader2, ExternalLink, BookOpen } from "lucide-react";

type Purchase = {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
  receipt_url: string | null;
  stripe_payment_id: string | null;
};

export default function Account() {
  const { user, signOut, hasAccess } = useAuth();
  const nav = useNavigate();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [newPw, setNewPw] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("purchases")
      .select("id, amount_cents, currency, status, created_at, receipt_url, stripe_payment_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setPurchases((data as Purchase[]) ?? []);
        setLoading(false);
      });
  }, [user]);

  const changeEmail = async () => {
    if (!newEmail) return;
    setBusy("email");
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Confirmation links sent to BOTH your old and new email. Click the link in each to complete the change.");
    setNewEmail("");
  };

  const changePw = async () => {
    if (newPw.length < 6) return toast.error("Min 6 characters");
    setBusy("pw");
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Password updated.");
    setNewPw("");
  };

  const deleteAccount = async () => {
    setBusy("delete");
    try {
      const { error } = await supabase.functions.invoke("delete-account", { body: {} });
      if (error) throw error;
      await supabase.auth.signOut();
      toast.success("Account deleted.");
      nav("/");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-[100dvh] vault-bg flex justify-center">
      <div className="w-full max-w-md flex flex-col px-6 safe-top pb-10">
        <div className="flex items-center justify-between mt-2">
          <button onClick={() => nav(-1)} className="size-10 grid place-items-center rounded-full glass press">
            <ArrowLeft className="size-4" />
          </button>
          <Z1Logo size={32} />
          <button onClick={() => { signOut(); nav("/auth"); }} className="text-xs text-muted-foreground flex items-center gap-1.5 press">
            <LogOut className="size-3.5" /> Sign out
          </button>
        </div>

        <div className="mt-8 animate-fade-up">
          <div className="text-[10px] uppercase tracking-[0.32em] text-gold-bright">Account</div>
          <h1 className="display text-3xl font-medium mt-2">{user?.email}</h1>
          <div className="text-xs text-muted-foreground mt-2">
            {hasAccess ? "Lifetime access · Active" : "No active access"}
          </div>
        </div>

        {/* Product */}
        <section className="mt-6">
          <div className="glass rounded-2xl p-4 flex items-center gap-3 gold-border">
            <div className="size-10 rounded-xl bg-gold/10 grid place-items-center shrink-0">
              <BookOpen className="size-4 text-gold-bright" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">Z1 INSIGHTS — Lifetime Vault</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Interactive book, AI tutor, quizzes, analytics. One payment.
              </div>
            </div>
          </div>
        </section>

        {/* Purchases */}
        <section className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <Receipt className="size-4 text-gold-bright" />
            <h2 className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Purchase history</h2>
          </div>
          <div className="glass rounded-2xl divide-y divide-border-strong">
            {loading ? (
              <div className="p-6 grid place-items-center"><Loader2 className="size-4 animate-spin text-gold" /></div>
            ) : purchases.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground text-center">No purchases yet.</div>
            ) : purchases.map((p) => (
              <div key={p.id} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">
                    ${(p.amount_cents / 100).toFixed(2)} {p.currency.toUpperCase()}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {new Date(p.created_at).toLocaleString()} · <span className="capitalize">{p.status}</span>
                  </div>
                </div>
                {p.receipt_url ? (
                  <a href={p.receipt_url} target="_blank" rel="noopener noreferrer"
                     className="text-xs text-gold-bright flex items-center gap-1 press">
                    Receipt <ExternalLink className="size-3" />
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        {/* Change email */}
        <section className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <Mail className="size-4 text-gold-bright" />
            <h2 className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Change email</h2>
          </div>
          <div className="space-y-2">
            <Input type="email" placeholder="New email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
              className="h-11 rounded-xl bg-surface-elevated/60 border-border-strong" />
            <Button onClick={changeEmail} disabled={busy === "email" || !newEmail}
              variant="outline" className="w-full h-11 rounded-xl">
              {busy === "email" ? <Loader2 className="size-4 animate-spin" /> : "Send confirmation"}
            </Button>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              For your security we send a confirmation to both your current and new email.
              The change only takes effect after you click the link in each.
            </p>
          </div>
        </section>

        {/* Change password */}
        <section className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="size-4 text-gold-bright" />
            <h2 className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Change password</h2>
          </div>
          <div className="space-y-2">
            <Input type="password" placeholder="New password" value={newPw} onChange={(e) => setNewPw(e.target.value)}
              className="h-11 rounded-xl bg-surface-elevated/60 border-border-strong" />
            <Button onClick={changePw} disabled={busy === "pw" || newPw.length < 6}
              variant="outline" className="w-full h-11 rounded-xl">
              {busy === "pw" ? <Loader2 className="size-4 animate-spin" /> : "Update password"}
            </Button>
          </div>
        </section>

        {/* Support */}
        <section className="mt-6">
          <a href="mailto:support@z1insights.com?subject=Z1%20INSIGHTS%20support"
            className="glass rounded-2xl p-4 flex items-center gap-3 press">
            <LifeBuoy className="size-4 text-gold-bright" />
            <div className="text-sm">Contact support</div>
          </a>
        </section>

        {/* Delete */}
        <section className="mt-10">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="w-full text-destructive hover:text-destructive">
                <Trash2 className="size-4 mr-2" /> Delete account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes your account, progress, highlights, and notebook.
                  Purchases remain on record with Stripe but vault access ends immediately.
                  This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={deleteAccount}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {busy === "delete" ? <Loader2 className="size-4 animate-spin" /> : "Delete forever"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>
      </div>
    </div>
  );
}