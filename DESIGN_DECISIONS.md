# Research to Code — design and quality decisions

## Visual reference research (29 October 2026)

There is no objective single “world's most beautiful website”; aesthetics depend on audience and product. For a developer-focused tool, this revision uses design principles from Linear's official UI refresh article (12 March 2026): make the main task the visual focus, reduce noisy borders, use consistent navigation, and keep information density calm. This project does not copy Linear's assets or exact layout.

Official reference: https://linear.app/now/behind-the-latest-design-refresh

## Security verification reference

The pre-launch checklist is informed by OWASP Application Security Verification Standard (ASVS) 5.0.0, which provides security requirements for web applications and services. This project has not been certified against ASVS; this is a reference for checklist thinking only.

Official reference: https://asvs.owasp.org/

## Design choices implemented

- Responsive hero with a clear one-sentence product promise.
- Quiet navigation and reduced border contrast, with a floating mobile navigation bar and compact desktop navigation.
- Light/dark/system theme preference, reduced-motion support, touch-friendly controls and safe-area spacing.
- Device-local draft autosave for code, tests and extracted PDF text. AI output and run history are intentionally excluded from autosave. Manual workspace export can include them, so users should keep backups private.
- Installable PWA shell with same-origin static caching. It is not a fully offline application: external libraries and account/AI/payment APIs require internet.
- Privacy-safe diagnostic export excludes code, PDF text, account email, tokens and API secrets.

## Reliability principles

- Never show a test as passed unless a completed test run returns that result.
- Treat third-party integration simulations as simulations, not live verification.
- Keep Pro and Ultra disabled until their features, entitlements, billing lifecycle, and staging tests actually exist.
- Do not claim zero bugs. Use repeatable tests, staged rollouts, monitoring, support and rollback to reduce risk.


## Follow-up (29 Oct 2026)
- Avoided a direct clone of another SaaS product; used the general principle of predictable navigation, reduced visual clutter and consistent action placement described in Linear's 12 March 2026 design-refresh article.
- Removed expensive decorative motion/blur and made theme switching immediate to suit lower-powered Android devices.
- Pricing cards show proposed prices and explicitly disable purchase until real features, quotas and billing have been verified. See `PRICING_MODEL_HI.md`.
