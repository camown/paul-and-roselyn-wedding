# Private Google Sheets RSVP connection

Destination: [the couple’s spreadsheet](https://docs.google.com/spreadsheets/d/1F0B2MTjam1Qf2AomkvhsHCbWH_vVgvJ-qAapf9wdSjc/edit). Keep sharing Restricted.

The website sends replies through Vercel to a Google Apps Script receiver. Guests cannot read the sheet or see the receiver secret. A dedicated `Website RSVPs` tab stores reply ID, Philippine timestamp, name, attendance, seats, dietary notes and message. Existing tabs remain untouched. Repeated submissions from the same browser update the same reply ID. Clearing browser storage or changing devices creates another ID; this is not invitation authentication or a verified seat entitlement.

## Owner authorization (not completed yet)

Prepared in the signed-in browser: [Paul & Roselyn · Private RSVPs](https://script.google.com/u/0/home/projects/1jImKPNK3QmnLPzVhyk5m-2XHKy4p-uJG_4ekNZmG2gXpD9vxjBfK026h/edit). Code is saved; no deployment, secret, Google authorization or sheet write has been performed. The spreadsheet's general access was changed from Anyone with the link (Editor) to Restricted and verified Private to only me.

1. In that spreadsheet, open **Extensions → Apps Script**. Paste [Code.gs](../integrations/google-sheets/Code.gs). Review the fixed sheet ID and destination tab.
2. Generate a random secret of at least 32 characters in a password manager. In Apps Script **Project Settings → Script Properties**, add `RSVP_SECRET` with that value. Never paste the secret into chat or public code.
3. **Deploy → New deployment → Web app**. Execute as yourself; allow Anyone to call it so Vercel can submit without a guest Google login. The receiver validates the secret before any sheet access and never returns sheet contents. Approve Google’s requested spreadsheet permission after reviewing this receiver. The spreadsheet itself stays private.
4. Copy the deployed **/exec URL**. Set these Vercel server environment variables for Production (and Preview only if intentionally enabled):
   - `RSVP_SHEETS_WEBHOOK_URL`: deployed /exec URL.
   - `RSVP_SHEETS_SECRET`: the same secret.
   - `RSVP_SITE_ORIGIN`: `https://paul-and-roselyn-wedding.vercel.app` (no trailing slash).
5. Redeploy. Submit a clearly marked synthetic test reply, verify the actual row in the private sheet, update it, and confirm one row remains. Remove the synthetic row afterward. Script updates require a new version under **Manage deployments**.

No Google authorization or real sheet write has been performed by preparing these files. Until all settings exist, the site continues to label its form as a local preview. A configured receiver still needs the live write/update test before guests use it.

## Boundaries

This is an open RSVP form with validation and an origin check, not authenticated invitation access or spam prevention. The receiver secret protects the Google endpoint; it does not authenticate guests. Use the planned invitation registry and durable abuse protection before distributing broadly. Avoid collecting sensitive medical details in dietary notes; restrict sheet editors and delete guest data after the agreed retention period. The Google sheet is separate from disposable-camera storage.

Formula-like guest text is neutralized, writes are serialized with a script lock, and acknowledgement follows a flush. Vercel returns success only for an acknowledged matching reply ID. Network failures remain retryable with the same ID. Google Apps Script has service quotas; this is intended for this wedding, not an unrestricted high-volume platform.

Reference: [Google Apps Script web apps](https://developers.google.com/apps-script/guides/web).
