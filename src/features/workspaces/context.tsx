import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { PermCode } from "../../shared/authz/perms";
import { PERMS } from "../../shared/authz/perms";
import {
  DEFAULT_WORKSPACES,
  getDefaultDashboard,
  getDefaultMenu,
  ICONS,
} from "./defaults";
import {
  useCurrentWorkspace,
  useDepartmentWorkspaces,
  useWorkspaceDashboard,
  useWorkspaceMenu,
} from "./hooks";
import type {
  DepartmentWorkspace,
  WorkspaceDashboard,
  WorkspaceMenuItem,
} from "./types";

const STORAGE_KEY = "erp.currentWorkspaceKey";

type DepartmentWorkspaceContextValue = {
  workspaces: DepartmentWorkspace[];
  currentWorkspace: DepartmentWorkspace;
  menu: WorkspaceMenuItem[];
  dashboard: WorkspaceDashboard;
  loading: boolean;
  setWorkspaceKey: (key: string) => void;
};

const DepartmentWorkspaceContext =
  createContext<DepartmentWorkspaceContextValue | null>(null);

function readStoredWorkspaceKey() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(STORAGE_KEY) || "";
}

function storeWorkspaceKey(key: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, key);
}

function normalizeWorkspace(raw: any): DepartmentWorkspace | null {
  const key = raw?.key ?? raw?.workspaceKey ?? raw?.code;
  if (!key) return null;

  const fallback = DEFAULT_WORKSPACES.find((item) => item.key === key);

  return {
    ...fallback,
    ...raw,
    key,
    name: raw?.name ?? raw?.label ?? fallback?.name ?? key,
    dashboardKey:
      raw?.dashboardKey ?? fallback?.dashboardKey ?? `${key}.dashboard`,
  };
}

function normalizeMenu(items: WorkspaceMenuItem[] | undefined) {
  return (items ?? []).map((item) => ({
    ...item,
    icon:
      typeof item.icon === "string"
        ? ICONS[item.icon] ?? ICONS[item.icon.toLowerCase()] ?? undefined
        : item.icon,
    children: item.children ? normalizeMenu(item.children) : undefined,
  }));
}

function menuContains(items: WorkspaceMenuItem[], key: string): boolean {
  return items.some(
    (item) => item.key === key || (item.children ? menuContains(item.children, key) : false),
  );
}

function normalizeIconItems<T extends { icon?: React.ReactNode | string | null }>(
  items: T[] | undefined,
) {
  return (items ?? []).map((item) => ({
    ...item,
    icon:
      typeof item.icon === "string"
        ? ICONS[item.icon] ?? ICONS[item.icon.toLowerCase()] ?? undefined
        : item.icon,
  }));
}

function normalizeDashboard(
  raw: WorkspaceDashboard | null | undefined,
): WorkspaceDashboard | null {
  if (!raw) return null;
  const apiDashboard = raw as WorkspaceDashboard & {
    processFlow?: WorkspaceDashboard["processSteps"];
    reportItems?: WorkspaceDashboard["reports"];
    shortcutItems?: WorkspaceDashboard["shortcuts"];
  };

  return {
    ...apiDashboard,
    processSteps: normalizeIconItems(
      apiDashboard.processSteps ?? apiDashboard.processFlow,
    ),
    reports: apiDashboard.reports ?? apiDashboard.reportItems ?? [],
    shortcuts: normalizeIconItems(
      apiDashboard.shortcuts ?? apiDashboard.shortcutItems,
    ),
  };
}

function mergeAdminWorkspaces(workspaces: DepartmentWorkspace[]) {
  const seen = new Set(workspaces.map((item) => item.key));
  return [
    ...workspaces,
    ...DEFAULT_WORKSPACES.filter((item) => !seen.has(item.key)),
  ];
}

function pickInitialWorkspace(
  storedKey: string,
  current: DepartmentWorkspace | null | undefined,
  workspaces: DepartmentWorkspace[],
) {
  return (
    workspaces.find((item) => item.key === storedKey) ??
    workspaces.find((item) => item.key === current?.key) ??
    workspaces.find((item) => item.isCurrent) ??
    workspaces.find((item) => item.isPrimary) ??
    workspaces[0] ??
    DEFAULT_WORKSPACES[0]
  );
}

export function useDepartmentWorkspaceValue({
  enabled,
  permissions,
}: {
  enabled: boolean;
  permissions: Set<PermCode>;
}): DepartmentWorkspaceContextValue {
  const isAdmin = permissions.has(PERMS.SYSTEM_RBAC_ADMIN);
  const [selectedKey, setSelectedKey] = useState(readStoredWorkspaceKey);

  const workspacesQuery = useDepartmentWorkspaces({ enabled });
  const currentQuery = useCurrentWorkspace({ enabled });

  const workspaces = useMemo(() => {
    const fromApi = (workspacesQuery.data ?? [])
      .map(normalizeWorkspace)
      .filter(Boolean) as DepartmentWorkspace[];
    const current = normalizeWorkspace(currentQuery.data);
    const source = fromApi.length
      ? fromApi
      : current
        ? [current]
        : DEFAULT_WORKSPACES;

    return isAdmin ? mergeAdminWorkspaces(source) : source;
  }, [currentQuery.data, isAdmin, workspacesQuery.data]);

  const currentWorkspace = useMemo(
    () =>
      pickInitialWorkspace(
        selectedKey,
        normalizeWorkspace(currentQuery.data),
        workspaces,
      ),
    [currentQuery.data, selectedKey, workspaces],
  );

  useEffect(() => {
    if (!workspaces.length || selectedKey === currentWorkspace.key) return;
    setSelectedKey(currentWorkspace.key);
    storeWorkspaceKey(currentWorkspace.key);
  }, [currentWorkspace.key, selectedKey, workspaces.length]);

  const menuQuery = useWorkspaceMenu(currentWorkspace.key, { enabled });
  const dashboardQuery = useWorkspaceDashboard(currentWorkspace.dashboardKey, {
    enabled,
  });

  const menu = useMemo(() => {
    const apiMenu = normalizeMenu(menuQuery.data);
    const baseMenu = apiMenu.length ? apiMenu : getDefaultMenu(currentWorkspace.key);
    const canViewOpeningBalances =
      isAdmin || permissions.has(PERMS.SYSTEM_OPENING_BALANCES_VIEW);

    if (
      !canViewOpeningBalances ||
      menuContains(baseMenu, "/settings/opening-balances")
    ) {
      return baseMenu;
    }

    return [
      ...baseMenu,
      {
        key: "/settings/opening-balances",
        label: "Số dư đầu kỳ",
        icon: ICONS.database,
        need: PERMS.SYSTEM_OPENING_BALANCES_VIEW,
      },
    ];
  }, [currentWorkspace.key, isAdmin, menuQuery.data, permissions]);

  const dashboard = useMemo(
    () => {
      const fallback = getDefaultDashboard(
        currentWorkspace.dashboardKey,
        currentWorkspace.name,
      );
      const apiDashboard = normalizeDashboard(dashboardQuery.data);
      if (!apiDashboard) return fallback;

      return {
        ...fallback,
        ...apiDashboard,
        metrics: apiDashboard.metrics?.length
          ? apiDashboard.metrics
          : fallback.metrics,
        tasks: apiDashboard.tasks ?? fallback.tasks,
        alerts: apiDashboard.alerts ?? fallback.alerts,
        quickActions: apiDashboard.quickActions?.length
          ? apiDashboard.quickActions
          : fallback.quickActions,
        processSteps: apiDashboard.processSteps?.length
          ? apiDashboard.processSteps
          : fallback.processSteps,
        reports: apiDashboard.reports?.length
          ? apiDashboard.reports
          : fallback.reports,
        shortcuts: apiDashboard.shortcuts?.length
          ? apiDashboard.shortcuts
          : fallback.shortcuts,
      };
    },
    [currentWorkspace.dashboardKey, currentWorkspace.name, dashboardQuery.data],
  );

  const setWorkspaceKey = (key: string) => {
    setSelectedKey(key);
    storeWorkspaceKey(key);
  };

  return {
    workspaces,
    currentWorkspace,
    menu,
    dashboard,
    loading:
      workspacesQuery.isLoading ||
      currentQuery.isLoading ||
      menuQuery.isLoading ||
      dashboardQuery.isLoading,
    setWorkspaceKey,
  };
}

export function DepartmentWorkspaceProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: DepartmentWorkspaceContextValue;
}) {
  return (
    <DepartmentWorkspaceContext.Provider value={value}>
      {children}
    </DepartmentWorkspaceContext.Provider>
  );
}

export function useDepartmentWorkspaceContext() {
  return useContext(DepartmentWorkspaceContext);
}
