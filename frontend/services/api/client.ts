"use client";

import axios, { type AxiosError, type AxiosRequestConfig } from "axios";
import { env } from "@/lib/env";
import { enqueueMutation } from "@/services/offline/queue";
import { useAuthStore } from "@/store/auth-store";

const MUTATION_METHODS = new Set(["post", "put", "patch", "delete"]);

function isNetworkError(error: AxiosError) {
  return error.code === "ERR_NETWORK" || !error.response;
}

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json"
  }
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ error?: string; message?: string }>) => {
    const config = error.config as AxiosRequestConfig | undefined;
    const method = config?.method?.toLowerCase();

    if (
      config &&
      method &&
      MUTATION_METHODS.has(method) &&
      isNetworkError(error) &&
      config.headers?.["X-Skip-Queue"] !== "1"
    ) {
      enqueueMutation(config);

      return Promise.reject(new Error("No connection. Request saved and will sync automatically."));
    }

    if (error.response?.status === 401) {
      useAuthStore.getState().clearSession();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }

    const message =
      error.response?.data?.error ??
      error.response?.data?.message ??
      error.message ??
      "Unexpected API error";

    return Promise.reject(new Error(message));
  }
);
