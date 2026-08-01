import { apiCall } from "../../shared/lib/api";
import type { ApiResponse } from "../../shared/lib/types";
import type {
  CreateSalesOrderFromPurchasePayload,
  CreateSalesOrderPayload,
  SalesOrder,
} from "./types";

const unwrap = <T,>(response: any) => (response.data?.data ?? response.data) as T;

export const SalesOrdersApi = {
  detail: (id: string) =>
    apiCall<ApiResponse<SalesOrder>>("salesOrders.detail", { params: { id } }).then(
      unwrap<SalesOrder>,
    ),

  create: (payload: CreateSalesOrderPayload) =>
    apiCall<ApiResponse<SalesOrder>>("salesOrders.create", { data: payload }).then(
      unwrap<SalesOrder>,
    ),

  createFromPurchaseOrder: (
    purchaseOrderId: string,
    payload: CreateSalesOrderFromPurchasePayload,
  ) =>
    apiCall<ApiResponse<SalesOrder>>("salesOrders.createFromPurchaseOrder", {
      params: { purchaseOrderId },
      data: payload,
    }).then(unwrap<SalesOrder>),

  unlinkPurchaseOrder: (purchaseOrderId: string) =>
    apiCall("salesOrders.unlinkPurchaseOrder", { params: { purchaseOrderId } }).then(
      unwrap<{ success: boolean }>,
    ),
};
