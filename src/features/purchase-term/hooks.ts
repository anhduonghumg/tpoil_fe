import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notify } from "../../shared/lib/notification";

import type {
  CreateTermPurchaseOrderPayload,
  TermPurchaseOrderListQuery,
} from "./types";
import { TermPurchaseOrdersApi } from "./api";

const qk = {
  list: (q: TermPurchaseOrderListQuery) =>
    ["term-purchase-orders", "list", q] as const,
};

export function useTermPurchaseOrderList(q: TermPurchaseOrderListQuery) {
  return useQuery({
    queryKey: qk.list(q),
    queryFn: () => TermPurchaseOrdersApi.list(q),
  });
}

export function useCreateTermPurchaseOrder() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTermPurchaseOrderPayload) =>
      TermPurchaseOrdersApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["term-purchase-orders"] });
      qc.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
    onError: (e: any) =>
      notify.error(e?.message || "Tạo đơn mua TERM thất bại"),
  });
}
