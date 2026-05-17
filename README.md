# SlingologyVOT

**FAR 91.171 VOR check logging. Offline-first, electronically signed, no kneeboard required.**

SlingologyVOT is a mobile-first Progressive Web App for Part 91 pilots to log VOR Operational Test (VOT) checks as required by 14 CFR 91.171. It runs fully offline, signs each entry with the pilot's name and certificate number, and syncs between devices without a user account or login.

Part of the [Slingology](https://slingology.com) suite of apps for owner-pilots.

---

## Table of Contents

- [Features](#features)
- [Regulatory Basis](#regulatory-basis)
- [Getting Started (End Users)](#getting-started-end-users)
- [Data & Privacy](#data--privacy)
- [Export Formats](#export-formats)
- [Multi-Device Sync](#multi-device-sync)
- [Tech Stack](#tech-stack)
- [Local Development](#local-development)
- [Hosting](#hosting)
  - [Option A — Lovable (recommended)](#option-a--lovable-recommended)
  - [Option B — Self-hosting / third-party host](#option-b--self-hosting--third-party-host)
- [Backend Configuration](#backend-configuration)
- [PWA & Updates](#pwa--updates)
- [Part of the Slingology Suite](#part-of-the-slingology-suite)
- [License](#license)

---

## Features

- **Offline-first** — works at any airport with or without cell signal
- **Live PASS/FAIL indicator** — real-time ±4° FAR limit check as you enter deviation
- **Electronic signature** — each entry is signed with the pilot's full name and certificate number, then locked
- **Auto timestamp** — date and time captured on entry open, editable with confirmation
- **Full history** — searchable log with pass/fail summary and days-since-last-check badge
- **Sites database** — reusable VOT/VOR sites with airport identifiers
- **Export** — Excel (.xlsx), plain text (.txt), and JSON backup
- **Device-to-device sync** — ephemeral QR-code relay between your devices, no account required
- **PWA** — installable on iPhone and iPad via Safari, with in-app update prompts and pull-to-refresh force update

---

## Regulatory Basis

FAR 91.171 requires that VOR equipment used under IFR be checked within the preceding 30 days. Each log entry must contain the date, place, bearing error, and the identity of the person making the check.

Electronic records are acceptable for Part 91 operators per FAA AC 120-78B guidance, provided the required elements are captured. SlingologyVOT captures all required elements and locks each entry after signing. When entries are exported and imported on another device, the original signer's certificate number is preserved.

---

## Getting Started (End Users)

1. Open the app URL in Safari on your iPhone or iPad
2. Tap **Share → Add to Home Screen** to install as a PWA
3. Go to **Settings** and enter your full name and certificate number
4. Navigate to **New Check** and log your first VOT check

---

## Data & Privacy

- All data is stored locally on your device (localStorage)
- No account, no login, no permanent backend storage
- Device-to-device sync uses an ephemeral relay — payloads are deleted on first retrieval and expire automatically after 10 minutes
- Nothing is ever stored permanently in the cloud

---

## Export Formats

| Format | Use |
| :---- | :---- |
| Excel (.xlsx) | Colour-coded logbook, easy to print or archive |
| Plain Text (.txt) | Human-readable logbook-style, one entry per block |
| JSON (.json) | Full backup for import onto another device |

---

## Multi-Device Sync

Two sync methods, both using a merge-by-ID strategy (existing entries are never overwritten):

- **QR Sync** — generate a QR code on the source device, scan it on the destination device. The payload is one-time use and expires in 10 minutes.
- **File Sync** — export a JSON backup and import it on the other device via the file picker.

---

## Tech Stack

- React 18 + Vite 5 + TypeScript 5
- Tailwind CSS v3 + shadcn/ui
- localStorage persistence
- SheetJS for Excel export
- `qrcode` + `@zxing/browser` for QR sync
- Workbox / `vite-plugin-pwa` for service worker and update flow
- Supabase (Lovable Cloud) for the ephemeral sync relay only

---

## Local Development

Requirements: Node.js 20+ and a package manager (npm, pnpm, or bun).

```bash
# Install
npm install

# Dev server (http://localhost:8080)
npm run dev

# Production build
npm run build

# Preview the production build locally
npm run preview
```

Tests:

```bash
npx vitest run
```

---

## Hosting

The app is a static SPA after `npm run build`. The only server-side components are three Supabase Edge Functions (`sync-push`, `sync-pull`, `sync-cleanup`) used for the ephemeral QR sync relay.

### Option A — Lovable (recommended)

This project is built on [Lovable](https://lovable.dev) with **Lovable Cloud** enabled. Hosting, SSL, edge functions, and the database are managed for you.

1. Open the project in Lovable.
2. Click **Publish** (top right). The app deploys to `https://<your-project>.lovable.app`.
3. Optional — connect a custom domain in **Project Settings → Domains**:
   - Add A records for `@` and `www` pointing to `185.158.133.1`
   - Add the `_lovable` TXT record shown in the dialog
   - SSL is provisioned automatically
4. Edge functions deploy automatically when the project is published. No CLI step is required.

Frontend changes require a new **Publish → Update** to go live. Backend changes (edge functions, migrations) deploy immediately.

### Option B — Self-hosting / third-party host

You can host the static build on any provider (Vercel, Netlify, Cloudflare Pages, Firebase Hosting, S3 + CloudFront, nginx, etc.).

1. **Build:**
   ```bash
   npm run build
   ```
   Output is written to `dist/`.

2. **Environment variables** (required at build time so the bundle can talk to the sync relay):
   ```
   VITE_SUPABASE_URL=https://<your-project>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<your anon/publishable key>
   VITE_SUPABASE_PROJECT_ID=<your project ref>
   ```
   If you do not need device-to-device QR sync, you can leave these unset — file import/export will still work.

3. **Upload `dist/`** to your host of choice.

4. **SPA fallback** — the host must serve `index.html` for unknown routes (React Router uses `BrowserRouter`):

   | Host | Config |
   | :---- | :---- |
   | Netlify | `dist/_redirects` containing `/*  /index.html  200` |
   | Vercel | Auto-detected for Vite SPAs |
   | Cloudflare Pages | Auto-detected; or add `_redirects` as above |
   | nginx | `try_files $uri /index.html;` inside the `location /` block |
   | Apache | `FallbackResource /index.html` |

5. **Service worker headers** — make sure `/sw.js` is served with `Cache-Control: no-cache` so PWA updates propagate. Most static hosts already do this correctly.

6. **Backend (optional, for QR sync)** — deploy the contents of `supabase/` to your own Supabase project:
   ```bash
   npx supabase link --project-ref <your-ref>
   npx supabase db push
   npx supabase functions deploy sync-push sync-pull sync-cleanup
   ```

---

## Backend Configuration

The ephemeral sync relay uses a single table, `sync_payloads`, with RLS enabled and **no policies** — all access goes through edge functions running with the service-role key.

| Function | Purpose |
| :---- | :---- |
| `sync-push` | Validates and stores a payload, returns a one-time token (10-minute TTL) |
| `sync-pull` | Atomically claims a payload by token and returns it |
| `sync-cleanup` | Scheduled cleanup of expired/consumed rows |

No user authentication is required for the relay; tokens are random UUIDs and payloads are single-use.

---

## PWA & Updates

- The app registers a Workbox service worker (`/sw.js`) in production builds only.
- Updates are checked every 2 minutes while the tab is visible and on each visibility change.
- When a new version is available, an in-app banner offers to apply it.
- A **pull-to-refresh** gesture on the top of the screen triggers a hard update: unregisters the service worker, clears all caches, and reloads from the network.

---

## Part of the Slingology Suite

| App | Purpose |
| :---- | :---- |
| SlingologyMX | Maintenance and financial tracking |
| SlingologyRamp | Ground activity logging (fuel, oil, squawks) |
| SlingologyXC | Cross-country flight experience journal |
| **SlingologyVOT** | FAR 91.171 VOR check logger |

---

## License

MIT
