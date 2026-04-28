"use client";

import { useAuthStore } from "@/store/auth-store";
import { getStoredUser, isAuthenticated } from "@/services/auth/token-storage";

interface LogoutOptions {
  redirectTo?: string;
}

export function getCurrentUser() {
  return getStoredUser();
}

export function logout(options?: LogoutOptions) {
  useAuthStore.getState().clearSession();

  if (typeof window !== "undefined") {
    const target = options?.redirectTo ?? "/login";
    if (window.location.pathname !== target) {
      window.location.replace(target);
    }
  }
}

export { isAuthenticated };
