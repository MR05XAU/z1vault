import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Z1Logo } from "@/components/Z1Logo";
import { toast } from "sonner";
import { ArrowLeft, Mail, Lock, Loader2 } from "lucide-react";

export default function Auth() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success("Welcome to Z1.", { description: "Check your inbox to confirm your email." });
        nav("/paywall");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        nav("/");
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) {
        toast.error("Google sign-in failed");
        setBusy(false);
        return;
      }
      // Supabase redirects the browser to Google; nothing more to do here.
    } catch (e: any) {
      toast.error(e.message);
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[100dvh] vault-bg flex justify-center">
      <div className="w-full max-w-md flex flex-col px-6 safe-top pb-8">
        <button
          onClick={() => nav(-1)}
          className="size-10 grid place-items-center rounded-full glass press mt-2 self-start"
        >
          <ArrowLeft className="size-4" />
        </button>

        <div className="flex-1 flex flex-col justify-center animate-fade-up">
          <div className="flex justify-center mb-8">
            <Z1Logo size={64} />
          </div>
          <h1 className="display text-3xl font-medium text-center mb-2">
            {mode === "signin" ? "Welcome back." : "Create your vault."}
          </h1>
          <p className="text-sm text-muted-foreground text-center mb-8">
            {mode === "signin" ? "Enter the vault." : "Lifetime access in one step."}
          </p>

          <Button
            type="button"
            onClick={google}
            disabled={busy}
            variant="outline"
            className="h-12 rounded-xl border-border-strong bg-surface-elevated/60 hover:bg-surface-elevated press"
          >
            <svg className="size-4 mr-2" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 11v2.8h6.5c-.3 1.6-1.9 4.6-6.5 4.6-3.9 0-7.1-3.2-7.1-7.2s3.2-7.2 7.1-7.2c2.2 0 3.7.9 4.5 1.7l3.1-3C17.5 1.3 15 0 12 0 5.4 0 0 5.4 0 12s5.4 12 12 12c6.9 0 11.5-4.9 11.5-11.7 0-.8-.1-1.4-.2-2H12z" />
            </svg>
            Continue with Google
          </Button>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-border-strong" />
            <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border-strong" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <Input
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 rounded-xl bg-surface-elevated/60 border-border-strong"
              />
            )}
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
            <div className="relative">
              <Lock className="size-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                required
                minLength={6}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-xl bg-surface-elevated/60 border-border-strong pl-11"
              />
            </div>
            <Button
              type="submit"
              disabled={busy}
              className="w-full h-12 rounded-xl mint-fill font-medium shadow-glow press hover:shadow-glow-strong"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-6 text-sm text-muted-foreground text-center hover:text-foreground transition-colors"
          >
            {mode === "signin" ? (
              <>New here? <span className="text-mint-bright">Create an account</span></>
            ) : (
              <>Already in? <span className="text-mint-bright">Sign in</span></>
            )}
          </button>

          {mode === "signin" && (
            <Link to="/forgot-password" className="mt-2 block text-xs text-muted-foreground/80 text-center hover:text-mint-bright">
              Forgot password?
            </Link>
          )}
        </div>

        <p className="text-[10px] text-center text-muted-foreground/70 tracking-wide">
          Educational content only. Not financial advice.
        </p>
      </div>
    </div>
  );
}