"use client";

import { useEffect, useState } from "react";
import { StatCard } from "@/components/dashboard/stat-card";
import { ErrorPanel } from "@/components/shared/error-panel";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Card } from "@/components/ui/card";
import { dashboardService } from "@/services/api/dashboard-service";
import type { DashboardSummary } from "@/types/dashboard";

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setError(null);
        const data = await dashboardService.getSummary();
        setSummary(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load dashboard");
      } finally {
        setLoading(false);
      }
    };

    void fetchSummary();
  }, []);

  return (
    <div className="space-y-5">
      <section>
        <h2 className="text-2xl font-semibold text-ink">Dashboard</h2>
        <p className="text-sm text-muted">Real-time incident and action overview.</p>
      </section>

      {loading ? <LoadingSpinner label="Loading summary..." /> : null}
      {error ? <ErrorPanel message={error} /> : null}

      {summary ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard label="Total Incidents" value={summary.totalIncidents} />
          <StatCard label="Open Incidents" value={summary.openIncidents} />
          <StatCard label="In Analysis" value={summary.incidentsInAnalysis} />
          <StatCard label="Closed Incidents" value={summary.closedIncidents} />
          <StatCard label="Pending Actions" value={summary.pendingActions} />
          <StatCard label="Overdue Actions" value={summary.overdueActions} />
        </div>
      ) : null}

      <Card>
        <h3 className="text-lg font-semibold text-ink">Compliance Snapshot</h3>
        <p className="mt-2 text-sm text-muted">
          Personal health payloads remain encrypted end-to-end. Access attempts are audited for KVKK/GDPR traceability.
        </p>
      </Card>
    </div>
  );
}
