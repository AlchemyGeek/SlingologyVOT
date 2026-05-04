// PWA registration with Workbox window. Guarded against Lovable preview iframes.
import { Workbox } from "workbox-window";

const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com") ||
  window.location.hostname.includes("lovable.app");

let updateCallback: (() => void) | null = null;
let waitingWb: Workbox | null = null;

export function onUpdateAvailable(cb: () => void) {
  updateCallback = cb;
}

export function applyUpdate() {
  if (!waitingWb) return;
  waitingWb.addEventListener("controlling", () => window.location.reload());
  waitingWb.messageSkipWaiting();
}

export function registerSW() {
  if (import.meta.env.DEV) return;
  if (isPreviewHost || isInIframe) {
    // Cleanup any leftover SW from a previous deployment
    navigator.serviceWorker?.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
    return;
  }
  if (!("serviceWorker" in navigator)) return;

  const wb = new Workbox("/sw.js");
  wb.addEventListener("waiting", () => {
    waitingWb = wb;
    updateCallback?.();
  });
  wb.register();
}
