import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { pushSync, type PushResult } from "@/lib/vot-sync";
import type { VotEntry, VotSite } from "@/lib/vot-storage";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entries: VotEntry[];
  sites: VotSite[];
}

function fmtRemaining(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export function SyncQrScreen({ open, onOpenChange, entries, sites }: Props) {
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<PushResult | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generate = async () => {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const res = await pushSync(entries, sites);
      setInfo(res);
      setNow(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start sync");
      toast({ title: "Could not start sync", description: "Check your connection and try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!info || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, info.token, {
      width: 280,
      margin: 1,
      color: { dark: "#0b0f17", light: "#ffffff" },
    }).catch(() => {});
  }, [info]);

  useEffect(() => {
    if (!info) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [info]);

  const expiresMs = info ? new Date(info.expiresAt).getTime() - now : 0;
  const expired = info !== null && expiresMs <= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-6 text-center">
        <DialogTitle className="text-base font-semibold">Sync to Another Device</DialogTitle>
        <DialogDescription className="sr-only">
          Show this QR code on your other device to import your VOT log and sites.
        </DialogDescription>

        {loading && (
          <div className="py-12 flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}

        {error && !loading && (
          <div className="py-6 space-y-4">
            <p className="text-sm text-destructive">{error}</p>
            <Button onClick={generate} variant="outline" className="w-full">
              <RefreshCw className="h-4 w-4 mr-1.5" /> Try again
            </Button>
            <p className="text-xs text-muted-foreground">
              No internet? Use Export &gt; JSON Backup and AirDrop the file instead.
            </p>
          </div>
        )}

        {info && !loading && !error && (
          <div className="space-y-3">
            <div className={"mx-auto rounded-lg bg-white p-3 inline-block " + (expired ? "opacity-30" : "")}>
              <canvas ref={canvasRef} />
            </div>

            {!expired ? (
              <>
                <p className="text-sm text-foreground">
                  Scan this code on your other device to import your VOT log.
                </p>
                <p className="text-xs text-muted-foreground">
                  {info.entryCount} {info.entryCount === 1 ? "entry" : "entries"} · {info.siteCount} {info.siteCount === 1 ? "site" : "sites"} included
                </p>
                <p className="font-display text-2xl text-accent tabular-nums">
                  {fmtRemaining(expiresMs)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Only scan on your own device. Code is single-use and expires automatically.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-foreground">Code expired.</p>
                <Button onClick={generate} variant="outline" className="w-full">
                  <RefreshCw className="h-4 w-4 mr-1.5" /> Generate a new one
                </Button>
              </>
            )}
          </div>
        )}

        <Button variant="ghost" onClick={() => onOpenChange(false)} className="mt-2">
          Done
        </Button>
      </DialogContent>
    </Dialog>
  );
}
