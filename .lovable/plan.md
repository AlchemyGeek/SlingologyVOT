## Add "Method" field with PASS/FAIL evaluation

Add a required Method dropdown after Location on the New Check screen, and use the method's FAR 91.171 tolerance to evaluate each entry as PASS or FAIL based on the entered deviation.

### Methods (per FAR 91.171) and tolerances
- VOT — ±4°
- Certified repair station test signal — ±4°
- Designated surface (ground) checkpoint — ±4°
- Designated airborne checkpoint — ±6°
- Dual VOR system check — ±4° (difference between receivers)

Stored as a stable code (`vot` | `repair_station` | `ground_checkpoint` | `airborne_checkpoint` | `dual_vor`) with a lookup table mapping code → label + tolerance, so wording/tolerances can be edited in one place.

### PASS/FAIL rule
- `result = |deviationDeg| <= tolerance ? "PASS" : "FAIL"`.
- Computed from stored `method` + `deviationDeg` at render/export time (not stored), so changing the lookup table re-evaluates legacy entries correctly.
- Entries with no method (legacy) show "—" instead of PASS/FAIL.

### Data model (`src/lib/vot-storage.ts`)
- Add `VotMethod` union and a `VOT_METHODS` array `[{ code, label, tolerance }]`.
- Add `method?: VotMethod` to `VotEntry` (optional so older saved entries still load; UI requires it for new entries).
- Add helpers: `methodLabel(code)`, `methodTolerance(code)`, `evaluateEntry(entry): "PASS" | "FAIL" | null`.

### New Check screen (`src/pages/NewCheck.tsx`)
- Add a shadcn `<Select>` immediately after Location, labeled "Method *", placeholder "Select check method".
- Add to `canSave`: method must be selected.
- Under the deviation display, once a method is chosen show: "Tolerance: ±4°" (or ±6°). For Dual VOR: "Enter the difference between receivers (±4°)."
- Live PASS/FAIL chip next to the deviation number once both method and a valid deviation are present (green for PASS, red for FAIL using existing destructive token).
- Sign confirmation dialog summary includes Method and the resulting PASS/FAIL.
- Persist `method` on the saved `VotEntry` (no stored result field).

### History (`src/pages/History.tsx`)
- Each row shows a small PASS/FAIL badge next to the deviation (green/red).
- Sub-line shows `<Method label> · ±<tolerance>°`. Omit for legacy entries without a method.

### Exports (`src/lib/vot-exports.ts`)
- Excel: insert columns "Method" and "Result" between Location and Deviation/after Deviation respectively. Adjust column widths. No conditional formatting (keep it simple, just text "PASS"/"FAIL").
- Plain text: add `Method:    <label>` after Location and `Result:    PASS|FAIL` after Deviation.
- JSON backup: automatic (`method` serialized; result is derived, not stored).
- Import: unchanged.

### Out of scope
- No blocking on FAIL — pilot can still sign a FAIL entry (it's a record of what happened).
- No reminders, no aggregate pass-rate stats.
