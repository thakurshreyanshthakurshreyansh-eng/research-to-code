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

## Live security-header blocker और इसे ठीक करने का verified तरीका

Latest live smoke run में frontend response से ये headers गायब मिले:
- मौजूद: `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`
- गायब: `Content-Security-Policy`, `X-Frame-Options`, `Referrer-Policy`

Meta CSP, HTTP response CSP का विकल्प नहीं है; विशेष रूप से meta tag `frame-ancestors` लागू नहीं कर सकता। इसलिए live smoke test इन headers के बिना fail ही रहना चाहिए।

### Preferred: repository workflow से safely configure करें
1. GitHub repository → **Settings → Secrets and variables → Actions** में `RENDER_API_KEY` नाम का repository secret बनाएँ। इस API key में frontend Render service के response-header rules पढ़ने/बदलने की अनुमति होनी चाहिए। Key को commit, workflow file या chat में न लिखें।
2. **Actions → Configure Render security headers → Run workflow** खोलें और confirmation में `APPLY` लिखें।
3. Workflow मौजूदा Render header rules पढ़ता है, unrelated rules बचाते हुए तीन आवश्यक rules set करता है, फिर Render API से configuration को दोबारा पढ़कर verify करता है। पहले confirmation के बिना production बदलाव नहीं होता।
4. अंत में workflow वास्तविक live frontend और API response पर `tests/live-smoke.mjs` चलाता है। Workflow green होने के बाद ही response headers को verified मानें।

यदि Render API key या उसकी अनुमति उपलब्ध नहीं है, तो वैकल्पिक रास्ता Render Dashboard → Static Site `research-to-code` → **Settings → Headers** में path `/*` के लिए नीचे दिए headers manually जोड़ना है:
- `Content-Security-Policy` — मौजूदा application directives बनाए रखें और `frame-ancestors 'none'` शामिल करें। repository workflow की policy वही है जिसे automated path लागू करता है।
- `X-Frame-Options: DENY`
- `Referrer-Policy: no-referrer`

`X-Content-Type-Options: nosniff` और HSTS पहले से live response में दिखे थे; इन्हें duplicate या conflicting rules से न बदलें। Manual changes के बाद **Actions → Live deployment smoke test → Run workflow** चलाएँ।

यह configuration step अभी पूरा मानकर न चलें: live smoke pass होने तक PUBLIC LAUNCH BLOCKED रहेगा। Supabase migration, real auth/quota, AI provider configuration, Android-device validation और privacy/terms placeholders भी अलग release gates हैं।
