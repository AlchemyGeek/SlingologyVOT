import { NavLink, Outlet } from "react-router-dom";
import { ClipboardCheck, History as HistoryIcon, MapPin, Settings as SettingsIcon } from "lucide-react";
import logo from "@/assets/logo.png";
import { UpdateBanner } from "./UpdateBanner";
import { useEntries } from "@/lib/vot-hooks";
import { effectiveTimestamp } from "@/lib/vot-storage";

const DaysSinceBadge = () => {
  const entries = useEntries();
  if (entries.length === 0) {
    return (
      <div className="ml-auto flex flex-col items-end leading-tight" aria-label="No checks yet">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Last check</span>
        <span className="text-sm font-semibold font-display text-muted-foreground">—</span>
      </div>
    );
  }
  const latest = entries.reduce((acc, e) =>
    new Date(effectiveTimestamp(e)).getTime() > new Date(effectiveTimestamp(acc)).getTime() ? e : acc,
  );
  const days = Math.floor(
    (Date.now() - new Date(effectiveTimestamp(latest)).getTime()) / 86_400_000,
  );
  const tone =
    days <= 24
      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
      : days <= 30
      ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
      : "bg-destructive/15 text-destructive border-destructive/30";
  return (
    <div
      className="ml-auto flex flex-col items-end leading-tight"
      aria-label={`${days} day${days === 1 ? "" : "s"} since last VOT check`}
      title={days > 30 ? "Beyond 30 days — VOR cannot be used for IFR flight (14 CFR 91.171)" : undefined}
    >
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Last check</span>
      <span className={`mt-0.5 px-2 py-0.5 rounded-full border text-sm font-semibold font-display tabular-nums ${tone}`}>
        {days}d
      </span>
    </div>
  );
};

const tabs = [
  { to: "/", label: "New Check", icon: ClipboardCheck, end: true },
  { to: "/history", label: "History", icon: HistoryIcon },
  { to: "/sites", label: "Sites", icon: MapPin },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export const AppShell = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="safe-top sticky top-0 z-30 bg-background/90 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <img src={logo} alt="SlingologyVOT logo" className="h-9 w-9 rounded-md" />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-wide text-foreground">SLINGOLOGY</span>
            <span className="text-xs text-muted-foreground -mt-0.5">VOT · VOR Check Logger · v26.05.01</span>
          </div>
          <DaysSinceBadge />
        </div>
      </header>

      <UpdateBanner />

      <main className="flex-1 w-full">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-28">
          <Outlet />
        </div>
      </main>

      <nav
        className="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-background/95 backdrop-blur safe-bottom"
        aria-label="Primary"
      >
        <div className="max-w-2xl mx-auto grid grid-cols-4">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] text-xs font-medium transition-colors ${
                    isActive
                      ? "text-accent"
                      : "text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`h-5 w-5 ${isActive ? "stroke-[2.25]" : ""}`} />
                    <span>{t.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
