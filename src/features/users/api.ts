import { apiCall } from "../../shared/lib/api";
import { ApiResponse } from "../../shared/lib/types";
import type { UsersListParams } from "./types";

export const UsersApi = {
  list: (query: UsersListParams) => apiCall("user.list", { query }),
  detail: (id: string) => apiCall("user.detail", { params: { id } }),
  create: (data: any) => apiCall("user.create", { data }),
  update: (id: string, data: any) =>
    apiCall("user.update", { params: { id }, data }),
  delete: (id: string) => apiCall("user.delete", { params: { id } }),

  rolesSelect: () => apiCall("user.roles"),

  setEmployee: (id: string, employeeId: string | null) =>
    apiCall("user.setEmployee", { params: { id }, data: { employeeId } }),

  setRoles: (id: string, roleIds: string[]) =>
    apiCall("user.setRoles", { params: { id }, data: { roleIds } }),

  resetPassword: (id: string, password: string) =>
    apiCall<ApiResponse<any>>("user.resetPassword", {
      params: { id },
      data: { password },
    }),
};
