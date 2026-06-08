const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <div className="w-full bg-danger/10 border-b border-danger/30 px-4 py-2 text-center text-xs text-danger">
        Production checkout is not configured. Complete payments go-live to accept real payments.
      </div>
    );
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full bg-gold/10 border-b border-gold/30 px-4 py-2 text-center text-[11px] uppercase tracking-[0.18em] text-gold-bright font-medium">
        Test mode — no real charges
      </div>
    );
  }
  return null;
}