import { apiCall } from "../../shared/lib/api";
import type { ApiResponse } from "../../shared/lib/types";
import type {
  DeleteEnvironmentTaxResult,
  EnvironmentTaxListQuery,
  EnvironmentTaxListResult,
  EnvironmentTaxRate,
  UpsertEnvironmentTaxPayload,
} from "./types";

function normalizeList(payload: any): EnvironmentTaxListResult {
  const data = payload?.data ?? payload;

  if (Array.isArray(data)) {
    return {
      items: data,
      total: data.length,
    };
  }

  return {
    items: data?.items ?? [],
    total: data?.total ?? data?.items?.length ?? 0,
  };
}

export const EnvironmentTaxesApi = {
  list: (query: EnvironmentTaxListQuery) =>
    apiCall<ApiResponse<EnvironmentTaxListResult> | EnvironmentTaxListResult>(
      "environmentTaxes.list",
      {
        query,
      },
    ).then((r) => normalizeList(r.data)),

  create: (data: UpsertEnvironmentTaxPayload) =>
    apiCall<ApiResponse<EnvironmentTaxRate>>("environmentTaxes.create", {
      data,
    }).then((r) => r.data?.data ?? (r.data as any)),

  update: (id: string, data: Partial<UpsertEnvironmentTaxPayload>) =>
    apiCall<ApiResponse<EnvironmentTaxRate>>("environmentTaxes.update", {
      params: { id },
      data,
    }).then((r) => r.data?.data ?? (r.data as any)),

  delete: (id: string) =>
    apiCall<ApiResponse<DeleteEnvironmentTaxResult>>(
      "environmentTaxes.delete",
      {
        params: { id },
      },
    ).then((r) => r.data?.data ?? (r.data as any)),
};
