import { useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "@/hooks/use-toast";
import { mergeEntries, mergeSites, savePilot } from "@/lib/vot-storage";
import { usePilot } from "@/lib/vot-hooks";
import { parseImportFile, type ImportPayload } from "@/lib/vot-exports";

const Settings = () => {
  const pilot = usePilot();
  const [fullName, setFullName] = useState("");
  const [cert, setCert] = useState("");
  const [savedHint, setSavedHint] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<ImportPayload | null>(null);

  useEffect(() => {
    setFullName(pilot?.fullName ?? "");
    setCert(pilot?.certificateNumber ?? "");
  }, [pilot]);

  const handleSave = () => {
    if (!fullName.trim()) {
      toast({ title: "Full name is required", variant: "destructive" });
      return;
    }
    savePilot({ fullName: fullName.trim(), certificateNumber: cert.trim() || undefined });
    setSavedHint(true);
    setTimeout(() => setSavedHint(false), 1500);
    toast({ title: "Pilot identity saved" });
  };

  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      const entries = parseImportFile(text);
      setPending(entries);
    } catch (err) {
      toast({
        title: "Could not read backup",
        description: err instanceof Error ? err.message : "Invalid file",
        variant: "destructive",
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const confirmImport = () => {
    if (!pending) return;
    const added = mergeEntries(pending);
    setPending(null);
    if (added > 0) toast({ title: `${added} new ${added === 1 ? "entry" : "entries"} imported.` });
    else toast({ title: "No new entries found." });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Settings</h1>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Pilot Identity
        </h2>
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
            <Input
              id="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Stathis Kanakaris"
              autoComplete="name"
            />
            <p className="text-xs text-muted-foreground">Used as the electronic signature on every log entry.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cert">Certificate Number (optional)</Label>
            <Input
              id="cert"
              value={cert}
              onChange={(e) => setCert(e.target.value)}
              placeholder="e.g. 1234567"
              autoComplete="off"
            />
          </div>
          <Button onClick={handleSave} className="w-full bg-primary hover:bg-primary-glow text-primary-foreground">
            {savedHint ? "Saved ✓" : "Save"}
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Data Management
        </h2>
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Restore or merge entries from a JSON backup file exported on another device.
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-1.5" />
            Import Data
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </div>
      </section>

      <p className="text-xs text-muted-foreground text-center">
        SlingologyVOT · v1.0 · All data stays on this device.
      </p>

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Import {pending?.length ?? 0} entries from this file?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Existing entries will not be overwritten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmImport} className="bg-primary hover:bg-primary-glow text-primary-foreground">
              Import
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Settings;
