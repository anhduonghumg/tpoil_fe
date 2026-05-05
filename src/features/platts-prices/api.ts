import { apiCall } from "../../shared/lib/api";
import type { ApiResponse } from "../../shared/lib/types";
import type {
  DeletePlattsQuoteResult,
  PlattsPriceListQuery,
  PlattsQuote,
  UpsertPlattsQuotePayload,
} from "./types";

export const PlattsPricesApi = {
  list: (query: PlattsPriceListQuery) =>
    apiCall<ApiResponse<PlattsQuote[]>>("commodityPriceQuotes.list", {
      query,
    }).then((r) => r.data!.data),

  upsert: (data: UpsertPlattsQuotePayload) =>
    apiCall<ApiResponse<PlattsQuote>>("commodityPriceQuotes.upsert", {
      data,
    }).then((r) => (r.data!.data ?? r.data) as any),

  delete: (id: string) =>
    apiCall<ApiResponse<DeletePlattsQuoteResult>>(
      "commodityPriceQuotes.delete",
      {
        params: { id },
      },
    ).then((r) => (r.data!.data ?? r.data) as any),
};
