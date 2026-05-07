import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader, IScannerControls } from "@zxing/browser";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { pullSync, PullError } from "@/lib/vot-sync";
import type { ImportPayload } from "@/lib/vot-exports";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onScanned: (payload: ImportPayload) => void;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const window: any;

export function SyncScannerScreen({ open, onOpenChange, onScanned }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"idle" | "scanning" | "fetching" | "denied">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let zxingControls: IScannerControls | null = null;
    let stream: MediaStream | null = null;
    let raf = 0;

    const handleToken = async (token: string) => {
      if (cancelled || !UUID_RE.test(token)) return;
      cancelled = true;
      setStatus("fetching");
      try {
        const payload = await pullSync(token);
        onScanned(payload);
        onOpenChange(false);
      } catch (e) {
        const msg =
          e instanceof PullError
            ? e.code === "expired" || e.code === "consumed" || e.code === "not_found"
              ? "This sync code has expired or has already been used. Ask the other device to generate a new one."
              : "Could not retrieve the sync payload."
            : "Network error.";
        setError(msg);
        toast({ title: "Sync failed", description: msg, variant: "destructive" });
        setStatus("idle");
      }
    };

    const prepareVideo = () => {
      const v = videoRef.current;
      if (!v) return;
      // iOS Safari requires these set as actual attributes BEFORE srcObject/play
      v.setAttribute("playsinline", "true");
      v.setAttribute("webkit-playsinline", "true");
      v.setAttribute("autoplay", "true");
      v.setAttribute("muted", "true");
      v.muted = true;
      v.playsInline = true;
      // @ts-expect-error iOS-only
      v.autoplay = true;
    };

    const start = async () => {
      setError(null);
      setStatus("scanning");
      try {
        prepareVideo();
        const Detector = window.BarcodeDetector;
        if (Detector && (await Detector.getSupportedFormats?.())?.includes?.("qr_code")) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
          });
          if (cancelled) return;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
          }
          const detector = new Detector({ formats: ["qr_code"] });
          const tick = async () => {
            if (cancelled || !videoRef.current) return;
            try {
              const codes = await detector.detect(videoRef.current);
              if (codes && codes[0]?.rawValue) {
                await handleToken(String(codes[0].rawValue).trim());
                return;
              }
            } catch {
              // ignore per-frame errors
            }
            raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
        } else {
          // ZXing fallback (iOS Safari path)
          const reader = new BrowserQRCodeReader();
          zxingControls = await reader.decodeFromConstraints(
            { video: { facingMode: { ideal: "environment" } }, audio: false },
            videoRef.current!,
            (result) => {
              if (result) handleToken(result.getText().trim());
            },
          );
          // iOS sometimes needs an explicit play() after srcObject is set
          try {
            await videoRef.current?.play();
          } catch {
            // autoplay may already be in progress
          }
        }
      } catch (e) {
        console.error(e);
        setStatus("denied");
        setError("Camera permission denied or unavailable.");
      }
    };

    start();

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      if (zxingControls) zxingControls.stop();
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [open, onOpenChange, onScanned]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogTitle className="sr-only">Scan QR Code</DialogTitle>
        <DialogDescription className="sr-only">
          Point your camera at the QR code on the other device.
        </DialogDescription>

        <div className="relative bg-black aspect-square">
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-8 border-2 border-white/70 rounded-xl pointer-events-none" />
          {status === "fetching" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
              <Loader2 className="h-6 w-6 animate-spin mr-2" /> Importing…
            </div>
          )}
          <Button
            size="icon"
            variant="secondary"
            className="absolute top-3 right-3 h-9 w-9 rounded-full"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 text-center space-y-1">
          <p className="text-sm text-foreground">
            Point your camera at the QR code on the other device.
          </p>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
