import { useMutation, useQueryClient } from "@tanstack/react-query";
import { extractApiError } from "../../shared/lib/httpError";
import { notify } from "../../shared/lib/notification";
import { SalesOrdersApi } from "./api";
import type {
  CreateSalesOrderFromPurchasePayload,
  CreateSalesOrderPayload,
} from "./types";

export function useCreateSalesOrder() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSalesOrderPayload) => SalesOrdersApi.create(payload),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["salesOrders"] });
      notify.success("Đã tạo đơn đặt hàng và thông báo cho mua hàng");
    },
    onError: (error) =>
      notify.error(extractApiError(error).message || "Không tạo được đơn đặt hàng"),
  });
}

function useRefreshLinkedOrders(purchaseOrderId?: string) {
  const client = useQueryClient();
  return () => {
    client.invalidateQueries({ queryKey: ["purchaseOrders"] });
    if (purchaseOrderId) {
      client.invalidateQueries({
        queryKey: ["purchaseOrders", "detail", purchaseOrderId],
      });
    }
  };
}

export function useCreateSalesOrderFromPurchase(purchaseOrderId?: string) {
  const refresh = useRefreshLinkedOrders(purchaseOrderId);
  return useMutation({
    mutationFn: (payload: CreateSalesOrderFromPurchasePayload) =>
      SalesOrdersApi.createFromPurchaseOrder(purchaseOrderId!, payload),
    onSuccess: () => {
      refresh();
      notify.success("Đã tạo đơn đặt hàng kinh doanh và gắn với đơn mua");
    },
    onError: (error) =>
      notify.error(extractApiError(error).message || "Không tạo được đơn đặt hàng"),
  });
}

export function useUnlinkSalesOrder(purchaseOrderId?: string) {
  const refresh = useRefreshLinkedOrders(purchaseOrderId);
  return useMutation({
    mutationFn: () => SalesOrdersApi.unlinkPurchaseOrder(purchaseOrderId!),
    onSuccess: () => {
      refresh();
      notify.success("Đã bỏ liên kết đơn đặt hàng");
    },
    onError: (error) =>
      notify.error(extractApiError(error).message || "Không bỏ được liên kết"),
  });
}
