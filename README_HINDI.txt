RESEARCH TO CODE — PRE-LAUNCH CANDIDATE
Updated: 29 October 2026

यह पूरा source package है, live website URL नहीं। इसे अभी सार्वजनिक रूप से launch-ready न मानें।

लोकल automated tests:
- 190 checks पास (logic, page flow, account/payment UI, integration, simulated Worker/database/payment/AI, static audit)
- नमूना EWMA समस्या: 10/10 pytest tests पास
- जानबूझकर buggy code: 5 tests fail, जिससे test suite की bug पकड़ने की क्षमता verify हुई
- JavaScript syntax checks और HTML parse/duplicate-ID checks पास

अभी भी live/real-device verification बाकी:
- Supabase SQL migration, OAuth/email OTP, account export/delete असली test account पर
- AI provider configured नहीं है; AI Lab अभी live response नहीं देगा
- Razorpay केवल simulated tests में; live payments blocked हैं
- Chromium इस environment में trivial local page पर भी hang हुआ; Android browser/OCR/Pyodide की असली UI जाँच बाकी
- Privacy/Terms में operator/contact/legal details placeholders हैं
- CSP अब known host patterns तक सीमित है, फिर भी inline scripts/WASM के कारण strict नहीं; chosen host/custom domains पर verify करना है
- Pro और Ultra केवल planned/disabled हैं; उनके checkout/entitlements नहीं हैं
- Cloud history, hardened server-side sandbox, GitHub PR export, auto-renewal/refund/cancellation automation और support workflow अभी नहीं बने

स्थानीय टेस्ट चलाने के लिए Node.js 20+:
  node tests/run-all.cjs

नमूना समस्या:
  samples/ewma-anomaly-detection/PROBLEM_HINDI.txt
  buggy_code.py, solution.py, test_solution.py

Cloudflare Pages के लिए `_headers` शामिल है। Deploy करने से पहले `DEPLOYMENT_CHECKLIST_HI.md` को पूरा करें; वर्तमान निर्णय PUBLIC LAUNCH BLOCKED है। GitHub Pages `_headers` लागू नहीं करता। किसी भी secret/API key को index.html, GitHub या ChatGPT में न डालें। पहले disposable test account और test-mode services से जाँच करें।
