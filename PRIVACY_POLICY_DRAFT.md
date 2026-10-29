# Research to Code — Privacy Policy Draft

**Draft only. Do not publish until reviewed and the placeholders are completed.**

Last updated: 29 October 2026

## Operator
Operator/legal entity: [ADD LEGAL NAME]
Contact email: [ADD SUPPORT EMAIL]
Jurisdiction/address: [ADD REQUIRED BUSINESS DETAILS]

## Data handled
- Account email and Google identity fields supplied through Supabase authentication.
- Payment/order metadata processed through Razorpay and stored in Supabase. Do not store full card/UPI credentials.
- When a user explicitly invokes AI Lab, selected extracted PDF text or code is sent to the configured AI provider. The original PDF file is not uploaded by this feature.
- AI request metadata (user ID, feature, input character count, timestamp) is stored to enforce monthly limits; AI prompt/output content is not stored by this app by default. Provider retention rules may differ and must be disclosed after a provider is selected.
- PDF reading, OCR and Python tests run in the browser, though required libraries are downloaded from third-party CDNs.

## Purposes and providers
Data is used to provide authentication, AI responses when requested, quota enforcement, payment verification, fraud prevention and support. Providers may include Supabase, Google OAuth, Cloudflare, Razorpay and a yet-to-be-selected AI API provider. The provider list and their policies must be reviewed before launch.

## Retention, deletion and rights
Retention periods, grievance contact and applicable rights must be finalized by the operator before launch. An authenticated account export endpoint returns app-held order, current entitlement and AI-usage metadata (bounded to up to 1,000 orders and 5,000 usage rows). An account deletion action deletes the Supabase auth user and linked app rows after explicit confirmation. It does not automatically refund a payment or delete records retained by Razorpay, Google, email, hosting/CDN or AI providers. The operator must verify the actual retention/deletion behavior of every configured provider. Contact [ADD SUPPORT EMAIL] for requests in the interim.

## Security and changes
Secrets must remain server-side. No online service can guarantee perfect security. This draft must be reviewed for applicable Indian data-protection, consumer, tax and payment requirements before public launch.
