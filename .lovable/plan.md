## SlingologyVOT — Build Plan

An offline-first, mobile-first PWA for Part 91 pilots to log VOR Operational Test (VOT) checks per FAR 91.171. All data stays on-device in localStorage; sync between devices is file-based (JSON export/import).

### Screens

**1. New Check** (default landing screen)
- Auto-captured date/time at top with pencil-edit (confirm dialog → datetime-local input). Stores both auto and overridden timestamps plus a `timeOverridden` flag.
- Location/Airport (required, free text)
- Deviation in degrees (required): numeric input −180 to +180 in 0.5° steps, plus a ±10° slider for fine adjustment. Large monospaced display for instrument-panel feel.
- Notes (optional, multi-line)
- "Sign & Save VOT Check" button — disabled until location + deviation set. Confirmation dialog shows pilot name, deviation, location, timestamp; on confirm, entry is saved with `signed: true`, `signedBy`, `signedAt`. Form resets, success toast.
- If pilot name not set, inline prompt linking to Settings (blocks save).
- No PASS/FAIL evaluation — raw deviation is stored only.

**2. History**
- Reverse-chronological list. Each row: location, deviation, date, signed-by, delete (×).
- Bottom summary strip: total entries.
- Empty state: "No VOT checks logged yet."
- Delete: inline Delete/Cancel confirmation, allowed even on signed entries.
- Export button → sheet with three options:
  - **Excel (.xlsx)** via SheetJS — `SlingologyVOT-log-YYYY-MM-DD.xlsx`. Columns: Date, Time, Location, Deviation (°), Signed By, Certificate No., Notes, Time Override. Bold header row.
  - **Plain Text (.txt)** — logbook-style block per entry with divider lines.
  - **JSON backup (.json)** — full entries array, restorable state.

**3. Settings**
- Full Name (required) and Certificate Number (optional), persisted under a pilot profile key.
- Import Data button → native file picker for `.json`. Merge by entry ID (existing IDs never overwritten). Pre-import dialog: "Import X entries from this file? Existing entries will not be overwritten." Post-import toast: "X new entries imported." or "No new entries found."
- No destructive bulk operations.

### Navigation
Bottom tab bar on mobile (New Check / History / Settings) with 44×44pt minimum tap targets; top nav on desktop. New Check is the default route.

### PWA & Offline
- Web app manifest: name `SlingologyVOT`, short_name `VOT`, `display: standalone`, dark theme/background colors, Slingology purple as `theme_color`. Manifest icons generated from your uploaded logo.
- Service worker caches all app assets for full offline operation (entry creation, history, export all work offline).
- Update flow: when a new SW version is detected, show a non-intrusive banner: *"A new version of SlingologyVOT is available. Update now?"* with Update (triggers `skipWaiting()` + reload) and Dismiss.
- Heads-up: PWA features (install, offline, update banner) only work in the **published/deployed** build, not the Lovable editor preview. SW will be disabled in dev and guarded against running inside iframes/Lovable preview hosts so it doesn't interfere with editing.

### Visual Design
- Dark cockpit aesthetic: deep charcoal/near-black backgrounds.
- Brand purple from the Slingology VOT logo (deep royal purple ~#3B1E6E with a lighter lavender accent ~#B8A8D9) for headings, primary buttons, focus rings, and the active tab indicator.
- Logo placed in the app header and used as the source for PWA/favicon icons.
- Deviation display in JetBrains Mono (large), body in DM Sans/Inter.
- All colors defined as HSL CSS variables in `index.css`; semantic Tailwind tokens.

### Data model (localStorage)
- `vot.pilot` → `{ fullName, certificateNumber }`
- `vot.entries` → array of `{ id, autoTimestamp, userTimestamp?, timeOverridden, location, deviationDeg, notes, signed, signedBy, signedAt }`

### Out of Scope (per spec)
Cloud sync/backend, auth, multiple pilots, 30-day currency reminders, third-party integrations, camera, CSV export.

### Tech notes
React + Tailwind + React Router. `xlsx` (SheetJS) for Excel; `vite-plugin-pwa` (Workbox) configured with `NetworkFirst` for HTML, `devOptions.enabled: false`, registration guarded against iframes and `lovableproject.com` hosts.