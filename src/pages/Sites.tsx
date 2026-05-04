import { useMemo, useState } from "react";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  addSite,
  deleteSite,
  methodLabel,
  newId,
  updateSite,
  VOT_METHODS,
  type VotMethod,
  type VotSite,
} from "@/lib/vot-storage";
import { useSites } from "@/lib/vot-hooks";

const NOTE_MAX = 100;
const FREQ_RE = /^\d{3}[.,]\d{1,2}$/;

const normalizeFreq = (raw: string) => {
  const [whole, frac = ""] = raw.trim().replace(",", ".").split(".");
  return `${whole}.${(frac + "00").slice(0, 2)}`;
};

interface FormState {
  method: VotMethod | "";
  location: string;
  frequency: string;
  azimuth: string;
  note: string;
}

const emptyForm: FormState = {
  method: "",
  location: "",
  frequency: "",
  azimuth: "",
  note: "",
};

const Sites = () => {
  const sites = useSites();
  const sorted = useMemo(
    () => [...sites].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)),
    [sites],
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [pendingDelete, setPendingDelete] = useState<VotSite | null>(null);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (s: VotSite) => {
    setEditingId(s.id);
    setForm({
      method: s.method,
      location: s.location,
      frequency: s.frequency,
      azimuth: String(s.azimuth),
      note: s.note ?? "",
    });
    setDialogOpen(true);
  };

  const validate = (): string | null => {
    if (!form.method) return "Method is required.";
    if (!form.location.trim()) return "Location is required.";
    if (!FREQ_RE.test(form.frequency.trim())) return "Frequency must be in the form XXX.X or XXX.XX.";
    const az = Number(form.azimuth);
    if (!Number.isInteger(az) || az < 0 || az > 359) return "Azimuth must be an integer 0–359.";
    if (form.note.length > NOTE_MAX) return `Note must be ≤ ${NOTE_MAX} characters.`;
    return null;
  };

  const handleSave = () => {
    const err = validate();
    if (err) {
      toast({ title: err, variant: "destructive" });
      return;
    }
    const now = new Date().toISOString();
    const frequency = form.frequency.trim().replace(",", ".");
    const azimuth = Number(form.azimuth);
    const note = form.note.trim() || undefined;
    if (editingId) {
      updateSite(editingId, {
        method: form.method as VotMethod,
        location: form.location.trim(),
        frequency,
        azimuth,
        note,
      });
      toast({ title: "Site updated" });
    } else {
      addSite({
        id: newId(),
        method: form.method as VotMethod,
        location: form.location.trim(),
        frequency,
        azimuth,
        note,
        createdAt: now,
        updatedAt: now,
      });
      toast({ title: "Site added" });
    }
    setDialogOpen(false);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteSite(pendingDelete.id);
    toast({ title: "Site deleted" });
    setPendingDelete(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <MapPin className="h-5 w-5 text-accent" /> Sites
        </h1>
        <Button size="sm" onClick={openAdd} className="bg-primary hover:bg-primary-glow text-primary-foreground">
          <Plus className="h-4 w-4 mr-1" /> Add site
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Save the test locations you've found — VOTs, surface checkpoints, and other approved sites.
          </p>
          <Button onClick={openAdd} className="bg-primary hover:bg-primary-glow text-primary-foreground">
            <Plus className="h-4 w-4 mr-1" /> Add your first site
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {sorted.map((s) => (
            <li key={s.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{s.location}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30">
                      {methodLabel(s.method)}
                    </span>
                    <span className="text-muted-foreground font-display tabular-nums">
                      Freq {s.frequency} · Az {String(s.azimuth).padStart(3, "0")}°
                    </span>
                  </div>
                  {s.note && (
                    <p className="mt-2 text-sm text-muted-foreground break-words">{s.note}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="ghost" className="h-9 w-9 p-0" onClick={() => openEdit(s)} aria-label="Edit site">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-9 w-9 p-0 text-destructive hover:text-destructive"
                    onClick={() => setPendingDelete(s)}
                    aria-label="Delete site"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit site" : "Add site"}</DialogTitle>
            <DialogDescription>Record a known VOR/VOT test location.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="s-method">Method *</Label>
              <Select value={form.method} onValueChange={(v) => setForm((f) => ({ ...f, method: v as VotMethod }))}>
                <SelectTrigger id="s-method">
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
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="s-loc">Location *</Label>
              <Input
                id="s-loc"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="e.g. KPAE — Run-up area Bravo"
                maxLength={120}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="s-freq">Frequency *</Label>
                <Input
                  id="s-freq"
                  value={form.frequency}
                  onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))}
                  placeholder="112.30"
                  inputMode="decimal"
                  className="font-display tabular-nums"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-az">Azimuth (°) *</Label>
                <Input
                  id="s-az"
                  type="number"
                  min={0}
                  max={359}
                  step={1}
                  value={form.azimuth}
                  onChange={(e) => setForm((f) => ({ ...f, azimuth: e.target.value }))}
                  placeholder="045"
                  className="font-display tabular-nums"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="s-note">Note</Label>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {form.note.length}/{NOTE_MAX}
                </span>
              </div>
              <Textarea
                id="s-note"
                rows={2}
                value={form.note}
                maxLength={NOTE_MAX}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value.slice(0, NOTE_MAX) }))}
                placeholder="Short remarks…"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              className="bg-primary hover:bg-primary-glow text-primary-foreground"
            >
              {editingId ? "Save changes" : "Add site"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this site?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.location} will be removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Sites;
