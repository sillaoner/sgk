import { getCache, setCache } from "@/services/offline/cache";
import { apiClient } from "@/services/api/client";
import { debugApiResponse, ensureArrayResponse, toErrorWithFallback } from "@/services/api/response-utils";
import type { AuditLog } from "@/types/audit";

const AUDIT_CACHE_KEY = "audit:list";

export const auditService = {
  async listAuditLogs(): Promise<AuditLog[]> {
    try {
      const response = await apiClient.get<unknown>("/audit-logs");
      const logs = ensureArrayResponse<AuditLog>(response.data, "/audit-logs");

      debugApiResponse("audit.list.success", {
        status: response.status,
        count: logs.length
      });

      setCache(AUDIT_CACHE_KEY, logs, 60_000);
      return logs;
    } catch (error) {
      const cached = getCache<AuditLog[]>(AUDIT_CACHE_KEY);
      if (cached) {
        debugApiResponse("audit.list.cache_fallback", { count: cached.length });
        return cached;
      }

      throw toErrorWithFallback(error, "Could not load audit logs.");
    }
  }
};
