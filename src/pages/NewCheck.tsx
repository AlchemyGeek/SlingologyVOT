import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Pencil, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  addEntry,
  newId,
  VOT_METHODS,
  evaluateEntry,
  methodLabel,
  methodTolerance,
  type VotEntry,
  type VotMethod,
} from "@/lib/vot-storage";
import { usePilot } from "@/lib/vot-hooks";

const fmtFull = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });

// Convert ISO string to value usable in <input type="datetime-local">
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const NewCheck = () => {
  const navigate = useNavigate();
  const pilot = usePilot();

  const [autoTs] = useState(() => new Date().toISOString());
  const [userTs, setUserTs] = useState<string | undefined>(undefined);
  const [editingTime, setEditingTime] = useState(false);
  const [confirmEditOpen, setConfirmEditOpen] = useState(false);

  const [location, setLocation] = useState("");
  const [method, setMethod] = useState<VotMethod | "">("");
  const [deviation, setDeviation] = useState<string>("");
  const [notes, setNotes] = useState("");

  const [confirmSignOpen, setConfirmSignOpen] = useState(false);

  const effectiveTs = userTs ?? autoTs;
  const deviationNum = deviation === "" ? null : Number(deviation);
  const deviationValid = deviationNum !== null && !Number.isNaN(deviationNum) && deviationNum >= -180 && deviationNum <= 180;

  const tolerance = method ? methodTolerance(method) : null;
  const result =
    method && deviationValid && deviationNum !== null
      ? evaluateEntry({ method, deviationDeg: deviationNum })
      : null;

  const canSave = !!pilot?.fullName && location.trim().length > 0 && !!method && deviationValid;

  // Reset slider value to mirror numeric input within ±10° range
  const sliderValue = useMemo(() => {
    if (deviationNum === null || Number.isNaN(deviationNum)) return [0];
    return [Math.max(-10, Math.min(10, deviationNum))];
  }, [deviationNum]);

  const handleConfirmEdit = () => {
    setConfirmEditOpen(false);
    setEditingTime(true);
    if (!userTs) setUserTs(autoTs);
  };

  const handleSign = () => {
    if (!pilot?.fullName) return;
    if (deviationNum === null) return;
    const entry: VotEntry = {
      id: newId(),
      autoTimestamp: autoTs,
      userTimestamp: userTs,
      timeOverridden: !!userTs && userTs !== autoTs,
      location: location.trim(),
      method: method || undefined,
      deviationDeg: Math.round(deviationNum * 10) / 10,
      notes: notes.trim() || undefined,
      signed: true,
      signedBy: pilot.fullName,
      signedAt: new Date().toISOString(),
    };
    addEntry(entry);
    setConfirmSignOpen(false);
    toast({ title: "Entry signed and saved" });
    setLocation("");
    setMethod("");
    setDeviation("");
    setNotes("");
    setUserTs(undefined);
    setEditingTime(false);
  };

  // Auto-snap deviation to 0.5 increments on blur
  const snapDeviation = () => {
    if (deviationNum === null || Number.isNaN(deviationNum)) return;
    const snapped = Math.round(deviationNum * 2) / 2;
    setDeviation(String(snapped));
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
        <Plane className="h-5 w-5 text-accent" /> New VOT Check
      </h1>

      {!pilot?.fullName && (
        <div className="rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
          Please{" "}
          <Link to="/settings" className="underline font-medium text-accent">
            set your name in Settings
          </Link>{" "}
          before logging a check.
        </div>
      )}

      {/* Date & time */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              {userTs ? "Time (overridden)" : "Auto-captured time"}
            </div>
            <div className="text-base font-medium font-display mt-0.5">{fmtFull(effectiveTs)}</div>
          </div>
          {!editingTime && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-9 w-9 p-0"
              aria-label="Edit date and time"
              onClick={() => setConfirmEditOpen(true)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>
        {editingTime && (
          <div className="mt-3">
            <Input
              type="datetime-local"
              value={toLocalInput(userTs ?? autoTs)}
              onChange={(e) => setUserTs(new Date(e.target.value).toISOString())}
            />
          </div>
        )}
      </div>

      {/* Location */}
      <div className="space-y-1.5">
        <Label htmlFor="loc">Location / Airport <span className="text-destructive">*</span></Label>
        <Input
          id="loc"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="KPAE or Paine Field"
          autoComplete="off"
        />
      </div>

      {/* Method */}
      <div className="space-y-1.5">
        <Label htmlFor="method">Method <span className="text-destructive">*</span></Label>
        <Select value={method} onValueChange={(v) => setMethod(v as VotMethod)}>
          <SelectTrigger id="method">
            <SelectValue placeholder="Select check method" />
          </SelectTrigger>
          <SelectContent>
            {VOT_METHODS.map((m) => (
              <SelectItem key={m.code} value={m.code}>
                {m.label} (±{m.tolerance}°)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {method === "dual_vor" && (
          <p className="text-xs text-muted-foreground">Enter the difference between the two receivers.</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="dev">Deviation (degrees) <span className="text-destructive">*</span></Label>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-center font-display text-4xl font-bold text-accent tabular-nums">
            {deviationValid && deviationNum !== null
              ? `${deviationNum > 0 ? "+" : ""}${deviationNum.toFixed(1)}°`
              : "—"}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Input
              id="dev"
              type="number"
              inputMode="decimal"
              step="0.5"
              min={-180}
              max={180}
              value={deviation}
              onChange={(e) => setDeviation(e.target.value)}
              onBlur={snapDeviation}
              placeholder="e.g. -3.5"
              className="font-display"
            />
          </div>
          <div className="mt-4">
            <div className="text-xs text-muted-foreground mb-2">Quick adjust ±10°</div>
            <Slider
              min={-10}
              max={10}
              step={0.5}
              value={sliderValue}
              onValueChange={(v) => setDeviation(String(v[0]))}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1 font-display">
              <span>-10°</span><span>0°</span><span>+10°</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Equipment notes, conditions, remarks…"
        />
      </div>

      <Button
        size="lg"
        disabled={!canSave}
        className="w-full h-14 text-base bg-primary hover:bg-primary-glow text-primary-foreground"
        onClick={() => setConfirmSignOpen(true)}
      >
        Sign &amp; Save VOT Check
      </Button>

      {/* Edit-time confirm */}
      <AlertDialog open={confirmEditOpen} onOpenChange={setConfirmEditOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Modify the date and time?</AlertDialogTitle>
            <AlertDialogDescription>
              This will override the automatically recorded time for this entry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmEdit}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sign confirm */}
      <AlertDialog open={confirmSignOpen} onOpenChange={setConfirmSignOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign this entry as {pilot?.fullName}?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <div>This record will be locked after saving.</div>
                <div className="rounded-md bg-muted p-3 space-y-1 font-display">
                  <div>Location: <span className="text-foreground">{location}</span></div>
                  <div>
                    Deviation:{" "}
                    <span className="text-accent">
                      {deviationNum !== null ? `${deviationNum > 0 ? "+" : ""}${deviationNum.toFixed(1)}°` : "—"}
                    </span>
                  </div>
                  <div>Time: <span className="text-foreground">{fmtFull(effectiveTs)}</span></div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSign}
              className="bg-primary hover:bg-primary-glow text-primary-foreground"
            >
              Sign &amp; Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!pilot?.fullName && (
        <Button variant="outline" className="w-full" onClick={() => navigate("/settings")}>
          Go to Settings
        </Button>
      )}
    </div>
  );
};

export default NewCheck;
