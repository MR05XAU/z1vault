import { useEffect, useState } from "react";
import { X, Smartphone } from "lucide-react";

// Soft "Add to home screen" nudge — appears from the 3rd session onward,
// never when already installed, dismissible forever. The actual
// beforeinstallprompt event is captured app-wide in App.tsx (lazy chunks
// load too late to catch it) and stashed on window.
const DISMISS_KEY = "z1.installNudgeDismissed";
const SESSIONS_KEY = "z1.sessions";

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
}
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

export function InstallNudge() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (isStandalone() || localStorage.getItem(DISMISS_KEY)) return;
      const sessions = Number(localStorage.getItem(SESSIONS_KEY) ?? 0);
      if (sessions >= 3 && ((window as any).__pwaPrompt || isIOS)) setVisible(true);
    } catch { /* storage unavailable */ }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch {}
    setVisible(false);
  };

  const install = async () => {
    const prompt = (window as any).__pwaPrompt;
    if (prompt) {
      prompt.prompt();
      await prompt.userChoice.catch(() => null);
      dismiss();
    }
  };

  return (
    <div className="mt-4 glass rounded-2xl p-4 flex items-center gap-3 animate-fade-up mint-border">
      <div className="size-10 shrink-0 rounded-xl bg-mint/10 grid place-items-center">
        <Smartphone className="size-5 text-mint-bright" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">Install Z1 Insights</div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isIOS && !(window as any).__pwaPrompt
            ? "Tap Share, then \"Add to Home Screen\" for the full-screen app."
            : "One tap for the full-screen app — no store needed."}
        </p>
      </div>
      {(window as any).__pwaPrompt && (
        <button onClick={install} className="shrink-0 rounded-xl mint-fill px-3 py-2 text-xs font-medium press">Install</button>
      )}
      <button onClick={dismiss} aria-label="Dismiss install suggestion" className="shrink-0 size-8 grid place-items-center rounded-full text-muted-foreground press">
        <X className="size-4" />
      </button>
    </div>
  );
}
