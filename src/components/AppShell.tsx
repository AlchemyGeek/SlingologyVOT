import { NavLink, Outlet } from "react-router-dom";
import { ClipboardCheck, History as HistoryIcon, Settings as SettingsIcon } from "lucide-react";
import logo from "@/assets/logo.png";
import { UpdateBanner } from "./UpdateBanner";

const tabs = [
  { to: "/", label: "New Check", icon: ClipboardCheck, end: true },
  { to: "/history", label: "History", icon: HistoryIcon },
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
            <span className="text-xs text-muted-foreground -mt-0.5">VOT · VOR Check Logger</span>
          </div>
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
        <div className="max-w-2xl mx-auto grid grid-cols-3">
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
