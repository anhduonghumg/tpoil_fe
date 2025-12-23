import { apiCall } from "../../shared/lib/api";
import { ApiResponse } from "../../shared/lib/types";

export const UsersApi = {
  list: (query: any) => apiCall<ApiResponse<any>>("user.list", { query }),
  detail: (id: string) =>
    apiCall<ApiResponse<any>>("user.detail", { params: { id } }),
  create: (data: any) => apiCall<ApiResponse<any>>("user.create", { data }),
  update: (id: string, data: any) =>
    apiCall<ApiResponse<any>>("user.update", { params: { id }, data }),
  delete: (id: string) =>
    apiCall<ApiResponse<any>>("user.delete", { params: { id } }),

  setEmployee: (id: string, employeeId: string | null) =>
    apiCall<ApiResponse<any>>("user.setEmployee", {
      params: { id },
      data: { employeeId },
    }),

  setRoles: (id: string, roleIds: string[]) =>
    apiCall<ApiResponse<any>>("user.setRoles", {
      params: { id },
      data: { roleIds },
    }),

  resetPassword: (id: string, password: string) =>
    apiCall<ApiResponse<any>>("user.resetPassword", {
      params: { id },
      data: { password },
    }),
};
