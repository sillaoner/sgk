export type IncidentType = "accident" | "near_miss";
export type IncidentStatus = "open" | "analysis" | "closed";

export interface Incident {
  id: string;
  type: IncidentType;
  dateTime: string;
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
  dateTime: string;
  locationId: string;
  description: string;
  photoUrls: string[];
  healthDataJson?: string;
}

export interface UpdateIncidentInput {
  description: string;
  status?: IncidentStatus;
}
