# Research to Code — Deep Pre-launch Audit

**Audit date:** 29 October 2026  
**Decision:** **NOT READY FOR PUBLIC CUSTOMER LAUNCH**  
**Live frontend:** https://research-to-code.onrender.com  
**Latest source revision:** `a00a2294819cc6813b73122f17ad6f672f2bbf7f` (adds a meta Content-Security-Policy fallback and its static-audit assertion).

## Changes made in this audit

- Redesigned visual hierarchy and responsive layout with a premium SaaS visual system informed by Linear’s public design principles: focus the work area, reduce noisy borders and keep navigation predictable. This is inspiration, not a copy of another product.
- Added explicit Pro and Ultra cards as **unavailable**. Their checkout buttons are disabled; no claim is made that these tiers exist or are paid-ready.
- Reset and terminate the browser Python worker on timeout, stop, startup failure or worker error; revoke its Blob URL when reset. The worker can be reused after a successful run.
- Added per-run limits: code at most 100 KB and tests at most 50 KB.
- Added an OCR canvas pixel cap and adaptive scale to reduce huge-page memory spikes.
- Cancel stale PDF reads when the user selects a new file; destroy the old document where possible.
- Made workspace import normalize/validate run records before committing imported state; restored imported PDF text to the visible workspace and clearly state that the original PDF is not in the backup.
- Tightened `connect-src`, `img-src` and `font-src` in the Cloudflare Pages `_headers` policy; added HSTS and cross-domain policy headers.
- Added `wrangler.toml` and a deployment runbook. No credentials are included.
- Added installable PWA metadata, icons, install prompt and same-origin offline shell caching. The app shell can be reopened after a first visit; CDN-hosted PDF/Python/OCR libraries and all account/AI/payment services still require internet.
- Added manual system/light/dark theme control, device-local autosave/recovery for code, tests and extracted PDF text, and keyboard shortcuts. Autosave excludes AI outputs and run history.
- Added `no-store` and `nosniff` defaults to Worker JSON responses, actual UTF-8 byte-size request checks, and timeouts for outbound Supabase/payment/admin requests.
- Added privacy-safe diagnostic report download and friendly error text for malformed AI/order/account API responses.
- Added a shared external-script loader promise to avoid duplicate concurrent downloads and allow retries after failures.
- Added a repeatable syntax/integrity test group for inline JS, service worker, manifest and PNG icon dimensions.
- Added a privacy-safe diagnostic download that excludes code, PDF text, account email, tokens and secrets; improved friendly errors for malformed API responses.
- Added `DESIGN_DECISIONS.md` to document the public design references and make clear that visual principles—not another site’s exact assets/layout—were used.

## Local test results

- `node tests/run-all.cjs`: all groups pass — 217 harness checks across logic, page flow, account/payment UI, example Python, cross-file integration, simulated Worker/database/payment/AI, static security audit and sample challenge.
- `python -m pytest -q samples/ewma-anomaly-detection/test_solution.py`: **10 passed**.
- The deliberately buggy sample is expected to fail 5 tests and pass 5, proving that the sample tests detect the seeded faults.
- Inline application JavaScript syntax check: passed.
- ZIP integrity: passed for the generated candidate and website preview packages.
- HTML duplicate-ID/static audit: passed (76 unique IDs).
- CSS parsed with `tinycss2`: 0 parse errors; HTML parsed with BeautifulSoup: passed.
- Chromium headless attempted twice (file URL and local HTTP server) but timed out before DOM output; no browser pass is claimed.

## Important limits and remaining blockers

1. **Frontend is deployed, but production acceptance is incomplete.** Render reports a successful static-site build/deploy for the CSP fallback revision. This confirms publication only—not browser functionality, live Supabase OTP, response security headers, Android compatibility or service integration. Render does not automatically apply Cloudflare Pages' `_headers` file; a meta CSP fallback is now present, but `frame-ancestors` and other response-only protections still require verified Render response headers.
2. **Browser automation remains unverified.** Chromium headless timed out in this environment before producing DOM output. This does not prove the app is broken, but it also does not prove it works in a real browser. Android Chrome smoke testing remains required.
3. **Supabase migration and auth are not live-tested.** Apply `supabase/schema.sql` in a disposable project and test email OTP, Google OAuth, export and deletion before public launch.
4. **AI is disabled.** No provider is configured. Provider success, timeout, rate limit, malformed response, quota and privacy behavior need real staging tests.
5. **Razorpay is test-only.** Current automated tests simulate Razorpay; real Test Mode checkout and webhook delivery remain unverified. Live payment keys are blocked by design.
6. **Pro and Ultra do not exist as working paid tiers.** They are visibly disabled. Do not enable or advertise them until their real features, plan-specific quotas/entitlements and billing lifecycle are implemented and tested.
7. **No hardened server-side code sandbox.** Python runs in the user's browser Worker. Timeouts and source-size limits help, but memory-exhaustive code can still affect the browser. Do not market this as secure isolation for untrusted code.
8. **Privacy and Terms are drafts.** Operator identity, contact, jurisdiction, retention, grievance and pricing/refund/renewal details must be filled and legally reviewed.
9. **CSP is not strict.** It still permits inline scripts and WebAssembly evaluation. The allowed origin list must match the final deployment domains; browser console/network checks must pass after deploy.
10. **Premium features still missing:** cross-device saved history, server-side isolated execution, GitHub PR export, automated renewals/cancellations/refunds and support workflow. Pro and Ultra remain disabled.
11. **PWA and browser behavior are not live-verified.** Manifest JSON, icon dimensions, service-worker syntax and same-origin cache rules are statically checked, but install prompts, offline reopening and layout still require Android Chrome over HTTPS. The headless Chromium process in this workspace timed out before producing DOM output.

## Go/no-go rule

Do not publicly launch or accept customer money until the deployment checklist is completed, the deployed response headers are verified, all real integrations pass on staging, no P0/P1 defects remain, and the policies/support/billing details are complete. No finite test suite can honestly guarantee zero bugs.


## 29 Oct 2026 — UX, theme, demo and pricing follow-up
- First-tap theme behavior fixed for system dark mode; global CSS override disables transitions, animations, backdrop blur and shadows to reduce rendering work on low-end phones. This is a performance-oriented change, not a measured “8K” benchmark.
- Preview gate now shows a clearly labeled demo route when backend configuration is empty, even in hosted preview viewers. Demo does not create an account and leaves AI/payments disabled. `DEMO_PREVIEW_BUILD` must be false before public deployment.
- Proposed prices: Pro ₹599/month; Ultra ₹1,299/month. Calculation and assumptions are in `PRICING_MODEL_HI.md`. Checkout remains disabled because live auth, AI provider, tier-specific quota logic and payment lifecycle have not been end-to-end tested.
- Previous local suite: 224 harness checks passed; sample pytest suite: 10 passed. A new static-audit assertion now covers the meta CSP fallback, but a fresh complete local suite was not executed in this environment. Android Chrome and real services remain unverified.


## 29 Oct 2026 — live deployment and hosting-header follow-up
- Render build logs report the CSP fallback build completed and the site was live for commit `b59289f930ce72dd0ade48dbb42be46c539c43bb`; a subsequent deploy for `a00a2294819cc6813b73122f17ad6f672f2bbf7f` was still running at the last status check.
- Added a meta CSP fallback in `index.html` because Render does not consume Cloudflare Pages' `_headers` file. The fallback was checked against the intended allowed host patterns. It is not a substitute for response headers or a real browser network/console test.
- Updated README and SETUP to explicitly warn about Render response-header configuration. Public launch remains blocked pending Supabase SQL/Auth, separate API Worker deployment, real end-to-end tests, completed legal/support details and owner-controlled configuration.
