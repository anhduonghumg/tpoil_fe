import { apiCall } from "../../shared/lib/api";
import type {
  InventoryReceipt,
  InventoryReceiptListQuery,
  StockCardQuery,
  StockCardResult,
} from "./types";

const unwrap = <T,>(response: any) =>
  (response.data?.data ?? response.data) as T;

export const InventoryReceiptsApi = {
  list: (query: InventoryReceiptListQuery) =>
    apiCall("goodsReceipts.list", { query }).then(
      unwrap<{ items: InventoryReceipt[]; total: number; page: number; limit: number }>,
    ),
  detail: (id: string) =>
    apiCall("goodsReceipts.detail", { params: { id } }).then(unwrap<InventoryReceipt>),
  stockCard: (query: StockCardQuery) =>
    apiCall("goodsReceipts.stockCard", { query }).then(unwrap<StockCardResult>),
  confirm: (id: string) =>
    apiCall("goodsReceipts.confirm", { params: { id }, data: {} }).then(
      unwrap<{ receipt: InventoryReceipt }>,
    ),
  void: (id: string) =>
    apiCall("goodsReceipts.void", { params: { id }, data: {} }).then(
      unwrap<{ receipt: InventoryReceipt }>,
    ),
};
