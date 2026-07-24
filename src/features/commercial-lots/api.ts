import { apiCall } from "../../shared/lib/api";
import type { ApiResponse } from "../../shared/lib/types";
import type { UpsertPurchaseOrderPayload } from "../purchases/types";
import type {
  ActivePurchaseContractResult,
  CommercialLotListQuery,
  CommercialLotListResult,
  CommercialLotPurchase,
  CommercialLotWithdrawal,
  CreateLotWithdrawalPayload,
} from "./types";

const unwrap = <T,>(response: any) =>
  (response.data?.data ?? response.data) as T;

export const CommercialLotsApi = {
  list: (query: CommercialLotListQuery) =>
    apiCall<ApiResponse<CommercialLotListResult>>("commercialLots.list", {
      query,
    }).then(unwrap<CommercialLotListResult>),

  detail: (id: string) =>
    apiCall<ApiResponse<CommercialLotPurchase>>("commercialLots.detail", {
      params: { id },
    }).then(unwrap<CommercialLotPurchase>),

  createOrder: (payload: UpsertPurchaseOrderPayload) =>
    apiCall("purchaseOrders.create", {
      data: { ...payload, orderType: "LOT" },
    }).then(unwrap<any>),

  approveOrder: (id: string) =>
    apiCall("purchaseOrders.approve", {
      params: { id },
      data: {},
    }).then(unwrap<any>),

  cancelOrder: (id: string) =>
    apiCall("purchaseOrders.cancel", {
      params: { id },
      data: {},
    }).then(unwrap<any>),

  validateContract: (supplierCustomerId: string, orderDate: string) =>
    apiCall<ApiResponse<ActivePurchaseContractResult>>(
      "purchaseOrders.validateContract",
      { query: { supplierCustomerId, orderDate } },
    ).then(unwrap<ActivePurchaseContractResult>),

  createWithdrawal: (id: string, payload: CreateLotWithdrawalPayload) =>
    apiCall<ApiResponse<CommercialLotWithdrawal>>(
      "commercialLots.createWithdrawal",
      { params: { id }, data: payload },
    ).then(unwrap<CommercialLotWithdrawal>),

  confirmWithdrawal: (id: string, withdrawalId: string) =>
    apiCall<ApiResponse<CommercialLotPurchase>>(
      "commercialLots.confirmWithdrawal",
      { params: { id, withdrawalId }, data: {} },
    ).then(unwrap<CommercialLotPurchase>),

  cancelWithdrawal: (id: string, withdrawalId: string) =>
    apiCall<ApiResponse<CommercialLotPurchase>>(
      "commercialLots.cancelWithdrawal",
      { params: { id, withdrawalId }, data: {} },
    ).then(unwrap<CommercialLotPurchase>),
};
