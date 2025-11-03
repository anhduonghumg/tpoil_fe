import { apiCall } from "../../shared/lib/api";
import { ApiResponse } from "../departments/types";
import type { BirthdayItem, Paged, User } from "./types";

export const UsersApi = {
  list: (query: any) =>
    apiCall<ApiResponse<Paged<User>>>("employee.list", { query }).then(
      (r) => r.data?.data
    ),
  detail: (id: string) =>
    apiCall<ApiResponse<User>>("employee.detail", { params: { id } }).then(
      (r) => r.data?.data
    ),
  create: (p: Partial<User>) =>
    apiCall<ApiResponse<User>>("employee.create", { data: p }).then(
      (r) => r.data
    ),

  // update: (id: string, data: Partial<User>) =>
  //   apiCall<User>("employee.update", { params: { id }, data }).then(
  //     (r) => r.data
  //   ),

  update: (id: string, payload: Partial<User>) =>
    apiCall<ApiResponse<User>>("employee.update", {
      params: { id },
      data: payload,
    }).then((r) => r.data),

  delete: (id: string) =>
    apiCall<ApiResponse<User>>("employee.delete", { params: { id } }).then(
      (r) => r.data
    ),

  deleteMany: (ids: string[]) =>
    apiCall<ApiResponse<{ count: number }>>("employee.bulkDelete", {
      data: { ids },
    }).then((r) => r.data),

  departments: () =>
    apiCall<Array<{ id: string; name: string }>>("user.departments").then(
      (r) => r.data
    ),
  roles: () =>
    apiCall<ApiResponse<Array<{ id: string; fullName: string }>>>(
      "employee.roles"
    ).then((r) => r.data?.data),
  birthdays: (month: number) =>
    apiCall<
      ApiResponse<
        Array<{ count: number; items: BirthdayItem[]; month: number }>
      >
    >("employee.birthdays", {
      query: { month },
    }).then((r) => r.data?.data),
};
