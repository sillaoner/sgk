import { getCache, setCache } from "@/services/offline/cache";
import { apiClient } from "@/services/api/client";
import type { DashboardSummary } from "@/types/dashboard";

const DASHBOARD_CACHE_KEY = "dashboard:summary";

export const dashboardService = {
  async getSummary(): Promise<DashboardSummary> {
    try {
      const response = await apiClient.get<DashboardSummary>("/dashboard/summary");
      setCache(DASHBOARD_CACHE_KEY, response.data, 30_000);
      return response.data;
    } catch {
      return (
        getCache<DashboardSummary>(DASHBOARD_CACHE_KEY) ?? {
          totalIncidents: 0,
          openIncidents: 0,
          incidentsInAnalysis: 0,
          closedIncidents: 0,
          pendingActions: 0,
          overdueActions: 0
        }
      );
    }
  }
};
