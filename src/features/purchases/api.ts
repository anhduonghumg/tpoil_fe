// features/purchases/api.ts

import { apiCall } from "../../shared/lib/api";
import { Paged } from "../../shared/lib/types";
import { ApiResponse } from "../departments/types";
import type {
  CreateGoodsReceiptPayload,
  CreatePurchaseOrderResponse,
  PriceQuoteBatchResult,
  PriceQuoteResult,
  PriceRegionOption,
  PurchaseOrderDetail,
  PurchaseOrderListItem,
  PurchaseOrderListQuery,
  SupplierLocationOption,
  UpsertPurchaseOrderPayload,
  UUID,
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
      },
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

  supplierLocationsSelect: (query: {
    supplierCustomerId: string;
    keyword?: string;
    limit?: number;
    isActive?: boolean;
  }) =>
    apiCall<ApiResponse<SupplierLocationOption[]>>("supplierLocations.select", {
      query,
    }).then((r) => r.data!.data ?? []),

  createGoodsReceipt: (data: CreateGoodsReceiptPayload) =>
    apiCall<ApiResponse<{ receipt: any }>>("goodsReceipts.create", {
      data,
    }).then((r) => (r.data!.data ?? r.data) as any),

  createGoodsReceiptAutoConfirm: (data: {
    purchaseOrderId: string;
    purchaseOrderLineId: string;
    receiptNo: string;
    receiptDate: string;
    qty: number;
    supplierLocationId?: string;
    vehicleId?: string;
    driverId?: string;
    shippingFee?: number;
    tempC?: number;
    density?: number;
    standardQtyV15?: number;
  }) =>
    apiCall<ApiResponse<{ receipt: any }>>("goodsReceipts.createAutoConfirm", {
      data,
    }).then((r) => (r.data!.data ?? r.data) as any),
};
