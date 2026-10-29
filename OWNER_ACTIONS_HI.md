# Research to Code — लॉन्च तैयारी (मालिक के लिए)

**स्थिति: अभी सार्वजनिक ग्राहक लॉन्च के लिए तैयार नहीं।** Frontend Render पर लाइव है और automated CI पास हुआ है। यह वास्तविक Supabase login, AI provider, Razorpay या Android-browser testing का प्रमाण नहीं है।

## इस रिपॉज़िटरी में तैयार
- Frontend source और Render build configuration.
- Cloudflare Worker API source (`worker/worker.js`) और `wrangler.toml`.
- Supabase schema/migrations (`supabase/schema.sql`) और row-level security policies.
- Automated tests and GitHub Actions.
- Privacy Policy/Terms drafts — कानूनी नाम, संपर्क और अनुपालन विवरण अभी भरने हैं.
- Payment/AI are disabled by default; payment build only accepts a Razorpay test key ID.

## शेष वास्तविक सेटअप
1. **Supabase:** project में `supabase/schema.sql` लागू करें; Email OTP configure करें; Site URL/redirect allowlist सेट करें; Google OAuth तभी चालू करें जब credentials तैयार हों.
2. **API service (already deployed):** [Render API dashboard](https://dashboard.render.com/web/srv-dbhld12jnfac73aab0a0). URL: `https://research-to-code-api.onrender.com`. `SUPABASE_URL` और `ALLOWED_ORIGIN` पहले से सेट हैं. यहाँ `SUPABASE_ANON_KEY` जोड़ें और `SUPABASE_SERVICE_ROLE_KEY` को Secret field में डालें. पहले [health endpoint](https://research-to-code-api.onrender.com/health) खोलकर liveness जाँचें.
3. **Frontend-to-API wiring:** केवल API service में दोनों Supabase keys सुरक्षित रूप से सेट करने के बाद Static Site environment में `API_BASE=https://research-to-code-api.onrender.com` जोड़ें. Frontend build command `python3 scripts/configure_site.py`, publish directory `.` ही रखें. Free API instance idle होने पर sleep कर सकता है.
4. **AI:** चुने गए provider की pricing/privacy जाँचकर `AI_API_URL`, `AI_API_KEY` (secret), `AI_MODEL` सेट करें. पहले low-cost quota/timeout tests करें. Credentials उपलब्ध होने तक `AI_ENABLED` बंद रखें.
5. **Payments:** Razorpay TEST credentials और webhook secret केवल Worker secrets में; `PAYMENT_MODE=test`; `PAYMENTS_ENABLED=true` सिर्फ तब जब schema लागू हो और test checkout end-to-end चलाया जा सके. कोई live key/charge नहीं.
6. **Security/browser:** Render response headers को deployed HTTPS response में verify करें; CSP, HSTS, frame protection, MIME sniffing/referrer policy जाँचें. Android Chrome में sign-in, PDF, code tests, AI consent, export/delete और responsive layout smoke-test करें.
7. **Legal/operations:** Privacy Policy और Terms में वास्तविक operator/legal identity, support email, retention/deletion, pricing, refund/cancellation, taxes और complaint process भरें; लागू कानून के अनुसार समीक्षा कराएँ.

## Launch gate
Public paid launch तब तक नहीं: जब तक सभी वास्तविक integrations staging में सफल न हों, no P0/P1 defects हों, security headers verify हों, backup/recovery/support process हो, और legal pages final न हों.

## सुरक्षा
कोई password, OTP, GitHub token, AI secret, Razorpay secret, database password या Supabase service-role key चैट में न भेजें. इन्हें केवल संबंधित provider के secret settings में डालें.

## नवीन लाइव जाँच से मिला अतिरिक्त आवश्यक काम

GitHub Actions ने वास्तविक Render frontend response पर ये headers पाए:
- मौजूद: `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`
- **नहीं मिले:** `Content-Security-Policy` response header, `X-Frame-Options`, `Referrer-Policy`

HTML meta CSP/referrer fallback मौजूद है, लेकिन meta CSP clickjacking के लिए `frame-ancestors` लागू नहीं कर सकती। इसे केवल कोड में जोड़ना पर्याप्त नहीं है। Render Dashboard में Static Site `research-to-code` → **Settings → Headers** में path `/*` के लिए ये rules जोड़ें:

1. `Content-Security-Policy` — मौजूदा `index.html` meta CSP की directives को response header में कॉपी करें और `frame-ancestors 'none'` जोड़ें। मौजूदा inline scripts, Pyodide/WASM, PDF.js, Supabase और Razorpay allowlist बनाए रखें; CSP बदलने के बाद browser tests दोबारा चलाएँ।
2. `X-Frame-Options` = `DENY`
3. `Referrer-Policy` = `no-referrer`
4. `X-Content-Type-Options` = `nosniff` (पहले से मौजूद है; duplicate rule न बनाएँ)
5. HSTS पहले से मौजूद है; दूसरा conflicting rule न जोड़ें।

नया live smoke test अब CSP, X-Frame-Options और Referrer-Policy response headers की अनुपस्थिति पर fail होगा, ताकि इसे गलती से launch-ready न माना जाए। Render dashboard header rules इस integration से सीधे बदलने का tool उपलब्ध नहीं है, इसलिए ये तीन rules dashboard में सेट करना अनिवार्य है। उसके बाद नया live smoke run पास होना चाहिए।

