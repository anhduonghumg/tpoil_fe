import type {
  DepartmentWorkspace,
  WorkspaceDashboard,
  WorkspaceMenuItem,
} from "./types";

export const WorkspaceApi = {
  workspaces: async (): Promise<DepartmentWorkspace[]> => {
    // Workspace configuration is currently client-side. Avoid requesting
    // backend endpoints that are not implemented yet; context.tsx supplies
    // DEFAULT_WORKSPACES when this returns an empty list.
    return [];
  },
  currentWorkspace: async (): Promise<DepartmentWorkspace | null> => {
    return null;
  },
  menu: async (workspaceKey?: string | null): Promise<WorkspaceMenuItem[]> => {
    void workspaceKey;
    return [];
  },
  dashboard: async (dashboardKey: string): Promise<WorkspaceDashboard | null> => {
    void dashboardKey;
    return null;
  },
};
