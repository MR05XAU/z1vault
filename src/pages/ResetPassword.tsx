import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Z1Logo } from "@/components/Z1Logo";
import { toast } from "sonner";
import { Lock, Loader2 } from "lucide-react";

export default function ResetPassword() {
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase auto-creates a recovery session from the URL fragment.
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((evt) => {
      if (evt === "PASSWORD_RECOVERY" || evt === "SIGNED_IN") setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated.");
      nav("/");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[100dvh] vault-bg flex justify-center px-6 safe-top">
      <div className="w-full max-w-md flex flex-col">
        <div className="flex-1 flex flex-col justify-center animate-fade-up">
          <div className="flex justify-center mb-8"><Z1Logo size={64} /></div>
          <h1 className="display text-3xl font-medium text-center mb-2">Set new password</h1>
          <p className="text-sm text-muted-foreground text-center mb-8">
            {ready ? "Choose a strong password to secure your vault." : "Verifying reset link…"}
          </p>
          {ready && (
            <form onSubmit={submit} className="space-y-3">
              <div className="relative">
                <Lock className="size-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  required
                  minLength={6}
                  placeholder="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-xl bg-surface-elevated/60 border-border-strong pl-11"
                />
              </div>
              <Button type="submit" disabled={busy} className="w-full h-12 rounded-xl gold-fill font-medium shadow-glow press">
                {busy ? <Loader2 className="size-4 animate-spin" /> : "Update password"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}