"use client";

import axios, { type AxiosError, type AxiosRequestConfig } from "axios";
<<<<<<< HEAD
import { env } from "@/lib/env";
import { enqueueMutation } from "@/services/offline/queue";
import { useAuthStore } from "@/store/auth-store";

const MUTATION_METHODS = new Set(["post", "put", "patch", "delete"]);
=======
import { getApiBaseUrl } from "@/lib/env";
import { logout } from "@/services/auth/auth-utils";
import { getToken, setToken } from "@/services/auth/token-storage";
import { enqueueMutation } from "@/services/offline/queue";
import { useAuthStore } from "@/store/auth-store";

type ApiErrorPayload = {
  error?: string;
  message?: string;
  title?: string;
  errors?: Record<string, string[] | string>;
};

type RefreshResponse = {
  accessToken?: string;
};

type RetriableRequestConfig = AxiosRequestConfig & {
  _retry?: boolean;
};

const MUTATION_METHODS = new Set(["post", "put", "patch", "delete"]);
let refreshPromise: Promise<string | null> | null = null;
const API_DEBUG = process.env.NEXT_PUBLIC_AUTH_DEBUG === "true";
const API_BASE_URL = getApiBaseUrl();
>>>>>>> abd55b3 (fixes)

function isNetworkError(error: AxiosError) {
  return error.code === "ERR_NETWORK" || !error.response;
}

<<<<<<< HEAD
export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 10000,
=======
function debugLog(label: string, payload: unknown) {
  if (!API_DEBUG) {
    return;
  }

  console.log(`[api.debug] ${label}`, payload);
}

function isAuthEndpoint(url?: string) {
  if (!url) {
    return false;
  }

  return url.includes("/auth/login") || url.includes("/auth/refresh");
}

function normalizeFieldName(field: string) {
  if (!field) {
    return "request";
  }

  return field.replace(/^\$\./, "");
}

function extractMessage(data: unknown): string | null {
  if (typeof data === "string" && data.length > 0) {
    return data;
  }

  if (!data || typeof data !== "object") {
    return null;
  }

  const payload = data as ApiErrorPayload;
  if (typeof payload.error === "string" && payload.error.length > 0) {
    return payload.error;
  }

  if (typeof payload.message === "string" && payload.message.length > 0) {
    return payload.message;
  }

  if (payload.errors && typeof payload.errors === "object") {
    const validationErrors = Object.entries(payload.errors)
      .flatMap(([field, messages]) => {
        const label = normalizeFieldName(field);

        if (Array.isArray(messages)) {
          return messages
            .filter((message): message is string => typeof message === "string" && message.length > 0)
            .map((message) => `${label}: ${message}`);
        }

        if (typeof messages === "string" && messages.length > 0) {
          return `${label}: ${messages}`;
        }

        return [];
      })
      .join("; ");

    if (validationErrors.length > 0) {
      return validationErrors;
    }
  }

  if (typeof payload.title === "string" && payload.title.length > 0) {
    return payload.title;
  }

  return null;
}

function extractAccessToken(data: unknown): string | null {
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data) as RefreshResponse;
      return typeof parsed.accessToken === "string" ? parsed.accessToken : null;
    } catch {
      return null;
    }
  }

  if (!data || typeof data !== "object") {
    return null;
  }

  const payload = data as RefreshResponse;
  return typeof payload.accessToken === "string" ? payload.accessToken : null;
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = authClient
      .post<unknown>("/auth/refresh")
      .then((response) => {
        const token = extractAccessToken(response.data);
        if (!token) {
          return null;
        }

        setToken(token);
        useAuthStore.setState((state) => ({
          ...state,
          token,
          isAuthenticated: true
        }));

        return token;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

function setAuthorizationHeader(config: AxiosRequestConfig, token: string) {
  if (!config.headers) {
    config.headers = {};
  }

  if (typeof (config.headers as { set?: (key: string, value: string) => void }).set === "function") {
    (config.headers as { set: (key: string, value: string) => void }).set("Authorization", `Bearer ${token}`);
    return;
  }

  (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
}

export const authClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json"
  }
});

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
>>>>>>> abd55b3 (fixes)
  headers: {
    "Content-Type": "application/json"
  }
});

apiClient.interceptors.request.use((config) => {
<<<<<<< HEAD
  const token = useAuthStore.getState().token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

=======
  const token = getToken() ?? useAuthStore.getState().token;
  if (token) {
    setAuthorizationHeader(config, token);
  }

  debugLog("request", {
    method: config.method?.toUpperCase(),
    url: config.url,
    baseURL: config.baseURL,
    hasAuthorization: Boolean(token)
  });

>>>>>>> abd55b3 (fixes)
  return config;
});

apiClient.interceptors.response.use(
<<<<<<< HEAD
  (response) => response,
  async (error: AxiosError<{ error?: string; message?: string }>) => {
    const config = error.config as AxiosRequestConfig | undefined;
=======
  (response) => {
    debugLog("response", {
      status: response.status,
      method: response.config.method?.toUpperCase(),
      url: response.config.url,
      baseURL: response.config.baseURL
    });

    return response;
  },
  async (error: AxiosError<ApiErrorPayload>) => {
    debugLog("response_error", {
      status: error.response?.status,
      method: error.config?.method?.toUpperCase(),
      url: error.config?.url,
      baseURL: error.config?.baseURL,
      message: error.message,
      data: error.response?.data
    });

    const config = error.config as RetriableRequestConfig | undefined;
>>>>>>> abd55b3 (fixes)
    const method = config?.method?.toLowerCase();

    if (
      config &&
      method &&
      MUTATION_METHODS.has(method) &&
      isNetworkError(error) &&
      config.headers?.["X-Skip-Queue"] !== "1"
    ) {
      enqueueMutation(config);
<<<<<<< HEAD

=======
>>>>>>> abd55b3 (fixes)
      return Promise.reject(new Error("No connection. Request saved and will sync automatically."));
    }

    if (error.response?.status === 401) {
<<<<<<< HEAD
      useAuthStore.getState().clearSession();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }

    const message =
      error.response?.data?.error ??
      error.response?.data?.message ??
=======
      if (config && !config._retry && !isAuthEndpoint(config.url)) {
        config._retry = true;
        const refreshedToken = await refreshAccessToken();

        if (refreshedToken) {
          setAuthorizationHeader(config, refreshedToken);
          return apiClient.request(config);
        }
      }

      logout({ redirectTo: "/login" });
      return Promise.reject(new Error("Session expired. Please sign in again."));
    }

    const message =
      extractMessage(error.response?.data) ??
>>>>>>> abd55b3 (fixes)
      error.message ??
      "Unexpected API error";

    return Promise.reject(new Error(message));
  }
);
