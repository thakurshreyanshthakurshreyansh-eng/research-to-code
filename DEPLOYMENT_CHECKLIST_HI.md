# Research to Code — Deploy / Launch Checklist (Hindi)

**वर्तमान निर्णय: PUBLIC LAUNCH BLOCKED.** यह रनबुक डिप्लॉयमेंट चरण को शामिल करती है; ZIP अपलोड कर देना अपने-आप में सफल डिप्लॉयमेंट या सुरक्षा प्रमाण नहीं है।

## 1. कोड और लोकल प्रीफ्लाइट

1. पूरा प्रोजेक्ट ZIP निकालें; `index.html`, `privacy.html`, `terms.html`, `_headers`, `worker/worker.js`, `supabase/schema.sql` और `tests/` मौजूद होने चाहिए।
2. Node.js 20+ और Python/pytest उपलब्ध हों तो चलाएँ:
   - `node tests/run-all.cjs`
   - `python -m pytest -q samples/ewma-anomaly-detection/test_solution.py`
3. सभी लोकल टेस्ट पास हों तभी आगे जाएँ। यह लाइव सेवाओं या Android का विकल्प नहीं है।
4. `PRIVACY_POLICY_DRAFT.md`, `TERMS_OF_USE_DRAFT.md`, `privacy.html`, `terms.html` में legal-name/contact/provider/refund placeholders पूरे करें और नीति की समीक्षा कराएँ। कोई `[ADD ...]` placeholder बचा हो तो लॉन्च रोकें।

## 2. Supabase

1. नया प्रोजेक्ट बनाएँ; `supabase/schema.sql` को SQL Editor में चलाएँ।
2. SQL Editor में `plans` का निरीक्षण करें। केवल `premium_test_30d` ₹1 Test Mode वाला plan होना चाहिए; Pro/Ultra का सक्रिय plan नहीं होना चाहिए।
3. Authentication में Email OTP चालू करें; Google OAuth callback और allowed redirect URLs सही configure करें।
4. असली disposable test account سے OTP/Google sign-in, session refresh, sign-out, account export और account deletion जाँचें। डिलीशन केवल test account पर करें।
5. Supabase service-role key केवल Worker secret में रखें; HTML, GitHub या ZIP में कभी न रखें।

## 3. Cloudflare Worker API

1. Cloudflare Workers में `wrangler.toml` के साथ `worker/worker.js` deploy करें (`npx wrangler login`, फिर `npx wrangler deploy --config wrangler.toml`) या Dashboard editor से करें। Worker settings में Supabase URL, anon key, service-role key और `ALLOWED_ORIGIN` (वेबसाइट का केवल origin, बिना path) सेट करें।
2. भुगतान परीक्षण के लिए केवल Razorpay `rzp_test_` key ID, test secret, test webhook secret और `PAYMENT_MODE=test` रखें। `PAYMENTS_ENABLED=true` केवल test setup के बाद करें। लाइव key स्वीकार नहीं है।
3. AI provider को चुने बिना `AI_ENABLED` बंद रखें। यदि बाद में enable करें, तो AI provider का privacy/data-retention, price और limits पढ़ें; URL, key और model Worker में रखें। `AI_API_KEY` frontend में न डालें।
4. Worker deploy के बाद `/api/ai`, `/api/orders`, `/api/verify`, `/api/account/export`, `/api/account/delete` के authenticated success/error cases test करें। Webhook signature और duplicate event को भी test करें।

## 4. Static site deploy (Cloudflare Pages recommended for `_headers`)

1. एक **preview/staging** site बनाएं; public production domain अभी न जोड़ें। Git-connected Cloudflare Pages में build command `mkdir -p dist && cp index.html privacy.html terms.html _headers manifest.webmanifest icon-192.png icon-512.png sw.js dist/` और output directory `dist` सेट करें। या Dashboard के Direct Upload में इन्हीं चार फ़ाइलों को publish करें।
2. `index.html` में `CFG` में केवल public Supabase URL, public anon key, Worker API base, test Razorpay key ID डालें। कोई secret key नहीं। `PAYMENTS_ENABLED` और `AI_ENABLED` default false रखें जब तक test steps पूरे न हों।
3. यदि custom API/Supabase domain हो तो `_headers` CSP के `connect-src` में उस exact HTTPS origin को जोड़ें। `connect-src https:` जैसी unrestricted wildcard वापिस न जोड़ें।
4. Deploy URL खोलें; HTTPS, redirects, status codes, CSP, security headers और browser console/network errors जाँचें। GitHub Pages `_headers` लागू नहीं करता—उस पर यह सुरक्षा नीति अपने-आप लागू नहीं होगी।

## 4A. Render Static Site response headers (required for the current live host)

Render Static Sites do **not** read the repository's `_headers` file. Configure the response headers in the Render Dashboard for the existing service:

1. Open **research-to-code → Settings → Headers** and add each rule for path `/*`.
2. Add `X-Frame-Options: DENY` and `Referrer-Policy: no-referrer`.
3. Add `Content-Security-Policy` with this value (single line):

```text
default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self' https://api.razorpay.com https://checkout.razorpay.com; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob: https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://checkout.razorpay.com; worker-src 'self' blob: https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; connect-src 'self' https://*.supabase.co https://*.workers.dev https://research-to-code-api.onrender.com https://api.razorpay.com https://checkout.razorpay.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; frame-src https://api.razorpay.com https://checkout.razorpay.com; font-src 'self' data:
```

4. Keep the existing `X-Content-Type-Options: nosniff` and HSTS rules; do not add duplicates. Save the rules, wait for the CDN update, then rerun the **Live deployment smoke test** workflow. A green code test does not substitute for this response-header check.

## 5. Android hard-condition smoke test

इनमें से हर कदम कम-से-कम एक साफ browser session और एक धीमे नेटवर्क पर जाँचें:

- PDF: वैध text PDF, scanned PDF, password PDF, गलत file extension, खाली/करप्ट PDF, 15 MB से बड़ी PDF, 100+ pages, बहुत बड़े page dimensions; नई PDF चुनते समय पुरानी PDF/OCR cancel होनी चाहिए।
- Compare: समान कोड, खाली पक्ष, CRLF/LF, 1,500 से अधिक lines, `<script>` जैसा text; कोड execute नहीं होना चाहिए और UI में HTML की तरह render नहीं होना चाहिए।
- Proof: सही tests, fail, syntax error, import error, no tests, timeout, stop, network failure, repeated run; source 100 KB और tests 50 KB की सीमाएँ। बहुत memory-intensive/untrusted code अभी भी browser को प्रभावित कर सकता है; इसे hardened sandbox न बताएं।
- Workspace: export/import valid backup, >1 MB backup, malformed JSON, hostile HTML in logs, missing/invalid fields; invalid import से मौजूदा workspace आधा overwrite नहीं होना चाहिए।
- OCR: पाँच पेज तक, cancellation, failed CDN/network, low-memory phone; failure के बाद दोबारा कोशिश हो सके।
- Account: OTP गलत/expired, resend cooldown, Google cancel, token expire, logout, export; deletion केवल disposable test account पर।
- Payments: test checkout success/cancel/fail, forged/incorrect signature, wrong order/amount/currency, duplicate webhook, delayed capture, refresh after payment. ग्राहक के असली पैसे नहीं लेने हैं।
- AI: consent unchecked, signed-out, provider disabled, provider timeout/429/500, invalid output, quota exhausted, oversized inputs; secret browser bundle/network logs में नहीं दिखना चाहिए।
- Plans: Free visible; Pro/Ultra disabled; किसी भी परिस्थिति में unavailable tier के लिए payment button नहीं होना चाहिए।

## 6. Launch acceptance criteria

**लॉन्च तभी विचार करें जब** (a) सभी लोकल टेस्ट पास हों, (b) ऊपर के सभी लागू staging tests का लिखित परिणाम हो, (c) कोई unresolved P0/P1 defect न हो, (d) Privacy/Terms पूरा हो, (e) security headers deployed response में सत्यापित हों, (f) support/refund/contact workflow मौजूद हो, (g) केवल वही plan charge करे जिसके सारे advertised features live और tested हों।

अभी live Supabase/Google/AI/Razorpay credentials और असली Android device इस workspace से जुड़े नहीं हैं, इसलिए ये live tests स्वतः पास नहीं माने जा सकते। Zero bugs की गारंटी कोई ईमानदार टेस्ट सूट नहीं दे सकता।


## अतिरिक्त अनिवार्य चेक — 29 अक्टूबर 2026
- [ ] Public deployment से पहले `DEMO_PREVIEW_BUILD=false` करें; preview demo को real authentication न समझें।
- [ ] Pro ₹599 / Ultra ₹1,299 को केवल प्रस्ताव मानें; actual AI model/provider pricing और usage bills से दुबारा गणना करें।
- [ ] Pro 50 और Ultra 200 AI requests/month quotas server-side enforce हों; अभी Worker Ultra के लिए अलग quota नहीं देता।
- [ ] Android Chrome पर कम-से-कम एक low-end phone और एक सामान्य phone पर tap, scroll, dark/light, PDF, code diff, tests और network-failure flows जाँचें।
- [ ] Razorpay test checkout, webhook signature, duplicate event, pending/failed payment, subscription cancellation/refund और entitlement expiry का live test पूरा करें।
