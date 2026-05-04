import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { applyUpdate, onUpdateAvailable } from "@/pwa";

export const UpdateBanner = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    onUpdateAvailable(() => setShow(true));
  }, []);

  if (!show) return null;

  return (
    <div className="bg-primary/20 border-b border-primary/40">
      <div className="max-w-2xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        <p className="text-sm text-foreground">
          A new version of SlingologyVOT is available. Update now?
        </p>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="ghost" onClick={() => setShow(false)}>
            Dismiss
          </Button>
          <Button size="sm" onClick={() => applyUpdate()} className="bg-primary hover:bg-primary-glow">
            Update
          </Button>
        </div>
      </div>
    </div>
  );
};
