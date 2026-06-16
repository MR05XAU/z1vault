Big scope. I'm splitting into **Auto** (I do now, no signoff) and **Signoff** (you confirm before I touch). Token usage is minimised throughout (keyword routing, caching, cheapest models, no re-fetching).

## A. Auto — I do these immediately

### Bug fixes & polish
1. **Tutor citations** — model returns chapter refs `[Ch.3]`; UI renders them as tap-to-jump pills to Reader.
2. **Token minimisation pass** — switch tutor to `google/gemini-2.5-flash-lite` (cheapest), tighten system prompt, cap response tokens, dedupe chapter context, drop the "answer not covered" fallback bloat.
3. **Loading bugginess** — add proper Suspense + skeleton fallbacks on Vault/Reader/Library/Notebook; fix the race where chapters render before auth resolves (caused blank screens); add retry on transient supabase failures.
4. **Admin page** — back-to-home button + breadcrumb; tidy layout; add **Email Logs** tab (reads `email_send_log`).
5. **Payments webhook error** — I'll pull logs, identify the failure, fix it.
6. **Offline downloads improvement** — show download progress per chapter, "Download all" button, storage-used indicator, clear-cache button, fix the 30-day TTL silently dropping chapters without notice.
7. **Recap questions** — at chapter end, 2 quick recap MCQs auto-generated from that chapter; random "did you remember?" prompt every 3rd chapter open from previously-read material.
8. **Word lookup (highlight + double-tap)** — hybrid: free `dictionaryapi.dev` first, AI Gateway fallback for trading jargon. Popover with definition + "save to vocab" button. New `vocab` table.
9. **More quiz questions** — bump to 6 per chapter when regenerated.
10. **Test accounts (both modes)** — admin toggle on /admin user list to grant/revoke entitlement on any user, + hardcoded allowlist env var `TEST_ACCOUNT_EMAILS` for auto-grant on signup.

### Trading journal (full scope)
11. **`trades` table** — pair, direction, entry/exit price, size, PnL (auto-calc), strategy tag, notes, screenshot URL, opened_at, closed_at.
12. **`strategies` table** — user-defined tags with colour.
13. **Storage bucket `trade-screenshots`** — private, RLS to owner.
14. **/journal page** — list view, add/edit trade form, filter by tag/date/win-loss.
15. **/journal/calendar** — heatmap (day/week/month/year toggles) coloured by daily PnL.
16. **/calculators page** — RR calculator + position-size calculator (account %, stop distance → size).
17. **Win-rate widget** — auto on /journal: rolling 30-day, lifetime, per-strategy.
18. **BottomNav** — add "Journal" tab.

### Diagnostics
19. End-to-end click-through every route via the browser tools; capture console + network errors; fix what I find. Will report what I touched.

## B. Signoff required — confirm and I'll execute

### Auth
- **S1. Disable Lovable-managed Google, enable BYO Google OAuth.** I'll wire the code (`@supabase/supabase-js` `signInWithOAuth`) and disable email if you want. **You need to:** create OAuth credentials in Google Cloud Console (I'll give exact steps + the callback URL), then I add `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` as secrets. **Confirm: Y/N + keep email/password? Y/N.**

### Email
- **S2. Email templates branding pass** — I'll style the 6 auth templates + welcome email to your brand colours. **Need from you:** logo URL or upload, primary colour hex, brand name to use in copy.
- **S3. New transactional emails** to add: streak-broken (already declined → skip), purchase receipt, password-changed confirmation, weekly digest. **Confirm which to ship.**

### Go-live checklist (you must do)
- **S4. Stripe go-live** — you said you'll test soon. Once live keys are populated I'll flip the env detection.
- **S5. Custom domain** — point your domain at the app + verify in Lovable settings.
- **S6. Privacy policy + ToS pages** — I can draft from a template; you review legal copy.
- **S7. App store assets** (if Capacitor build) — icon 1024², splash, screenshots. I can generate drafts.
- **S8. Legal disclaimer for trading content** — required for journal/PnL features. I'll draft; you sign off.

### Bigger product calls
- **S9. Push notifications** for streak reminders / recap nudges — requires Capacitor + APNs/FCM setup. Skip for v1?
- **S10. Multi-device sync conflict resolution** — currently last-write-wins on highlights. Fine for v1?
- **S11. Export trade journal to CSV** — easy add, want it?

## Technical notes
- Word lookup uses `definitionsCache` table to avoid re-calling AI for the same word twice.
- Recap questions reuse existing `quizzes` table with a `is_recap` flag (migration).
- Calendar uses pure CSS grid — no chart lib needed.
- Tutor moves from full-chapter context to: current chapter + top-2 keyword-scored chapters + chapter summaries (new `summary` column, generated once by admin button). ~95% token reduction vs current.
- All new tables: GRANT + RLS scoped to `auth.uid()`.

## What I need from you to start
1. Confirm **A is approved to execute** (yes/no — default yes).
2. Answer **S1** (Google OAuth: proceed? keep email?).
3. Answer **S2** (logo + brand colour + brand name).
4. Answer **S3, S8, S9, S10, S11** with quick yes/no.

I'll start on **A** the moment you say go. S items wait for your answers.