## Add "Sites" section (CRUD list of test locations)

A new tab between **History** and **Settings** where pilots can record VOT test sites they've discovered. Each site is editable and stored locally (same pattern as entries).

### Site fields
- **Method** — same dropdown as New Check (`VOT_METHODS` from `vot-storage.ts`)
- **Location** — free text (e.g. "KPAE — Run-up area Bravo")
- **Frequency** — masked input in the form `XXX.XX` (e.g. `108.00`–`117.95`); accept comma or dot, store as number string `XXX.XX`
- **Azimuth** — degrees `0–359` (integer)
- **Note** — short text, max 100 characters

### Data model — `src/lib/vot-storage.ts`
Add:
```ts
export interface VotSite {
  id: string;
  method: VotMethod;
  location: string;
  frequency: string;   // "112.30"
  azimuth: number;     // 0..359
  note?: string;       // <=100 chars
  createdAt: string;
  updatedAt: string;
}
```
Add helpers mirroring entries: `getSites()`, `saveSites()`, `addSite()`, `updateSite(id, patch)`, `deleteSite(id)` using key `vot.sites` and event `vot:sites-changed`.

### Hook — `src/lib/vot-hooks.ts`
Add `useSites()` mirroring `useEntries()`.

### Routing — `src/App.tsx`
Add `<Route path="/sites" element={<Sites />} />`.

### Nav — `src/components/AppShell.tsx`
Insert a new tab between History and Settings (icon: `MapPin` from lucide). Grid becomes `grid-cols-4`.

### New page — `src/pages/Sites.tsx`
- Header: "Sites" with an "Add site" button (top-right) opening a Dialog.
- Empty state: short explainer ("Save the test locations you've found — VOTs, surface checkpoints, etc.") with a primary "Add your first site" button.
- List: cards showing Location (title), Method label as a chip, `Freq 112.30 · Az 045°`, and the note if present. Trailing buttons: Edit (pencil) and Delete (trash, with AlertDialog confirm).
- Add/Edit dialog: same form fields, validates:
  - Method required
  - Location required (trimmed)
  - Frequency matches `^\d{3}[.,]\d{2}$`, normalized to dot
  - Azimuth integer `0–359`
  - Note ≤100 chars (live counter)
- Sort: most recently updated first.

### Out of scope
- No link from sites to auto-fill New Check (can be a follow-up).
- No import/export of sites in this pass.
- No favorites/tags.

### Files touched
- `src/lib/vot-storage.ts` — add types + CRUD
- `src/lib/vot-hooks.ts` — add `useSites`
- `src/App.tsx` — add route
- `src/components/AppShell.tsx` — add tab, switch to 4-column grid
- `src/pages/Sites.tsx` — new
