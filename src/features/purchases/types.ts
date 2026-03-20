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

export type SupplierInvoiceImportMode = "sync" | "async";
export type SupplierInvoiceImportStatus =
  | "SUCCESS"
  | "QUEUED"
  | "PROCESSING"
  | "FAILED";

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
  supplierLocationId: UUID;
  orderedQty: string;
  unitPrice?: string | null;
  taxRate?: string | null;
  withdrawnQty: string;
  discountAmount?: string | null;
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
  supplierLocationId: UUID;
  orderedQty: number;
  unitPrice?: number | null;
  discountAmount?: number | null;
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
  paymentTermType?: "SAME_DAY" | "NET_DAYS";
  paymentTermDays?: number | null;
  totalAmount?: number | null;
  totalQty?: number | null;
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

  receipts?: Array<{
    id: string;
  }>;

  supplierInvoices?: Array<{
    id: string;
    status: "DRAFT" | "POSTED" | "VOID";
  }>;

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

  receipts?: Array<{
    id: UUID;
    receiptNo: string;
    receiptDate: string;
    qty: string;
    supplierLocationId?: UUID;
    supplierLocation?: {
      id: UUID;
      code?: string | null;
      name: string;
    } | null;
    vehicleId?: UUID;
    driverId?: UUID;
    shippingFee?: string;
  }>;

  supplierInvoices?: Array<{
    id: string;
    invoiceNo: string;
    status: "DRAFT" | "POSTED" | "VOID";
    createdAt: string;
    sourceFileName?: string | null;
    sourceFileUrl?: string | null;
    sourceFileChecksum?: string | null;
  }>;
};

export type PurchaseOrderListQuery = {
  keyword?: string;
  supplierCustomerId?: UUID;
  orderType?: PurchaseOrderType;
  paymentMode?: PurchasePaymentMode;
  status?: PurchaseOrderStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
};

export type SupplierLocationOption = {
  id: UUID;
  code: string;
  name: string;
  label: string;
};

export type CreateGoodsReceiptPayload = {
  purchaseOrderId: UUID;
  purchaseOrderLineId: UUID;
  receiptNo: string;
  receiptDate: string;
  qty: number;
  supplierLocationId?: UUID;
  vehicleId?: UUID;
  driverId?: UUID;
  shippingFee?: number;
  tempC?: number;
  density?: number;
  standardQtyV15?: number;
};

export type SupplierInvoiceStatus = "DRAFT" | "POSTED" | "VOID";

export type SupplierInvoiceDetail = {
  id: UUID;
  supplierCustomerId: UUID;
  purchaseOrderId?: UUID | null;

  invoiceNo: string;
  invoiceSymbol?: string | null;
  invoiceTemplate?: string | null;
  invoiceDate: string;
  status: SupplierInvoiceStatus;
  postedAt?: string | null;

  totalAmount?: number | string | null;
  note?: string | null;

  sourceFileId?: string | null;
  sourceFileUrl?: string | null;
  sourceFileName?: string | null;
  sourceFileChecksum?: string | null;

  supplier?: {
    id: UUID;
    code?: string | null;
    name: string;
  } | null;

  purchaseOrder?: {
    id: UUID;
    orderNo?: string | null;
  } | null;

  payableSettlement?: {
    id: UUID;
    status: string;
    amountTotal?: number | string | null;
    amountSettled?: number | string | null;
  } | null;

  lines: Array<{
    id: UUID;
    supplierLocationId: UUID;
    productId: UUID;
    qty: number | string;
    tempC?: number | string | null;
    density?: number | string | null;
    standardQtyV15?: number | string | null;
    unitPrice?: number | string | null;
    taxRate?: number | string | null;
    goodsReceiptId?: UUID | null;

    product?: {
      id: UUID;
      code?: string | null;
      name: string;
    } | null;

    supplierLocation?: {
      id: UUID;
      code?: string | null;
      name: string;
    } | null;
  }>;

  // supplierInvoices?: Array<{
  //   id: string;
  //   invoiceNo: string;
  //   status: "DRAFT" | "POSTED" | "VOID";
  //   createdAt: string;
  //   sourceFileName?: string | null;
  //   sourceFileUrl?: string | null;
  //   sourceFileChecksum?: string | null;
  // }>;
};

export type SupplierInvoicePdfExtracted = {
  invoiceNo?: string | null;
  invoiceSymbol?: string | null;
  invoiceDate?: string | null;
  subTotal?: number | null;
  vatAmount?: number | null;
  totalAmount?: number | null;
};

export type SupplierInvoicePdfImportResponse = {
  mode: SupplierInvoiceImportMode;
  status: SupplierInvoiceImportStatus;
  runId?: string;
  sourceFileId?: string | null;
  sourceFileUrl?: string | null;
  sourceFileName?: string | null;
  sourceFileChecksum?: string | null;
  extracted?: SupplierInvoicePdfExtracted | null;
  warnings?: string[];
};

export type SupplierInvoicePdfImportResultResponse = {
  mode: "async";
  status: SupplierInvoiceImportStatus;
  runId: string;
  sourceFileId?: string | null;
  sourceFileUrl?: string | null;
  sourceFileName?: string | null;
  sourceFileChecksum?: string | null;
  extracted?: SupplierInvoicePdfExtracted | null;
  warnings?: string[];
  error?: string | null;
  metrics?: any;
};

export type CreateSupplierInvoicePayload = {
  supplierCustomerId: string;
  purchaseOrderId?: string;
  invoiceNo: string;
  invoiceSymbol?: string;
  invoiceTemplate?: string;
  invoiceDate: string;
  note?: string;

  sourceFileId?: string;
  sourceFileUrl?: string;
  sourceFileName?: string;
  sourceFileChecksum?: string;

  lines: Array<{
    supplierLocationId: string;
    productId: string;
    qty: number;
    tempC?: number;
    density?: number;
    standardQtyV15?: number;
    unitPrice?: number;
    taxRate?: number;
    goodsReceiptId?: string;
  }>;
};
