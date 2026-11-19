# Wedding invitation and guest-camera plan

## Recommendation

Build a responsive website opened from a personal invitation link, with an optional home-screen shortcut later. Do not require an app-store download or a guest password. A guest opens the invitation, confirms their name, RSVPs, and receives a 24-shot camera. Hosts sign in; guests hold an invitation-scoped session. Each person should have an invitation if they need their own roll; a household invitation deliberately shares seats and a roll.

This follows established product patterns: [GUESTPIX](https://help.guestpix.com/article/153-start-here-welcome-to-guestpix) uses browser-based event galleries, [POV](https://pov.camera/use-cases/weddings) offers limited guest rolls and delayed reveal, and [WedPOV](https://wedpov.com/how-it-works) combines an invitation, RSVP, camera, and approved gallery. The public [photo-booth repository](https://github.com/kaungsetlin3013/photo-booth) demonstrates a mobile camera with Supabase; it is a reference, not an audited security foundation or code copied into this project.

## Status and boundaries

The SQL migration in `supabase/migrations/202611160001_wedding_foundation.sql` is a foundation for a future hosted backend. It is not applied to Supabase, and is not connected to the browser prototype. Its redemption, RSVP and photo-reservation functions are server-only. They do not implement a full upload pipeline, host dashboard, rate limiter, scheduled deletion, authorization provider, invitation distribution, or backup system. Do not describe local browser storage as a shared database or a confirmed RSVP to the couple.

The former `api/rsvp.js` used process memory and exposed guest data to unauthenticated GET requests. The rebuild now fails closed with HTTP 503 for every method. Replace that disabled route with authorized, persistent endpoints before sending real invitations.

## Hosting and data layout

Use Vercel for the frontend and same-origin API routes, and Supabase for Postgres, host Auth, and private object storage. Pick supported deployment regions near the Philippines after checking availability. Keep large uploads off Vercel functions: obtain a signed upload capability from the API, then upload directly to private Supabase Storage. Use the HTTP Data API for server database operations to avoid per-request database connections. The Supabase service secret stays exclusively in server environment variables; never embed it in JS, HTML, the repository, logs, or an exported settings file.

| Record | Purpose | Browser access |
| --- | --- | --- |
| `wedding_events` | Camera windows, reveal time, retention and gallery switch | Only safe fields returned by API |
| `wedding_hosts` | Explicit Supabase Auth user-ID allowlist per event | None directly |
| `wedding_invitations` | Guest label, hashed invitation token, seat and roll allocation | Current invitation projection only |
| `wedding_guest_sessions` | Hashed opaque session, expiry and revocation | HttpOnly cookie only |
| `wedding_rsvps` | One updateable attendance response per invitation | Own invitation only |
| `wedding_photos` | Object path, status, sizes, upload expiry and idempotency key | Own roll; approved gallery after reveal |
| `wedding_audit_log` | Host actions without raw tokens or guest messages | Hosts only |
| Private `wedding-photos` bucket | JPEG images | Scoped upload URLs and short-lived read URLs |
| Private `wedding-site-media` bucket | Replacement website photos | Host uploads; publish sanitized copies intentionally |

RLS is enabled on every app table and grants are revoked from `anon` and `authenticated`. There are intentionally no permissive guest policies. All access goes through an authorized Vercel API with the server-only role. RLS therefore prevents direct browser API access; it does **not** protect against a bug in a privileged server route. Every route needs its own authorization checks. Supabase documents [RLS behavior](https://supabase.com/docs/guides/database/postgres/row-level-security), including service-role bypass.

## Invitation and session flow

1. Host creates a guest or household invitation. Server generates 32 cryptographically random bytes, encodes them as base64url, and stores only the SHA-256 hexadecimal digest. Never use a guest name, phone number or sequential ID as the secret.
2. Share a link such as `https://<domain>/#invite=<token>`. The fragment avoids putting the token in ordinary server access logs and referrers. The browser immediately removes it with `history.replaceState`, then POSTs it in the request body. Do not include third-party analytics on this landing flow. Existing section hashes must preserve redemption before navigation.
3. The server rate-limits redemption using a shared durable limiter, validates Origin and token length/encoding, creates a new random session token, and calls `wedding_redeem_invitation` with both hashes. The transaction locks the invitation so concurrent redemptions cannot exceed its active-device limit.
4. Set `__Host-wedding-session` with `Secure; HttpOnly; SameSite=Lax; Path=/`; return only the guest label, party allocation, remaining roll count and safe event settings. Keep successful and failed private responses `Cache-Control: private, no-store`; never cache identity-bearing responses on the CDN.
5. Every request hashes and checks the session, its expiry/revocation, and invitation expiry/revocation. All mutations enforce the configured same-origin Origin and a session-bound CSRF token. No permissive CORS. Use constant-shaped public errors for invalid tokens, never log request tokens, and redact cookies and authorization headers.
6. Repeat opens on a recognized device reuse its session before redeeming. New devices share the invitation's single server-enforced quota. The default is three active devices; hosts may revoke a lost session. Forwarding a secret invitation grants its access: communicate that limitation and provide rotation/revocation. A shared table QR should lead to an invitation lookup/help screen, not expose all guests or bypass private access.

Supabase [anonymous sign-in](https://supabase.com/docs/guides/auth/auth-anonymous) is a valid alternative, but creates Auth users and adds CAPTCHA, cleanup and shared-venue IP-limit considerations. An opaque invitation session avoids asking guests for accounts while still supporting authorization. The current SQL uses that choice; do not mix in anonymous signup without revisiting the authorization design.

## Disposable camera and upload flow

The invited guest can see their camera entitlement immediately. Actual capture follows the configured wedding window. Suggested defaults: December 19, 2026 at 8:00 AM to December 20 at noon, Asia/Manila; gallery reveal December 20 at noon. These are product defaults to confirm with the couple, not hard-coded assumptions. Device clock changes must not unlock capture or reveal.

1. Ask camera permission only after the guest taps the camera action. Use HTTPS (or localhost during development), stop tracks when the dialog closes, and offer the native file/camera picker when live-camera permission is denied. Explain browser/device failures without claiming a photo was saved.
2. Encode a JPEG at up to 2,400 px on its longest edge and target roughly 1 MB, under a 6 MiB hard cap. Browser re-encoding reduces metadata but the server must also decode/re-encode before publication to strip EXIF/GPS and verify content. Enforce a pixel cap to avoid decompression bombs. Do not trust MIME or filenames. Handle unsupported HEIC explicitly rather than uploading an unreadable file.
3. Save the pending JPEG and a stable client UUID to IndexedDB before upload. Display pending/saved/failed separately; browser storage can be evicted and is not a backup. Retry on foreground reconnect with bounded backoff. Do not promise background sync on every mobile browser. Warn before discarding pending shots and provide individual downloads for recovery.
4. POST the client UUID to `/api/photos/reserve`. The server checks authorization/rate limits and calls `wedding_reserve_photo`. That function locks the invitation, checks the server-time camera window, enforces the shared roll limit and returns the same row for repeated IDs. This prevents parallel tabs/devices and retries consuming extra shots.
5. Server signs exactly the returned object path with overwrite disabled. Standard Supabase signed upload URLs are currently valid for [two hours](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl); the migration reserves a slot for two hours plus five minutes. Do not claim a 10-minute upload token unless using a different mechanism. Never expose unrestricted bucket writes or user-supplied object paths.
6. Upload directly to Storage. POST the photo ID to a finalize route. It verifies session ownership, reservation status/deadline, actual object size/type, and content, then re-encodes and marks the photo `stored`. Use a durable processing job if work exceeds a function budget. Finalization must lock the invitation/row and be idempotent; it must not resurrect expired/rejected/deleted records. Only mark saved after finalization succeeds.
7. Hosts approve photos. Gallery APIs require a valid guest session, `gallery_enabled`, server time >= `reveal_at`, and state `approved`. They return bounded pages of short-lived signed URLs and thumbnails, never guest contact/dietary data or all original images at once. Use approximately five-minute read URLs. Already issued URLs remain capabilities until they expire.
8. A rejected or host-deleted uploaded shot still consumes a roll slot; an expired, never-finalized reservation does not. Retrying an expired client UUID returns its expired record: the client must explicitly create a new attempt UUID after informing the guest. Cleanup deletes abandoned objects after the signed URL lifetime plus a safety margin; a late upload to an expired reservation remains invisible and is swept again. Deleting metadata alone does not delete storage bytes.

The migration handles reservation/redeem concurrency, but finalize/processing/cleanup routes remain to be implemented and integration-tested. Standard uploads are appropriate for files under [6 MB](https://supabase.com/docs/guides/storage/uploads/standard-uploads); resumable upload can be added later if retaining larger originals becomes necessary. Video is outside the initial scope.

## API contract to implement

| Endpoint | Authorization | Behavior |
| --- | --- | --- |
| `POST /api/invitations/redeem` | Token + limiter + same Origin | Set opaque guest cookie; safe invitation response |
| `GET /api/session` | Guest session | Own invitation, RSVP and roll summary |
| `PUT /api/rsvp` | Session + CSRF | Use `wedding_save_rsvp`; enforce allocated seats, validated fields |
| `POST /api/photos/reserve` | Session + CSRF + limiter | Atomic quota reservation; signed upload capability |
| `POST /api/photos/:id/finalize` | Owner session + CSRF | Verify/process object; idempotent confirmation |
| `GET /api/photos` | Session | Own roll only; bounded projection |
| `GET /api/gallery` | Session + reveal checks | Approved photos with expiring read URLs |
| `POST /api/logout` | Session + CSRF | Revoke session and clear cookie |
| `/api/host/*` | Verified host + CSRF where relevant | Invite management, RSVPs, media, approval, export and deletion |

Never allow anonymous GET of the RSVP collection. Validate and bound text, reject unknown attendance values, and enforce invitation seat limits in both API and database. Guests may edit their own household response; timestamps record the last update. Display dietary information only to hosts. A future RSVP deadline can be added as an event setting and enforced in the RPC.

## Host access and photo replacement

Use Supabase Auth email magic links or Google sign-in for Paul and Roselyn. Verify the current access token server-side and check `wedding_hosts` by verified `user_id` and event. Email address, user-editable metadata, a hidden URL, a client-side switch, or knowing the public Supabase key must never grant host access. Provision the first host out of band through a trusted migration/dashboard operation; the browser cannot add itself.

Local developer photo settings now save replacements under `public/content` on D: for the next static build. They do not publish images to other guests until that build is deployed. Hosted settings need authenticated uploads, crop/alt-text controls, versioned asset paths, confirmation of successful persistence, and audit records. Keep published wedding imagery separate from the private guest-photo archive. Do not mark replaceable filenames immutable for a year unless their URLs are versioned.

## Minimal data and retention

Store a guest label, allocated seats, RSVP, optional dietary note/message, token/session hashes, and sanitized photos. Do not require phone, email, birthday, social login, location or contacts from guests. A host may retain a separate private address book outside this app. Show a short plain-language notice before capture: the couple receives the photo, who can view it after reveal, planned deletion date, and how to request removal. Provide a host contact mechanism and moderation tools. Avoid analytics/session-replay SDKs on private guest pages.

Proposed retention, to confirm before sending invitations: expire invitation access and purge RSVP dietary/contact-like notes 90 days after the event; retain the private photo gallery for 180 days, with a clear end date. Export originals plus metadata for the couple before deletion. Purge both objects and database rows through a retriable scheduled job with a dry-run report and per-item deletion tracking. Audit records should omit raw personal content. Keep operational request logs short and redacted. Do not silently delete the couple's only copy.

Supabase database backups [exclude Storage object contents](https://supabase.com/docs/guides/platform/backups). Arrange a separate private object backup/export and test restoring it. Document how deletion requests age out of backups; do not promise instantaneous deletion from historical backups. This is a product handling plan, not a legal compliance determination.

## Scale and reliability budget

Planning scenario, not a benchmark: 300 guests × 24 shots = 7,200 images. At 1 MB each, allow about 7.2 GB of image payload plus thumbnails, processing copies, and backup capacity (budget 10–15 GB for the active set). At the 6 MiB worst-case cap, 7,200 uploads can exceed 45 GB. Gallery egress may exceed stored volume when many guests browse; pagination, 320/640 px thumbnails, lazy loading and explicit original downloads matter more than database row count.

The static invitation should ship optimized images and avoid loading the gallery until requested. Fifty simultaneous 1 MB uploads are about 50 MB in flight; direct Storage upload keeps them away from Vercel body limits. Add shared per-session and per-IP rate limits, recognizing many guests share venue Wi-Fi. Do not keep quotas or limits in process memory. Start without realtime subscriptions; bounded foreground polling is enough for processing status. Use a unique `(invitation_id, client_id)` key and invitation row locks for consistency. Check current Supabase/Vercel plan storage, egress, function and image-processing limits before choosing a paid tier; no price or capacity guarantee is implied here.

Before wedding day, run an authorized staging load test for expected concurrency, network interruption and cross-device retries. Monitor upload/finalization errors, storage consumption and quota rejections without exposing private payloads. Export the RSVP list and prepare printed/table camera QR instructions and a manual contact fallback. Keep a runbook for restoring data, rotating a leaked invitation, disabling uploads and privately exporting all photos.

## Connection and release sequence

1. Finish and test the local design and flows. Clearly distinguish local demonstration saves from hosted persistence.
2. Connect the user's Supabase account through an available provider authorization flow or dashboard session; create a project only after the account is selected. Do not fabricate an OAuth authorization URL or ask for a service key in chat. Supabase's [project dashboard](https://supabase.com/dashboard) is the manual starting point if a connector cannot provision it.
3. Apply and test the migration in a nonproduction project, configure Auth redirect allowlists and host accounts, then implement the API contract, processing, limiter, cleanup and exports. Run database-role tests and verify no public RSVP, invite, session, or bucket access.
4. Connect Vercel only after the complete app passes staging checks; set server secrets with the provider's secure environment settings. Preview and production must use separate data/projects. Never let a public preview share real guest data.
5. Test real iOS Safari and Android Chrome camera/permission behavior, invitation links in Messenger/Viber in-app browsers, denied permissions, unsupported files, full storage, retries, multiple tabs/devices, full rolls, expired/revoked links, response edits, host authorization, gallery timing and accessibility. Desktop browser emulation cannot prove physical camera compatibility.
6. Deploy to Vercel, verify HTTPS/cookies/headers and a real persisted RSVP/photo end to end, then distribute invitations. Sending messages is a separate explicitly authorized action.

## Required database and integration checks

The foundation must pass: application of the migration in an empty Supabase-compatible database; denial of table and RPC access as `anon`/`authenticated`; service-role redemption of valid invitations; invalid/expired/revoked invitation rejection; concurrent redemption device cap; concurrent reservations at a 24-photo limit; stable idempotent retry; expired reservation release; rejected/deleted photos still consuming quota; server-time camera window enforcement; own-invitation RSVP update and seat-limit rejection. Full Supabase Storage/Auth integration and the remaining server routes require a real staging project before release.

Local verification completed November 16, 2026 with PostgreSQL 17.2 and stub Supabase platform schemas/roles: the migration applied successfully, and `supabase/tests/foundation.sql` passed its permission, redemption/device-cap, quota/idempotency, expired-slot, deletion-quota, RSVP/allocation, closed-camera and revoked-invitation assertions. Two additional local `pgbench` runs used 24 clients and 72 attempts each: a two-shot quota produced exactly two rows, and a one-device invitation produced exactly one session. Expected full-roll/device-limit rejections were handled by test wrappers; these figures verify consistency, not cloud performance. The isolated local test server was stopped after checks. No production project, account, migration, or deployment was changed. Invalid session, expired invitation, and real Auth/Storage end-to-end cases still belong in the staging release suite.


## Capture-only product update

The guest camera is now capture-only: no file picker, camera-roll import, individual deletion or retake. The browser UI shows numbered exposed frames and hides photos until the local preview reveal (20 December 2026, noon Asia/Manila). An atomic IndexedDB transaction maintains a per-device 24-exposure ledger even if individual photo objects disappear. Full-roll UI stops the camera. Host photo replacement remains available separately.

This changes the earlier file-picker fallback: when permission is denied or a camera is unavailable, guests get instructions to allow the camera or open the invitation on a supported phone. Do not reintroduce photo-library imports as a fallback. Keep privacy export and erasure available.

The preview now uses the server clock described below; local data can still be reset/inspected. Production requires server-side reveal authorization and invitation-scoped quotas; local concealment is not a security boundary. Capture-only is a UX constraint, not cryptographic proof that bytes originated from a physical camera. Signed background transfer of captured frames to private Storage remains necessary; “no uploads” here means no guest-selected file imports.

## Wedding-day camera window

`shared/event-window.mjs` is the canonical schedule: capture starts 19 December 2026 at 00:00 Asia/Manila and ends at 20 December 00:00, exclusively. Reveal starts 20 December at 12:00. The read-only `/api/event-status` endpoint uses host server time, never a date supplied by the request, and disables caching. Vite mirrors this route locally; Vercel uses the serverless handler.

The browser anchors server epoch to `performance.now()`, refreshes every 30 seconds while visible, and rejects anchors older than 90 seconds. It rechecks on entry, camera enable, each exposure and foreground return. Invalid/unreachable time fails closed. Before opening and after closing, the camera dialog and permission request are unavailable; only the date card is shown. At closure an active stream stops. Developed photos use a separate viewer so capture stays closed after the wedding. The header camera icon appears only during capture hours.

This prevents accidental access and device wall-clock changes through the supported UI; it does not secure IndexedDB against inspection or altered client code. Production capture reservation/finalization and signed media retrieval must independently enforce the same schedule, guest session, quota and reveal rules. Account provisioning, shared storage and those routes remain unconnected.
