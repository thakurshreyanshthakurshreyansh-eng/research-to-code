# Research to Code — मालिक के लिए आसान सेटअप

## अभी की स्थिति
यह प्रोजेक्ट अभी pre-launch candidate है। कुछ automated tests पास हैं, लेकिन इससे लाइव लॉगिन, AI, payments या production security प्रमाणित नहीं होते।

## पहले आपको सिर्फ यह करना है

### 1. GitHub में private repository बनाएं (Android फोन से)
1. Chrome में https://github.com/new खोलें और GitHub में sign in करें।
2. Repository name: `research-to-code` रखें।
3. **Private** चुनें।
4. README, .gitignore और license अपने-आप जोड़ने वाले विकल्प खाली छोड़ें (इस ZIP में फाइलें पहले से हैं)।
5. **Create repository** दबाएं।
6. बनी हुई repository का URL इस चैट में भेजें। कोई password या token न भेजें।

इस चैट के जुड़े GitHub connector में repository-create API उपलब्ध नहीं है और अभी कोई repository दिखाई नहीं दी, इसलिए ऊपर का एक कदम आपको करना होगा। Repository URL मिलने पर मैं उपलब्ध GitHub integration से फाइलें भेजने की कोशिश कर सकता हूँ; अगर अनुमति उपलब्ध न हुई तो साफ बताऊँगा।

### 2. Render
Repository बनने और code उसमें पहुंचने के बाद:
1. https://dashboard.render.com/static/new खोलें।
2. GitHub account connect करें और `research-to-code` चुनें।
3. Name: `research-to-code` (या उपलब्ध नाम), Branch: `main`.
4. Build Command: खाली या `echo "Static site: no build step"`.
5. Publish Directory: `.` (repository root).
6. Create Static Site दबाएं।
7. जो `onrender.com` URL बने, उसे चैट में भेजें ताकि अगली जाँच की जा सके।

Render account में `business's workspace` उपलब्ध दिखा, लेकिन repository न होने के कारण deployment अभी शुरू नहीं हो सका।

### 3. Supabase (अकाउंट मालिक के नियंत्रण में)
1. https://supabase.com खोलें और New project बनाएं। Database password निजी जगह सुरक्षित रखें।
2. SQL Editor में `supabase/schema.sql` की सामग्री खोलकर review करें और तभी Run करें।
3. Authentication में Email provider चालू करें; OTP template और Site URL/Redirect URL को deployed site URL से सेट करें।
4. Project Settings > API से Project URL और anon/publishable key लें। Public anon key को ही website config में इस्तेमाल किया जा सकता है; `service_role` key केवल server-side secret है।
5. Project URL और public anon key चैट में देने के बजाय जब तक संभव हो सीधे संबंधित सुरक्षित config fields में डालें। अगर किसी कदम में मदद चाहिए तो स्क्रीनशॉट भेजें—secret values छिपाकर।

### 4. AI Provider
1. अभी AI provider/model तय नहीं है। पहले provider की कीमत, privacy, retention और rate limits पढ़ें।
2. चुने गए provider की API key केवल server-side worker/secret settings में रखें।
3. `AI_ENABLED=true` तभी करें जब endpoint, model, key और quota tests तैयार हों।
4. पहले कम खर्च वाली test सीमा रखें। API key इस चैट या GitHub में न भेजें।

### 5. API Worker
Frontend को host करना API worker को deploy करने के बराबर नहीं है। `worker/worker.js` को compatible worker runtime पर अलग deploy करना होगा; फिर server-side variables/secrets और `index.html` के public config values जोड़ने होंगे। `SETUP.md` में चरण दिए गए हैं।

### 6. Razorpay — बाद में, केवल Test Mode
- अभी live payments चालू न करें।
- पहले test account/keys, webhook और ₹1 test plan के साथ end-to-end test करें।
- Live keys/charges तभी जब subscription lifecycle, refunds/cancellation, plan quotas, legal pages और security review पूरा हो। Secret key चैट में न भेजें।

## सुरक्षा
कभी भी GitHub token, password, OTP, AI secret key, Razorpay secret, या Supabase `service_role` key चैट में न दें। कोई service account connect करने के लिए यदि login/approval माँगे, तो approval आप स्वयं provider की आधिकारिक साइट पर करें।
