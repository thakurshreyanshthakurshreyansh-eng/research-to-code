# Research to Code

Phone-first web app prototype for turning research/PDF tasks into coding workspaces.

## Current status

This repository is a **pre-launch candidate**, not a production-ready paid service. Login/database, AI provider, safe server-side code execution, payments, and live mobile/browser verification require owner setup and end-to-end testing. Do not enable live payments.

## Quick local preview

Open `index.html` in a modern browser. If the browser's file preview disables JavaScript, download the project and open the file in Chrome. Demo mode is for preview only and does not represent real authentication, AI, or payments.

## Project map

- `index.html` — mobile-first web app and public configuration block
- `worker/worker.js` — API worker source
- `supabase/schema.sql` — database schema
- `privacy.html`, `terms.html` — draft policy pages; review and replace placeholders before public launch
- `tests/` — automated test suite
- `DEPLOYMENT_CHECKLIST_HI.md` — release gate/runbook in Hindi
- `OWNER_ACTIONS_HI.md` — owner setup checklist in Hindi

## Deployment notes

- Use Render Static Site for the frontend after this repository is connected.
- A static-site host alone does not run `worker/worker.js`; deploy the API separately to a compatible worker runtime.
- Keep all secret keys in server-side secret settings only. Never commit API keys, service-role keys, passwords, or payment secrets.
- The Cloudflare Pages `_headers` file is not automatically applied by Render. A meta CSP fallback is present, but configure and verify response security headers in Render before any public customer launch.
- Set `DEMO_PREVIEW_BUILD=false` before public launch.
- Keep payment mode disabled until the complete test-mode flow and all legal/operational requirements are verified.

See `OWNER_ACTIONS_HI.md` and `SETUP.md` before configuring external services.
