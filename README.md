# Paul & Roselyn Wedding Invitation Web Application

A digital wedding invitation web app designed for **Paul & Roselyn's Wedding** on **Saturday, December 19, 2026** at **Our Lady of the Pillar Parish (Imus Cathedral), Cavite, Philippines**.

---

## Features

- **Interactive 3D Wax Seal & Envelope Opening:** Guests tap the glowing botanical wax seal on the metallic envelope to trigger a realistic shimmer and open animation.
- **Synchronized Live Countdown:** Real-time ticker counting down to Dec 19, 2026, 9:00 AM (UTC+8 Philippine Time).
- **Dual Navigation (Waze & Google Maps):** 1-tap navigation buttons for both Ceremony (Imus Cathedral) and Reception (Nathan's Catering).
- **1-Tap Add to Calendar:** Instant sync with Google Calendar or direct download for Apple / Outlook Calendar (`.ics`).
- **Dress Code Guide:** Interactive color palette chips (Rust, Brown, Khaki, Beige) and Ninong & Ninang Barong guidelines.
- **Smart RSVP System:**
  - Send formatted draft to WhatsApp
  - 1-click Copy to Clipboard for instant replies in Facebook Messenger, Viber, or SMS
- **Gift of Love (Monetary Registry):** Optional modal with 1-click copy for GCash and bank account numbers.
- **Photo Replacement:** Client-side photo preview tools for the couple to personalize story and gallery photos.
- **Messenger & Viber Friendly:** Fast load times, responsive layout, and Open Graph rich card previews.

---

## Deployment to Vercel

To deploy live to Vercel and generate a public HTTPS link:

```bash
# In the project directory:
npx vercel
```

Follow the prompts in your terminal:
1. `Set up and deploy?` → **Y**
2. `Which scope?` → Select your Vercel account
3. `Link to existing project?` → **N**
4. `Project name?` → `paul-roselyn-wedding` (or your preferred name)
5. `In which directory is your code located?` → `./`

For production deployment:
```bash
npx vercel --prod
```

You will immediately get a live link like `https://paul-roselyn-wedding.vercel.app` which can be shared with all guests!
