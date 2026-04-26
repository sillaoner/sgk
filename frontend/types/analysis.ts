export type AnalysisCategory =
  | "human"
  | "machine"
  | "method"
  | "material"
  | "measurement"
  | "environment"
  | "management"
  | "other";

export interface ActionItem {
  id: string;
  analysisId: string;
  description: string;
  responsibleId: string;
  endDate: string;
  status: "pending" | "completed";
  completedAt?: string;
  ohsApprovalAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RootCauseAnalysis {
  id: string;
  incidentId: string;
  cause1: string;
  cause2?: string;
  cause3?: string;
  cause4?: string;
  cause5?: string;
  category: AnalysisCategory;
  fishboneJson: string;
  analystId: string;
  actions: ActionItem[];
  createdAt: string;
  updatedAt: string;
}

export interface UpsertAnalysisInput {
  incidentId: string;
  cause1: string;
  cause2?: string;
  cause3?: string;
  cause4?: string;
  cause5?: string;
  category: AnalysisCategory;
  fishboneJson?: string;
}
