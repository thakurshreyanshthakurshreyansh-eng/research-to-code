# Research to Code — Feature status (29 Oct 2026)

## Added in this revision (29 Oct 2026)
- AI Lab UI: paper summary, methods/equation explanation, code review/improvement, pytest test generation.
- Configurable OpenAI-compatible provider endpoint in Cloudflare Worker. AI is OFF by default; no provider or paid account was selected.
- Server-side provider secret; sign-in required; explicit consent checkbox is required in the UI and consent flag is checked by the Worker before submitting content.
- Monthly quota: Free 3 AI requests; active Premium entitlement 50. Supabase tracks request metadata only, not prompt/output content.
- Input size and request-time limits; generic provider errors; no claims that AI output was executed.
- Worker hardening: reject mismatched browser Origin headers; cap Razorpay webhook payloads at 64 KiB.
- OCR hardening: pin Tesseract.js to 5.1.1, clear stale PDF state when a new file is chosen, and terminate OCR workers on failures.
- Local workspace JSON backup/export and validated import for code, tests, extracted PDF text (first 100,000 chars), AI output, and up to 20 recent run records. Import is limited to 1 MB, bounds field lengths, and sanitizes numeric run fields to prevent imported data from injecting HTML. Clear workspace also clears in-memory run history.
- Starter Content-Security-Policy and additional security headers in `_headers`; the policy now restricts network connections to known CDN/Supabase/Cloudflare Worker/Razorpay host patterns. It still permits inline scripts and must be tested against the final custom domains.
- Reproducible EWMA anomaly-detection sample problem, buggy implementation, solution, and 10 pytest tests. Solution passes all 10; buggy version fails 5 as expected.
- Local OCR attempt for up to five pages using Tesseract.js. It processes rendered pages in the browser and may be inaccurate.
- Buttons to copy AI output into After code or Proof tests, followed by manual review.
- Privacy/Terms draft pages with placeholders.
- Razorpay remains test-mode-only; live keys are blocked in the Worker.
- Login-first entry gate: configured sites require a real Supabase Auth session before showing the workspace. The gate supports email OTP and Google OAuth; local `file://` preview includes an explicit demo path without creating an account.
- Hindi/English selector is shown at the entry screen and remains visible in the app header; key entry/home/navigation labels are translated and the selection persists locally.
- Delegated handling of `data-go` buttons supports dynamically-rendered routes; demo mode has a visible warning and keeps AI/payments disabled.
- New premium-style responsive interface based on general SaaS UX principles (not a clone), with a desktop-aware navigation layout, theme toggle and reduced-motion handling.
- Installable PWA shell: manifest, 192/512 icons, install prompt, service worker and same-origin shell cache. External libraries and services still need internet.
- Local draft autosave/recovery for code, tests and extracted PDF text; excludes AI outputs and run history. Added keyboard shortcuts and a privacy-safe diagnostic report download.
- Script-loader request de-duplication/retry after failure; friendly errors for malformed AI/order/account API responses.
- Worker JSON responses use no-store/nosniff/referrer policy headers by default; UTF-8 request limits use byte counts and outbound calls have timeouts.

## UX, performance and pricing revision (29 Oct 2026)
- Theme toggle now switches from the effective OS theme (so the first tap changes the theme even when OS dark mode is on); final CSS override removes transitions, animations, blur and heavy shadows to reduce low-end mobile rendering work.
- Preview build now shows an explicitly labeled demo entry when backend settings are empty, including in hosted file viewers. It creates no real account; AI and payment remain disabled. **Set `DEMO_PREVIEW_BUILD=false` before public deployment.**
- Pro and Ultra proposed prices are shown as ₹599/month and ₹1,299/month. They are not for sale; their tier-specific feature/usage logic is not implemented end-to-end.
- Pricing assumptions and calculation are in `PRICING_MODEL_HI.md`. Estimated contribution after reserved payment/API/support costs is about ₹261 for Pro and ₹605 for Ultra, before income tax, acquisition, refunds/chargebacks and shared fixed costs. These are estimates, not guaranteed profit.

## Not done / must not be advertised as working
- Pro and Ultra are display-only planned tiers and are explicitly disabled; there are no working Pro/Ultra entitlements or checkout products.
- No AI provider configured or live AI request tested. Provider choice may cost money and needs approval.
- Supabase schema/migration has not been run against a real database; OAuth/email OTP have not been tested against real accounts.
- Razorpay has only been tested against a simulation; no real checkout verified.
- Saved cross-device history, server-side code sandbox, GitHub pull-request export, subscription auto-renewal, automated cancellation/refunds and customer support workflow are not implemented.
- Privacy/Terms are drafts and require the operator details, provider disclosures, actual refund/renewal policy and legal review.
- CSP in `_headers` is narrower than before but still permits inline scripts and WebAssembly evaluation for the current single-file app/Pyodide. It is not a strict production CSP. The current browser-based Python execution is not a hardened server sandbox and cannot promise protection from every memory-exhaustion program.
- `_headers` is supported by Cloudflare Pages but ignored by GitHub Pages; host-specific security headers must be configured before production.
- Headless Chromium smoke tests were attempted but Chromium hung in this execution environment even on a trivial local HTML page; browser/mobile behavior remains unverified.
- Real Android browser test and deployment have not been completed. Chromium headless was attempted twice, including a local HTTP server and single-process flags, but timed out before producing DOM output; do not treat browser testing as passed.

## Automated checks
The current local suite is rerun with `node tests/run-all.cjs`; latest run: 217 harness checks passed. The separate sample challenge passes 10/10 real pytest tests; the deliberately buggy version fails 5 tests as expected. These are local tests, not live end-to-end checks. This is not equivalent to a live end-to-end test. Browser-based OCR, real OAuth, real AI provider, real Supabase SQL and Razorpay are not live-tested.
