"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { clearStoredUser, clearToken, setStoredUser, setToken } from "@/services/auth/token-storage";
import type { AuthUser, LoginResponse } from "@/types/auth";

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  setSession: (payload: LoginResponse) => void;
  clearSession: () => void;
}

function writeAuthCookies(user: AuthUser | null) {
  if (typeof document === "undefined") {
    return;
  }

  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";

  if (!user) {
    document.cookie = `auth_state=; Path=/; Max-Age=0; SameSite=Strict${secure}`;
    document.cookie = `user_role=; Path=/; Max-Age=0; SameSite=Strict${secure}`;
    return;
  }

  const ttl = 60 * 60 * 8;
  document.cookie = `auth_state=1; Path=/; Max-Age=${ttl}; SameSite=Strict${secure}`;
  document.cookie = `user_role=${user.role}; Path=/; Max-Age=${ttl}; SameSite=Strict${secure}`;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      setSession: (payload) => {
        writeAuthCookies(payload.user);
        setToken(payload.accessToken);
        setStoredUser(payload.user);
        set({
          token: payload.accessToken,
          user: payload.user,
          isAuthenticated: true
        });
      },
      clearSession: () => {
        writeAuthCookies(null);
        clearToken();
        clearStoredUser();
        set({ token: null, user: null, isAuthenticated: false });
      }
    }),
    {
      name: "ohs-auth-session",
      storage: createJSONStorage(() => sessionStorage)
    }
  )
);
