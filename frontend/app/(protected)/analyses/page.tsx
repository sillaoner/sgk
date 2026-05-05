"use client";

import { useEffect, useState } from "react";
import { AnalysisForm } from "@/components/analyses/analysis-form";
import { ErrorPanel } from "@/components/shared/error-panel";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import { analysisService } from "@/services/api/analysis-service";
import { incidentService } from "@/services/api/incident-service";
import { debugApiResponse } from "@/services/api/response-utils";
import type { RootCauseAnalysis } from "@/types/analysis";
import type { Incident } from "@/types/incident";

export default function AnalysesPage() {
  const [analyses, setAnalyses] = useState<RootCauseAnalysis[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingIncidents, setLoadingIncidents] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadingIncidents(true);
    setError(null);

    try {
      const [analysesResult, incidentsResult] = await Promise.allSettled([
        analysisService.listAnalyses(),
        incidentService.listIncidents()
      ]);

      const errors: string[] = [];

      if (analysesResult.status === "fulfilled") {
        setAnalyses(analysesResult.value);
      } else {
        setAnalyses([]);
        errors.push(analysesResult.reason instanceof Error ? analysesResult.reason.message : "Could not load analyses");
      }

      if (incidentsResult.status === "fulfilled") {
        const incidentsData = incidentsResult.value;
        const eligibleIncidents = incidentsData.filter((incident) => incident.status !== "Closed");
        setIncidents(eligibleIncidents);

        debugApiResponse("analyses.incidents.loaded", {
          total: incidentsData.length,
          eligible: eligibleIncidents.length,
          draftCount: incidentsData.filter((incident) => incident.isDraft).length,
          closedCount: incidentsData.filter((incident) => incident.status === "Closed").length
        });
      } else {
        setIncidents([]);
        errors.push(incidentsResult.reason instanceof Error ? incidentsResult.reason.message : "Could not load incidents");
      }

      if (errors.length > 0) {
        setError(errors.join(" | "));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load analyses");
    } finally {
      setLoading(false);
      setLoadingIncidents(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onSubmit = async (payload: Parameters<typeof analysisService.upsertAnalysis>[0]) => {
    try {
      await analysisService.upsertAnalysis(payload);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save analysis failed");
    }
  };

  return (
    <div className="space-y-5">
      <section>
        <h2 className="text-2xl font-semibold text-ink">Root Cause Analyses</h2>
        <p className="text-sm text-muted">Capture 5 Whys and Fishbone inputs for each incident.</p>
      </section>

      {error ? <ErrorPanel message={error} /> : null}

      <Card>
        <h3 className="mb-3 text-lg font-semibold text-ink">Create / Update Analysis</h3>
        <AnalysisForm onSubmit={onSubmit} incidents={incidents} isLoadingIncidents={loadingIncidents} />
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ink">Analysis List</h3>
          <Button variant="secondary" onClick={() => void load()}>
            Refresh
          </Button>
        </div>

        {loading ? <LoadingSpinner label="Loading analyses..." /> : null}

        {!loading ? (
          <div className="space-y-3">
            {analyses.map((analysis) => (
              <article key={analysis.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="mb-1 flex flex-wrap items-center gap-3 text-xs text-muted">
                  <span>Incident: {analysis.incidentId}</span>
                  <span>Category: {analysis.category}</span>
                  <span>Updated: {formatDateTime(analysis.updatedAt)}</span>
                </div>
                <p className="text-sm text-ink">Cause 1: {analysis.cause1}</p>
                <p className="mt-1 text-xs text-muted">Actions: {analysis.actions.length}</p>
              </article>
            ))}

            {!analyses.length ? <p className="text-sm text-muted">No analyses found.</p> : null}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
