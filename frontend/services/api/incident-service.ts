import { getCache, setCache } from "@/services/offline/cache";
import { env } from "@/lib/env";
import { getToken } from "@/services/auth/token-storage";
import { debugApiResponse, ensureArrayResponse, toErrorWithFallback } from "@/services/api/response-utils";
import type { CreateIncidentInput, Incident, UpdateIncidentInput } from "@/types/incident";

const INCIDENTS_CACHE_KEY = "incidents:list";

type IncidentTypeValue = CreateIncidentInput["type"];
type IncidentStatusValue = NonNullable<UpdateIncidentInput["status"]>;

function toIso(date: string): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) {
    throw new Error("Invalid date");
  }

  return d.toISOString();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseApiError(status: number, raw: string): string {
  if (!raw) {
    return `Request failed (${status}).`;
  }

  try {
    const json = JSON.parse(raw) as unknown;

    if (isPlainObject(json)) {
      const direct = json.error ?? json.message ?? json.detail ?? json.title;
      if (typeof direct === "string" && direct.trim().length > 0) {
        return direct;
      }

      const errors = json.errors;
      if (isPlainObject(errors)) {
        for (const value of Object.values(errors)) {
          if (Array.isArray(value)) {
            const first = value.find((item) => typeof item === "string" && item.trim().length > 0);
            if (typeof first === "string") {
              return first;
            }
          }

          if (typeof value === "string" && value.trim().length > 0) {
            return value;
          }
        }
      }
    }
  } catch {
    // Fallback to plain text response.
  }

  return raw.length <= 240 ? raw : `Request failed (${status}).`;
}

function normalizeIncidentType(rawType: unknown): IncidentTypeValue {
  if (typeof rawType === "string") {
    const normalized = rawType.replace(/\s+/g, "");
    if (normalized === "NearMiss" || normalized === "Accident") {
      return normalized;
    }
  }

  if (isPlainObject(rawType) && typeof rawType.value === "string") {
    return normalizeIncidentType(rawType.value);
  }

  throw new Error("Type must be a valid enum name (NearMiss or Accident).");
}

function normalizeIncidentStatus(rawStatus: unknown): IncidentStatusValue {
  if (typeof rawStatus === "string") {
    const normalized = rawStatus.replace(/\s+/g, "").toLowerCase();
    if (normalized === "open") {
      return "Open";
    }

    if (normalized === "analysis") {
      return "Analysis";
    }

    if (normalized === "closed") {
      return "Closed";
    }
  }

  if (isPlainObject(rawStatus) && typeof rawStatus.value === "string") {
    return normalizeIncidentStatus(rawStatus.value);
  }

  throw new Error("Status must be a valid enum name (Open, Analysis, Closed).");
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeIncident(raw: unknown, index: number): Incident {
  if (!isPlainObject(raw)) {
    throw new Error(`Invalid incident payload at index ${index}.`);
  }

  const occurredAtRaw = typeof raw.occurredAt === "string"
    ? raw.occurredAt
    : typeof raw.dateTime === "string"
      ? raw.dateTime
      : null;

  if (!occurredAtRaw) {
    throw new Error(`Incident at index ${index} is missing occurredAt.`);
  }

  if (typeof raw.id !== "string" || raw.id.trim().length === 0) {
    throw new Error(`Incident at index ${index} has an invalid id.`);
  }

  if (typeof raw.reporterId !== "string" || raw.reporterId.trim().length === 0) {
    throw new Error(`Incident ${raw.id} has an invalid reporterId.`);
  }

  const photoUrls = Array.isArray(raw.photoUrls)
    ? raw.photoUrls.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

  return {
    id: raw.id,
    type: normalizeIncidentType(raw.type),
    occurredAt: occurredAtRaw,
    locationId: typeof raw.locationId === "string" ? raw.locationId : undefined,
    reporterId: raw.reporterId,
    description: typeof raw.description === "string" ? raw.description : undefined,
    status: normalizeIncidentStatus(raw.status),
    isDraft: Boolean(raw.isDraft),
    photoUrls,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : occurredAtRaw,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : occurredAtRaw
  };
}

export const incidentService = {
  async listIncidents(): Promise<Incident[]> {
    try {
      const token = getToken();
      if (!token) {
        throw new Error("Unauthorized. Please sign in again.");
      }

      const response = await fetch(`${env.apiBaseUrl}/incidents`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const raw = await response.text();
        throw new Error(parseApiError(response.status, raw));
      }

      const payload = await response.json();
      const rows = ensureArrayResponse<unknown>(payload, "/incidents");
      const incidents = rows.map((row, index) => normalizeIncident(row, index));

      debugApiResponse("incidents.list.success", {
        status: response.status,
        rawCount: rows.length,
        count: incidents.length
      });

      setCache(INCIDENTS_CACHE_KEY, incidents, 60_000);
      return incidents;
    } catch (error) {
      const cached = getCache<Incident[]>(INCIDENTS_CACHE_KEY);
      if (cached) {
        debugApiResponse("incidents.list.cache_fallback", { count: cached.length });
        return cached;
      }

      throw toErrorWithFallback(error, "Could not load incidents.");
    }
  },

  async createIncident(input: CreateIncidentInput): Promise<Incident> {
    if (!input.type) {
      throw new Error("Type is required");
    }

    if (!input.occurredAt) {
      throw new Error("Date / Time is required");
    }

    const token = getToken();
    if (!token) {
      throw new Error("Unauthorized. Please sign in again.");
    }

    const healthDataJson = input.healthDataJson?.trim() ?? "";
    if (healthDataJson) {
      try {
        JSON.parse(healthDataJson);
      } catch {
        throw new Error("Health Data JSON must be valid JSON.");
      }
    }

    const normalizedPhotoUrls = (input.photoUrls ?? [])
      .map((url) => url.trim())
      .filter((url) => url.length > 0);

    for (const url of normalizedPhotoUrls) {
      if (!isValidHttpUrl(url)) {
        throw new Error(`Invalid photo URL: ${url}`);
      }
    }

    const payload = {
      type: normalizeIncidentType(input.type as unknown),
      occurredAt: toIso(input.occurredAt),
      locationId: input.locationId ?? null,
      description: input.description?.trim() ? input.description.trim() : null,
      healthDataJson: healthDataJson || null,
      photoUrls: Array.from(new Set(normalizedPhotoUrls))
    };

    if (process.env.NODE_ENV !== "production") {
      console.log("incident payload", payload);
    }

    const response = await fetch(`${env.apiBaseUrl}/incidents/drafts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const raw = await response.text();
      throw new Error(parseApiError(response.status, raw));
    }

    const incident = normalizeIncident(await response.json(), 0);
    return incident;
  },

  async uploadImages(files: File[]): Promise<string[]> {
    if (!files.length) {
      return [];
    }

    const token = getToken();
    if (!token) {
      throw new Error("Unauthorized. Please sign in again.");
    }

    const formData = new FormData();
    for (const file of files) {
      formData.append("files", file);
    }

    const response = await fetch(`${env.apiBaseUrl}/uploads/images`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const raw = await response.text();
      throw new Error(parseApiError(response.status, raw));
    }

    const json = (await response.json()) as { urls?: unknown };
    if (!json.urls || !Array.isArray(json.urls)) {
      throw new Error("Upload response is invalid.");
    }

    return json.urls.filter((url): url is string => typeof url === "string" && url.length > 0);
  },

  async updateIncident(id: string, input: UpdateIncidentInput): Promise<Incident> {
    if (!id || !/^[0-9a-fA-F-]{36}$/.test(id)) {
      throw new Error("Invalid incident id.");
    }

    const token = getToken();
    if (!token) {
      throw new Error("Unauthorized. Please sign in again.");
    }

    const payload: { description?: string; status?: IncidentStatusValue } = {};

    const normalizedDescription = input.description?.trim();
    if (normalizedDescription) {
      payload.description = normalizedDescription;
    }

    if (input.status) {
      payload.status = normalizeIncidentStatus(input.status);
    }

    if (!payload.description && !payload.status) {
      throw new Error("No fields provided for update.");
    }

    const statusOnlyUpdate = Boolean(payload.status) && !payload.description;
    const endpoint = statusOnlyUpdate ? `${env.apiBaseUrl}/incidents/${id}/status` : `${env.apiBaseUrl}/incidents/${id}`;
    const body = statusOnlyUpdate ? { status: payload.status } : payload;

    const response = await fetch(endpoint, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const raw = await response.text();
      throw new Error(parseApiError(response.status, raw));
    }

    return normalizeIncident(await response.json(), 0);
  }
};
