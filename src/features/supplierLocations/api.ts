import { apiCall } from "../../shared/lib/api";
import { ApiResponse } from "../../shared/lib/types";
import type {
  SupplierLocation,
  SupplierLocationListQuery,
  SupplierLocationListResult,
  CreateSupplierLocationPayload,
  UpdateSupplierLocationPayload,
  SupplierOption,
  BatchUpdateSupplierLocationPayload,
} from "./types";

export const SupplierLocationsApi = {
  list: (query: SupplierLocationListQuery) =>
    apiCall<ApiResponse<SupplierLocationListResult>>("supplierLocations.list", {
      query: {
        ...query,
        isActive:
          query.isActive === undefined ? undefined : String(query.isActive),
      } as any,
    }).then((r) => r.data!.data),

  detail: (id: string) =>
    apiCall<ApiResponse<SupplierLocation>>("supplierLocations.detail", {
      params: { id },
    }).then((r) => r.data!.data),

  create: (data: CreateSupplierLocationPayload) =>
    apiCall<
      ApiResponse<{
        createdCount: number;
        skippedCount: number;
        skippedSupplierIds: string[];
      }>
    >("supplierLocations.create", { data }).then((r) => r.data!.data),

  update: (id: string, data: UpdateSupplierLocationPayload) =>
    apiCall<ApiResponse<SupplierLocation>>("supplierLocations.update", {
      params: { id },
      data,
    }).then((r) => r.data!.data),

  batchUpdate: (id: string, data: BatchUpdateSupplierLocationPayload) =>
    apiCall<ApiResponse<SupplierLocation[]>>("supplierLocations.batchUpdate", {
      params: { id },
      data,
    }).then((r) => (r.data!.data ?? r.data) as any),

  deactivate: (id: string) =>
    apiCall<ApiResponse<SupplierLocation>>("supplierLocations.deactivate", {
      params: { id },
    }).then((r) => r.data!.data),

  activate: (id: string) =>
    apiCall<ApiResponse<SupplierLocation>>("supplierLocations.activate", {
      params: { id },
    }).then((r) => r.data!.data),

  suppliersSelect: (keyword = "") =>
    apiCall<ApiResponse<SupplierOption[]>>("customer.select", {
      query: {
        keyword: keyword,
        page: 1,
        pageSize: 100,
        role: "SUPPLIER",
      },
    }).then((r) => r.data!.data ?? []),
};
