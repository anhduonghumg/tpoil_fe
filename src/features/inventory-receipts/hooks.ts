import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { extractApiError } from "../../shared/lib/httpError";
import { notify } from "../../shared/lib/notification";
import { InventoryReceiptsApi } from "./api";
import type { InventoryReceiptListQuery, StockCardQuery } from "./types";

export function useInventoryReceipts(query: InventoryReceiptListQuery) {
  return useQuery({
    queryKey: ["inventory-receipts", "list", query],
    queryFn: () => InventoryReceiptsApi.list(query),
    placeholderData: (previous) => previous,
  });
}

export function useInventoryReceiptDetail(id?: string) {
  return useQuery({
    queryKey: ["inventory-receipts", "detail", id],
    queryFn: () => InventoryReceiptsApi.detail(id!),
    enabled: Boolean(id),
  });
}

function useRefreshReceipts() {
  const client = useQueryClient();
  return () => {
    client.invalidateQueries({ queryKey: ["inventory-receipts"] });
    client.invalidateQueries({ queryKey: ["purchaseOrders"] });
  };
}

export function useConfirmInventoryReceipt() {
  const refresh = useRefreshReceipts();
  return useMutation({
    mutationFn: (id: string) => InventoryReceiptsApi.confirm(id),
    onSuccess: () => {
      refresh();
      notify.success("Đã xác nhận nhập kho và cộng tồn");
    },
    onError: (error) =>
      notify.error(extractApiError(error).message || "Không xác nhận được phiếu nhập"),
  });
}

export function useVoidInventoryReceipt() {
  const refresh = useRefreshReceipts();
  return useMutation({
    mutationFn: (id: string) => InventoryReceiptsApi.void(id),
    onSuccess: () => {
      refresh();
      notify.success("Đã hủy đề nghị nhập hàng");
    },
    onError: (error) =>
      notify.error(extractApiError(error).message || "Không hủy được đề nghị nhập hàng"),
  });
}

export function useStockCard(query: StockCardQuery) {
  return useQuery({
    queryKey: ["inventory-receipts", "stock-card", query],
    queryFn: () => InventoryReceiptsApi.stockCard(query),
    enabled: Boolean(query.warehouseId && query.productId),
    placeholderData: (previous) => previous,
  });
}
