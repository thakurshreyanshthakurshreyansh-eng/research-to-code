# Research to Code — Deep Pre-launch Audit

**Audit date:** 29 October 2026  
**Decision:** **NOT READY FOR PUBLIC CUSTOMER LAUNCH**  
**Live frontend:** https://research-to-code.onrender.com  
**Source revision re-verified:** `5df6e8c39c4cd6123dc251eafac89f0997686728` (adds Render API adapter hardening, CORS health-method coverage, and a live Node adapter smoke test).

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

- `node tests/run-all.cjs`: **224 checks passed** across logic, page flow, account/payment UI, example Python, cross-file integration, simulated Worker/database/payment/AI, static security audit and sample challenge. GitHub Actions passed this suite on source revision `de27ef14ed11283364bfddab29eab554f133e11a`.
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
- Previous local suite: 224 harness checks passed; sample pytest suite: 10 passed. The meta CSP fallback is covered by the static audit. The fresh GitHub Actions run passed both `node tests/run-all.cjs` and `python -m pytest -q samples/ewma-anomaly-detection/test_solution.py` (10 passed). This still does not replace live-browser or real-provider integration tests. Android Chrome and real services remain unverified.


## 29 Oct 2026 — live deployment and hosting-header follow-up
- Render's latest confirmed live deployment at the time of this audit was commit `09a6ddc1d727661ed2181ff5420b463bec0a8298`. A newer commit `de27ef14ed11283364bfddab29eab554f133e11a` had been queued for deployment; verify the final Render deployment status before assuming that revision is live.
- Added a meta CSP fallback in `index.html` because Render does not consume Cloudflare Pages' `_headers` file. The fallback is covered by static checks. It is not a substitute for response headers or a real browser network/console test.
- Fixed the test harness's URL-host parser to handle CSP separators and explicitly configured Supabase/Worker origins; both GitHub Actions workflows passed the 224-check suite and the separate 10-test pytest suite on revision `de27ef14ed11283364bfddab29eab554f133e11a`.
- Updated README and SETUP to explicitly warn about Render response-header configuration. Public launch remains blocked pending Supabase SQL/Auth, separate API Worker deployment, real end-to-end tests, completed legal/support details and owner-controlled configuration.

## 29 Oct 2026 — API hosting progress (latest follow-up)

- Added a Node HTTP adapter for the existing Worker API and deployed a separate Render free web service: `https://research-to-code-api.onrender.com` (dashboard: `https://dashboard.render.com/web/srv-dbhld12jnfac73aab0a0`).
- Added a minimal `GET /health` liveness route that returns only the service name/status; it intentionally does not claim that Supabase, AI or payment dependencies are healthy.
- The API service has `SUPABASE_URL`, `ALLOWED_ORIGIN`, `AI_ENABLED=false`, `PAYMENTS_ENABLED=false`, and `PAYMENT_MODE=test`. The owner still must set `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` in the API service environment; the latter must be a Secret. Frontend `API_BASE` is intentionally not wired until those keys are present.
- Latest GitHub Actions on revision `764a9c240284d14e3afc77cdb9139ccb15c2436c`: both workflows passed. The Worker test suite now includes a health-endpoint assertion.
- Render reported the API process started successfully on port 10000 and the environment-variable deployment reached `live`. Direct external HTTP verification from this execution environment was unavailable, so the public `/health` URL still needs an owner/browser smoke check.
- **Still not ready for customer launch:** Supabase schema/Auth not confirmed in the live project; API service-role and anon keys not set; frontend-to-API wiring intentionally pending; AI provider not selected/configured; Razorpay test credentials/webhook not configured or end-to-end tested; security response headers and Android Chrome not independently verified; Privacy/Terms still contain operator/contact placeholders. Do not accept customer payments.



## Follow-up audit — 29 October 2026, 14:35 UTC

### Additional code changes in this pass
- The Render Node adapter now applies `nosniff`, frame-denial, a JSON-only CSP, no-referrer and HSTS headers to normal Worker responses as well as adapter-generated errors. These headers are implemented in code; the deployed HTTPS response still needs an external header check.
- Corrected the API CORS allowed-methods list to include GET for the liveness endpoint.
- Expanded CI to run an actual local HTTP smoke test against the Node adapter: `/health`, security headers, missing-Supabase configuration guard, and oversized-request rejection.
- The current latest commit is `5df6e8c39c4cd6123dc251eafac89f0997686728`. The website-bundle workflow passed on this commit; the full API/logic workflow was still running at the moment of this report refresh. Check GitHub Actions for final status.
- Render auto-deploys for the latest commit were queued/in progress at the time of this report refresh. Confirm both services report the same revision as live before relying on the new runtime behavior.

### Still blocked by owner-side configuration or real devices/accounts
- Do not set frontend `API_BASE` until the API service has `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` configured securely. Do not paste keys into chat or GitHub.
- The database schema/auth providers, real AI provider, Razorpay test webhook, and legal/operator placeholders remain unconfigured/unverified.
- The Render service's health-check path is not configured in the service settings; configure it to `/health` in Render if the plan/settings support it.
- External live endpoint requests from this environment returned an access error, so no claim is made that the deployed health endpoint, response headers, browser behavior, or Android behavior has been externally verified.

## 29 Oct 2026 — additional deployed verification

**Latest code revision checked:** `dfddd0be96904ebb10f7b0ec0fcfadb8566b1255`.

- Render control plane reports both the API and frontend deployments for this revision as **live**.
- GitHub Actions on this revision passed the complete test suite and website-bundle checks. The complete suite includes the Node API adapter smoke test; the separate sample pytest suite passed **10/10**.
- Added a static DOM integrity test. It checks **146 unique HTML IDs** and **207 static lookups**, with no missing references.
- Added a live deployment smoke workflow that runs on pushes to `main`, on demand, and every six hours. The successful live run checked the frontend's HTTP 200 response, app entry gate, demo mode disabled, theme/PDF/AI-consent controls, API health JSON, and five API security headers.
- The live smoke check is a focused deployment check, **not** a full real-browser user journey. Android Chrome, real Supabase authentication/schema, AI-provider requests, and Razorpay checkout/webhooks remain unverified.

### Still blocks a claim of “100% working” or public customer launch

1. The API still requires the Supabase anon key and service-role key in Render secret settings; do not paste either secret into chat or commit it to GitHub.
2. Only after those API secrets are set should the frontend's `API_BASE=https://research-to-code-api.onrender.com` be configured and rebuilt.
3. Apply `supabase/schema.sql` in Supabase and test real email OTP/Google OAuth, account export/deletion, and session expiry.
4. AI and payments are disabled by default. AI provider credentials and Razorpay **test-mode** credentials/webhook setup are needed for end-to-end staging tests; no live payments should be enabled yet.
5. Pro/Ultra entitlements, cross-device history, a hardened server-side Python sandbox, GitHub PR export, automated renewal/cancellation/refund flows, and support workflow are not implemented end-to-end. Keep unavailable tiers disabled.
6. Complete legal/privacy placeholders and test the real flows on Android Chrome. The Render API health-check path is still blank in service settings; set it to `/health` in the Render dashboard if the service settings permit it.

**Decision remains: NOT READY FOR PUBLIC CUSTOMER LAUNCH.** Automated checks and the current deployment smoke test are green, but they cannot replace the missing credentials, provider integrations, legal details, and real-device testing.

## 29 Oct 2026 — real-browser regression pass

- Added `tests/browser-smoke.cjs` and a dedicated Playwright workflow. The test runs in Chromium at 390×844 mobile and 1280×900 desktop viewports.
- The browser regression covers the local preview entry, theme and language controls, navigation, code comparison output, example loading, real workspace JSON download, invalid-PDF rejection, and draft-save status.
- The mobile pass also launches the real browser Pyodide + pytest worker and asserts that the included example's five tests pass. This exercises the browser execution feature rather than only checking its button.
- Latest successful browser run before the latest logging-only change: [run 40897365514](https://github.com/thakurshreyanshthakurshreyansh-eng/research-to-code/actions/runs/40897365514). It passed both viewport scenarios; a subsequent commit only adds an explicit log line for the Python result and triggers a fresh validation run.
- The API and frontend Render deployments were both reported live on commit `33abc4182149a9fff42ae723c6591a1d0fa35b91`. A fresh live smoke run was in progress when this note was drafted; check the latest workflow result for the newest commit.
- This browser test uses the repository's local preview mode. It does **not** prove that hosted Supabase authentication, AI, payment processing, mobile-device installation, or production response headers are configured. Public customer launch remains blocked by the owner-side items above.

## 29 Oct 2026 — final responsive/browser regression pass

- A real Chromium layout assertion found a **5 px horizontal overflow on 390 px mobile**, caused by the header's brand and action controls sharing one row. Added a narrow-screen header wrap in `index.html`; the responsive regression now passes at 360×800, 390×844 and 1280×900.
- Expanded browser regression to verify code/result/PDF views do not create document-level horizontal overflow.
- Browser checks now exercise workspace JSON **export and import round-trip**, actual PDF.js text extraction using a generated valid one-page PDF, invalid-PDF rejection, local draft status, theme/language changes, and navigation.
- The mobile scenario runs the actual Pyodide/pytest worker and verifies **five sample tests pass**. It also waits for service-worker activation, turns the browser offline, and confirms the cached app shell still opens.
- Latest confirmed all-green full suite, bundle and browser run on commit `64ebb1583b1f57f441403a32b3431261588047af`: [full suite](https://github.com/thakurshreyanshthakurshreyansh-eng/research-to-code/actions/runs/40899559240), [bundle](https://github.com/thakurshreyanshthakurshreyansh-eng/research-to-code/actions/runs/40899559327), [browser regression](https://github.com/thakurshreyanshthakurshreyansh-eng/research-to-code/actions/runs/40899559246). The Render frontend and API deployments were both reported live for that revision, and its live smoke workflow was still running when checked.
- These checks prove the **local browser tools** work in CI. They do not activate or prove live Supabase authentication, backend AI, Razorpay, real customer entitlements, legal compliance, or a hardened server-side code sandbox. Public launch remains blocked until those dependencies and owner inputs are completed.

## 29 Oct 2026 — frontend response-header gate

- The live HTTPS smoke check now logs the **actual response headers** from Render, rather than relying on the HTML meta policy.
- On the latest externally checked frontend response, `X-Content-Type-Options: nosniff` and HSTS were present, but the **Content-Security-Policy response header, X-Frame-Options and Referrer-Policy response header were absent**. The HTML meta CSP/referrer fallback does not replace every response-header control; in particular, meta CSP cannot enforce `frame-ancestors`.
- Added a launch gate: the live smoke workflow now fails if CSP, X-Frame-Options or Referrer-Policy response headers are absent. The code and browser tests can pass while this hosting-level gate fails; that is intentional and prevents a false “all clear”.
- The current Render integration tools available for this project cannot edit static-site header rules. The owner must add the rules in [Render Static Site settings](https://dashboard.render.com/static/srv-dbhk0o8473hc73a6u22g) → Settings → Headers, following the exact safe configuration in `OWNER_ACTIONS_HI.md`, then rerun the live smoke workflow.
- **Launch decision stays NO-GO** until those response headers are verified and the Supabase/AI/payment/legal owner-side setup and real end-to-end tests are complete.

