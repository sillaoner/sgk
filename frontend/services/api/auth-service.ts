<<<<<<< HEAD
import { apiClient } from "@/services/api/client";
import type { LoginRequest, LoginResponse } from "@/types/auth";

interface ApiLoginResponse {
  accessToken?: string;
  token?: string;
  expiresIn?: number;
  user: {
    id: string;
    fullName: string;
    role: "ohs" | "supervisor" | "manager" | "hr";
    departmentName?: string;
  };
=======
"use client";

import { getApiBaseUrl } from "@/lib/env";
import { setStoredUser, setToken } from "@/services/auth/token-storage";
import type { AuthUser, LoginRequest, LoginResponse, UserRole } from "@/types/auth";

const AUTH_DEBUG = process.env.NEXT_PUBLIC_AUTH_DEBUG === "true";

interface ApiErrorResponse {
  error?: string;
  message?: string;
}

function debugLog(label: string, payload: unknown) {
  if (!AUTH_DEBUG) {
    return;
  }

  console.log(`[auth.debug] ${label}`, payload);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUserRole(value: unknown): value is UserRole {
  return value === "ohs" || value === "supervisor" || value === "manager" || value === "hr";
}

function isAuthUser(value: unknown): value is AuthUser {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.fullName === "string" &&
    value.fullName.length > 0 &&
    isUserRole(value.role) &&
    (typeof value.departmentName === "string" || value.departmentName === null)
  );
}

function isLoginResponse(value: unknown): value is LoginResponse {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.accessToken === "string" &&
    value.accessToken.length > 0 &&
    typeof value.expiresIn === "number" &&
    Number.isFinite(value.expiresIn) &&
    value.expiresIn > 0 &&
    isAuthUser(value.user)
  );
}

function toApiErrorMessage(value: unknown, status: number): string {
  if (isRecord(value)) {
    const payload = value as ApiErrorResponse;
    if (typeof payload.error === "string" && payload.error.length > 0) {
      return payload.error;
    }

    if (typeof payload.message === "string" && payload.message.length > 0) {
      return payload.message;
    }
  }

  if (status === 401) {
    return "Invalid username or password.";
  }

  return `Login failed with status ${status}.`;
>>>>>>> abd55b3 (fixes)
}

export const authService = {
  async login(input: LoginRequest): Promise<LoginResponse> {
<<<<<<< HEAD
    const response = await apiClient.post<ApiLoginResponse>("/auth/login", input);

    return {
      accessToken: response.data.accessToken ?? response.data.token ?? "",
      expiresIn: response.data.expiresIn ?? 3600,
      user: response.data.user
    };
=======
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const apiBaseUrl = getApiBaseUrl();
    const loginUrl = `${apiBaseUrl}/auth/login`;

    try {
      debugLog("login.request", {
        url: loginUrl,
        username: input.username.trim()
      });

      const response = await fetch(loginUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: input.username.trim(),
          password: input.password
        }),
        signal: controller.signal
      });

      const payload = (await response.json()) as unknown;
      debugLog("login.url", loginUrl);
      debugLog("login.status", response.status);
      debugLog("login.payload", payload);

      if (!response.ok) {
        throw new Error(toApiErrorMessage(payload, response.status));
      }

      if (!isLoginResponse(payload)) {
        throw new Error("Invalid API response");
      }

      setToken(payload.accessToken);
      setStoredUser(payload.user);

      return payload;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new Error("Login request timed out. Please try again.");
      }

      if (error instanceof SyntaxError) {
        throw new Error("Invalid API response");
      }

      if (error instanceof TypeError) {
        throw new Error("Unable to reach the server. Check API URL and network connectivity.");
      }

      throw error instanceof Error ? error : new Error("Unexpected login error.");
    } finally {
      clearTimeout(timeoutId);
    }
>>>>>>> abd55b3 (fixes)
  }
};
