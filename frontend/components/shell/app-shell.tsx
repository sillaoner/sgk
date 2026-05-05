"use client";

import { Menu, Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { NavLink } from "@/components/shell/nav-link";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const { user, isAdmin, logout } = useAuth();
  const { pendingCount, isSyncing } = useOfflineSync();

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#ebf7f1_0,_#f8fafc_45%,_#e9f2ff_100%)]">
      <div className="mx-auto max-w-7xl px-3 pb-6 pt-4 sm:px-4 md:px-6 md:py-6">
        <div className="relative grid items-start gap-4 md:grid-cols-[260px_1fr]">
          {open ? (
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-30 bg-slate-900/35 backdrop-blur-[1px] md:hidden"
            />
          ) : null}

          <aside
            className={`fixed inset-y-3 left-3 z-40 w-[78%] max-w-[320px] rounded-3xl border border-white/70 bg-white/95 p-4 shadow-xl backdrop-blur transition duration-300 md:static md:block md:w-auto md:max-w-none md:translate-x-0 md:shadow-soft ${
              open ? "translate-x-0" : "-translate-x-[120%]"
            }`}
          >
            <div className="mb-6 rounded-2xl bg-slate-50 p-3">
              <h1 className="text-base font-semibold text-ink md:text-lg">OHS Incident Management System</h1>
              <p className="mt-1 text-xs text-muted">Incident Intelligence Dashboard</p>
            </div>

            <nav className="space-y-2">
              <NavLink href="/dashboard" label="Dashboard" />
              <NavLink href="/incidents" label="Incidents" />
              <NavLink href="/analyses" label="Analyses" />
              {isAdmin ? <NavLink href="/audit-logs" label="Audit Logs" /> : null}
            </nav>

            <Button variant="secondary" onClick={handleLogout} className="mt-4 w-full md:hidden">
              Logout
            </Button>
          </aside>

          <main className="min-w-0">
            <header className="rounded-3xl border border-white/75 bg-white/90 p-4 shadow-soft backdrop-blur md:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setOpen((prev) => !prev)}
                    className="rounded-xl border border-border bg-white p-2 md:hidden"
                    aria-label="Toggle sidebar"
                  >
                    <Menu className="h-4 w-4" />
                  </button>

                  <div>
                    <p className="text-xs tracking-wide text-muted">Welcome to OHS Incident Management System</p>
                    <p className="text-sm font-semibold text-ink md:text-base">{user?.fullName ?? "User"}</p>
                  </div>
                </div>

                <Button variant="secondary" onClick={handleLogout} className="hidden md:inline-flex">
                  Logout
                </Button>
              </div>

              <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs text-muted">
                <div className="flex items-center gap-2">
                  {isOnline ? (
                    <Wifi className="h-4 w-4 text-success" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-warning" />
                  )}
                  <span className="truncate">
                    {pendingCount} pending sync {isSyncing ? "(syncing)" : ""}
                  </span>
                </div>
              </div>
            </header>

            <section className="mt-4 space-y-4">{children}</section>
          </main>
        </div>
      </div>
    </div>
  );
}
