"use client";

import axios, { type AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";
import { getApiBaseUrl } from "@/lib/env";
import { logout } from "@/services/auth/auth-utils";
import { getToken } from "@/services/auth/token-storage";
import { enqueueMutation } from "@/services/offline/queue";
import { useAuthStore } from "@/store/auth-store";

type ApiErrorPayload = {
  error?: string;
  message?: string;
  title?: string;
  errors?: Record<string, string[] | string>;
};

const MUTATION_METHODS = new Set(["post", "put", "patch", "delete"]);
const API_DEBUG = process.env.NEXT_PUBLIC_AUTH_DEBUG === "true";
const API_BASE_URL = getApiBaseUrl();

function debugLog(label: string, payload: unknown) {
  if (!API_DEBUG) {
    return;
  }

  console.log(`[api.debug] ${label}`, payload);
}

function isNetworkError(error: AxiosError) {
  return error.code === "ERR_NETWORK" || !error.response;
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

function toPlainHeaders(headers: AxiosRequestConfig["headers"]): Record<string, string> | undefined {
  if (!headers) {
    return undefined;
  }

  if (typeof (headers as { toJSON?: () => unknown }).toJSON === "function") {
    const json = (headers as { toJSON: () => unknown }).toJSON();
    if (json && typeof json === "object" && !Array.isArray(json)) {
      return Object.fromEntries(
        Object.entries(json as Record<string, unknown>)
          .filter((entry) => typeof entry[1] === "string")
          .map(([key, value]) => [key, String(value)])
      );
    }
  }

  if (typeof headers === "object" && !Array.isArray(headers)) {
    return Object.fromEntries(
      Object.entries(headers as Record<string, unknown>)
        .filter((entry) => typeof entry[1] === "string")
        .map(([key, value]) => [key, String(value)])
    );
  }

  return undefined;
}

function getHeaderValue(headers: AxiosRequestConfig["headers"], name: string): string | undefined {
  if (!headers) {
    return undefined;
  }

  const key = name.toLowerCase();

  if (typeof (headers as { get?: (header: string) => unknown }).get === "function") {
    const value = (headers as { get: (header: string) => unknown }).get(name);
    return typeof value === "string" ? value : undefined;
  }

  if (typeof headers === "object" && !Array.isArray(headers)) {
    const record = headers as Record<string, unknown>;
    for (const [headerName, value] of Object.entries(record)) {
      if (headerName.toLowerCase() === key && typeof value === "string") {
        return value;
      }
    }
  }

  return undefined;
}

function setAuthorizationHeader(config: InternalAxiosRequestConfig, token: string) {
  if (typeof config.headers.set === "function") {
    config.headers.set("Authorization", `Bearer ${token}`);
    return;
  }

  (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json"
  }
});

apiClient.interceptors.request.use((config) => {
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

  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    debugLog("response", {
      status: response.status,
      method: response.config.method?.toUpperCase(),
      url: response.config.url,
      baseURL: response.config.baseURL
    });

    return response;
  },
  (error: AxiosError<ApiErrorPayload>) => {
    debugLog("response_error", {
      status: error.response?.status,
      method: error.config?.method?.toUpperCase(),
      url: error.config?.url,
      baseURL: error.config?.baseURL,
      message: error.message,
      data: error.response?.data
    });

    const config = error.config;
    const method = config?.method?.toLowerCase();
    const shouldSkipQueue = getHeaderValue(config?.headers, "X-Skip-Queue") === "1";

    if (config && method && MUTATION_METHODS.has(method) && isNetworkError(error) && !shouldSkipQueue) {
      enqueueMutation({
        method: config.method,
        url: config.url,
        data: config.data,
        params: config.params,
        headers: toPlainHeaders(config.headers)
      });

      return Promise.reject(new Error("No connection. Request saved and will sync automatically."));
    }

    if (error.response?.status === 401 && !isAuthEndpoint(config?.url)) {
      logout({ redirectTo: "/login" });
      return Promise.reject(new Error("Session expired. Please sign in again."));
    }

    const message = extractMessage(error.response?.data) ?? error.message ?? "Unexpected API error";
    return Promise.reject(new Error(message));
  }
);
