import { getCache, setCache } from "@/services/offline/cache";
import { apiClient } from "@/services/api/client";
import type { RootCauseAnalysis, UpsertAnalysisInput } from "@/types/analysis";

const ANALYSES_CACHE_KEY = "analyses:list";

export const analysisService = {
  async listAnalyses(): Promise<RootCauseAnalysis[]> {
    try {
      const response = await apiClient.get<RootCauseAnalysis[]>("/analyses");
      setCache(ANALYSES_CACHE_KEY, response.data, 60_000);
      return response.data;
    } catch {
      return getCache<RootCauseAnalysis[]>(ANALYSES_CACHE_KEY) ?? [];
    }
  },

  async upsertAnalysis(input: UpsertAnalysisInput): Promise<RootCauseAnalysis> {
    const response = await apiClient.put<RootCauseAnalysis>(
      `/incidents/${input.incidentId}/analysis`,
      {
        cause1: input.cause1,
        cause2: input.cause2,
        cause3: input.cause3,
        cause4: input.cause4,
        cause5: input.cause5,
        category: input.category,
        fishboneJson: input.fishboneJson
      }
    );

    return response.data;
  }
};
