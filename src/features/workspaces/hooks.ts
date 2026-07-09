import { useQuery } from "@tanstack/react-query";
import { WorkspaceApi } from "./api";

export const WORKSPACE_QUERY_KEYS = {
  all: ["workspaces"] as const,
  list: ["workspaces", "list"] as const,
  current: ["workspaces", "current"] as const,
  menu: (workspaceKey?: string | null) =>
    ["workspaces", "menu", workspaceKey || "current"] as const,
  dashboard: (dashboardKey?: string | null) =>
    ["workspaces", "dashboard", dashboardKey || "empty"] as const,
};

export function useDepartmentWorkspaces(opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: WORKSPACE_QUERY_KEYS.list,
    queryFn: WorkspaceApi.workspaces,
    enabled: opts?.enabled ?? true,
    staleTime: 5 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useCurrentWorkspace(opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: WORKSPACE_QUERY_KEYS.current,
    queryFn: WorkspaceApi.currentWorkspace,
    enabled: opts?.enabled ?? true,
    staleTime: 5 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useWorkspaceMenu(
  workspaceKey?: string | null,
  opts?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: WORKSPACE_QUERY_KEYS.menu(workspaceKey),
    queryFn: () => WorkspaceApi.menu(workspaceKey),
    enabled: opts?.enabled ?? true,
    staleTime: 5 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useWorkspaceDashboard(
  dashboardKey?: string | null,
  opts?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: WORKSPACE_QUERY_KEYS.dashboard(dashboardKey),
    queryFn: () => WorkspaceApi.dashboard(dashboardKey!),
    enabled: !!dashboardKey && (opts?.enabled ?? true),
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
