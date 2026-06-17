## Go-live execution plan

### 1. Enable Leaked Password Protection (HIBP)
Call `supabase--configure_auth` with `password_hibp_enabled: true` (other flags unchanged: `disable_signup: false`, `external_anonymous_users_enabled: false`, `auto_confirm_email: false`). New/changed passwords will be checked against the HaveIBeenPwned database.

### 2. Tighten `/legal` copy for live payments
`src/pages/Legal.tsx` is solid (Privacy / Terms / Risk, dated 17 June 2026, UK GDPR, contact, processors). Two small fixes:
- Replace processor name **"Resend"** with **"Lovable Cloud"** (we use Lovable Email, not Resend).
- Add an explicit **Refund policy** paragraph under Terms covering live Stripe payments (e.g. 14-day UK consumer right to cancel for unused digital access, statement on lifetime-access non-refundability once consumed, how to request a refund via `support@mr05xau.co.uk`).

### 3. SEO / share metadata
`index.html` already has title, description, OG/Twitter title+description+url+image (`/og-image.jpg`), favicon, apple-touch-icon, theme-color, manifest. No template defaults remain. **No code change needed** — I'll verify `/public/og-image.jpg` and `/public/favicon.ico` exist, and flag if either is missing so you can replace them.

### 4. Trigger SEO scan
Run `seo_chat--trigger_scan` (with your approval) so the SEO & AI search tab shows a fresh report after publish.

### 5. Publish the frontend
Call `preview_ui--publish` (`website_info_status: already_relevant`) to push the latest frontend to `https://z1vault.lovable.app` and `https://mr05xau.co.uk`. Backend (edge functions, migrations, security lockdown) is already live.

### 6. Smoke-test checklist (you run this on the live domain)
I can't perform real payments, send real OTP emails, or sign in with your Google account, so you drive this after publish. Suggested order:
1. Open `https://mr05xau.co.uk` in a private window.
2. **Email signup** → check inbox for verification email → confirm → land in app.
3. **Password reset** → request from `/auth` → check inbox → set new password → sign in.
4. **Google sign-in** → only works once you've corrected the Client ID (the `apps.-googleusercontent.com` typo from earlier).
5. **Stripe live checkout** → buy lifetime access with a real card (small amount or your own) → confirm redirect to `/checkout-return` → verify in Backend → Users that your profile flipped to paid → verify in Backend → Edge Functions logs that `payments-webhook` returned 200.
6. **Refund test row** → optionally refund the test charge from your Stripe dashboard to confirm the webhook downgrades access.

If any step fails, share the screen/console/network output and I'll debug.

### What I will NOT touch
- `src/integrations/supabase/client.ts`, `types.ts`, `.env*` (auto-generated)
- Google Client ID (you must paste it in the backend; I can't read it)
- Stripe dashboard (you already completed all 5 go-live steps)
