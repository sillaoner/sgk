function trimSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

const browserApiBaseUrl = trimSlash(
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://localhost:8080/api"
);

const internalApiBaseUrl = trimSlash(
  process.env.API_BASE_URL_INTERNAL?.trim() || "http://backend:8080/api"
);

export function getApiBaseUrl() {
  return typeof window === "undefined" ? internalApiBaseUrl : browserApiBaseUrl;
}

export const env = {
  apiBaseUrl: getApiBaseUrl(),
  browserApiBaseUrl,
  internalApiBaseUrl,
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "MetalForm OHS"
};
