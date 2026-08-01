export type NotificationSeverity = "INFO" | "SUCCESS" | "WARNING" | "ERROR";
export type NotificationStatus = "UNREAD" | "READ" | "ARCHIVED";

export interface CommonNotification {
  id: string;
  notificationId: string;
  eventType: string;
  moduleCode: string;
  category: string;
  severity: NotificationSeverity;
  title: string;
  body: string;
  entityType?: string | null;
  entityId?: string | null;
  action?: string | null;
  metadata?: Record<string, unknown> | null;
  status: NotificationStatus;
  readAt?: string | null;
  occurredAt: string;
  createdAt: string;
}

export interface NotificationListResult {
  items: CommonNotification[];
  nextCursor?: string | null;
}

