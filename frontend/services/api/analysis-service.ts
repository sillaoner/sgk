import { getCache, setCache } from "@/services/offline/cache";
import { apiClient } from "@/services/api/client";
import { debugApiResponse, ensureArrayResponse, toErrorWithFallback } from "@/services/api/response-utils";
import type { RootCauseAnalysis, UpsertAnalysisInput } from "@/types/analysis";

const ANALYSES_CACHE_KEY = "analyses:list";

export const analysisService = {
  async listAnalyses(): Promise<RootCauseAnalysis[]> {
    try {
      const response = await apiClient.get<unknown>("/analyses");
      const analyses = ensureArrayResponse<RootCauseAnalysis>(response.data, "/analyses");

      debugApiResponse("analyses.list.success", {
        status: response.status,
        count: analyses.length
      });

      setCache(ANALYSES_CACHE_KEY, analyses, 60_000);
      return analyses;
    } catch (error) {
      const cached = getCache<RootCauseAnalysis[]>(ANALYSES_CACHE_KEY);
      if (cached) {
        debugApiResponse("analyses.list.cache_fallback", { count: cached.length });
        return cached;
      }

      throw toErrorWithFallback(error, "Could not load analyses.");
    }
  },

  async upsertAnalysis(input: UpsertAnalysisInput): Promise<RootCauseAnalysis> {
    const response = await apiClient.put<RootCauseAnalysis>(`/incidents/${input.incidentId}/analysis`, {
      cause1: input.cause1,
      cause2: input.cause2,
      cause3: input.cause3,
      cause4: input.cause4,
      cause5: input.cause5,
      category: input.category,
      fishboneJson: input.fishboneJson?.trim() ? input.fishboneJson.trim() : null
    });

    return response.data;
  }
};
