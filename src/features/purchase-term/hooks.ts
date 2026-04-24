import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PurchaseTermApi } from "./api";
import type {
  CreateTermPurchaseOrderPayload,
  TermPurchaseOrderListQuery,
} from "./types";
import { notify } from "../../shared/lib/notification";

export const purchaseTermKeys = {
  all: ["purchase-term"] as const,
  lists: () => ["purchase-term", "list"] as const,
  list: (query: TermPurchaseOrderListQuery) =>
    ["purchase-term", "list", query] as const,
};

export function useTermPurchaseOrders(query: TermPurchaseOrderListQuery) {
  return useQuery({
    queryKey: purchaseTermKeys.list(query),
    queryFn: () => PurchaseTermApi.listOrders(query),
  });
}

export function useCreateTermPurchaseOrder() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateTermPurchaseOrderPayload) =>
      PurchaseTermApi.createOrder(payload),
    onSuccess: () => {
      notify.success("Tạo đơn TERM thành công");
      qc.invalidateQueries({ queryKey: purchaseTermKeys.lists() });
    },
  });
}
