import { apiCall } from "../../shared/lib/api";
import { ApiResponse } from "../../shared/lib/types";
import type {
  CreateTermGoodsReceiptPayload,
  CreateTermPricingPayload,
  CreateTermPricingResult,
  CreateTermPurchaseOrderPayload,
  CreateTermPurchaseOrderResult,
  TermGoodsReceipt,
  TermPurchaseOrderDetail,
  TermPurchaseOrderListQuery,
  TermPurchaseOrderListResult,
  UpdateTermGoodsReceiptPayload,
} from "./types";

export const TermPurchaseOrdersApi = {
  list: (query: TermPurchaseOrderListQuery) =>
    apiCall<ApiResponse<TermPurchaseOrderListResult>>("purchaseTerm.list", {
      query,
    }).then((r) => r.data!.data),

  create: (data: CreateTermPurchaseOrderPayload) =>
    apiCall<ApiResponse<CreateTermPurchaseOrderResult>>("purchaseTerm.create", {
      data,
    }).then((r) => (r.data!.data ?? r.data) as any),

  detail: (id: string) =>
    apiCall<ApiResponse<TermPurchaseOrderDetail>>("purchaseTerm.detail", {
      params: { id },
    }).then((r) => (r.data!.data ?? r.data) as any),

  approve: (id: string) =>
    apiCall<ApiResponse<TermPurchaseOrderDetail>>("purchaseTerm.approve", {
      params: { id },
    }).then((r) => (r.data!.data ?? r.data) as any),

  receipts: (orderId: string) =>
    apiCall<ApiResponse<TermGoodsReceipt[]>>("purchaseTerm.receipts", {
      params: { orderId },
    }).then((r) => (r.data!.data ?? r.data) as any),

  createReceipt: (orderId: string, data: CreateTermGoodsReceiptPayload) =>
    apiCall<ApiResponse<TermGoodsReceipt>>("purchaseTerm.createReceipt", {
      params: { orderId },
      data,
    }).then((r) => (r.data!.data ?? r.data) as any),

  updateReceipt: (id: string, data: UpdateTermGoodsReceiptPayload) =>
    apiCall<ApiResponse<TermGoodsReceipt>>("purchaseTerm.updateReceipt", {
      params: { id },
      data,
    }).then((r) => (r.data!.data ?? r.data) as any),

  confirmReceipt: (id: string) =>
    apiCall<ApiResponse<TermGoodsReceipt>>("purchaseTerm.confirmReceipt", {
      params: { id },
    }).then((r) => (r.data!.data ?? r.data) as any),

  voidReceipt: (id: string) =>
    apiCall<ApiResponse<TermGoodsReceipt>>("purchaseTerm.voidReceipt", {
      params: { id },
    }).then((r) => (r.data!.data ?? r.data) as any),

  createEstimatePricing: (orderId: string, data: CreateTermPricingPayload) =>
    apiCall<ApiResponse<CreateTermPricingResult>>(
      "purchaseTerm.createEstimatePricing",
      {
        params: { orderId },
        data,
      },
    ).then((r) => (r.data!.data ?? r.data) as any),

  createBillNormalizePricing: (
    orderId: string,
    data: CreateTermPricingPayload,
  ) =>
    apiCall<ApiResponse<CreateTermPricingResult>>(
      "purchaseTerm.createBillNormalizePricing",
      {
        params: { orderId },
        data,
      },
    ).then((r) => (r.data!.data ?? r.data) as any),

  createFinalPricing: (orderId: string, data: CreateTermPricingPayload) =>
    apiCall<ApiResponse<CreateTermPricingResult>>(
      "purchaseTerm.createFinalPricing",
      {
        params: { orderId },
        data,
      },
    ).then((r) => (r.data!.data ?? r.data) as any),

  createBossSheetPricing: (orderId: string, data: CreateTermPricingPayload) =>
    apiCall<ApiResponse<CreateTermPricingResult>>(
      "purchaseTerm.createBossSheetPricing",
      {
        params: { orderId },
        data,
      },
    ).then((r) => (r.data!.data ?? r.data) as any),

  getVcbFxRate: () =>
    apiCall<any>("purchaseTerm.getVcbFxRate").then(
      (r) => (r.data!.data ?? r.data) as any,
    ),
};
