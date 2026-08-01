import { apiCall } from "../../shared/lib/api"
import type { ApiResponse } from "../../shared/lib/types"
import type { UpsertVatRatePayload, VatRate } from "./types"

export const VatRatesApi = {
  list: () =>
    apiCall<ApiResponse<VatRate[]> | VatRate[]>("vatRates.list").then(
      (result) => (result.data as any)?.data ?? result.data ?? [],
    ),
  select: () =>
    apiCall<ApiResponse<VatRate[]> | VatRate[]>("vatRates.select").then(
      (result) => (result.data as any)?.data ?? result.data ?? [],
    ),
  create: (data: UpsertVatRatePayload) =>
    apiCall<ApiResponse<VatRate> | VatRate>("vatRates.create", { data }).then(
      (result) => (result.data as any)?.data ?? result.data,
    ),
  update: (id: string, data: Partial<UpsertVatRatePayload>) =>
    apiCall<ApiResponse<VatRate> | VatRate>("vatRates.update", {
      params: { id },
      data,
    }).then((result) => (result.data as any)?.data ?? result.data),
  delete: (id: string) =>
    apiCall<ApiResponse<{ id: string }>>("vatRates.delete", {
      params: { id },
    }),
}
