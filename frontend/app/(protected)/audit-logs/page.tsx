"use client";

import { useEffect, useState } from "react";
import { RoleGuard } from "@/components/auth/role-guard";
import { ErrorPanel } from "@/components/shared/error-panel";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import { auditService } from "@/services/api/audit-service";
import type { AuditLog } from "@/types/audit";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const data = await auditService.listAuditLogs();
      setLogs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <RoleGuard allow={["admin"]}>
      <div className="space-y-5">
        <section>
          <h2 className="text-2xl font-semibold text-ink">Audit Logs</h2>
          <p className="text-sm text-muted">Read-only privacy and access traces.</p>
        </section>

        {error ? <ErrorPanel message={error} /> : null}

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-ink">Access Events</h3>
            <Button variant="secondary" onClick={() => void load()}>
              Refresh
            </Button>
          </div>

          {loading ? <LoadingSpinner label="Loading logs..." /> : null}

          {!loading ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead>
                  <tr className="text-muted">
                    <th className="px-2 py-2">When</th>
                    <th className="px-2 py-2">Actor</th>
                    <th className="px-2 py-2">Entity</th>
                    <th className="px-2 py-2">Action</th>
                    <th className="px-2 py-2">Reason</th>
                    <th className="px-2 py-2">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-t border-border">
                      <td className="px-2 py-2">{formatDateTime(log.createdAt)}</td>
                      <td className="px-2 py-2">{log.actorUserId ?? "system"}</td>
                      <td className="px-2 py-2">{log.entityType}</td>
                      <td className="px-2 py-2">{log.action}</td>
                      <td className="px-2 py-2">{log.reason ?? "-"}</td>
                      <td className="px-2 py-2">{log.ipAddress ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!logs.length ? <p className="pt-4 text-sm text-muted">No audit events found.</p> : null}
            </div>
          ) : null}
        </Card>
      </div>
    </RoleGuard>
  );
}
