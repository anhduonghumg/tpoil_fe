import { apiCall } from "../../shared/lib/api";
import { ApiResponse } from "../departments/types";
import type { Paged, User } from "./types";

export const UsersApi = {
  list: (query: any) =>
    apiCall<ApiResponse<Paged<User>>>("employee.list", { query }).then(
      (r) => r.data?.data
    ),
  detail: (id: string) =>
    apiCall<User>("user.detail", { params: { id } }).then((r) => r.data),
  create: (p: Partial<User>) =>
    apiCall<ApiResponse<User>>("employee.create", { data: p }).then(
      (r) => r.data
    ),
  update: (id: string, data: Partial<User>) =>
    apiCall<User>("user.update", { params: { id }, data }).then((r) => r.data),
  remove: (id: string) =>
    apiCall("user.delete", { params: { id } }).then((r) => r.data),

  departments: () =>
    apiCall<Array<{ id: string; name: string }>>("user.departments").then(
      (r) => r.data
    ),
  roles: () =>
    apiCall<ApiResponse<Array<{ id: string; name: string }>>>(
      "employee.roles"
    ).then((r) => r.data),
};
