import { apiCall } from "../../../shared/lib/api";
import { ApiResponse } from "../../departments/types";
import type {
  PermissionItem,
  RoleCreateInput,
  RoleDetail,
  RoleRow,
  RolesListQuery,
  RolesListRes,
  RoleUpdateInput,
} from "./types";

export const rbacRolesApi = {
  getRoles: (query: RolesListQuery) =>
    apiCall<ApiResponse<RolesListRes>>("rbacAdmin.getRoles", { query }).then(
      (r) => r.data!.data!
    ),
  getRoleDetail: async (id: string): Promise<RoleDetail> => {
    const res = await apiCall<ApiResponse<{ role: RoleDetail }>>(
      "rbacAdmin.getRoleDetail",
      {
        params: { id },
      }
    );
    return res.data!.data!.role;
  },
  listPermissions: async (moduleCode?: string): Promise<PermissionItem[]> => {
    const res = await apiCall<ApiResponse<{ items: PermissionItem[] }>>(
      "rbacAdmin.listPermissions",
      {
        query: moduleCode ? { moduleCode } : undefined,
      }
    );
    return res.data!.data!.items;
  },
  updateRolePermissions: async (id: string, permissionIds: string[]) => {
    await apiCall<ApiResponse<{ ok: boolean }>>(
      "rbacAdmin.updateRolePermissions",
      {
        params: { id },
        data: { permissionIds },
      }
    );
  },
  createRole: (data: RoleCreateInput) =>
    apiCall<ApiResponse<RoleRow>>("rbacAdmin.createRole", { data }).then(
      (r) => r.data!.data!
    ),

  updateRole: (id: string, data: RoleUpdateInput) =>
    apiCall<ApiResponse<RoleRow>>("rbacAdmin.updateRole", {
      params: { id },
      data,
    }).then((r) => r.data!.data!),

  deleteRole: (id: string) =>
    apiCall<ApiResponse<{ ok: true }>>("rbacAdmin.deleteRole", {
      params: { id },
    }).then((r) => r.data!.data!),
};
