import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

/**
 * Register the device for native push notifications (iOS/Android only).
 * Safe to call on web — it no-ops.
 */
export async function initPushNotifications() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    const perm = await PushNotifications.checkPermissions();
    let status = perm.receive;
    if (status === "prompt" || status === "prompt-with-rationale") {
      const req = await PushNotifications.requestPermissions();
      status = req.receive;
    }
    if (status !== "granted") return;

    await PushNotifications.register();

    PushNotifications.addListener("registration", async (t) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const platform = Capacitor.getPlatform() as "ios" | "android";
      await supabase.from("push_tokens").upsert(
        { user_id: user.id, token: t.value, platform, last_seen_at: new Date().toISOString() },
        { onConflict: "user_id,token" }
      );
    });

    PushNotifications.addListener("registrationError", (e) => {
      console.warn("push registration error", e);
    });
  } catch (e) {
    console.warn("push init failed", e);
  }
}