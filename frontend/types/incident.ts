export type IncidentType = "Accident" | "NearMiss";
export type IncidentStatus = "Open" | "Analysis" | "Closed";

export interface Incident {
  id: string;
  type: IncidentType;
  occurredAt: string;
  locationId?: string;
  reporterId: string;
  description?: string;
  status: IncidentStatus;
  isDraft: boolean;
  photoUrls: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateIncidentInput {
  type: IncidentType;
  occurredAt: string;
  locationId?: string | null;
  description?: string;
  healthDataJson?: string;
  photoUrls?: string[];
}

export interface UpdateIncidentInput {
  description?: string | null;
  status?: IncidentStatus;
}
