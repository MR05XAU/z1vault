import { supabase } from "@/integrations/supabase/client";

// Best-effort real-user error logging. Deduped in-session and throttled so a
// render loop can't hammer the table; never throws (logging must not break
// the app further).
const seen = new Set<string>();
let sentThisSession = 0;

export async function logClientError(message: string, stack?: string) {
  try {
    const key = (message + (stack ?? "")).slice(0, 200);
    if (seen.has(key) || sentThisSession >= 20) return;
    seen.add(key);
    sentThisSession++;
    const { data } = await supabase.auth.getUser();
    await supabase.from("client_errors").insert({
      user_id: data?.user?.id ?? null,
      message: message.slice(0, 1000),
      stack: stack?.slice(0, 4000) ?? null,
      url: typeof location !== "undefined" ? location.href.slice(0, 500) : null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : null,
    });
  } catch { /* logging must never throw */ }
}

// Global hooks for uncaught errors + unhandled promise rejections.
export function installErrorHooks() {
  if (typeof window === "undefined" || (window as any).__errHooked) return;
  (window as any).__errHooked = true;
  window.addEventListener("error", (e) => {
    logClientError(e.message || "window.onerror", (e.error as Error)?.stack);
  });
  window.addEventListener("unhandledrejection", (e) => {
    const r: any = e.reason;
    logClientError(r?.message ? `Unhandled rejection: ${r.message}` : "Unhandled promise rejection", r?.stack);
  });
}
