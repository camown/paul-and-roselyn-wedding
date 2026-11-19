# Local QA results · 16 November 2026

The rebuild is a working local preview plus a production database foundation. It is not ready to send as a live invitation. No Vercel deployment or live Supabase connection was made.

## Automated checks

- `npm run build`: passed. Static output under `dist`, with hashed default photographs and approximately 10 KB gzipped application JavaScript.
- `npm test`: 5 tests passed. Checked ICS UTC+8 timing, escaping and line folding; ZIP recovery of original photo bytes and optional reply; fail-closed legacy RSVP API; development upload origin/slot/type checks and disk persistence; bundled assets and exclusion of development write behavior.
- Dependency audit after removing unused Jimp: zero reported vulnerabilities. Production audit also reported zero.
- `git diff --check`: passed after source formatting.
- Supabase foundation: applied to local PostgreSQL 17 with Supabase role/schema stubs. The architecture agent ran `supabase/tests/foundation.sql`, then 24-client concurrency scenarios for photo quota and device limits. These establish SQL consistency in that local setup, not actual Supabase service integration or cloud throughput.

## Interactive browser checks

Used the Codex in-app Chromium browser against Vite development and built-preview servers. Checked rendered widths of 320, 390, 768, 1024 and 1440 pixels: no horizontal document overflow was observed. Screenshots are under `docs/screenshots`.

Verified by actual interaction:

- Desktop/header and mobile menu navigation, including automatic mobile menu closing; both camera entry points.
- Acceptance with two seats, saved reply restored after reload, update to decline, and hidden/disabled attendance-only fields. A whitespace-only name was rejected with a readable validation message. Mobile input text computed to 16px.
- All four palette buttons and all three gallery lightboxes with their close controls.
- All four FAQ disclosures.
- Calendar download; inspected its event start/end as 9 AM–2 PM Philippine time. Later automated checks verify valid folding and escaping. Import into a real calendar remains a release check.
- Clicked Google Maps and Waze controls for both venues. The ceremony Google Maps tab visibly showed the intended search. Exact reception pin/address and navigation on real devices still need couple confirmation; query links do not prove an exact venue.
- Browser photo picker, persisted local JPEG, camera-roll export, and privacy ZIP export. ZIP contents are also tested automatically.
- Filled a preview roll with 24 imported photographs. At zero shots left, import and shutter controls were disabled. Deleting a shot restored its allowance. The local limit is a demonstration, not a secure cross-tab or cross-device quota.
- Live camera started in this browser. Shutter capture reduced allowance from 24 to 23. Switching selected the user-facing camera; video reported ready state 4 and width 1280. This does not establish physical iPhone/Android lens selection.
- Privacy export and deletion; in-page delete confirmation was tested through cancel and confirm paths. Final test reply and photos were cleared. Camera close logic stops tracks, with a page-hidden cleanup path; physical camera-indicator checks remain required on phones.
- Replaced all five development photo slots through their file pickers, verified saved status and files in the project, then restored defaults. Keyboard-inaccessible upload labels were replaced with buttons. Replacement write routes do not exist in the built site.
- Built-preview site loaded its default photos and camera dialog, and hid the development editor button. Lazy photographs completed loading after scrolling into their section.

During testing, native browser confirmation prompts proved unreliable in the automation surface; they were replaced by accessible in-page confirmations. HTML formatting caught and corrected a missing RSVP layout closing tag. One intermediate hot-reload error occurred while matching dialog markup and JavaScript were being edited; final rebuilt interactions passed.

## Verification limits before release

Physical iOS Safari / Android Chrome, Messenger/Viber in-app browsers, actual venue Wi-Fi, camera-denied and no-camera devices, storage eviction/full disk, unsupported HEIC, screen-reader announcements, full keyboard coverage, 200% zoom, and network interruption still require validation. Not every error branch has been clicked. There has been no production load test.

Production invitation redemption, secure sessions, host sign-in/dashboard, durable shared RSVPs, private uploads and server image validation, moderation/reveal, rate limiting, backup restoration and scheduled deletion are planned in `architecture.md` and remain unconnected/unimplemented beyond the SQL foundation. No preview confirmation should be interpreted as delivery to the couple.

## Rust invitation revision

The requested direction now uses rust (#873f2e) as the primary page background, warm ivory as text, and deeper rust for section separation. The hero names and photograph are larger. A first-visit sealed envelope opens into the invitation; session storage prevents repeated interruption on refresh, and the footer’s “The invitation” control replays it. This is a visual reveal, not authentication or a generated private guest link.

Browser checks passed for tap and keyboard reveal, replay, Escape dismissal, focus transfer to the invitation heading, return to the top after replay, and camera-dialog access after revealing. Checked 320, 390, 768 and 1440px without horizontal overflow. The 390×844 opening fits its viewport. Reduced-motion handling is implemented; physical-device checks remain deferred. Updated screenshots are prefixed `rust-`.

## Botanical stationery verification

The richer design was checked in the in-app Chromium browser at 320, 390, 650 and 1440px. Corrected the narrow tablet portrait crop by stacking the layout, contained overflowing opening artwork inside its own decorative wrapper, and bounded the decorative date at the smallest handset width. Final document widths matched the available client widths at 320px (305), 650px (635), and 1440px (1425). The desktop opening fit 1440×1000 with no internal overflow; the mobile opening was visually inspected at 390×844.

Rechecked tap/keyboard reveal, replay, mobile navigation, hero RSVP link, guest-camera dialog and gallery lightbox controls with the artwork in place. Ornament layers ignore pointer input. Final screenshots are named `botanical-*`. Functional data/backend boundaries remain unchanged.

## Refined attire / capture-only verification

The supplied attire screenshot was rebuilt as an editorial outfit guide: smaller swatches, three original garment illustrations, role-specific captions, and precise white/ivory dress guidance. Decorative elements are kept away from the reading area. Checked at 1440px, 390px and 320px; document client/scroll widths matched (375px at 390 viewport; 305px at 320 viewport). At 320px the camera dialog client/scroll widths both measured 267px. All three guide SVGs loaded.

Actual live capture test: one frame changed the counter from 24 to 23, survived reload and remained concealed. Then 23 additional live captures completed the roll. The final UI displayed ROLL COMPLETE, 24 exposed frame markers, a disabled shutter and switch control, hidden camera-enable control, and zero image thumbnails. Camera file-input and per-shot delete-button counts were zero. Temporary test frames were cleared through the existing privacy controls after verification.

Automated suite now has ten passing tests, including simultaneous 30-save requests admitting exactly 24 exposures, spent exposure preservation after object removal, failed-save rollback, Philippine-time reveal boundary, and absence of file-picker/deletion controls in the guest camera. Existing calendar, export, disabled legacy API, development media editor and built-asset tests remain passing. Build passed. The device-local clock/reveal and ledger remain preview behavior; server-backed guest authorization and reveal enforcement still require the planned Supabase integration.

Updated screenshots: `attire-refined-desktop.jpg`, `attire-refined-mobile.jpg`, `disposable-camera-desktop.jpg`, and `disposable-camera-mobile.jpg`.

## Photographic first-view verification

Tested the new composition at 320×720, 390×844, 768×1024 and 1440×1000. Document scroll/client widths matched at each checked width. At 320px the primary portrait ended at approximately y=519, within the 720px viewport; at 390px it ended at y=576, with the RSVP action ending at y=696, within the 844px viewport. At 768px the portrait ended at y=670 in a 1024px viewport. Both hero images loaded on desktop.

Rechecked sealed opening by tap and keyboard, replay, RSVP navigation, and capture-only camera dialog access. The envelope had no horizontal overflow at 320px. Desktop and mobile screenshots are `editorial-desktop.jpg`, `editorial-mobile.jpg`, and `editorial-envelope.jpg`. Build and all ten tests pass. Backend/reveal/production boundaries are unchanged.

## Wedding-day access and calligraphy revision

The clock descriptions in earlier entries are superseded: supported camera and reveal flows now use a fresh server-time anchor, with monotonic elapsed time, rather than the phone's wall clock. Unit/integration checks cover exact Philippine calendar-day boundaries, stale/invalid anchors, closed-window writes, and the read-only uncacheable clock route. The 14-test suite and production build pass.

All 12 isolated Playwright Chromium checks pass. They use fresh browser contexts, mock only the event-status response, and provide a synthetic camera stream. They cover pre-event access with a spoofed phone clock, closing midnight, unavailable/malformed clocks and retry, live capture followed by closure/stream shutdown, all 24 concealed exposures, developed viewing/download, envelope keyboard opening/replay, and mobile menu navigation. No real guest data or the user's browser profile is used. Browser binaries are on `D:\wedding-browser-cache`.

Screenshots were visually reviewed at 390 and 1440px; automated layout checks also cover 320 and 768px. No horizontal overflow was found, the self-hosted script font loaded, and the main portrait fits within the first phone viewport. Updated screenshots are `calligraphy-landing-*.png`, `calligraphy-envelope-390.png`, and `wedding-camera-locked.png`. Physical phone camera compatibility, cloud authorization and production load remain release checks; the synthetic browser camera does not establish hardware compatibility.

## Vercel preparation · 19 November 2026

Verified a clean `npm ci`, the production Vite build, all 16 unit/integration checks and all 12 Chromium browser checks on Node 22.14.0. New checks copy the clock/RSVP handlers and shared schedule into an isolated directory and exercise them over HTTP, including real host time, no-cache JSON, method rejection, missing routes and the unconfigured RSVP response. Published photo overrides are checked against actual built files. This validates the application package and HTTP contracts, not Vercel's proprietary build/runtime adapter.

The configuration declares Vite, `npm ci`, `dist`, Node 22.x, explicit inclusion of the shared schedule for the clock function, short function timeouts and differentiated cache headers. The GitHub workflow runs the build, integration and browser suites on Linux; its remote result must be checked after pushing. Extra original photos remain local. There has been no Vercel deployment or account configuration, and no Supabase service has been connected.

## Public Supabase setup · 19 November 2026

The user created project `vmstqqfmwkisyzwrlftw` and approved MCP OAuth; CLI configuration lists the server enabled with OAuth. Its database tools are not yet exposed in the running chat. The publishable browser client now uses Vite environment variables, a singleton, persistent sessions and automatic token refresh. It does not create anonymous users, enable OTP or write guest data. The Next.js SSR helpers are intentionally not used in this Vite app.

The read-only `npm run supabase:check` request to the live Auth settings endpoint succeeded. Local build plus 17 unit/integration checks and 13 isolated browser checks pass, including key/origin validation, incomplete configuration rejection, singleton reuse and absence of guest signup. `.env.local` is Git-ignored; `.env.example` contains no project credential values. Vercel must receive the two `VITE_SUPABASE_` values before rebuilding. The CSP permits connection only to this specific project in addition to the existing self origin. Live schema migrations and private data flows are still pending; a successful public connection is not proof that RSVPs or photos are stored remotely.

## Applied invitation suite · 19 November 2026

Both new rust backgrounds are applied to the actual website, alongside matching framed paper surfaces, copper rules, coordinated type and self-hosted fonts. A mobile review found competing floral detail behind long story text and form controls: mobile story crops now favor the quiet image area, and RSVP controls have a calm rust panel. Explicit radio sizing prevents the shared field styles from enlarging radio inputs. The original couple photographs and development replacement flow are preserved.

Production build, 17 unit/integration checks and 14 isolated browser checks pass. Layout checks cover 320, 390, 768 and 1440px, including horizontal overflow in each section, script/serif font loading, heading font selection and first-viewport portrait placement. Added click coverage exercises calendar download, gallery open/close, all FAQ disclosures, accepting/editing/declining an RSVP preview and persistence after reload. Existing camera-window, 24-frame, reveal, download and navigation checks remain passing. All browser data is synthetic and stays in isolated contexts.

Visually inspected the actual rendered hero, story, attire, day and RSVP at desktop/phone sizes. Evidence is saved as `suite-<section>-390.jpg`, `suite-<section>-1440.jpg`, full-page `suite-full-*.jpg`, and updated `calligraphy-landing-*.png`. This is desktop-browser responsive QA; physical phone and cloud guest-service limitations remain as recorded above.

## Gallery, attire and release review · 19 November 2026

Added clickable cover, opening keepsake and story photographs to the five-slot gallery. Tested previous/next wraparound, keyboard arrows, horizontal pointer-based touch swipes, vertical gesture rejection, Escape/close, focus return and containment at 390/1440px. Swipes are browser-simulated input, not a physical-phone test. Uploaded local replacements are read from the current image source when opening the gallery.

Local photo settings are visible through a labelled Photos control and the development-only `/?photos=edit` shortcut. Verified that the shortcut opens all five replacement inputs and that the control reopens the editor. The mobile control was moved away from the main invitation action. It remains hidden in production; local photo replacement does not provide a public host upload service.

Corrected the attire guide to the couple's instructions: guest colours are rust, brown, khaki or beige; sponsors may wear formal or semi-formal attire, preferably Barong Tagalog for Ninong and Filipiniana for Ninang. Added a matching original Filipiniana illustration with butterfly sleeves, expanded the sponsor note to the guide width, and stacked phone outfit cards to avoid crowded headings.

First-visit and replay checks at 320, 390, 768 and 1440px start from a deep RSVP URL, verify the centered opening fits the viewport, open it, assert hero focus and scroll position zero, follow the RSVP action, replay the opening and verify landing again. This caught a tablet replay focus/scroll race caused by restoring focus to the footer opener; the invitation now has dedicated synchronous focus/scroll handling and Escape dismissal. Opening an editor dialog is respected by the focus handler.

The final review passes the production build, 17 unit/integration checks and 21 browser checks. All referenced main images load at the reviewed phone/desktop sizes; section overflow and local font loading checks pass. Reviewed the actual screenshots for invitation centering, portrait composition, story text, attire, RSVP and gallery controls. Physical iOS/Safari, Android hardware cameras and the unconnected cloud guest flows remain outside these checks.

## Separate opening album and multi-photo settings

Supersedes the combined five-slot viewer described above: the opening cover, small keepsake and additional opening photos form one independent album; Memories contains its three existing slots; the story image opens independently. Removed fullscreen badges entirely. Added small opening-photo arrows and horizontal swipe directly on the card, along with tap/keyboard opening and the existing viewer controls. A swipe's trailing pointer click is suppressed so it does not unintentionally open the viewer; keyboard activation remains available.

Local settings expose six primary replacements and an Add opening photos control supporting multi-file selection. Opening extras have UUID-based slots, separate replace/remove-from-gallery controls, and persist in the same build manifest. The loopback endpoint validates slot names and image signatures, serializes writes and replaces the manifest atomically. Removal unregisters an extra from the album; it does not promise secure erasure of local image originals.

Tests cover independent album counts, main-card arrows/swipes without fullscreen markers, keyboard activation, viewer wraparound, extra additions/removal, and six primary editor slots. Real two-file browser uploads are exercised against an isolated copied Vite project, then verified on disk and after reload. No real user images are uploaded or removed by the tests. Concurrent HTTP uploads also verify manifest entries are preserved. The server uses its configured project root rather than ambient cwd.

During testing, the original integration fixture shared Vite's dependency cache and trace HTML changes triggered preview reloads. Isolated the test cache and excluded QA artifacts from preview watching. Public photo edits are also excluded from source watching because the editor explicitly refreshes their URLs; this prevents reloads interrupting a multi-file save. The real fixture specifically retains this content exclusion while allowing source watching.

Final checks pass: production build, 17 unit/integration checks and 24 browser checks, including the additional 1366×768 laptop opening/replay case. The upload editor was opened and visually verified in the user's local in-app browser with separate Opening photo gallery and Our story & Memories sections. All extra-photo tests use synthetic uploads in isolated/mocked projects, leaving the user's `public/content` manifest unchanged.
