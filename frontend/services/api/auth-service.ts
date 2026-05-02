"use client";

import { getApiBaseUrl } from "@/lib/env";
import type { AuthUser, LoginRequest, LoginResponse, UserRole } from "@/types/auth";

const AUTH_DEBUG = process.env.NEXT_PUBLIC_AUTH_DEBUG === "true";

type ApiErrorResponse = {
  error?: string;
  message?: string;
  title?: string;
  errors?: Record<string, string[] | string>;
};

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

function toAuthUser(value: unknown): AuthUser | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.id !== "string" ||
    value.id.length === 0 ||
    typeof value.fullName !== "string" ||
    value.fullName.length === 0 ||
    !isUserRole(value.role) ||
    (value.departmentName !== null && typeof value.departmentName !== "string")
  ) {
    return null;
  }

  return {
    id: value.id,
    fullName: value.fullName,
    role: value.role,
    departmentName: value.departmentName ?? null
  };
}

function toLoginResponse(value: unknown): LoginResponse | null {
  if (!isRecord(value)) {
    return null;
  }

  const user = toAuthUser(value.user);
  if (!user) {
    return null;
  }

  if (
    typeof value.accessToken !== "string" ||
    value.accessToken.length === 0 ||
    typeof value.expiresIn !== "number" ||
    !Number.isFinite(value.expiresIn) ||
    value.expiresIn <= 0
  ) {
    return null;
  }

  return {
    accessToken: value.accessToken,
    expiresIn: value.expiresIn,
    user
  };
}

function toApiErrorMessage(payload: unknown, status: number): string {
  if (typeof payload === "string" && payload.trim().length > 0) {
    return payload;
  }

  if (isRecord(payload)) {
    const errorPayload = payload as ApiErrorResponse;

    if (typeof errorPayload.error === "string" && errorPayload.error.length > 0) {
      return errorPayload.error;
    }

    if (typeof errorPayload.message === "string" && errorPayload.message.length > 0) {
      return errorPayload.message;
    }

    if (errorPayload.errors && typeof errorPayload.errors === "object") {
      for (const value of Object.values(errorPayload.errors)) {
        if (Array.isArray(value)) {
          const first = value.find((item): item is string => typeof item === "string" && item.length > 0);
          if (first) {
            return first;
          }
        }

        if (typeof value === "string" && value.length > 0) {
          return value;
        }
      }
    }

    if (typeof errorPayload.title === "string" && errorPayload.title.length > 0) {
      return errorPayload.title;
    }
  }

  if (status === 401) {
    return "Invalid username or password.";
  }

  return `Login failed with status ${status}.`;
}

export const authService = {
  async login(input: LoginRequest): Promise<LoginResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const loginUrl = `${getApiBaseUrl()}/auth/login`;

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
      debugLog("login.response", {
        status: response.status,
        payload
      });

      if (!response.ok) {
        throw new Error(toApiErrorMessage(payload, response.status));
      }

      const loginResponse = toLoginResponse(payload);
      if (!loginResponse) {
        throw new Error("Invalid API response");
      }

      return loginResponse;
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
  }
};
