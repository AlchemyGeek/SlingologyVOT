# Ephemeral Cloud Sync — Implementation Plan

Replace the file-based-only sync with a QR-code ephemeral relay backed by Lovable Cloud. Entries **and** Sites travel together. File import/export remains the always-available fallback.

## 1. Backend (Lovable Cloud)

### Table `sync_payloads`
| col | type | notes |
|---|---|---|
| `token` | uuid (PK, default `gen_random_uuid()`) | retrieval token |
| `payload` | jsonb | `{ schema, version, entries, sites }` |
| `entry_count` | int | shown on QR screen |
| `site_count` | int | shown on QR screen |
| `expires_at` | timestamptz | now() + 10 min |
| `consumed_at` | timestamptz nullable | set on first successful GET |
| `created_at` | timestamptz default now() | |

RLS: **enabled, no policies**. All access goes through edge functions using the service-role key — clients cannot read/write directly.

### Edge functions (`verify_jwt = false`, public)
- **`sync-push`** (POST): validates body with Zod (entries[], sites[], reasonable size cap ~2 MB), inserts row, returns `{ token, expiresAt, entryCount, siteCount }`.
- **`sync-pull`** (POST `{ token }`): looks up row; if missing/expired/already consumed → 410 with code (`expired` | `consumed` | `not_found`). Otherwise marks `consumed_at = now()` atomically (UPDATE ... WHERE consumed_at IS NULL AND expires_at > now() RETURNING payload) and returns the payload.
- **`sync-cleanup`** (scheduled daily via pg_cron in a migration): `DELETE FROM sync_payloads WHERE expires_at < now() - interval '1 day' OR consumed_at < now() - interval '1 day'`.

CORS headers on every response, including errors.

## 2. Frontend changes

### `src/lib/vot-sync.ts` (new)
Thin client wrapping `supabase.functions.invoke('sync-push' | 'sync-pull')`. Builds the payload using the existing `exportJson` shape so the server format matches the file backup exactly.

### `src/pages/History.tsx` — Export sheet
Add **"Sync to Another Device"** as the first option, above Excel / Plain Text / JSON Backup. Disabled when offline (`!navigator.onLine`) with a hint pointing to JSON backup. Tapping it opens the QR screen.

### `src/components/SyncQrScreen.tsx` (new)
Full-screen modal (Dialog) shown on the source device:
- Calls `sync-push` on open, shows spinner.
- Renders QR using **`qrcode`** npm package into a `<canvas>` (token only — short, no payload in QR).
- Live MM:SS countdown derived from server-returned `expiresAt`.
- Labels: "Scan this code on your other device to import your VOT log.", "X entries · Y sites included", and a small note: "Only scan on your own device."
- On expiry: replaces QR with "Code expired. Tap to generate a new one." (regenerates by calling push again).
- Cancel/Done dismisses.

### `src/pages/Settings.tsx` — Import options
Replace the single "Import Data" button with a sheet offering:
- **Scan QR Code** → opens `SyncScannerScreen`
- **Import from File** → existing file picker (unchanged)

### `src/components/SyncScannerScreen.tsx` (new)
Full-screen camera viewfinder:
- Prefers `window.BarcodeDetector` when available; falls back to **`@zxing/browser`** (works on iOS Safari).
- Decodes token → calls `sync-pull` → on success, hands the payload to the existing import-confirmation flow (reuses `ImportPayload`, `mergeEntries`, `mergeSites`).
- Error states map to friendly messages: expired/consumed → "This sync code has expired or has already been used…"; camera denied → instructions; offline → fallback hint.

### Reuse, no duplication
The merge confirmation dialog and toast already in `Settings.tsx` are reused — both file import and QR import set the same `pending: ImportPayload` state.

## 3. Payload format
Identical to existing JSON export so files and cloud sync are interchangeable:
```json
{ "schema": "slingology-vot", "version": 1, "entries": [...], "sites": [...] }
```
Pilot profile is **not** included (per spec §8).

## 4. Dependencies
- `qrcode` — render QR on source device
- `@zxing/browser` — camera fallback for iOS Safari (BarcodeDetector primary)

## 5. Out of scope
- Syncing pilot identity / Settings
- Background or auto-sync
- Cross-account / multi-user sharing
- History of past syncs

## 6. Files touched / created
- **New:** `supabase/functions/sync-push/index.ts`, `supabase/functions/sync-pull/index.ts`, `supabase/functions/sync-cleanup/index.ts`
- **New migration:** create `sync_payloads` table + enable RLS + pg_cron schedule for `sync-cleanup`
- **New:** `src/lib/vot-sync.ts`, `src/components/SyncQrScreen.tsx`, `src/components/SyncScannerScreen.tsx`
- **Edited:** `src/pages/History.tsx` (export sheet entry), `src/pages/Settings.tsx` (import sheet with two options, reuse merge flow)
