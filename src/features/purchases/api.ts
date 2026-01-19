// features/purchases/api.ts

import { apiCall } from "../../shared/lib/api";
import { Paged } from "../../shared/lib/types";
import { ApiResponse } from "../departments/types";
import type {
  CreatePurchaseOrderResponse,
  PriceQuoteBatchResult,
  PriceQuoteResult,
  PriceRegionOption,
  PurchaseOrderDetail,
  PurchaseOrderListItem,
  PurchaseOrderListQuery,
  UpsertPurchaseOrderPayload,
} from "./types";

export const PurchasesApi = {
  listPO: (query: PurchaseOrderListQuery) =>
    apiCall<ApiResponse<Paged<PurchaseOrderListItem>>>("purchaseOrders.list", {
      query,
    }).then((r) => r.data!.data),

  detailPO: (id: string) =>
    apiCall<ApiResponse<PurchaseOrderDetail>>("purchaseOrders.detail", {
      params: { id },
    }).then((r) => (r.data!.data ?? r.data) as any),

  createPO: (data: UpsertPurchaseOrderPayload) =>
    apiCall<ApiResponse<CreatePurchaseOrderResponse>>("purchaseOrders.create", {
      data,
    }).then((r) => (r.data!.data ?? r.data) as any),

  approvePO: (id: string) =>
    apiCall<ApiResponse<CreatePurchaseOrderResponse>>(
      "purchaseOrders.approve",
      {
        params: { id },
      }
    ).then((r) => (r.data!.data ?? r.data) as any),

  cancelPO: (id: string) =>
    apiCall<ApiResponse<null>>("purchaseOrders.cancel", {
      params: { id },
    }).then((r) => r.data!.data ?? null),

  regionsSelect: (keyword = "") =>
    apiCall<ApiResponse<PriceRegionOption[]>>("priceBulletins.regionsSelect", {
      query: { keyword },
    }).then((r) => r.data!.data ?? []),

  quotePrice: (params: {
    productId: string;
    regionCode: string;
    onDate?: string;
  }) =>
    apiCall<ApiResponse<PriceQuoteResult>>("priceBulletins.quote", {
      query: params,
    }).then((r) => (r.data!.data ?? r.data) as any),

  quoteBatch: (data: {
    productIds: string[];
    regionCode: string;
    onDate?: string;
  }) =>
    apiCall<ApiResponse<PriceQuoteBatchResult>>("priceBulletins.quoteBatch", {
      data,
    }).then((r) => (r.data!.data ?? r.data) as any),
};
