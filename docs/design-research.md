# Wedding experience and visual direction

Research date: November 16, 2026. These are design recommendations and a test plan, not a claim that the rebuilt experience has passed the tests below.

## Recommendation

Build one responsive invitation website with a guest camera inside it. Send individual invitation links through the channels guests already use. Offer a printed QR at the wedding as a second entry point. A native app adds installation and store-distribution work without a clear benefit for this single event.

Guests should not create passwords. Redeem an individual invitation into a private, server-verified session; identify the invitee or household from the invitation rather than trusting a typed name. An optional email recovery link can restore access on another device. The couple's management area needs separate authenticated access. A shared table QR should use a deliberately limited camera-entry flow, not reveal the guest list or confer host permissions.

This combines the low-friction browser entry documented by [GUESTPIX](https://help.guestpix.com/article/153-start-here-welcome-to-guestpix) with the per-guest photo allowance and configurable reveal time described by [POV for weddings](https://pov.camera/use-cases/weddings). Those products validate the interaction pattern; they are not evidence that our implementation is secure or complete.

## Visual references

- [Minted: Terracotta by Kanika Mathur](https://www.minted.com/product/wedding-invitations/MIN-0WT-INV/terracotta) offers a Rust variant, a hand-drawn patterned frame, and a coordinated stationery suite. Apply the principle of one coordinated identity across invitation, RSVP, camera, and settings. Do not copy its artwork.
- [Minted: Arches by Kelly Schmidt](https://www.minted.com/product/wedding-invitations/MIN-6A2-INV/) includes a Terracotta variant. An occasional arch or inset image can provide a wedding-stationery cue without making every section a rounded card.
- [Papier's wedding invitation collection](https://www.papier.com/us/wedding/wedding-invitations/) is a reference collection for restrained printed-stationery compositions. Our recommendation is an interpretation, not a Papier-prescribed palette or font pairing.

Use original couple photography in the largest image positions. Keep the existing photo assets available for replacement, but avoid treating decorative generated couple images as authentic photographs of Paul and Roselyn. A quiet solid paper-colored background is sufficient; no new generated background is necessary.

## A coordinated design system

Retain the existing rust family while reducing the current four font families to two: Cormorant Garamond for names and headings, and one clean sans serif for navigation, forms, time, and supporting text. Use actual serif italics sparingly. Keep body text at least 16px and form controls at least 16px to avoid mobile zoom.

Suggested tokens (implementation may adjust them coherently):

| Role | Color | Use |
| --- | --- | --- |
| Rust | `#9c4120` | Main action, names, restrained accent |
| Ivory | `#faf6ef` | Main surface |
| Ink | `#35251f` | Reading text |
| Muted | `#745e53` | Secondary text |
| Hairline | `#d9c7b8` | Rules and borders, never small reading text |

Calculated contrast on ivory is 6.11:1 for rust, 13.58:1 for ink, and 5.62:1 for muted. These values cover opaque colors only; verify actual rendered overlays and disabled controls separately.

Remove animated particles, glow, large drop shadows, metallic shimmer, emoji decoration, and stacked gradient overlays. Prefer flat surfaces, fine rules, a single monogram, generous spacing, and photography. Do not present every section as an interchangeable card grid.

Keep sections purposeful: invitation; our story with one photograph; ceremony and reception; attire; a short gallery; RSVP; guest camera. A separate full-height countdown is unnecessary when a compact date/countdown can sit near the introduction. Keep gifts quiet and optional.

## Copy and factual integrity

Preserve these source facts from the current invitation:

- Paul and Roselyn; Saturday, December 19, 2026.
- Ceremony at 9:00 AM, Our Lady of the Pillar Parish / Imus Cathedral, Imus, Cavite.
- Reception at 11:00 AM–2:00 PM, Nathan's Catering and Events Services, Imus, Cavite. All displayed event times use Philippine time (UTC+8).
- High school sweethearts; nine years together, 2017–2026.
- Sponsors: Barong Tagalog for gentlemen, formal floor-length gown for ladies. Guests: formal or semi-formal in rust, brown, khaki, beige. Reserve white/off-white for the bride; avoid denim/slippers.

Correct “Dinner Reception” to “Reception” because the stated schedule is 11:00 AM–2:00 PM. The attire illustration's “Ninong Suit” conflicts with the written Barong guideline; use the written guideline unless the couple changes it. Do not invent exact venue addresses, an RSVP deadline, guest capacity, or payment account details.

Remove duplicate section labels and headings, generic romantic quotations, repeated date/venue paragraphs, and explanatory marketing copy. Keep necessary operational text: photo privacy/consent, remaining shots, pending upload status, unavailable backend, and form errors.

## Guest flow

1. Open invitation; see names, date, invitation identity, and RSVP action without an animation gate.
2. Review venue directions and attire; calendar and direction controls can be icon buttons with accessible names and tooltips.
3. Submit or update RSVP. Limit household count to the invitation allowance. Confirm only after the server acknowledges a durable save. A local demo must say it is saved only on this device.
4. Open the camera from the same invitation. Before capture, explain who can see photos and when they reveal. Request camera permission only after the guest chooses to start.
5. Capture with a large shutter; show remaining allowance and queued/sending/saved/failed states. Keep camera-roll upload as a fallback for unsupported or denied camera access.
6. Permit retry after network loss without double-counting shots. Keep an unsent image until its upload is confirmed. A photo is not safely uploaded merely because it appears in a browser preview.
7. After reveal, show only approved images according to the event's privacy settings. Provide a clear way to request removal.

Use icons for familiar secondary controls: close, back, camera switch, download, settings, calendar, directions. Keep visible text for high-stakes or unfamiliar actions such as RSVP, submit, delete confirmation, and permission recovery. Icon-only controls still need accessible names and generous targets.

## Existing implementation risks to remove

- `api/rsvp.js` currently stores RSVP records in process memory, which is not reliable Vercel persistence.
- Its unauthenticated GET returns contact details and guest messages. No guest-facing endpoint should return the full guest list.
- `assets/js/main.js` ignores the POST response status and always reports success, even if the backend rejects the save.
- Browser-local RSVP lists and photo previews must not be described as a shared database or owner dashboard.
- Development photo controls currently appear in the public invitation. Put them behind a local-only development route or real admin authorization; hidden UI alone is not authorization.

## Responsive and accessibility acceptance checklist

Standards reference: [WCAG 2.2](https://www.w3.org/TR/WCAG22/), especially text contrast, reflow, focus visibility, accessible labels, and target size. [W3C's native dialog technique](https://www.w3.org/WAI/WCAG22/Techniques/html/H102) describes keyboard focus containment and Escape behavior. Aim for 44px touch controls as a practical design target, above the WCAG 2.2 AA minimum of 24px subject to exceptions.

- Test widths 320, 375, 390, 768, 1024, and 1440px; portrait and landscape; no horizontal scrolling, clipped names, or overlapping controls.
- Test 200% zoom and text expansion. Allow names, venue titles, and buttons to wrap. Do not fix content panel heights.
- Check all navigation links, calendar files, directions, swatches, gallery open/close, RSVP fields, attendance choices, and submit/update paths.
- Test keyboard-only navigation, visible focus, skip link, labelled icon controls, form validation announcements, Escape, modal focus return, and screen-reader names.
- Verify reduced-motion preference removes nonessential transitions; content remains accessible if external fonts fail.
- Camera: permission allowed, denied, no camera, front/back switch, device rotation, close/reopen, capture, quota exhausted, and camera-roll upload.
- Uploads: network offline, interruption, retry, duplicate retry, oversized image, unsupported/HEIC image, corrupted file, and storage full. Reject unsupported formats with clear instructions.
- RSVP: empty fields, decline, household limit, repeated submission, backend failure, expired invitation, wrong invitation, and refresh after success.
- Developer photo settings: replace each slot, cancel picker, invalid file, reset, refresh persistence, and export/apply instructions. State whether changes are local or shared.
- Security acceptance: guest A cannot read/update guest B; unknown visitor cannot list guests/photos; expired/revoked invite fails; admin controls require server authorization.
- Run synthetic desktop/mobile flows locally, then perform a separate real iPhone Safari and Android Chrome test on HTTPS before event launch. Browser automation cannot establish physical-camera reliability or venue-network quality.

## Botanical stationery revision · 16 November 2026

The visual direction now follows illustrated wedding stationery rather than flat fields of color. References reviewed:

- [Artisaire: Midsummer / Bohemian invitation](https://artisaire.com/products/bohemian1-wedding-invitation): dense fine floral illustration around formal typography. Inspected the product photograph as a composition reference.
- [Papier: Sketchy Floral arched invitation](https://www.papier.com/us/sketchy-floral-59323): illustrated framing and an arch-shaped format.
- [Minted: Illuminated Storybook by Alethea and Ruth](https://www.minted.com/product/foil-stamped-wedding-invitations/MIN-G5U-IFS/foil-pressed-wedding-invitations): an ornamental botanical border on rust stationery.

Applied as a coordinated suite: original gold-toned rose/daisy/leaf SVG ornaments, subtle SVG paper grain, inset double rules, a monogram crest, arched portrait mat, ribbon and wax-style seal, framed schedule, layered gallery prints and an arched RSVP panel. Rust remains dominant and no gradients were added. Product imagery is research material only; site ornaments are original, deterministic vector assets generated by `scripts/create-stationery-art.mjs`. The presentation layer is in `assets/css/stationery.css`, loaded after the base stylesheet. The existing couple photographs remain replaceable through development settings.

## Elegant attire and disposable camera · 16 November 2026

Replaced the large arch swatches in the supplied screenshot with small colour references and an illustrated attire guide. Original SVG fashion flats distinguish an untucked long-sleeved embroidered Barong Tagalog with dress trousers for Ninong, a floor-length gown for Ninang, and semi-formal guest options. Clarified the white/ivory reservation applies to dresses, preserving natural-coloured traditional Barongs. Decorative flowers are reduced around the reading area; gallery rotations/shadows are quieter.

References: [Papier Elegant Double Border](https://www.papier.com/us/elegant-double-border-24128) for restrained stationery hierarchy; [Vogue dress-code guidance](https://www.vogue.com/article/wedding-dress-codes) for semi-formal options; [Barong Tagalog Store occasion guide](https://barongtagalogstore.com/2020/02/22/style-guide-choosing-the-right-barong-for-the-occasion/) for the formal/semi-formal context. The couple's existing sponsor requirements remain the source for event rules. Garment artwork is illustrative guidance, not a prescribed garment or exact fabric colour.

The [POV wedding camera](https://pov.camera/use-cases/weddings) informs the limited roll and delayed reveal. Guest-camera file input, photo-library access, retake and per-shot deletion are removed. Host/development photo replacement remains separate. Local exposures are recorded atomically across browser tabs, with a persistent 24-exposure ledger; deleting a photo record cannot refund its exposure. No actual captured thumbnail appears before the local preview reveal on 20 December 2026 at noon Philippine time. Privacy export and whole-preview erasure remain available as data recovery/privacy controls.

## Photographic invitation composition · 16 November 2026

The user's mobile screenshot showed too much vertical type before any photograph. The opening now combines a generated rust-silk / garden-rose backdrop with layered existing couple photographs. Mobile removes the extra crest, makes the names two compact lines, and orders the portrait before date and RSVP. Desktop uses a framed invitation beside the photographic keepsakes. The same surface carries into the sealed opening.

Reference sources: [Northern Printing Co. terracotta texture suite](https://www.northernprintingco.co.uk/blogs/news/exploring-texture-gold-foil-digital-print-velvet-silk-ribbon) and [Saffron Avenue's Moderna collection](https://saffronavenue.com/blog/calligraphy/moderna-collection/). These informed materials and composition; the final background is original generated artwork, not a licensed product photograph from either source. The couple images are the existing supplied assets. [Asset provenance and complete prompt](assets/rust-silk-atelier.md) documents the built-in imagegen operation and final file location on D:.

Layout rules are isolated in `assets/css/editorial.css`. The final background is a 297 KB JPEG, hashed into the Vite build; the source generated PNG stays in the tool's default output directory.

## Calligraphy and integrated header · 16 November 2026

Reviewed [Papier's calligraphy wedding invitations](https://www.papier.com/wedding/wedding-invitations/calligraphy) and [Artisaire's Vineyard Folio](https://artisaire.com/products/vineyard-folio-wedding-invitations) for expressive name lettering, framing and restrained navigation. These are design references; no product artwork was copied. Italianno names give the invitation a more personal stationery character, alongside the existing serif and small sans-serif details. The font is self-hosted with its OFL license in `assets/fonts`.

The header now sits directly on the rust photographic surface, with a round monogram and two-line menu control. Desktop RSVP is a small underlined link; the mobile invitation uses its existing hero action. The camera icon appears only on the wedding day. Both envelope and landing use the same calligraphy and rust palette. No CSS gradients were added in this revision.

## Coordinated invitation suite · 19 November 2026

The previous revision left the interior sections visually disconnected from the photographic opening. The final presentation now applies the generated assets to the actual sections: embossed rust paper across story, attire and memories; matching deeper silk around schedule, RSVP, footer and dialogs. The original floral landing is retained, with a more prominent rust invitation card and fine inset copper rules. Mobile receives a full invitation frame and crops decorative flowers away from long text. RSVP controls sit on a calm matching rust surface rather than directly over the floral imagery.

References reviewed: [Papier's Elegant Double Border suite](https://www.papier.com/elegant-double-border-24128), [Artisaire wedding folios](https://artisaire.com/collections/wedding-invitations), and [NN/g's consistency guidance](https://www.nngroup.com/articles/consistency-and-standards/). The visual references informed matching borders, material, typography and hierarchy; NN/g informed consistent controls and recognizable behavior. These are design principles and references, not a claim of formal certification or accessibility conformance.

`assets/css/invitation-suite.css` is the final shared presentation layer. Bodoni Moda provides editorial headings and story text; Italianno provides names, signatures and short accents; DM Sans provides controls and supporting details. All three families are served locally, with licenses in `assets/fonts`. Form text is at least 16px, controls retain visible labels, radio targets have 44px rows, and the floral background remains decorative. No CSS gradients were added. [Full prompts and generated asset provenance](assets/rust-suite.md) document the two new backgrounds (424 KB combined).
