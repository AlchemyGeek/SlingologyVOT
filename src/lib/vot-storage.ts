// Domain types and localStorage helpers for SlingologyVOT.

export interface Pilot {
  fullName: string;
  certificateNumber?: string;
}

export type VotMethod =
  | "vot"
  | "repair_station"
  | "ground_checkpoint"
  | "airborne_checkpoint"
  | "dual_vor";

export const VOT_METHODS: { code: VotMethod; label: string; tolerance: number }[] = [
  { code: "vot", label: "VOT", tolerance: 4 },
  { code: "repair_station", label: "Certified repair station test signal", tolerance: 4 },
  { code: "ground_checkpoint", label: "Designated surface checkpoint", tolerance: 4 },
  { code: "airborne_checkpoint", label: "Designated airborne checkpoint", tolerance: 6 },
  { code: "dual_vor", label: "Dual VOR system check", tolerance: 4 },
];

export function methodLabel(code?: VotMethod): string {
  return VOT_METHODS.find((m) => m.code === code)?.label ?? "";
}
export function methodTolerance(code?: VotMethod): number | null {
  return VOT_METHODS.find((m) => m.code === code)?.tolerance ?? null;
}
export function evaluateEntry(e: { method?: VotMethod; deviationDeg: number }): "PASS" | "FAIL" | null {
  const tol = methodTolerance(e.method);
  if (tol === null) return null;
  return Math.abs(e.deviationDeg) <= tol ? "PASS" : "FAIL";
}

export interface VotEntry {
  id: string;
  method?: VotMethod;
  /** ISO timestamp captured automatically when the New Check screen opened. */
  autoTimestamp: string;
  /** ISO timestamp set by the pilot if they edited the time. */
  userTimestamp?: string;
  timeOverridden: boolean;
  location: string;
  /** Bearing error in degrees, e.g. -3.5, +1.0 */
  deviationDeg: number;
  notes?: string;
  signed: boolean;
  signedBy: string;
  /** ISO timestamp of the moment of signing. */
  signedAt: string;
}

const PILOT_KEY = "vot.pilot";
const ENTRIES_KEY = "vot.entries";

export function getPilot(): Pilot | null {
  try {
    const raw = localStorage.getItem(PILOT_KEY);
    return raw ? (JSON.parse(raw) as Pilot) : null;
  } catch {
    return null;
  }
}

export function savePilot(p: Pilot) {
  localStorage.setItem(PILOT_KEY, JSON.stringify(p));
  window.dispatchEvent(new Event("vot:pilot-changed"));
}

export function getEntries(): VotEntry[] {
  try {
    const raw = localStorage.getItem(ENTRIES_KEY);
    return raw ? (JSON.parse(raw) as VotEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveEntries(entries: VotEntry[]) {
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
  window.dispatchEvent(new Event("vot:entries-changed"));
}

export function addEntry(entry: VotEntry) {
  const entries = getEntries();
  entries.push(entry);
  saveEntries(entries);
}

export function deleteEntry(id: string) {
  saveEntries(getEntries().filter((e) => e.id !== id));
}

export function mergeEntries(incoming: VotEntry[]): number {
  const existing = getEntries();
  const seen = new Set(existing.map((e) => e.id));
  const added: VotEntry[] = [];
  for (const e of incoming) {
    if (!seen.has(e.id)) {
      added.push(e);
      seen.add(e.id);
    }
  }
  if (added.length) saveEntries([...existing, ...added]);
  return added.length;
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `vot-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function effectiveTimestamp(e: VotEntry): string {
  return e.timeOverridden && e.userTimestamp ? e.userTimestamp : e.autoTimestamp;
}

// ---------- Sites ----------

export interface VotSite {
  id: string;
  method: VotMethod;
  location: string;
  frequency: string; // "112.30"
  azimuth: number;   // 0..359
  note?: string;     // <=100 chars
  createdAt: string;
  updatedAt: string;
}

const SITES_KEY = "vot.sites";

export function getSites(): VotSite[] {
  try {
    const raw = localStorage.getItem(SITES_KEY);
    return raw ? (JSON.parse(raw) as VotSite[]) : [];
  } catch {
    return [];
  }
}

export function saveSites(sites: VotSite[]) {
  localStorage.setItem(SITES_KEY, JSON.stringify(sites));
  window.dispatchEvent(new Event("vot:sites-changed"));
}

export function addSite(site: VotSite) {
  saveSites([...getSites(), site]);
}

export function updateSite(id: string, patch: Partial<Omit<VotSite, "id" | "createdAt">>) {
  saveSites(
    getSites().map((s) =>
      s.id === id ? { ...s, ...patch, updatedAt: new Date().toISOString() } : s,
    ),
  );
}

export function deleteSite(id: string) {
  saveSites(getSites().filter((s) => s.id !== id));
}
