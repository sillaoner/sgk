"use client";

import { useEffect, useState } from "react";
import { IncidentForm } from "@/components/incidents/incident-form";
import { ErrorPanel } from "@/components/shared/error-panel";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils";
import { incidentService } from "@/services/api/incident-service";
import type { Incident, IncidentStatus } from "@/types/incident";

const INCIDENT_STATUS_OPTIONS: ReadonlyArray<{ label: string; value: IncidentStatus }> = [
  { label: "Open", value: "Open" },
  { label: "Analysis", value: "Analysis" },
  { label: "Closed", value: "Closed" }
];

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updateState, setUpdateState] = useState<Record<string, { description: string; status: IncidentStatus }>>({});
  const [updatingById, setUpdatingById] = useState<Record<string, boolean>>({});
  const [copiedIncidentId, setCopiedIncidentId] = useState<string | null>(null);

  const loadIncidents = async () => {
    setLoading(true);

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
      setError(null);
      await incidentService.createIncident(payload);
      await loadIncidents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create incident failed");
    }
  };

  const handleUpdate = async (id: string) => {
    const draft = updateState[id];
    const incident = incidents.find((item) => item.id === id);
    if (!draft || !incident || !id) {
      return;
    }

    const editedDescription = draft.description.trim();
    const currentDescription = (incident.description ?? "").trim();
    const descriptionChanged = editedDescription !== currentDescription;

    const payload: Parameters<typeof incidentService.updateIncident>[1] = {
      status: draft.status
    };

    if (descriptionChanged) {
      payload.description = editedDescription.length > 0 ? editedDescription : null;
    }

    try {
      setError(null);
      setUpdatingById((prev) => ({ ...prev, [id]: true }));
      await incidentService.updateIncident(id, payload);
      await loadIncidents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update incident failed");
    } finally {
      setUpdatingById((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleCopyIncidentId = async (incidentId: string) => {
    try {
      await navigator.clipboard.writeText(incidentId);
      setCopiedIncidentId(incidentId);
      window.setTimeout(() => {
        setCopiedIncidentId((current) => (current === incidentId ? null : current));
      }, 1500);
    } catch {
      setError("Incident ID could not be copied.");
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
        <h3 className="mb-3 text-lg font-semibold text-ink">Create Incident Draft</h3>
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
                    <span>{formatDateTime(incident.occurredAt)}</span>
                    <span className="rounded-full bg-white px-2 py-1">{incident.status}</span>
                  </div>

                  <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span className="font-mono">ID: {incident.id}</span>
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-7 px-2 text-xs"
                      onClick={() => void handleCopyIncidentId(incident.id)}
                    >
                      {copiedIncidentId === incident.id ? "Copied" : "Copy ID"}
                    </Button>
                  </div>

                  <div className="grid gap-2 md:grid-cols-[1fr_160px_120px]">
                    <Input
                      value={edit?.description ?? ""}
                      onChange={(event) =>
                        setUpdateState((prev) => ({
                          ...prev,
                          [incident.id]: {
                            ...(prev[incident.id] ?? { description: "", status: "Open" }),
                            description: event.target.value
                          }
                        }))
                      }
                      disabled={Boolean(updatingById[incident.id])}
                    />

                    <select
                      className="h-11 rounded-xl border border-border bg-white px-3 text-sm"
                      value={edit?.status ?? incident.status}
                      onChange={(event) =>
                        setUpdateState((prev) => ({
                          ...prev,
                          [incident.id]: {
                            ...(prev[incident.id] ?? { description: "", status: "Open" }),
                            status: event.target.value as IncidentStatus
                          }
                        }))
                      }
                      disabled={Boolean(updatingById[incident.id])}
                    >
                      {INCIDENT_STATUS_OPTIONS.map((statusOption) => (
                        <option key={statusOption.value} value={statusOption.value}>
                          {statusOption.label}
                        </option>
                      ))}
                    </select>

                    <Button disabled={Boolean(updatingById[incident.id])} onClick={() => void handleUpdate(incident.id)}>
                      {updatingById[incident.id] ? "Updating..." : "Update"}
                    </Button>
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
