# Vercel deployment

This revision can be hosted as an invitation preview. The shared RSVP service, guest authentication and cloud photo storage are not connected. Do not distribute it as the finished guest system until the production integration in `architecture.md` is complete.

## Import from GitHub

1. Open https://vercel.com/new and import `camown/paul-and-roselyn-wedding`.
2. Select the prepared `codex/vercel-ready` branch for this revision. The repository's `master` branch still contains the older website. In an existing project, use a preview deployment for this branch; merge it into the production branch when ready.
3. Leave Root Directory at the repository root (`./`). Use the Vite preset, Node.js 22.x, install command `npm ci`, build command `npm run build`, and output directory `dist`. These are declared in `package.json` and `vercel.json`.
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to Preview and Production before building. Use `https://vmstqqfmwkisyzwrlftw.supabase.co` and the project's publishable key. These replace the `NEXT_PUBLIC_` names from the Next.js quickstart. Rebuild/redeploy after changing them: Vite embeds public values at build time. An invitation-only preview can still build without either variable; supplying only one or a non-publishable key fails the build. Never expose service-role/secret credentials with a `VITE_` prefix.
5. Enable Vercel Deployment Protection for previews if available for your account. The invitation reveal is visual presentation, not authentication.
6. Deploy, then run the checks below. Connecting GitHub can enable automatic deployments on future pushes; check the selected production branch first.

The deployment uses Vercel's standard Vite build and Node.js functions in `api/`. Do not deploy only `dist/` to a static host: the camera requires the server clock endpoint. Do not add a blanket rewrite to `index.html`; missing API routes must remain errors.

## Deployment checks

- Open the landing on phone and desktop. The sealed opening must land on the invitation card at the top; test footer replay and Escape too. Test the menu, RSVP preview, calendar and gallery (including opening photos, previous/next, keyboard and touch swipe).
- `GET /api/event-status` must return JSON with `serverNow`, the fixed schedule and `Cache-Control: private, no-store`. Before 19 December 2026 Philippine time, the phase must be `scheduled`; the header camera icon is hidden, and camera permission is never requested. `POST` returns 405.
- `/api/rsvp` deliberately returns 503 until durable guest-scoped storage is configured. An RSVP saved in this revision is only a device-local preview; it is not delivered to the couple.
- Camera capture is available only from 19 December 00:00 to 20 December 00:00 Asia/Manila; developed viewing starts 20 December at noon. Browser-local photos and limits remain a demonstration, not secure cloud authorization.
- `/__dev/photos`, `/pictures/`, `/docs/`, `/.env`, and arbitrary nonexistent API paths must not expose source, originals or editor endpoints. The local Photos control and `/?photos=edit` shortcut are development-only. Opening album extras are published from `public/content/photos.json` with the next build; adding them locally does not instantly upload them to Vercel.
- Hashed `/assets/` files may cache for one year. `/content/` photo overrides revalidate; API responses never cache. Verify HTTPS and the configured security headers.

## Local verification

Run `npm ci --cache D:\npm-cache`, `npm run check`, and `npm run test:browser`. The last command uses the D: browser cache on Windows; on other platforms it uses Playwright's normal cache unless `PLAYWRIGHT_BROWSERS_PATH` is set. `npm run preview` is a static inspection server and does not run Vercel functions.

Local builds and tests do not prove that Vercel has built and served the functions. Final deployment verification requires the actual preview URL. Nothing in this preparation creates a Vercel project, adds a domain or publishes the site.

The Supabase browser client is initialized with persistent host sessions and automatic token refresh; it does not sign guests up, enable OTP, write RSVPs or upload photos. Next.js `@supabase/ssr` middleware does not apply to this Vite application. The publishable connection is configured locally in ignored `.env.local`, and `npm run supabase:check` makes only a read-only Auth settings request. The database migration and private server routes remain unconnected.

References: [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite), [project configuration](https://vercel.com/docs/project-configuration/vercel-json), and [Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).
