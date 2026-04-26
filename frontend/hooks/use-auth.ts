"use client";

import { ROLE_MAP } from "@/lib/constants";
import { useAuthStore } from "@/store/auth-store";

export function useAuth() {
  const { token, user, isAuthenticated, clearSession } = useAuthStore();

  const uiRole = user ? ROLE_MAP[user.role] : null;

  return {
    token,
    user,
    isAuthenticated,
    uiRole,
    isAdmin: uiRole === "admin",
    logout: clearSession
  };
}
