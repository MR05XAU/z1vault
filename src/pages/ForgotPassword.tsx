import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Z1Logo } from "@/components/Z1Logo";
import { toast } from "sonner";
import { Mail, Loader2, ArrowLeft } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[100dvh] vault-bg flex justify-center px-6 safe-top">
      <div className="w-full max-w-md flex flex-col">
        <Link to="/auth" className="size-10 grid place-items-center rounded-full glass press mt-2 self-start">
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex-1 flex flex-col justify-center animate-fade-up">
          <div className="flex justify-center mb-8"><Z1Logo size={64} /></div>
          <h1 className="display text-3xl font-medium text-center mb-2">Reset password</h1>
          <p className="text-sm text-muted-foreground text-center mb-8">
            {sent ? "Check your inbox for the reset link." : "We'll email you a secure reset link."}
          </p>
          {!sent && (
            <form onSubmit={submit} className="space-y-3">
              <div className="relative">
                <Mail className="size-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  required
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-xl bg-surface-elevated/60 border-border-strong pl-11"
                />
              </div>
              <Button type="submit" disabled={busy} className="w-full h-12 rounded-xl mint-fill font-medium shadow-glow press">
                {busy ? <Loader2 className="size-4 animate-spin" /> : "Send reset link"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}