export type SalesOrderStatus =
  | "DRAFT"
  | "CONFIRMED"
  | "PARTIALLY_RESERVED"
  | "RESERVED"
  | "PARTIALLY_DELIVERED"
  | "COMPLETED"
  | "CANCELLED";

export type SalesOrderLine = {
  id: string;
  lineNo: number;
  productId: string;
  orderedActualQty: string;
  orderedV15Qty?: string | null;
  unitPrice: string;
  taxRate?: string | null;
  note?: string | null;
  product: { id: string; code?: string | null; name: string; uom: string };
  receivingWarehouse?: { id: string; code: string; name: string } | null;
};

export type SalesOrderComparisonRow = {
  productId: string;
  product?: { id: string; code?: string | null; name: string; uom: string } | null;
  orderedQty: number;
  purchasedQty: number;
  varianceQty: number;
};

export type SalesOrder = {
  id: string;
  orderNo: string;
  orderDate: string;
  status: SalesOrderStatus;
  currency: string;
  note?: string | null;
  customer: { id: string; code?: string | null; name: string; taxCode?: string | null };
  lines: SalesOrderLine[];
  purchaseOrders: Array<{
    id: string;
    orderNo: string;
    orderDate: string;
    status: string;
    supplier: { id: string; code?: string | null; name: string };
  }>;
  comparison: SalesOrderComparisonRow[];
};

export type CreateSalesOrderPayload = {
  customerPartyId: string;
  orderDate?: string;
  note?: string;
  lines: Array<{
    productId: string;
    receivingWarehouseId?: string;
    orderedActualQty: number;
    unitPrice?: number;
  }>;
};

export type CreateSalesOrderFromPurchasePayload = {
  customerPartyId: string;
  orderDate?: string;
  note?: string;
  lines?: Array<{
    productId: string;
    orderedActualQty: number;
    unitPrice?: number;
  }>;
};
