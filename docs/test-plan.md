# Wedding rebuild review and acceptance tests

Reviewed November 16, 2026. This report covers source review of the rebuilt `index.html`, `assets/css/style.css`, `assets/js/main.js`, and `vite.config.mjs`. It does not claim physical-device, browser-click, or hosted Supabase verification. The primary implementation agent owns the separate interactive browser test results.

## Review findings

| Priority | Finding | Required outcome |
| --- | --- | --- |
| P2 | Dialogs initially lacked accessible names. A heading inside a dialog does not automatically label it. | Label each camera, lightbox, photo-editor, and privacy dialog using `aria-labelledby` or `aria-label`. Reported to implementation owner. |
| P2 | Development upload used a non-focusable label and a file input with `display:none`. | Make “Replace photo” a keyboard-operable button triggering the picker. Reported to implementation owner. |
| P2 | RSVP inputs initially used 13px text, which can trigger Safari focus zoom on iPhone. | Use at least 16px form-control text; check actual phone focus and layout. Reported to implementation owner. |
| P2 | `startCamera()` enables the shutter after camera startup without rechecking the current roll quota. `addPhoto()` rejects excess photos, but the available-looking shutter is misleading. | Recalculate the remaining allowance after startup and keep shutter disabled at zero. Reported to implementation owner. |
| P2 | The rewritten attire copy initially omitted the original white/off-white reservation and no-denim/no-slippers guidance. | Restore a short factual note unless the couple changes the policy. Reported to implementation owner. |
| Advisory | Many mobile captions are 6–8px and supporting paragraphs 10–12px. | Review at physical phone size and increase meaningful text as needed, particularly for older invitees. |

The December 1, 2026 RSVP deadline was verified in the original enhanced invitation; retain it. An initial concern about its provenance was retracted.

## Source-reviewed strengths

- Preview RSVP and guest photos use IndexedDB, with explicit device-only notices. The interface does not claim preview replies have reached the couple.
- RSVP confirmation follows completion of the local storage transaction. Name is trimmed and blank-only input is rejected.
- Decline disables and hides guest-count and dietary controls; local replies can be restored and updated.
- The camera requests permission only after activation, has a device-photo fallback, and stops tracks when closed or hidden.
- Imported guest images have a type and size limit, are decoded, resized, and re-encoded before local storage. Imported photos are not directly injected as HTML.
- Photo allowance is checked before saving; a per-page busy flag guards overlapping saves. This is a preview behavior, not a secure server-side quota.
- Every preview image can be deleted after confirmation, and preview reply/photos can be exported or cleared.
- The development editor is excluded from production UI and uses a loopback Vite server, an allowlisted slot list, file-size limit, signature check, and same-origin protection. Replacement photographs are written to the project and packaged with the build.
- External maps use new-tab isolation. The page contains a skip link, native form controls, reduced-motion CSS, and native dialogs.

## Click-through acceptance matrix

Record actual results separately as Pass / Fail / Not tested, with viewport and browser. Source review is not a substitute for these actions.

| Area | Actions and expected result |
| --- | --- |
| Navigation | Click monogram, every desktop and mobile link, primary hero action, hero scroll, footer names, and both camera entry points. Correct section opens; mobile menu closes after selecting a destination. |
| Keyboard | Tab through every link/button/input; visible focus; Enter/Space operate controls. Skip link reaches main content. No hidden editor control is reachable in a production build. |
| Calendar | Activate save date; inspect downloaded ICS: December 19, 2026, 9 AM–2 PM UTC+8, correct names and venue. Import into a calendar on a real device before launch. |
| Maps | Open ceremony and reception Google Maps and Waze links. Check each search resolves to the intended venue; search links alone do not verify exact coordinates. |
| Palette | Activate all four swatches; verify copied hex; deny clipboard permission and verify understandable fallback. |
| Gallery | Open all three images; close by close button, Escape, and outside click; focus returns to the initiating image. Replacement image also appears in the lightbox. |
| RSVP validation | Submit empty, whitespace-only name, and missing attendance; useful native errors; no saved confirmation. |
| RSVP accept | Fill name, attendance, each supported seat count, dietary note, and message; save; refresh; update; verify local persisted values and truthful device-only confirmation. |
| RSVP decline | Select decline; count/dietary hidden and disabled; saved seats zero; refresh keeps decline; change to accept restores controls. |
| Camera permission | Allow, deny, unavailable camera, dismiss prompt, and unsupported API. Verify clear recovery and continued file-upload access. |
| Camera lifecycle | Start, switch front/back, capture, close/reopen, Escape, hide tab, return, rotate phone. Confirm physical camera indicator stops and recovery works. |
| Photo import | Upload JPG, PNG, WebP, unsupported HEIC/GIF, file over 20 MB, and a corrupt image. Valid files appear once; failures are clear; picker cancel leaves state unchanged. |
| Roll limit | Save to 24 photos; verify no 25th save and disabled shutter/import. Delete one; remaining allowance returns; refresh preserves roll count. |
| Roll delete | Cancel and confirm per-photo deletion; count and thumbnails update; no accidental deletion on cancel. |
| Export | Empty and populated roll; privacy export with RSVP; confirm ZIP contains ordinary JPEG files and a manifest with the expected reply. |
| Privacy | Open, read device-only explanation, export, cancel clear, confirm clear; refresh verifies empty local reply and photos. Project photo replacements remain separate. |
| Editor | Replace and reset all five slots, reopen and refresh, overwrite same slot with same format, cancel picker, >8 MB and invalid type. Changes persist on D: and in built preview. |
| Storage failure | Browser storage denied/full/interrupted. No false save confirmation; controls recover; readable error appears. |
| Production build | All default and replacement photos load after build; editor button and mutation route absent; no credentials or guest data bundled. |

## Viewports and accessibility checks

- Check 320, 375, 390, 480, 600, 768, 1024, and 1440px, plus phone landscape. Inspect whole page and all dialogs. The 481–700px range retains multiple columns and deserves special attention.
- No horizontal overflow, text clipping, overlapping buttons, or offscreen modal controls. Text wraps at 200% zoom.
- Meaningful body copy remains readable; touch targets remain generous; 24px WCAG AA minimum is the floor, and 44px is the design aim.
- Screen-reader test confirms dialog names, field legends, icon names, live status, and disabled state. Native dialog closes with Escape and returns focus.
- Test font-loading failure, reduced motion, slow image network, and private-browsing storage behavior.
- Validate actual iPhone Safari and Android Chrome camera capture over HTTPS. Desktop simulation cannot establish permission, HEIC, camera-switching, or venue-network reliability.

## Deferred integration gates

The local preview intentionally does not implement shared guest authentication, an invitation registry, durable shared RSVP, private cloud photo upload, moderation, or timed album reveal. Before sending real invitation links:

1. Provision and apply the reviewed Supabase schema and storage policies; wire server endpoints and authenticated admin access.
2. Confirm invitation redemption, expiry, revocation, household seat allowance, recovery, and identity binding.
3. Prove guest A cannot read or modify guest B's RSVP or unrevealed photos. Prove unknown visitors cannot list invitations, guests, or photos.
4. Verify atomic server-enforced shot reservation, idempotent retry, expired upload cleanup, moderation, reveal time, and deletion.
5. Run realistic concurrent RSVP/upload tests and verify limits, cost alerts, database backup, export/restore, and retention deletion.
6. Only then deploy to Vercel, exercise the deployed HTTPS flows on real phones, and send invitations.
