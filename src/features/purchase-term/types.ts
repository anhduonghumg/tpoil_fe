// features/purchase-terms/types.ts

import type { Paged } from "../../shared/lib/types";

export type UUID = string;

export type TermOrderStatus =
  | "DRAFT"
  | "APPROVED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type TermNextAction =
  | "APPROVE_ORDER"
  | "CREATE_RECEIPT"
  | "CALCULATE_TEMP_PRICE"
  | "CALCULATE_INVOICE_PRICE"
  | "CALCULATE_OFFICIAL_FX"
  | "COMPLETE_ORDER"
  | "VIEW_ONLY";

export type CreateTermBillInfoPayload = {
  premium?: number;
};

export type CreateTermPurchaseOrderLinePayload = {
  productId: UUID;
  supplierLocationId?: UUID;
  orderedQty: number;
  unitPrice?: number;
  taxRate?: number;
  discountAmount?: number;
};

export type CreateTermPurchaseOrderPayload = {
  bizType: "TERM";
  orderType: "SINGLE";

  supplierCustomerId: UUID;
  supplierLocationId?: UUID;

  orderDate: string;
  expectedDate?: string;

  contractNo?: string;
  deliveryLocation?: string;

  paymentNote?: string;
  note?: string;

  billInfo?: CreateTermBillInfoPayload;

  lines: CreateTermPurchaseOrderLinePayload[];
};

export type CreateTermPurchaseOrderResult = {
  id: UUID;
  orderNo: string;
};

export type TermPurchaseOrderListItem = {
  id: UUID;
  orderNo: string;
  status: TermOrderStatus;

  orderDate: string;
  expectedDate?: string | null;

  supplierCustomerId: UUID;
  supplierName?: string | null;

  productSummary: string;
  lineCount: number;

  totalQty: number;
  totalAmount?: number | null;

  premium?: number | null;

  nextAction: TermNextAction;

  createdAt: string;
  updatedAt: string;
};

export type TermPurchaseOrderListQuery = {
  keyword?: string;
  status?: TermOrderStatus;
  supplierCustomerId?: UUID;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
};

export type TermPurchaseOrderListResult = Paged<TermPurchaseOrderListItem>;
