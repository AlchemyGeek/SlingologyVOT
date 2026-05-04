import { useEffect, useState } from "react";
import { getEntries, getPilot, type Pilot, type VotEntry } from "./vot-storage";

export function usePilot(): Pilot | null {
  const [pilot, setPilot] = useState<Pilot | null>(() => getPilot());
  useEffect(() => {
    const sync = () => setPilot(getPilot());
    window.addEventListener("vot:pilot-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("vot:pilot-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return pilot;
}

export function useEntries(): VotEntry[] {
  const [entries, setEntries] = useState<VotEntry[]>(() => getEntries());
  useEffect(() => {
    const sync = () => setEntries(getEntries());
    window.addEventListener("vot:entries-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("vot:entries-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return entries;
}
