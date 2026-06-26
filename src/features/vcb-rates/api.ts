import { apiCall } from "../../shared/lib/api";
import type { ApiResponse } from "../../shared/lib/types";
import type {
  DeleteVcbFxRateResult,
  FetchVcbFxRatePayload,
  UpsertVcbFxRatePayload,
  VcbFxRate,
  VcbFxRateListQuery,
} from "./types";

export const VcbRatesApi = {
  list: (query: VcbFxRateListQuery) =>
    apiCall<ApiResponse<VcbFxRate[]>>("vcbFxRates.list", {
      query,
    }).then((r) => r.data?.data ?? (r.data as any)),

  upsert: (data: UpsertVcbFxRatePayload) =>
    apiCall<ApiResponse<VcbFxRate>>("vcbFxRates.upsert", {
      data,
    }).then((r) => r.data?.data ?? (r.data as any)),

  fetchFromVcb: (data: FetchVcbFxRatePayload) =>
    apiCall<ApiResponse<VcbFxRate>>("vcbFxRates.fetchFromVcb", {
      data,
    }).then((r) => r.data?.data ?? (r.data as any)),

  delete: (id: string) =>
    apiCall<ApiResponse<DeleteVcbFxRateResult>>("vcbFxRates.delete", {
      params: { id },
    }).then((r) => r.data?.data ?? (r.data as any)),
};
