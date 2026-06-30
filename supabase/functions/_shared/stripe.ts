import Stripe from "https://esm.sh/stripe@22.0.2";

const getEnv = (key: string): string => {
  const value = Deno.env.get(key);
  if (!value) throw new Error(`${key} is not configured`);
  return value;
};

export type StripeEnv = "sandbox" | "live";

// Direct Stripe access (no third-party gateway). Secrets live in Supabase
// function secrets: STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET (live), with
// optional *_TEST variants for sandbox.
export function getConnectionApiKey(env: StripeEnv): string {
  return env === "sandbox"
    ? (Deno.env.get("STRIPE_SECRET_KEY_TEST") ?? getEnv("STRIPE_SECRET_KEY"))
    : getEnv("STRIPE_SECRET_KEY");
}

export function getWebhookSecret(env: StripeEnv): string {
  return env === "sandbox"
    ? (Deno.env.get("STRIPE_WEBHOOK_SECRET_TEST") ?? getEnv("STRIPE_WEBHOOK_SECRET"))
    : getEnv("STRIPE_WEBHOOK_SECRET");
}

export function createStripeClient(env: StripeEnv): Stripe {
  const apiKey = getConnectionApiKey(env);
  return new Stripe(apiKey, {
    httpClient: Stripe.createFetchHttpClient(),
  });
}
