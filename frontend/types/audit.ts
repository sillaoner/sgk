export interface AuditLog {
  id: number;
  actorUserId?: string;
  entityType: string;
  entityId: string;
  action: string;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}
