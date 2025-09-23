import { apiCall } from "../../shared/lib/api";
import {
  ApiResponse,
  Department,
  DeptListQuery,
  DeptSite,
  DeptTreeNode,
  Paged,
} from "./types";

export const DepartmentsApi = {
  list: (query: DeptListQuery) =>
    apiCall<ApiResponse<Paged<Department>>>("department.list", { query }).then(
      (r) => r.data!
    ),

  tree: (opts?: { rootId?: string }) =>
    apiCall<ApiResponse<DeptTreeNode[]>>("department.tree", {
      params: opts,
    }).then((r) => r.data!),

  detail: (id: string) =>
    apiCall<ApiResponse<Department>>("department.detail", {
      params: { id },
    }).then((r) => r.data!),

  create: (p: Partial<Department>) =>
    apiCall<ApiResponse<Department>>("department.create", { data: p }).then(
      (r) => r.data
    ),

  update: (id: string, data: Partial<Department>) =>
    apiCall<ApiResponse<Department>>("department.update", {
      params: { id },
      data,
    }).then((r) => r.data!),

  remove: (id: string, byUserId?: string) =>
    apiCall<ApiResponse<{ ok: true }>>("department.delete", {
      params: { id },
      data: byUserId ? { byUserId } : undefined,
    }).then((r) => r.data!),

  sites: () =>
    apiCall<ApiResponse<DeptSite>>("department.sites").then((r) => r.data!),
};
