# Research to Code — प्रस्तावित मासिक कीमत का हिसाब

तारीख: 29 अक्टूबर 2026. यह एक **योजना-आधारित अनुमान** है, अकाउंटिंग/टैक्स सलाह या गारंटी नहीं। Pro/Ultra checkout अभी बंद है।

## प्रस्तावित कीमतें

- **Pro: ₹599/माह** — अधिकतम 50 AI requests/माह (प्रस्तावित)
- **Ultra: ₹1,299/माह** — अधिकतम 200 AI requests/माह (प्रस्तावित)

## अनुमान में क्या माना गया

- ग्राहक से ली गई कीमत में 18% GST शामिल माना गया। GST registration/actual tax treatment की पुष्टि CA से करें।
- USD conversion के लिए planning assumption ₹90/USD; वास्तविक बिलिंग दिन की दर अलग हो सकती है।
- Payment fee reserve: 3% + fee पर 18% GST. यह सामान्य 2% gateway fee के ऊपर recurring/subscription processing के लिए अतिरिक्त 1% का सावधानीपूर्ण budget है; Razorpay का वास्तविक merchant offer/fee अलग हो सकता है।
- API cost scenario: 5,500 input tokens और 1,800 output tokens प्रति request; API model scenario के लिए आधिकारिक OpenAI pricing page पर सूचीबद्ध GPT-6.1 Terra की standard दर $1 / 1M input tokens और $5 / 1M output tokens मानी गई। यह केवल लागत का scenario है; ऐप में यह मॉडल चुना या configure नहीं किया गया है।
- API spend reserve: Pro ₹150 प्रति subscriber/month; Ultra ₹300 प्रति subscriber/month. यह अनुमानित raw token cost से अधिक reserve है।
- Support/infrastructure allocation: Pro ₹75 और Ultra ₹150 प्रति subscriber/month.

## हिसाब

| मद | Pro | Ultra |
|---|---:|---:|
| ग्राहक कीमत (GST सहित) | ₹599.00 | ₹1,299.00 |
| GST निकालकर राजस्व (price ÷ 1.18) | ₹507.63 | ₹1,100.85 |
| Payment-fee reserve (price × 3% × 1.18) | ₹21.20 | ₹45.98 |
| API खर्च का बजट | ₹150.00 | ₹300.00 |
| Support/infra reserve | ₹75.00 | ₹150.00 |
| **अनुमानित contribution** | **₹261.42** | **₹604.86** |

Contribution का मतलब: ऊपर लिखे खर्चों के बाद, लेकिन income tax, ग्राहक लाने/विज्ञापन की लागत, refunds/chargebacks, टीम वेतन और साझा fixed costs से पहले। इसलिए वास्तविक लाभ कम हो सकता है। लक्ष्य ₹200/₹500 से ऊपर है, लेकिन यह तभी टिकेगा जब quotas और token limits लागू हों, usage logs हों, API spend alerts हों और वास्तविक bills से मॉडल की लागत जाँची जाए।

## ज़रूरी नियंत्रण लॉन्च से पहले

1. API input 22,000 characters तक और output 1,800 tokens तक सीमित है; request quota DB में atomic रूप से लागू हो।
2. Pro quota 50 और Ultra quota 200 लागू करने से पहले Worker/DB entitlement logic को plan-specific बनाना और tests लिखना होगा। मौजूदा Worker paid users को Premium 50 requests तक मानता है; इसलिए Ultra 200 **अभी लागू नहीं है**।
3. API provider/model चुने जाने के बाद उसकी वर्तमान official pricing verify करें और हर request के actual token usage को log करें (content नहीं)।
4. Razorpay की वास्तविक gateway + recurring fee, GST invoice, refund/chargeback लागत और merchant eligibility की पुष्टि करें।
5. Pro/Ultra की advertised features पूरी तरह implement और end-to-end test होने तक checkout disabled रहे।

## आधिकारिक स्रोत

- Razorpay Payment Gateway fees: https://razorpay.com/pricing/
- Razorpay Subscriptions fees and supported recurring methods: https://razorpay.com/subscriptions/
- OpenAI API pricing (यदि OpenAI चुना जाए): https://developers.openai.com/api/docs/pricing
- Supabase hosting/auth/database plan pricing: https://supabase.com/pricing
