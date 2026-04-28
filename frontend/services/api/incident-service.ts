import { getCache, setCache } from "@/services/offline/cache";
import { apiClient } from "@/services/api/client";
<<<<<<< HEAD
=======
import { debugApiResponse, ensureArrayResponse, toErrorWithFallback } from "@/services/api/response-utils";
>>>>>>> abd55b3 (fixes)
import type { CreateIncidentInput, Incident, UpdateIncidentInput } from "@/types/incident";

const INCIDENTS_CACHE_KEY = "incidents:list";

interface IncidentDraftResponse {
  id: string;
}

export const incidentService = {
  async listIncidents(): Promise<Incident[]> {
    try {
<<<<<<< HEAD
      const response = await apiClient.get<Incident[]>("/incidents");
      setCache(INCIDENTS_CACHE_KEY, response.data, 60_000);
      return response.data;
    } catch {
      return getCache<Incident[]>(INCIDENTS_CACHE_KEY) ?? [];
=======
      const response = await apiClient.get<unknown>("/incidents");
      const incidents = ensureArrayResponse<Incident>(response.data, "/incidents");

      debugApiResponse("incidents.list.success", {
        status: response.status,
        count: incidents.length
      });

      setCache(INCIDENTS_CACHE_KEY, incidents, 60_000);
      return incidents;
    } catch (error) {
      const cached = getCache<Incident[]>(INCIDENTS_CACHE_KEY);
      if (cached) {
        debugApiResponse("incidents.list.cache_fallback", { count: cached.length });
        return cached;
      }

      throw toErrorWithFallback(error, "Could not load incidents.");
>>>>>>> abd55b3 (fixes)
    }
  },

  async createIncident(input: CreateIncidentInput): Promise<Incident> {
<<<<<<< HEAD
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
=======
    debugApiResponse("incidents.create.payload", input);

    try {
      const draftRequest = {
        type: input.type,
        dateTime: input.dateTime,
        description: input.description,
        healthDataJson: input.healthDataJson
      };
      debugApiResponse("incidents.create.draft.request", draftRequest);

      const draft = await apiClient.post<IncidentDraftResponse>("/incidents/drafts", draftRequest);

      const detailsRequest = {
        locationId: input.locationId,
        description: input.description,
        dateTime: input.dateTime
      };
      debugApiResponse("incidents.create.details.request", detailsRequest);

      await apiClient.put(`/incidents/drafts/${draft.data.id}/details`, detailsRequest);

      const photosRequest = { photoUrls: input.photoUrls };
      debugApiResponse("incidents.create.photos.request", photosRequest);

      await apiClient.put(`/incidents/drafts/${draft.data.id}/photos`, photosRequest);

      const submitted = await apiClient.post<Incident>(`/incidents/drafts/${draft.data.id}/submit`);
      return submitted.data;
    } catch (error) {
      throw toErrorWithFallback(error, "Could not create incident.");
    }
>>>>>>> abd55b3 (fixes)
  },

  async updateIncident(id: string, input: UpdateIncidentInput): Promise<Incident> {
    const response = await apiClient.put<Incident>(`/incidents/${id}`, input);
    return response.data;
  }
};
