"use client";

import { useEffect, useState } from "react";
import { ErrorPanel } from "@/components/shared/error-panel";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { IncidentForm } from "@/components/incidents/incident-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils";
import { incidentService } from "@/services/api/incident-service";
import type { Incident, IncidentStatus } from "@/types/incident";

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updateState, setUpdateState] = useState<Record<string, { description: string; status: IncidentStatus }>>({});

  const loadIncidents = async () => {
<<<<<<< HEAD
=======
    setLoading(true);
>>>>>>> abd55b3 (fixes)
    try {
      setError(null);
      const data = await incidentService.listIncidents();
      setIncidents(data);
      setUpdateState(
        Object.fromEntries(data.map((item) => [item.id, { description: item.description ?? "", status: item.status }]))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load incidents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadIncidents();
  }, []);

  const handleCreate = async (payload: Parameters<typeof incidentService.createIncident>[0]) => {
    try {
<<<<<<< HEAD
=======
      setError(null);
>>>>>>> abd55b3 (fixes)
      await incidentService.createIncident(payload);
      await loadIncidents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create incident failed");
    }
  };

  const handleUpdate = async (id: string) => {
    const payload = updateState[id];
    if (!payload) {
      return;
    }

    try {
<<<<<<< HEAD
=======
      setError(null);
>>>>>>> abd55b3 (fixes)
      await incidentService.updateIncident(id, payload);
      await loadIncidents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update incident failed");
    }
  };

  return (
    <div className="space-y-5">
      <section>
        <h2 className="text-2xl font-semibold text-ink">Incident Management</h2>
        <p className="text-sm text-muted">Create, review, and update incident records.</p>
      </section>

      {error ? <ErrorPanel message={error} /> : null}

      <Card>
        <h3 className="mb-3 text-lg font-semibold text-ink">Create Incident</h3>
        <IncidentForm onSubmit={handleCreate} />
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ink">Incident List</h3>
          <Button variant="secondary" onClick={() => void loadIncidents()}>
            Refresh
          </Button>
        </div>

        {loading ? <LoadingSpinner label="Loading incidents..." /> : null}

        {!loading ? (
          <div className="space-y-3">
            {incidents.map((incident) => {
              const edit = updateState[incident.id];
              return (
                <div key={incident.id} className="rounded-xl border border-border bg-surface p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-3 text-xs text-muted">
                    <span>{incident.type}</span>
                    <span>{formatDateTime(incident.dateTime)}</span>
                    <span className="rounded-full bg-white px-2 py-1">{incident.status}</span>
                  </div>

                  <div className="grid gap-2 md:grid-cols-[1fr_160px_120px]">
                    <Input
                      value={edit?.description ?? ""}
                      onChange={(event) =>
                        setUpdateState((prev) => ({
                          ...prev,
                          [incident.id]: {
                            ...(prev[incident.id] ?? { description: "", status: "open" }),
                            description: event.target.value
                          }
                        }))
                      }
                    />

                    <select
                      className="h-11 rounded-xl border border-border bg-white px-3 text-sm"
                      value={edit?.status ?? incident.status}
                      onChange={(event) =>
                        setUpdateState((prev) => ({
                          ...prev,
                          [incident.id]: {
                            ...(prev[incident.id] ?? { description: "", status: "open" }),
                            status: event.target.value as IncidentStatus
                          }
                        }))
                      }
                    >
                      <option value="open">open</option>
                      <option value="analysis">analysis</option>
                      <option value="closed">closed</option>
                    </select>

                    <Button onClick={() => void handleUpdate(incident.id)}>Update</Button>
                  </div>
                </div>
              );
            })}

            {!incidents.length ? <p className="text-sm text-muted">No incidents found.</p> : null}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
