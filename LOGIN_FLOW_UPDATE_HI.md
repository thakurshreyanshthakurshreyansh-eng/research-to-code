# Research to Code — लॉगिन और भाषा अपडेट

## अब क्या बदला
- अब वेबसाइट पहले साइन-इन स्क्रीन दिखाती है। जब Supabase Auth कॉन्फ़िगर हो, ईमेल OTP या Google से सफल प्रवेश के बाद ही workspace खुलेगा।
- `file://` लोकल HTML preview में “डेमो में प्रवेश करें” दिखता है ताकि PDF, कोड तुलना और टेस्ट जैसे लोकल फीचर जाँचे जा सकें। यह असली अकाउंट नहीं बनाता।
- हिंदी/English चयन पहली स्क्रीन पर और प्रवेश के बाद header में दिखता है; प्रमुख होम टेक्स्ट/नेविगेशन अनुवादित हैं। कुछ तकनीकी strings अभी भी English में हैं।
- `data-go` बटनों के लिए delegated click routing जोड़ा और चार automated tests जोड़े: preview gate, demo unlock, language persistence, dynamic navigation.

## Android पर जाँचने का तरीका
1. HTML को डाउनलोड करो; ChatGPT/फ़ाइल-रीडर के अंदर खुले preview में क्लिक काम न करें तो उसे बंद करो।
2. फ़ाइल मैनेजर से HTML को Chrome में खोलो। Chrome यदि local HTML के scripts को नहीं चलाता/फाइल को preview में खोलता है, तो पूरे ZIP को hosting में deploy करके HTTPS URL से जाँचो।
3. पहले स्क्रीन पर हिंदी/English बदलो। स्थानीय HTML के लिए “डेमो में प्रवेश करें” दबाओ। फिर Home → PDF / Code / Tests बटन दबाकर जाँचो।
4. टेस्ट चलाने के लिए internet चाहिए क्योंकि Pyodide/pytest पहली बार CDN से डाउनलोड होते हैं। PDF text extraction भी PDF.js को डाउनलोड करता है।

## महत्वपूर्ण सीमा
- असली साइन-अप के लिए `CFG.SUPABASE_URL`, `CFG.SUPABASE_ANON_KEY`, Supabase Email OTP/OAuth और redirect URL सेट करना ज़रूरी है।
- AI व Razorpay भुगतान live/configured नहीं हैं। कोई API key या secret इस HTML में मत डालना; secrets backend में रखें।
- Automated tests pass हैं, लेकिन इस रन में Android Chrome का वास्तविक touch/speed test पूरा नहीं हो सका। इसे production-ready या bug-free न मानें।
