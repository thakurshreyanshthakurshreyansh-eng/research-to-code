# Research to Code — UX अपडेट (29 अक्टूबर 2026)

## इस अपडेट में
- हिंदी-प्रथम मोबाइल इंटरफेस और छोटा, 4-बटन नेविगेशन: होम, PDF, कोड, टेस्ट।
- होम स्क्रीन पर एक-टैप शॉर्टकट; AI, प्लान तुलना और अकाउंट वहीं से खुलते हैं।
- Free, Pro और Ultra के कार्ड अब होम पर दिखते हैं। Pro/Ultra स्पष्ट रूप से “जल्द/अभी चालू नहीं” हैं; पेमेंट जानबूझकर बंद है।
- सजावटी blur, भारी shadow, hover movement और tab animation हटाए/कम किए ताकि कमज़ोर मोबाइल पर UI का काम हल्का हो।
- थीम बटन अब सीधे Dark/Light के बीच बदलता है।
- साइन-अप बटन अब साफ़ बताता है कि लाइव अकाउंट क्यों नहीं बन सकता।

## वास्तविक साइन-अप अभी क्यों नहीं चलता?
इस पैकेज में `CFG.SUPABASE_URL`, `CFG.SUPABASE_ANON_KEY` और `CFG.API_BASE` खाली हैं। इसलिए कोई असली अकाउंट/OTP/Google login नहीं बनाया जा सकता। UI अब यह बात स्पष्ट बताता है और ईमेल को अनावश्यक रूप से नहीं माँगता। असली साइन-अप के लिए Supabase Auth, साइट URL/redirect allow-list और backend configuration को मालिक द्वारा सेटअप व टेस्ट करना ज़रूरी है। कोई fake local password/login नहीं जोड़ा गया है।

## टेस्ट
- `node tests/run-all.cjs`: सभी टेस्ट ग्रुप पास।
- `python -m pytest -q samples/ewma-anomaly-detection/test_solution.py`: 10 पास।
- Inline JavaScript syntax check पास; 139 IDs में कोई duplicate नहीं।

## सीमा
ये लोकल automated checks हैं। Android Chrome पर वास्तविक touch, scroll, memory और perceived lag की पुष्टि इस रन में नहीं हुई; डिवाइस पर जाँच ज़रूरी है। Pro/Ultra, AI, वास्तविक signup और payments अभी production-ready नहीं हैं।

## एकीकृत पेमेंट विकल्प (29 अक्टूबर 2026)
- अलग-अलग पेमेंट सिस्टम जोड़ने के बजाय मौजूदा backend के साथ एक ही Razorpay Checkout रखा गया है।
- UI में UPI ऐप/QR, डेबिट/क्रेडिट कार्ड, नेट बैंकिंग, वॉलेट, EMI और अनुमति/पात्रता-आधारित Pay Later श्रेणियाँ दिखाई जाती हैं।
- ये श्रेणियाँ हैं, हर merchant account पर सभी तरीके उपलब्ध होने की गारंटी नहीं। भुगतान default रूप से बंद है और live payment चालू नहीं किया गया।
- आधिकारिक संदर्भ: Razorpay payment gateway और payment methods docs.


## Login-first और भाषा चयन — नया सुधार
- शुरुआत अब अलग sign-in स्क्रीन से होती है; कॉन्फ़िगर की गई साइट पर ऐप साइन-इन के बिना नहीं खुलेगा। ईमेल OTP और Google sign-in Supabase Auth से जुड़ते हैं; कोई नकली पासवर्ड/अकाउंट नहीं बनाया गया।
- `file://` लोकल प्रीव्यू में “डेमो में प्रवेश करें” विकल्प है, ताकि बैकएंड कॉन्फ़िगरेशन के बिना लोकल PDF/कोड/टेस्ट फीचर्स जाँचे जा सकें। इससे असली अकाउंट नहीं बनता; AI और पेमेंट बंद रहते हैं।
- हिंदी/English selector पहले स्क्रीन और प्रवेश के बाद header दोनों में दिखता है। होम, प्रमुख शॉर्टकट और नेविगेशन के शब्द अनुवादित हैं; कुछ तकनीकी संदेश अब भी English में हैं।
- `data-go` क्लिक इवेंट अब delegation से हैंडल होता है, ताकि बाद में UI में जोड़े गए बटन भी नेविगेशन खोल सकें।
- Android file preview में JavaScript बंद हो सकता है; डाउनलोड की गई HTML को Chrome में खोलने का स्पष्ट निर्देश जोड़ा है।



## 29 अक्टूबर 2026 — स्मूदनेस और कीमत अपडेट
- थीम का पहला टैप अब OS की मौजूदा dark/light setting के उलट जाता है; पहले “system dark” होने पर टैप बेअसर लग सकता था।
- कमज़ोर Android फोन के लिए CSS में animation, transition, backdrop blur और बड़े shadows हटाए गए। असली डिवाइस पर speed test अभी बाकी है।
- backend सेट न होने पर demo entry preview viewers में भी दिखती है; यह असली login नहीं बनाती। Public launch से पहले `DEMO_PREVIEW_BUILD=false` करना अनिवार्य है।
- Pro ₹599/माह और Ultra ₹1,299/माह प्रस्तावित हैं। Margin assumptions `PRICING_MODEL_HI.md` में हैं। Pro/Ultra checkout अभी disabled है; Ultra quota और live payment lifecycle अभी लागू/टेस्ट नहीं हैं।
- अंतिम स्थानीय टेस्ट: 224 harness checks और 10 pytest checks पास; real Android/live services अभी verified नहीं हैं।
