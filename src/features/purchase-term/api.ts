import { apiCall } from "../../shared/lib/api";
import { ApiResponse } from "../../shared/lib/types";
import type {
  CreateTermPurchaseOrderPayload,
  TermPurchaseOrderListQuery,
  TermPurchaseOrderListResult,
} from "./types";

function cleanQuery<T extends Record<string, any>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(
      ([, v]) => v !== undefined && v !== null && v !== "",
    ),
  ) as T;
}

function unwrap<T>(res: any): T {
  return (res.data?.data ?? res.data) as T;
}

export const PurchaseTermApi = {
  listOrders: (query: TermPurchaseOrderListQuery) =>
    apiCall<ApiResponse<TermPurchaseOrderListResult>>(
      "purchaseTerm.orders.list",
      {
        query: cleanQuery(query),
      },
    ).then(unwrap<TermPurchaseOrderListResult>),

  createOrder: (payload: CreateTermPurchaseOrderPayload) =>
    apiCall<ApiResponse<any>>("purchaseTerm.orders.create", {
      data: payload,
    }).then((res) => (res.data?.data ?? res.data) as any),
};
