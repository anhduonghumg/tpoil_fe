export type NotificationSeverity = "INFO" | "SUCCESS" | "WARNING" | "ERROR";
export type NotificationStatus = "UNREAD" | "READ" | "ARCHIVED";
export type NotificationKind = "ACTION" | "ALERT" | "UPDATE";
export type NotificationTab = "SALES" | "PURCHASES" | "OPERATIONS" | "FINANCE" | "SYSTEM" | "GENERAL";

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
  kind: NotificationKind;
  tab: NotificationTab;
  actionRequired?: boolean;
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

export interface NotificationSummary {
  unread: number;
  openWorkItems: number;
  menuCounts?: Record<string, number>;
  tabs: Record<string, { unread: number; actionRequired: number; total: number }>;
}

export interface NotificationQuickResult {
  tasks: CommonNotification[];
  updates: CommonNotification[];
}
