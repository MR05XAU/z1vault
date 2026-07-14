import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MobileShell } from "@/components/MobileShell";
import { ArrowLeft } from "lucide-react";

type Tab = "privacy" | "terms" | "disclaimer";

const BRAND = "Z1 Insights";
const DOMAIN = "mr05xau.co.uk";
const CONTACT = `support@${DOMAIN}`;
const UPDATED = "17 June 2026";

export default function Legal() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const initial = (params.get("tab") as Tab) || "privacy";
  const [tab, setTab] = useState<Tab>(initial);

  return (
    <MobileShell header={
      <header className="px-5 pt-6 safe-top">
        <div className="flex items-center gap-3">
          <button onClick={() => nav(-1)} className="size-9 grid place-items-center rounded-xl glass press" aria-label="Back">
            <ArrowLeft className="size-4" />
          </button>
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-mint-bright">Legal</div>
            <h1 className="display text-2xl font-medium mt-1">Policies.</h1>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          {(["privacy","terms","disclaimer"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-full text-xs ${tab === t ? "bg-mint/15 text-mint-bright" : "glass text-muted-foreground"}`}>
              {t === "privacy" ? "Privacy" : t === "terms" ? "Terms" : "Risk"}
            </button>
          ))}
        </div>
      </header>
    }>
      <article className="px-5 py-4 prose prose-invert prose-sm max-w-none [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-medium [&_p]:text-sm [&_p]:text-muted-foreground [&_li]:text-sm [&_li]:text-muted-foreground">
        <p className="text-xs italic text-muted-foreground">Last updated {UPDATED}.</p>
        {tab === "privacy" && <Privacy />}
        {tab === "terms" && <Terms />}
        {tab === "disclaimer" && <Disclaimer />}
      </article>
    </MobileShell>
  );
}

function Privacy() {
  return (
    <>
      <h2>1. Who we are</h2>
      <p>{BRAND} ("we", "us") operates this application at {DOMAIN}. Contact: {CONTACT}.</p>
      <h2>2. Data we collect</h2>
      <ul>
        <li>Account: email, name, authentication identifiers.</li>
        <li>Usage: chapters read, quiz results, notes, highlights, trade journal entries.</li>
        <li>Billing: handled by Stripe; we store purchase status, not card details.</li>
        <li>Technical: device type, IP (for security), error logs.</li>
      </ul>
      <h2>3. How we use it</h2>
      <ul>
        <li>Provide and improve the service.</li>
        <li>Send transactional emails (receipts, security alerts, password resets).</li>
        <li>Detect abuse and meet legal obligations.</li>
      </ul>
      <h2>4. Legal basis (UK GDPR)</h2>
      <p>Contract (to deliver the app), legitimate interests (security, product improvement), and consent where required (marketing).</p>
      <h2>5. Sharing</h2>
      <p>Processors: Vercel (hosting), Supabase (database, authentication), Stripe (payments), Google (sign-in). We do not sell personal data.</p>
      <h2>6. Retention</h2>
      <p>Account data is kept while your account is active. Delete your account from Settings to remove your data within 30 days, except where retention is required by law (e.g. tax records).</p>
      <h2>7. Your rights</h2>
      <p>Access, rectification, erasure, portability, objection, and complaint to the ICO. Email {CONTACT} to exercise these rights.</p>
      <h2>8. Cookies</h2>
      <p>Only essential cookies for authentication and session management. No advertising trackers.</p>
      <h2>9. International transfers</h2>
      <p>Some processors are based outside the UK/EEA. Transfers are protected by standard contractual clauses.</p>
      <h2>10. Changes</h2>
      <p>We will notify users of material changes via email or in-app notice.</p>
    </>
  );
}

function Terms() {
  return (
    <>
      <h2>1. Acceptance</h2>
      <p>By using {BRAND} you agree to these Terms. If you do not agree, do not use the service.</p>
      <h2>2. Eligibility</h2>
      <p>You must be 18+ and legally able to enter contracts in your jurisdiction.</p>
      <h2>3. Licence</h2>
      <p>We grant you a personal, non-transferable, revocable licence to access the content and tools for your own educational use. No resale, scraping, or redistribution.</p>
      <h2>4. Account</h2>
      <p>You are responsible for keeping your credentials secure and for activity under your account.</p>
      <h2>5. Payments & refunds</h2>
      <p>Purchases are processed by Stripe in GBP. Prices include VAT where applicable. {BRAND} sells lifetime access to digital educational content delivered immediately on payment.</p>
      <p><strong>UK / EU consumer cooling-off:</strong> Under the Consumer Contracts Regulations 2013 you normally have 14 days to cancel a distance purchase. By starting to use the content (opening a chapter, the AI tutor, quizzes, or any premium feature) before the 14 days expire, you expressly consent to immediate performance and acknowledge that you lose the right to cancel once delivery has begun.</p>
      <p><strong>Discretionary refunds:</strong> If you have not used any premium feature, email {CONTACT} within 14 days of purchase and we will refund in full. Refunds outside this window are at our discretion. Refunds for technical issues we cannot resolve within a reasonable time are always available.</p>
      <p><strong>How to request:</strong> email {CONTACT} from the address on the account. Refunds are returned to the original payment method via Stripe, typically within 5–10 business days.</p>
      <h2>6. AI features</h2>
      <p>AI tutor and word lookup responses are generated automatically and may contain errors. Do not rely on them as financial, legal, or professional advice.</p>
      <h2>7. Acceptable use</h2>
      <p>No unlawful, abusive, infringing, or automated misuse. We may suspend accounts that breach these rules.</p>
      <h2>8. Intellectual property</h2>
      <p>All content, design, and code is owned by {BRAND} or its licensors.</p>
      <h2>9. Disclaimers</h2>
      <p>Service provided "as is" without warranties. Markets are risky — see the Risk page.</p>
      <h2>10. Liability</h2>
      <p>To the maximum extent permitted by law, our liability is capped at the amount you paid in the prior 12 months. Nothing limits liability for death, personal injury, or fraud.</p>
      <h2>11. Termination</h2>
      <p>You may close your account at any time. We may suspend access for breach.</p>
      <h2>12. Governing law</h2>
      <p>England and Wales. Courts of England and Wales have exclusive jurisdiction.</p>
      <h2>13. Contact</h2>
      <p>{CONTACT}</p>
    </>
  );
}

function Disclaimer() {
  return (
    <>
      <h2>Educational content only — not financial advice</h2>
      <p>{BRAND} provides educational material, tools, and an AI tutor for learning about trading concepts. <strong>Nothing in this app is financial, investment, tax, or legal advice</strong> and nothing constitutes a personal recommendation or solicitation to buy or sell any asset.</p>
      <h2>Risk warning</h2>
      <p>Trading financial markets — including spot, derivatives, crypto, and CFDs — carries a high level of risk and may not be suitable for all investors. You can lose more than your initial deposit when using leverage. Past performance is not a reliable indicator of future results.</p>
      <h2>No regulated activity</h2>
      <p>{BRAND} is not authorised or regulated by the UK Financial Conduct Authority (FCA) or any other regulator. We do not manage assets, place orders, or provide regulated services.</p>
      <h2>Your responsibility</h2>
      <ul>
        <li>Do your own research and seek independent, regulated advice before making any financial decision.</li>
        <li>Only risk capital you can afford to lose.</li>
        <li>Trade journal and calculator outputs are tools for record-keeping and arithmetic only; they make no predictions and are not signals.</li>
      </ul>
      <h2>AI outputs</h2>
      <p>AI-generated responses may be inaccurate, outdated, or incomplete. Always verify against primary sources before acting on any information.</p>
      <h2>Contact</h2>
      <p>{CONTACT}</p>
    </>
  );
}