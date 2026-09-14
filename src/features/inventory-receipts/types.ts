export type GoodsReceiptStatus = "DRAFT" | "CONFIRMED" | "VOID";

export type InventoryReceiptLine = {
  id: string;
  lineNo: number;
  actualQty: string;
  v15Qty?: string | null;
  temperatureC?: string | null;
  density?: string | null;
  product: { id: string; code?: string | null; name: string; uom: string };
  owner?: { id: string; code?: string | null; name: string } | null;
  lot?: { id: string; lotNo: string } | null;
};

export type InventoryReceipt = {
  id: string;
  receiptNo: string;
  receiptDate: string;
  status: GoodsReceiptStatus;
  note?: string | null;
  sourceType: "COMMERCIAL_LOT_WITHDRAWAL" | "PURCHASE_RECEIPT";
  sourceNo?: string | null;
  totalActualQty: string;
  totalV15Qty: string;
  warehouse: { id: string; code: string; name: string };
  supplier: { id: string; code?: string | null; name: string };
  purchaseOrder?: { id: string; orderNo: string; orderType: string } | null;
  posting?: { id: string; postingNo: string; status: string; postedAt: string } | null;
  commercialLotWithdrawalLine?: {
    withdrawal: { id: string; withdrawalNo: string; withdrawalDate: string };
  } | null;
  lines: InventoryReceiptLine[];
};

export type InventoryReceiptListQuery = {
  page: number;
  limit: number;
  keyword?: string;
  warehouseId?: string;
  productId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type StockCardQuery = {
  warehouseId?: string;
  productId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type StockCardSource = {
  type:
    | "GOODS_RECEIPT"
    | "SALES_DELIVERY"
    | "WAREHOUSE_TRANSFER"
    | "STOCK_ADJUSTMENT"
    | "OWNERSHIP_TRANSFER";
  id: string;
  no: string;
};

export type StockCardEntry = {
  id: string;
  effectiveAt: string;
  actualQtyDelta: string;
  v15QtyDelta?: string | null;
  runningActualQty: string;
  runningV15Qty: string;
  documentNo: string;
  goodsReceiptId?: string | null;
  /** Chứng từ sinh ra bút toán; null với bút toán đảo. */
  source?: StockCardSource | null;
  posting: { id: string; postingNo: string; kind: string; status: string };
  lot: { id: string; lotNo: string };
  owner: { id: string; code?: string | null; name: string };
};

export type StockCardResult = {
  openingActualQty: string;
  openingV15Qty: string;
  endingActualQty: string;
  endingV15Qty: string;
  items: StockCardEntry[];
  truncated: boolean;
};
