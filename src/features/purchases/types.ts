// features/purchases/types.ts

export type UUID = string;

export type PriceBulletinStatus = "DRAFT" | "PUBLISHED" | "VOID";


export type PurchasePaymentMode = "PREPAID" | "POSTPAID";
export type PurchaseOrderType = "SINGLE" | "LOT";
export type PurchaseOrderStatus =
  | "DRAFT"
  | "APPROVED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type PriceRegionOption = {
  id: UUID;
  code: string;
  name: string;
};

export type PriceBulletinBrief = {
  id: UUID;
  publishedAt: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
};

export type PriceQuoteOk = {
  ok: true;
  productId: UUID;
  region: { code: string; name: string };
  bulletin: PriceBulletinBrief;
  price: string;
};

export type PriceQuoteFail = {
  ok: false;
  reason: "NO_PUBLISHED_BULLETIN" | "NO_PRICE_FOR_PRODUCT_REGION";
  productId: UUID;
  region?: { code: string; name: string };
  bulletin?: PriceBulletinBrief;
  onDate?: string;
};

export type PriceQuoteResult = PriceQuoteOk | PriceQuoteFail;

export type PriceQuoteBatchResult = {
  ok: true;
  region: { code: string; name: string };
  bulletin: PriceBulletinBrief;
  items: Array<{ productId: UUID; price: string | null }>;
};

export type PurchaseOrderLine = {
  id: UUID;
  purchaseOrderId: UUID;
  productId: UUID;

  orderedQty: string;
  unitPrice?: string | null;
  taxRate?: string | null;

  withdrawnQty: string;

  discount?: string | null;
};

export type SupplierBrief = {
  id: UUID;
  code: string;
  name: string;
  taxCode?: string | null;
};

export type PaymentPlanLine = {
  dueDate: string;
  amount: number;
  note?: string | null;
};

export type UpsertPurchaseOrderLinePayload = {
  productId: UUID;
  orderedQty: number;
  unitPrice?: number | null;
  discount?: number | null;
  taxRate?: number | null;
};

export type UpsertPurchaseOrderPayload = {
  orderNo: string;
  supplierCustomerId: UUID;
  orderType: PurchaseOrderType;
  paymentMode: PurchasePaymentMode;

  priceRegionCode: string;
  orderDate: any;
  expectedDate?: string | null;
  note?: string | null;

  paymentPlans?: PaymentPlanLine[];

  lines: UpsertPurchaseOrderLinePayload[];
};

export type CreatePurchaseOrderResponse = {
  po: PurchaseOrderDetail;
  warnings?: {
    contract?: {
      ok: boolean;
      level?: "Low" | "Medium" | "High";
      message?: string;
    };
  };
};

export type PurchaseOrderListItem = {
  id: UUID;
  orderNo: string;
  supplierCustomerId: UUID;
  orderType: PurchaseOrderType;
  paymentMode: PurchasePaymentMode;
  status: PurchaseOrderStatus;

  orderDate: string;
  expectedDate?: string | null;
  note?: string | null;

  supplier?: SupplierBrief;

  totalQty?: string | null;
  totalAmount?: string | null;

  createdAt: string;
  updatedAt: string;
};

export type PurchaseOrderDetail = {
  id: UUID;
  orderNo: string;

  supplierCustomerId: UUID;
  supplier?: SupplierBrief;

  orderType: PurchaseOrderType;
  paymentMode: PurchasePaymentMode;
  status: PurchaseOrderStatus;

  priceRegionId?: UUID | null;
  orderDate: string; // ISO
  expectedDate?: string | null;
  note?: string | null;

  lines: PurchaseOrderLine[];

  createdAt: string;
  updatedAt: string;

  paymentPlans?: PaymentPlanLine[];
};

export type PurchaseOrderListQuery = {
  keyword?: string;
  supplierCustomerId?: UUID;
  orderType?: PurchaseOrderType;
  paymentMode?: PurchasePaymentMode;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
};
