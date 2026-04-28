const API_DEBUG = process.env.NEXT_PUBLIC_AUTH_DEBUG === "true";

export function ensureArrayResponse<T>(payload: unknown, endpoint: string): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  throw new Error(`Invalid API response from ${endpoint}. Expected an array.`);
}

export function toErrorWithFallback(error: unknown, fallbackMessage: string): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(fallbackMessage);
}

export function debugApiResponse(label: string, payload: unknown) {
  if (!API_DEBUG) {
    return;
  }

  console.log(`[api.debug] ${label}`, payload);
}
