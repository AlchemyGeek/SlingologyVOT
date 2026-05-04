import { useEffect, useState } from "react";
import { getEntries, getPilot, getSites, type Pilot, type VotEntry, type VotSite } from "./vot-storage";

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

export function useSites(): VotSite[] {
  const [sites, setSites] = useState<VotSite[]>(() => getSites());
  useEffect(() => {
    const sync = () => setSites(getSites());
    window.addEventListener("vot:sites-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("vot:sites-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return sites;
}
