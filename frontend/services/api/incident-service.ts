import { getCache, setCache } from "@/services/offline/cache";
import { apiClient } from "@/services/api/client";
import type { CreateIncidentInput, Incident, UpdateIncidentInput } from "@/types/incident";

const INCIDENTS_CACHE_KEY = "incidents:list";

interface IncidentDraftResponse {
  id: string;
}

export const incidentService = {
  async listIncidents(): Promise<Incident[]> {
    try {
      const response = await apiClient.get<Incident[]>("/incidents");
      setCache(INCIDENTS_CACHE_KEY, response.data, 60_000);
      return response.data;
    } catch {
      return getCache<Incident[]>(INCIDENTS_CACHE_KEY) ?? [];
    }
  },

  async createIncident(input: CreateIncidentInput): Promise<Incident> {
    const draft = await apiClient.post<IncidentDraftResponse>("/incidents/drafts", {
      type: input.type,
      dateTime: input.dateTime,
      description: input.description,
      healthDataJson: input.healthDataJson
    });

    await apiClient.put(`/incidents/drafts/${draft.data.id}/details`, {
      locationId: input.locationId,
      description: input.description,
      dateTime: input.dateTime
    });

    await apiClient.put(`/incidents/drafts/${draft.data.id}/photos`, {
      photoUrls: input.photoUrls
    });

    const submitted = await apiClient.post<Incident>(`/incidents/drafts/${draft.data.id}/submit`);
    return submitted.data;
  },

  async updateIncident(id: string, input: UpdateIncidentInput): Promise<Incident> {
    const response = await apiClient.put<Incident>(`/incidents/${id}`, input);
    return response.data;
  }
};
