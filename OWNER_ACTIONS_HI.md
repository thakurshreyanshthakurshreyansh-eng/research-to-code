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
2. **Cloudflare Worker:** `wrangler.toml` से deploy करें. Worker variables में `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ALLOWED_ORIGIN=https://research-to-code.onrender.com` सेट करें. `SUPABASE_SERVICE_ROLE_KEY` केवल Secret field में रखें. पहले `/health` जाँचें.
3. **Render:** `API_BASE` को वास्तविक Worker के `https://….workers.dev` origin पर सेट करें. `SUPABASE_URL` और `SUPABASE_ANON_KEY` की पुष्टि करें. Build command `python3 scripts/configure_site.py`, publish directory `.`.
4. **AI:** चुने गए provider की pricing/privacy जाँचकर `AI_API_URL`, `AI_API_KEY` (secret), `AI_MODEL` सेट करें. पहले low-cost quota/timeout tests करें. Credentials उपलब्ध होने तक `AI_ENABLED` बंद रखें.
5. **Payments:** Razorpay TEST credentials और webhook secret केवल Worker secrets में; `PAYMENT_MODE=test`; `PAYMENTS_ENABLED=true` सिर्फ तब जब schema लागू हो और test checkout end-to-end चलाया जा सके. कोई live key/charge नहीं.
6. **Security/browser:** Render response headers को deployed HTTPS response में verify करें; CSP, HSTS, frame protection, MIME sniffing/referrer policy जाँचें. Android Chrome में sign-in, PDF, code tests, AI consent, export/delete और responsive layout smoke-test करें.
7. **Legal/operations:** Privacy Policy और Terms में वास्तविक operator/legal identity, support email, retention/deletion, pricing, refund/cancellation, taxes और complaint process भरें; लागू कानून के अनुसार समीक्षा कराएँ.

## Launch gate
Public paid launch तब तक नहीं: जब तक सभी वास्तविक integrations staging में सफल न हों, no P0/P1 defects हों, security headers verify हों, backup/recovery/support process हो, और legal pages final न हों.

## सुरक्षा
कोई password, OTP, GitHub token, AI secret, Razorpay secret, database password या Supabase service-role key चैट में न भेजें. इन्हें केवल संबंधित provider के secret settings में डालें.