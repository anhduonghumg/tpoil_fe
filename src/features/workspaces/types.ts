import type { ReactNode } from "react";

export type DepartmentWorkspaceKey =
  | "purchase"
  | "sales"
  | "operations"
  | "warehouse"
  | "legal"
  | "executive"
  | "admin"
  | string;

export type WorkspaceMenuItem = {
  key: string;
  label: string;
  icon?: ReactNode | string | null;
  need?: string | string[] | null;
  needAny?: string[];
  /** "group" dựng tiêu đề mục (I. TỔNG QUAN, II. KHAI BÁO...), không bấm được. */
  type?: "group";
  children?: WorkspaceMenuItem[];
};

export type DepartmentWorkspace = {
  id?: string;
  key: DepartmentWorkspaceKey;
  name: string;
  departmentCode?: string | null;
  departmentName?: string | null;
  dashboardKey: string;
  isPrimary?: boolean;
  isCurrent?: boolean;
};

export type DashboardMetric = {
  key?: string;
  label: string;
  value: string | number | null;
  hint?: string | null;
};

export type DashboardTask = {
  key?: string;
  title: string;
  description?: string | null;
  status?: string | null;
  href?: string | null;
};

export type DashboardAlert = {
  key?: string;
  title: string;
  description?: string | null;
  level?: "info" | "warning" | "error" | "success" | string;
  href?: string | null;
};

export type DashboardQuickAction = {
  key?: string;
  label: string;
  href?: string | null;
};

export type WorkspaceProcessStep = {
  key?: string;
  label: string;
  description?: string | null;
  href?: string | null;
  icon?: ReactNode | string | null;
  need?: string | string[] | null;
};

export type WorkspaceReport = {
  key?: string;
  label: string;
  description?: string | null;
  href?: string | null;
  need?: string | string[] | null;
};

export type WorkspaceShortcut = {
  key?: string;
  label: string;
  href?: string | null;
  icon?: ReactNode | string | null;
  need?: string | string[] | null;
};

export type WorkspaceDashboard = {
  key: string;
  title: string;
  description?: string | null;
  workspaceName?: string | null;
  metrics: DashboardMetric[];
  tasks: DashboardTask[];
  alerts: DashboardAlert[];
  quickActions: DashboardQuickAction[];
  processSteps?: WorkspaceProcessStep[];
  reports?: WorkspaceReport[];
  shortcuts?: WorkspaceShortcut[];
};
