import type { UiRole, UserRole } from "@/types/auth";

export const OFFLINE_QUEUE_KEY = "ohs:offline-queue";
export const CACHE_PREFIX = "ohs:cache:";

export const ROLE_MAP: Record<UserRole, UiRole> = {
  ohs: "admin",
  manager: "admin",
  supervisor: "user",
  hr: "user"
};

export const PROTECTED_ROUTES = ["/dashboard", "/incidents", "/analyses", "/audit-logs"] as const;
