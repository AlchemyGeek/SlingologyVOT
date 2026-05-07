import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { forceUpdate } from "@/pwa";

const TRIGGER = 80; // px pull distance to trigger
const MAX = 120;

/**
 * Pull-to-refresh: when the user pulls down at the top of the page beyond the
 * threshold, run forceUpdate() to clear the service worker + caches and
 * hard-reload. Touch-only so desktop scrollwheel is not affected.
 */
export const PullToRefresh = () => {
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 0 || refreshing) return;
      startY.current = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (startY.current == null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        setPull(0);
        return;
      }
      // dampen
      const damped = Math.min(MAX, dy * 0.5);
      setPull(damped);
    };
    const onTouchEnd = async () => {
      if (startY.current == null) return;
      const triggered = pull >= TRIGGER;
      startY.current = null;
      if (triggered) {
        setRefreshing(true);
        await forceUpdate();
      } else {
        setPull(0);
      }
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [pull, refreshing]);

  if (pull <= 0 && !refreshing) return null;

  const progress = Math.min(1, pull / TRIGGER);
  const ready = progress >= 1 || refreshing;

  return (
    <div
      className="fixed inset-x-0 top-0 z-40 flex justify-center pointer-events-none"
      style={{ transform: `translateY(${refreshing ? TRIGGER : pull}px)` }}
    >
      <div className="mt-2 rounded-full bg-card border border-border shadow-md px-3 py-1.5 flex items-center gap-2">
        <RefreshCw
          className={`h-4 w-4 ${refreshing ? "animate-spin text-primary" : ready ? "text-primary" : "text-muted-foreground"}`}
          style={{ transform: refreshing ? undefined : `rotate(${progress * 270}deg)` }}
        />
        <span className="text-xs font-medium text-foreground">
          {refreshing ? "Updating…" : ready ? "Release to update" : "Pull to update"}
        </span>
      </div>
    </div>
  );
};
