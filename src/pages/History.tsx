import { useMemo, useState } from "react";
import { Download, QrCode, Trash2, X } from "lucide-react";
import { SyncQrScreen } from "@/components/SyncQrScreen";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useEntries, usePilot, useSites } from "@/lib/vot-hooks";
import { deleteEntry, effectiveTimestamp, evaluateEntry, methodLabel, methodTolerance, type VotEntry } from "@/lib/vot-storage";
import { exportJson, exportTxt, exportXlsx } from "@/lib/vot-exports";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

const fmtDeg = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}°`;

const HistoryRow = ({ e, onDelete }: { e: VotEntry; onDelete: (id: string) => void }) => {
  const [confirming, setConfirming] = useState(false);
  const result = evaluateEntry(e);
  const tol = methodTolerance(e.method);
  const mLabel = methodLabel(e.method);
  return (
    <li className="rounded-xl border border-border bg-card p-3.5 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-medium text-foreground truncate">{e.location}</span>
            <span className="font-display text-accent">{fmtDeg(e.deviationDeg)}</span>
            {result && (
              <span
                className={
                  "px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide " +
                  (result === "PASS"
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-destructive/15 text-destructive")
                }
              >
                {result}
              </span>
            )}
          </div>
          {mLabel && (
            <div className="text-xs text-muted-foreground mt-0.5">
              {mLabel} · ±{tol}°
            </div>
          )}
          <div className="text-xs text-muted-foreground mt-0.5">
            {fmtDate(effectiveTimestamp(e))} · Signed by {e.signedBy}
          </div>
          {e.notes && (
            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{e.notes}</div>
          )}
        </div>
        {!confirming ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
            aria-label="Delete entry"
            onClick={() => setConfirming(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      {confirming && (
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-border">
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onDelete(e.id)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
          </Button>
        </div>
      )}
    </li>
  );
};

const History = () => {
  const entries = useEntries();
  const pilot = usePilot();
  const sites = useSites();
  const [exportOpen, setExportOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);

  const sorted = useMemo(
    () =>
      [...entries].sort(
        (a, b) =>
          new Date(effectiveTimestamp(b)).getTime() -
          new Date(effectiveTimestamp(a)).getTime(),
      ),
    [entries],
  );

  const onExport = (kind: "xlsx" | "txt" | "json") => {
    if (kind === "xlsx") exportXlsx(sorted, pilot?.certificateNumber, sites);
    if (kind === "txt") exportTxt(sorted, sites);
    if (kind === "json") exportJson(sorted, sites);
    setExportOpen(false);
  };

  const startSync = () => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      // Offline: route the user to the file fallback per spec.
      alert(
        "No internet connection. Use Export > JSON Backup and AirDrop to sync manually.",
      );
      return;
    }
    setExportOpen(false);
    setSyncOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">History</h1>
        <Sheet open={exportOpen} onOpenChange={setExportOpen}>
          <SheetTrigger asChild>
            <Button size="sm" variant="outline" disabled={sorted.length === 0 && sites.length === 0}>
              <Download className="h-4 w-4 mr-1.5" /> Export
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>Export VOT Log</SheetTitle>
              <SheetDescription>Sync to another device or download a copy.</SheetDescription>
            </SheetHeader>
            <div className="mt-4 grid gap-2">
              <Button variant="outline" className="justify-start h-12" onClick={startSync}>
                <QrCode className="h-4 w-4 mr-2" /> Sync to Another Device
              </Button>
              <Button variant="outline" className="justify-start h-12" onClick={() => onExport("xlsx")}>
                Excel (.xlsx)
              </Button>
              <Button variant="outline" className="justify-start h-12" onClick={() => onExport("txt")}>
                Plain Text (.txt)
              </Button>
              <Button variant="outline" className="justify-start h-12" onClick={() => onExport("json")}>
                JSON backup (.json)
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <SyncQrScreen
        open={syncOpen}
        onOpenChange={setSyncOpen}
        entries={sorted}
        sites={sites}
      />

      {sorted.length === 0 ? (
        <div className="text-center text-muted-foreground py-16 border border-dashed border-border rounded-xl">
          No VOT checks logged yet.
        </div>
      ) : (
        <ul className="space-y-2.5">
          {sorted.map((e) => (
            <HistoryRow key={e.id} e={e} onDelete={deleteEntry} />
          ))}
        </ul>
      )}

      {sorted.length > 0 && (
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-2.5 text-sm text-center text-muted-foreground">
          <span className="text-foreground font-medium">{sorted.length}</span> total{" "}
          {sorted.length === 1 ? "entry" : "entries"}
        </div>
      )}
    </div>
  );
};

export default History;
