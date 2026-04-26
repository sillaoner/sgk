import { getCache, setCache } from "@/services/offline/cache";
import { apiClient } from "@/services/api/client";
import type { AuditLog } from "@/types/audit";

const AUDIT_CACHE_KEY = "audit:list";

export const auditService = {
  async listAuditLogs(): Promise<AuditLog[]> {
    try {
      const response = await apiClient.get<AuditLog[]>("/audit-logs");
      setCache(AUDIT_CACHE_KEY, response.data, 60_000);
      return response.data;
    } catch {
      return getCache<AuditLog[]>(AUDIT_CACHE_KEY) ?? [];
    }
  }
};
