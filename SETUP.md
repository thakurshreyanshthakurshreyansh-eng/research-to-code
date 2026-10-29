# Research to Code: Stage 2 setup (phone-friendly)

Nothing here is switched on until YOU do these steps. Never paste secret keys into chat, index.html or GitHub.

## Entry screen (new)
- The workspace is hidden until sign-in succeeds on a configured site. Email one-time code and Google use Supabase Auth; a fake password/account is not created.
- In a local `file://` preview only, `Continue in demo mode` opens local PDF/code/test tools so you can inspect the app without backend credentials. This demo does not create an account; AI and payments remain unavailable.
- The language control is visible on the first screen and remains in the top header after sign-in. The main home/navigation strings are translated; detailed technical tool messages may still be in English.
- If opening an HTML file in an Android file preview makes taps do nothing, download it and open it in Chrome. Some file/document previewers disable JavaScript.

## Files
- index.html: the website (edit only the CFG block near the end of the script, public values only)
- manifest.webmanifest, icon-192.png, icon-512.png, sw.js: installable PWA metadata, icons and offline app-shell cache. The shell is not a full offline application; external libraries/APIs still need internet.
- worker/worker.js: the API (paste into a Cloudflare Worker)
- supabase/schema.sql: the database (run once in Supabase)
- tests/: automated tests (not needed to run the site)

## A. Supabase (free tier)
1. supabase.com > New project. Save the database password somewhere private.
2. SQL Editor > paste supabase/schema.sql > Run.
3. Authentication > Sign In / Providers: Email on. Authentication > Email Templates: in "Magic Link" and "Confirm signup", put {{ .Token }} in the text so people receive a numeric code.
4. Authentication > URL Configuration: set Site URL to your website address and add the same address under Redirect URLs.
5. Project Settings > API: copy Project URL and the anon/publishable key (public). Keep the service_role/secret key private for step C.
Note: Supabase's built-in email sender is limited and meant for testing. Real users will need a custom email (SMTP) provider. That may cost money, so ask before choosing one.

## B. Google sign-in (free)
1. console.cloud.google.com > create a project > OAuth consent screen > then Credentials > Create OAuth client ID > Web application.
2. Authorized redirect URI: copy it from Supabase > Authentication > Providers > Google (it ends with /auth/v1/callback).
3. Paste Google's Client ID and Client Secret into that Supabase page and save. The secret goes only there.

## C. Cloudflare Worker (free tier)
1. dash.cloudflare.com > Workers & Pages > Create > Worker. Open the code editor, replace everything with worker/worker.js, Deploy.
2. Settings > Variables and Secrets. Plain text: SUPABASE_URL, SUPABASE_ANON_KEY, ALLOWED_ORIGIN (your site origin only, like https://name.github.io, no path), PAYMENTS_ENABLED = false initially, PAYMENT_MODE = test.
3. Secrets (type "Secret"): SUPABASE_SERVICE_ROLE_KEY. For payment testing later, add RAZORPAY_KEY_ID as a plain variable beginning `rzp_test_`, and RAZORPAY_KEY_SECRET plus RAZORPAY_WEBHOOK_SECRET as Secrets. Never use `rzp_live_` keys in this build.
4. Copy the Worker address (https://....workers.dev). Verify its `/health` URL returns `{"status":"ok","service":"research-to-code-api"}`. This checks Worker liveness only, not database/auth/AI/payment health.
5. The Worker also exposes authenticated `/api/account/export` and `/api/account/delete` endpoints. Export returns up to 1,000 recent orders, the current entitlement and up to 5,000 AI-usage metadata rows; the response declares these limits. Deletion requires `DELETE_MY_ACCOUNT`, uses the Supabase Admin API, and cascades app rows linked to `auth.users`. Test both on a disposable test account first. Deletion does not issue refunds or erase external-provider records.

## D. Website

### Render static-site build configuration (recommended)
- Keep `index.html` committed with blank client settings; do not commit project credentials to the public repository.
- Render-specific security note: Render Static Sites do **not** automatically apply Cloudflare Pages' `_headers` file. The main app now includes a meta CSP as a fallback, but meta CSP cannot enforce every response-header control (for example `frame-ancestors`). In Render > Settings > Headers, add the equivalent response security headers where supported and verify them in the deployed response before public launch.
- In Render > the `research-to-code` static site > Environment, set `SUPABASE_URL` and `SUPABASE_ANON_KEY` to the Supabase project URL and publishable key. These are public client settings; never add a database password, `sb_secret_`, or `service_role` key.
- After deploying the Cloudflare Worker, optionally set `API_BASE` to its exact HTTPS origin (for example `https://research-to-code-api.<your-account>.workers.dev`, no path). The build validates this origin and injects it into the public frontend config. If absent, the API stays disconnected.
- Optional: set `RAZORPAY_KEY_ID` only to a Razorpay TEST public key beginning `rzp_test_`. The build rejects live IDs and never enables checkout from these variables.
- In Render > Settings > Build Command, set `python3 scripts/configure_site.py`. Keep Publish Directory as `.`. The build script injects public client settings only into Render's temporary build copy and disables hosted demo entry. It deliberately leaves AI and payments off.
- Save changes and deploy. If the build fails, read the build log; the script intentionally blocks missing or unsafe values.

1. For non-Render/manual hosting, fill the CFG block only in the deployment copy: SUPABASE_URL, SUPABASE_ANON_KEY, API_BASE (Worker address). Leave PAYMENTS_ENABLED false.
2. A baseline set of security headers and a starter Content-Security-Policy are in `_headers` for Cloudflare Pages. The CSP permits inline scripts and WebAssembly evaluation for the current single-file app/Pyodide, but narrows `connect-src` to expected CDN, Supabase, Worker and Razorpay host patterns. Verify browser console/network behavior after deployment; add only the exact custom API/auth origins you use. **GitHub Pages ignores `_headers`**; do not use it for a public launch unless equivalent headers are supplied by another supported layer.
3. Upload `index.html`, `privacy.html`, `terms.html`, `manifest.webmanifest`, `icon-192.png`, `icon-512.png`, `sw.js` and host configuration only after completing and reviewing the policy pages. PWA installability requires HTTPS and must be tested on the deployed origin. The included Privacy/Terms pages contain placeholders and are not ready for a public launch.

## E. AI provider (optional; paid use may cost money)
1. AI is off by default. Do not enable it until you choose a provider and check its price, privacy policy, data retention, and API limits.
2. The Worker expects an OpenAI-compatible chat-completions endpoint: plain variables `AI_ENABLED=true`, `AI_API_URL`, `AI_MODEL`; Secret `AI_API_KEY`. Never put the API key in `index.html`.
3. In `index.html` CFG, set `AI_ENABLED:true` only after the Worker is configured. The site requires sign-in and a consent checkbox before sending the first 18,000 characters of current PDF text, or the entered code/tests, to the provider.
4. Monthly quotas are enforced in the database: Free 3 requests/month; Premium 50 requests/month. Each request is capped. The input text/code is not stored by the app; usage metadata is stored. The chosen AI provider receives the selected content.
5. Run the SQL migration in `supabase/schema.sql` again only if the AI usage table/function has not already been created; SQL Editor may run the `ai_usage_events` and `consume_ai_quota` section separately. Review SQL before executing.

## One payment integration for India
The website uses **one gateway only: Razorpay Checkout**. Customers choose from the payment instruments enabled for the merchant account inside the gateway checkout; do not build separate direct integrations for individual UPI apps or banks. Razorpay documents UPI, debit/credit cards, net banking, wallets, EMI and additional methods that may require approval. Actual methods vary by merchant approval, account settings, bank/customer eligibility and current checkout support. Do not promise that every method will appear for every customer. Official references: https://razorpay.com/payment-gateway/ and https://razorpay.com/docs/payments/payment-methods/.

The UI lists the major Indian digital-payment categories for transparency, but **payments remain disabled by default** in this package. Listing a method is not proof it is enabled or live-tested.

## F. Razorpay TEST MODE ONLY (no live charges in this build)
1. Do this only after steps A–D work. Create/sign in to Razorpay and select Test Mode. Do not enable live payments.
2. Worker plain variable: `RAZORPAY_KEY_ID` (must start `rzp_test_`). Worker Secrets: `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`. Set `PAYMENT_MODE = test`.
3. Razorpay > Webhooks: URL = Worker address + `/api/webhook`. Events: `payment.captured`, `payment.authorized`, `order.paid`, `payment.failed`. Use the webhook secret you set in the Worker.
4. In the Worker, set `PAYMENTS_ENABLED = true`; in `index.html` CFG, set `PAYMENTS_ENABLED:true` and add the public `RAZORPAY_KEY_ID`. The Worker rejects missing test configuration and rejects live key IDs. Do not change `PAYMENT_MODE` to live.
5. `schema.sql` inserts a clearly named ₹1 **test-only** plan. This is for checkout-flow testing, not a real product offer. Razorpay Test Mode uses simulated payments and should not collect real money.
6. Keep Razorpay auto-capture on (the default). Before granting Premium, the Worker asks Razorpay directly for the payment status, order ID, amount and currency. If a payment is only authorized, the website shows "pending" and the plan is granted after capture.
7. Test successful, failed, cancelled, delayed-capture and duplicate webhook scenarios. The automated suite simulates Razorpay; it is not a live integration test.

**Important:** AI Lab code is included but AI remains unavailable until an owner selects/configures a provider and applies the database migration. Cross-device saved history, a hardened server-side sandbox, GitHub PR export, subscription renewals/refunds/cancellation automation, and a support workflow are still not implemented. Account export/deletion only covers the app's Supabase-held records; deletion does not issue refunds or remove external provider records. Privacy/Terms are drafts and the CSP is a compatibility-oriented starter, not a strict production policy. A test entitlement does not mean all Premium features exist. Do not accept live customer payments until these gaps are resolved.

## Test checklist (after A to D and optional AI setup)
1. Account tab shows Google button and email box (not "not set up").
2. Email code arrives, works once, wrong code shows an error, Resend waits 60 s.
3. Google sign-in returns to your site signed in.
4. Sign out works. Account shows "Free plan".
5. AI Lab stays disabled until AI_ENABLED and provider settings are configured.
6. After enabling, AI requests require sign-in and explicit consent; test Free quota and Premium quota.
7. Try local OCR on a scanned PDF; confirm it works without uploading the PDF file.
8. Export a workspace JSON backup, import it again, and verify code/tests/results are restored. Treat the backup as sensitive if it contains unpublished work.
9. Test the supplied `samples/ewma-anomaly-detection/` exercise: run the tests against `solution.py` (expected 10/10 pass), then against `buggy_code.py` (expected 5 failures).
10. On a disposable Supabase test account, verify account export returns only that user's data; verify account deletion with explicit confirmation and confirm the auth user plus linked app records are gone. Do not test deletion against a real user's account.


## Deployment gate (read before publishing)

Use `DEPLOYMENT_CHECKLIST_HI.md` as the required release runbook. Pro and Ultra are intentionally unavailable; do not create active price rows or accept live payments until their actual features and lifecycle are implemented and end-to-end tested. The `_headers` CSP supports the default `*.supabase.co` and `*.workers.dev` hostnames; if you use custom domains, add those exact origins and re-test the deployed browser console/network panel. HSTS should only be served over HTTPS.

## Before public launch — required

- In `index.html`, set `DEMO_PREVIEW_BUILD=false`. This build intentionally shows a demo path while backend credentials are empty so the owner can test local features; it is not a real sign-in.
- Review `PRICING_MODEL_HI.md`. Pro ₹599/month and Ultra ₹1,299/month are proposed only; do not activate checkout until features, per-tier quotas, cancellation/refund handling and real test-mode payments are verified. The current Worker quota is 3 Free / 50 paid AI requests; Ultra 200 is not implemented.
- Theme/performance overrides reduce animation, blur and shadow work, but actual Android device performance has not been measured in this environment.
