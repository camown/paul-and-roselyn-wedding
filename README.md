# Paul & Roselyn · wedding invitation

A locally rebuilt, responsive invitation for **19 December 2026**, 9 AM at Imus Cathedral, with reception 11 AM–2 PM at Nathan’s Catering & Events Services, Imus.

## Run on D:

From `D:\paul-and-roselyn-wedding`:

```powershell
npm install --cache D:\npm-cache
npm run dev
```

Open http://127.0.0.1:3000. Run `npm run build` followed by `npm test` for the production build and integration checks. `npm run preview` serves the built version at http://127.0.0.1:4173.

Browser interaction checks use isolated test data and mocked event times, with no public date override:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH='D:\wedding-browser-cache'
npx playwright install chromium
npm run test:browser
```

The Vite development server provides `/api/event-status`; Vercel will use `api/event-status.js`. The static-only `npm run preview` server has no API, so its camera stays locked.

## Implemented locally

- Coordinated rust silk and embossed floral stationery across the entire invitation, self-hosted Bodoni Moda / Italianno / DM Sans, responsive layouts and native dialogs.
- Wedding schedule, Google Maps/Waze links, downloadable calendar invitation, dress palette and photo lightboxes.
- Editable **preview** RSVP stored in IndexedDB; acceptance, decline and seat selection. This is not delivered to the couple.
- Capture-only disposable camera: 24 exposures, compressed JPEGs, no library imports, retakes or individual deletion. Capture opens only on 19 December 2026, midnight to midnight Philippine time. Server time anchors the UI and local write guard; stale or unavailable time keeps capture locked. Frames stay concealed until 20 December at noon Philippine time in a separate viewer. No photo is sent to a cloud service.
- Privacy controls export/delete this browser’s preview data. Exports contain ordinary JPEG files and a JSON manifest in a ZIP archive.
- Development photo settings: use the gear icon in the footer. Replace cover, story and three gallery images. Changes persist under `public/content` on D: and ship with the next build. Restore controls revert individual slots. This editor is loopback development tooling, not a production admin login.

Real iOS/Android camera compatibility must be verified before invitations are sent. Browser storage can be evicted; it is not a backup. The local 24-shot demonstration is not a secure cross-device quota.

## Planned production system

Vercel import settings and post-deployment checks are in [the deployment guide](docs/vercel-deployment.md). `npm run check` builds and runs the unit/integration suite; GitHub Actions additionally runs the browser checks. The current revision is deployable as a preview; the guest data system still needs the integration below.

See [architecture](docs/architecture.md), [design research](docs/design-research.md) and [QA](docs/qa-results.md). The Supabase migration and database checks are under `supabase/`.

Recommended: private invitation links, invisible guest sessions, host sign-in, invitation seat limits, server-enforced 24-shot rolls, private Supabase Storage, moderated delayed album, and explicit export/retention. Vercel hosts the frontend and server APIs. No guest app or password is required.

**The guest data backend is not connected.** The public Supabase browser client is configured for project `vmstqqfmwkisyzwrlftw` in ignored `.env.local`; run `npm run supabase:check` for a read-only connection check. Vercel needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (see `.env.example`), rather than the Next.js quickstart's `NEXT_PUBLIC_` names. The client supports host-session persistence/refresh but does not create accounts or send guest data. Host login/dashboard, invitation provisioning/redemption, durable RSVPs, signed uploads, media processing, moderation, rate limiting and cleanup remain production integration work. The old public/in-memory RSVP endpoint fails closed with HTTP 503, instead of exposing guest information or claiming saves.

The user has created a Supabase project and authenticated the Codex MCP connection; the schema has not yet been migrated, and nothing has been deployed to Vercel by this agent. Do not put service secrets in frontend code or chat. Review the staged release gates in the architecture document before distribution.

## Project layout

- `index.html`: invitation content and dialog markup
- `assets/css/style.css`: responsive design tokens and layout
- `assets/js/main.js`: local guest interactions and development editor
- `vite.config.mjs`: development-only photo write endpoint
- `api/rsvp.js`: disabled legacy serverless route
- `supabase/migrations`: unconnected production database foundation
- `supabase/tests`: local PostgreSQL foundation verification
- `tests/app.test.mjs`: fail-closed route, editor and build integration checks
- `vercel.json`: future Vercel build and security header configuration

The original enhanced HTML and unused image assets remain as source references; they are not entry points in the Vite build. Dependencies, build outputs and npm cache are on D:.
