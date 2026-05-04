# SlingologyVOT

FAR 91.171 VOR check logging. Offline-first, electronically signed, no kneeboard required.

SlingologyVOT is a mobile-first Progressive Web App for Part 91 pilots to log VOR Operational Test (VOT) checks as required by 14 CFR 91.171. It runs fully offline, signs each entry with your name, and syncs between your devices without a cloud account or login.

Part of the [Slingology](https://slingology.com) suite of apps for owner-pilots.

---

## Features

- **Offline-first** — works at any airport with or without cell signal  
- **Live PASS/FAIL indicator** — real-time ±4° FAR limit check as you enter deviation  
- **Electronic signature** — each entry is signed with your full name and locked after saving  
- **Auto timestamp** — date and time captured on entry open, editable with confirmation  
- **Full history** — searchable log with pass/fail summary  
- **Export** — Excel (.xlsx), plain text (.txt), and JSON backup  
- **Device sync** — ephemeral QR-code-based sync between your devices, no cloud account required  
- **PWA** — installable on iPhone and iPad via Safari, with in-app update prompts

---

## Regulatory Basis

FAR 91.171 requires that VOR equipment used under IFR be checked within the preceding 30 days. Each log entry must contain the date, place, bearing error, and the identity of the person making the check.

Electronic records are acceptable for Part 91 operators per FAA AC 120-78B guidance, provided the required elements are captured. SlingologyVOT captures all required elements and locks each entry after signing.

---

## Getting Started

1. Open the app URL in Safari on your iPhone or iPad  
2. Tap **Share → Add to Home Screen** to install as a PWA  
3. Go to **Settings** and enter your full name  
4. Navigate to **New Check** and log your first VOT check

---

## Data & Privacy

- All data is stored locally on your device (localStorage)  
- No account, no login, no backend  
- Device-to-device sync uses an ephemeral cloud relay — data is deleted after first retrieval and expires automatically  
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

SlingologyVOT supports two sync methods:

- **QR Sync** — generate a QR code on the source device, scan it on the destination device. The payload is one-time use and expires in 10 minutes.  
- **Manual** — export a JSON backup and import it on the other device via the file picker.

Both methods use a merge-by-ID strategy: existing entries are never overwritten.

---

## Tech Stack

- React \+ Tailwind CSS  
- localStorage persistence  
- SheetJS for Excel export  
- PWA with service worker and update promotion

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
