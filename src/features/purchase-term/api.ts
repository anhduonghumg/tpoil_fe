import { apiCall } from "../../shared/lib/api";
import { ApiResponse } from "../../shared/lib/types";
import type {
  CreateTermGoodsReceiptPayload,
  CreateTermLogisticsCostPayload,
  CreateTermPricingPayload,
  CreateTermPricingResult,
  CreateTermPurchaseOrderPayload,
  CreateTermShipmentPayload,
  CreateTermPurchaseOrderResult,
  TermGoodsReceipt,
  TermLogisticsCost,
  TermPurchaseOrderDetail,
  TermShipment,
  TermPurchaseOrderListQuery,
  TermPurchaseOrderListResult,
  UpdateTermGoodsReceiptPayload,
  UpdateTermLogisticsCostPayload,
  UpdateTermShipmentPayload,
  ValidateTermContractResult,
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

  complete: (id: string) =>
    apiCall<ApiResponse<TermPurchaseOrderDetail>>("purchaseTerm.complete", {
      params: { id },
    }).then((r) => (r.data!.data ?? r.data) as any),

  validateContract: (query: { supplierCustomerId: string; orderDate?: string }) =>
    apiCall<ApiResponse<ValidateTermContractResult>>(
      "purchaseTerm.validateContract",
      { query },
    ).then((r) => (r.data!.data ?? r.data) as any),

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

  getVcbFxRate: (params?: { date?: string; currencyCode?: string }) =>
    apiCall<any>("purchaseTerm.getVcbFxRate", { query: params }).then(
      (r) => (r.data!.data ?? r.data) as any,
    ),

  getPlattsAverage: (params: { productId: string; baseDate: string }) =>
    apiCall<any>("purchaseTerm.getPlattsAverage", {
      query: params,
    }).then((r) => (r.data!.data ?? r.data) as any),

  getEnvironmentTax: (params: { productId: string; date: string }) =>
    apiCall<any>("purchaseTerm.getEnvironmentTax", {
      query: params,
    }).then((r) => (r.data!.data ?? r.data) as any),

  shipments: (purchaseOrderId: string) =>
    apiCall<ApiResponse<TermShipment[]>>("purchaseTerm.shipments", {
      params: { purchaseOrderId },
    }).then((r) => (r.data!.data ?? r.data) as any),

  createShipment: (purchaseOrderId: string, data: CreateTermShipmentPayload) =>
    apiCall<ApiResponse<TermShipment>>("purchaseTerm.createShipment", {
      params: { purchaseOrderId },
      data,
    }).then((r) => (r.data!.data ?? r.data) as any),

  updateShipment: (
    purchaseOrderId: string,
    shipmentId: string,
    data: UpdateTermShipmentPayload,
  ) =>
    apiCall<ApiResponse<TermShipment>>("purchaseTerm.updateShipment", {
      params: { purchaseOrderId, shipmentId },
      data,
    }).then((r) => (r.data!.data ?? r.data) as any),

  deleteShipment: (purchaseOrderId: string, shipmentId: string) =>
    apiCall<ApiResponse<any>>("purchaseTerm.deleteShipment", {
      params: { purchaseOrderId, shipmentId },
    }).then((r) => (r.data!.data ?? r.data) as any),

  logisticsCosts: (purchaseOrderId: string) =>
    apiCall<ApiResponse<TermLogisticsCost[]>>("purchaseTerm.logisticsCosts", {
      params: { purchaseOrderId },
    }).then((r) => (r.data!.data ?? r.data) as any),

  createLogisticsCost: (
    purchaseOrderId: string,
    data: CreateTermLogisticsCostPayload,
  ) =>
    apiCall<ApiResponse<TermLogisticsCost>>("purchaseTerm.createLogisticsCost", {
      params: { purchaseOrderId },
      data,
    }).then((r) => (r.data!.data ?? r.data) as any),

  updateLogisticsCost: (
    purchaseOrderId: string,
    costId: string,
    data: UpdateTermLogisticsCostPayload,
  ) =>
    apiCall<ApiResponse<TermLogisticsCost>>("purchaseTerm.updateLogisticsCost", {
      params: { purchaseOrderId, costId },
      data,
    }).then((r) => (r.data!.data ?? r.data) as any),

  deleteLogisticsCost: (purchaseOrderId: string, costId: string) =>
    apiCall<ApiResponse<any>>("purchaseTerm.deleteLogisticsCost", {
      params: { purchaseOrderId, costId },
    }).then((r) => (r.data!.data ?? r.data) as any),

  confirmLogisticsCost: (purchaseOrderId: string, costId: string) =>
    apiCall<ApiResponse<TermLogisticsCost>>("purchaseTerm.confirmLogisticsCost", {
      params: { purchaseOrderId, costId },
    }).then((r) => (r.data!.data ?? r.data) as any),

  voidLogisticsCost: (purchaseOrderId: string, costId: string) =>
    apiCall<ApiResponse<TermLogisticsCost>>("purchaseTerm.voidLogisticsCost", {
      params: { purchaseOrderId, costId },
    }).then((r) => (r.data!.data ?? r.data) as any),
};
