import type { Paged } from "../../shared/lib/types";

export type UUID = string;

export type PurchaseBizType = "COMMERCIAL" | "TERM";
export type PurchaseOrderType = "SINGLE" | "LOT";
export type PaymentTermType = "SAME_DAY" | "NET_DAYS";
export type PurchaseOrderStatus =
  | "DRAFT"
  | "APPROVED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";
export type PaymentMode = "PREPAID" | "POSTPAID";

export type TermNextAction =
  | "APPROVE_ORDER"
  | "CREATE_RECEIPT"
  | "CALCULATE_ESTIMATE"
  | "CALCULATE_BILL_NORMALIZE"
  | "CALCULATE_FINAL"
  | "COMPLETE_ORDER"
  | "VIEW_ONLY";

export type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

export type TermPurchaseOrderListItem = {
  id: UUID;
  orderNo: string;
  bizType: PurchaseBizType;
  orderType: PurchaseOrderType;
  status: PurchaseOrderStatus;
  paymentMode: PaymentMode;
  orderDate: string;
  expectedDate?: string | null;
  supplierCustomerId: UUID;
  supplierName: string | null;
  productSummary: string;
  totalQty: number;
  totalAmount?: number | null;
  nextAction: TermNextAction;
  createdAt: string;
  updatedAt: string;
};

export type TermPurchaseOrderListQuery = {
  keyword?: string;
  status?: PurchaseOrderStatus;
  orderType?: PurchaseOrderType;
  paymentMode?: PaymentMode;
  supplierCustomerId?: UUID;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
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
  supplierCustomerId: UUID;
  supplierLocationId?: UUID;
  orderType: PurchaseOrderType;
  paymentMode: PaymentMode;
  paymentTermType?: PaymentTermType;
  paymentTermDays?: number;
  orderDate: string;
  expectedDate?: string;
  contractNo?: string;
  deliveryLocation?: string;
  note?: string;
  lines: CreateTermPurchaseOrderLinePayload[];
};

export type TermPurchaseOrderListResult = Paged<TermPurchaseOrderListItem>;
