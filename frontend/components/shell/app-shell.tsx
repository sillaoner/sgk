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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#f2f8ff_0,_#f8fafc_35%,_#eef5ef_100%)]">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 md:grid-cols-[240px_1fr]">
        <aside className={`border-r border-border bg-white/80 p-4 backdrop-blur md:block ${open ? "block" : "hidden"}`}>
          <div className="mb-6">
            <h1 className="text-lg font-semibold text-ink">MetalForm OHS</h1>
            <p className="text-xs text-muted">Incident Intelligence Panel</p>
          </div>

          <nav className="space-y-2">
            <NavLink href="/dashboard" label="Dashboard" />
            <NavLink href="/incidents" label="Incidents" />
            <NavLink href="/analyses" label="Analyses" />
            {isAdmin ? <NavLink href="/audit-logs" label="Audit Logs" /> : null}
          </nav>
        </aside>

        <main className="p-4 md:p-8">
          <header className="mb-6 flex items-center justify-between rounded-2xl border border-border bg-white/85 px-4 py-3 shadow-soft backdrop-blur">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className="rounded-lg border border-border p-2 md:hidden"
                aria-label="Toggle sidebar"
              >
                <Menu className="h-4 w-4" />
              </button>

              <div>
                <p className="text-sm text-muted">Welcome back</p>
                <p className="text-sm font-semibold text-ink">{user?.fullName ?? "User"}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs text-muted">
                {isOnline ? (
                  <Wifi className="h-4 w-4 text-success" />
                ) : (
                  <WifiOff className="h-4 w-4 text-warning" />
                )}
                <span>{pendingCount} pending sync {isSyncing ? "(syncing)" : ""}</span>
              </div>

              <Button variant="secondary" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </header>

          {children}
        </main>
      </div>
    </div>
  );
}
