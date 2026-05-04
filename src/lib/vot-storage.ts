// Domain types and localStorage helpers for SlingologyVOT.

export interface Pilot {
  fullName: string;
  certificateNumber?: string;
}

export interface VotEntry {
  id: string;
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
