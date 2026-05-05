import { apiCall } from "../../shared/lib/api";
import { ApiResponse } from "../../shared/lib/types";
import type {
  CreateTermPurchaseOrderPayload,
  CreateTermPurchaseOrderResult,
  TermPurchaseOrderListQuery,
  TermPurchaseOrderListResult,
} from "./types";

export const TermPurchaseOrdersApi = {
  list: (query: TermPurchaseOrderListQuery) =>
    apiCall<ApiResponse<TermPurchaseOrderListResult>>(
      "purchaseOrders.termList",
      { query },
    ).then((r) => r.data!.data),

  create: (data: CreateTermPurchaseOrderPayload) =>
    apiCall<ApiResponse<CreateTermPurchaseOrderResult>>(
      "purchaseOrders.create",
      { data },
    ).then((r) => (r.data!.data ?? r.data) as any),
};
