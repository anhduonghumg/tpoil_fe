export type SalesOrderStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "CONFIRMED"
  | "REJECTED"
  | "AWAITING_STOCK"
  | "PARTIALLY_RESERVED"
  | "RESERVED"
  | "WAREHOUSE_PROCESSING"
  | "PARTIALLY_DELIVERED"
  | "DELIVERED"
  | "AWAITING_RECONCILIATION"
  | "AWAITING_INVOICE"
  | "COMPLETED"
  | "CANCELLED";

/**
 * DAY_TRADE là luồng cũ (kinh doanh đặt hàng để mua lẻ đi mua).
 * SINGLE/LOT là luồng bán hàng nội bộ, xuất từ kho của mình.
 */
export type SalesOrderKind = "DAY_TRADE" | "SINGLE" | "LOT";

export type SalesOrderLine = {
  id: string;
  lineNo: number;
  productId: string;
  orderedActualQty: string;
  orderedV15Qty?: string | null;
  unitPrice: string;
  discountAmount?: string | null;
  vehiclePlate?: string | null;
  driverName?: string | null;
  taxRate?: string | null;
  note?: string | null;
  product: { id: string; code?: string | null; name: string; uom: string };
  receivingWarehouse?: { id: string; code: string; name: string } | null;
  /** Kho xuất của luồng nội bộ; DAY_TRADE vẫn dùng receivingWarehouse. */
  issueWarehouseId?: string | null;
  issueWarehouse?: { id: string; code: string; name: string } | null;
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
  kind: SalesOrderKind;
  status: SalesOrderStatus;
  currency: string;
  note?: string | null;
  contractId?: string | null;
  paymentTermType?: "SAME_DAY" | "NET_DAYS";
  paymentTermDays?: number | null;
  approvalCycle?: number;
  rejectedReason?: string | null;
  submittedAt?: string | null;
  approvedAt?: string | null;
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
    vehiclePlate?: string;
    driverName?: string;
    orderedActualQty: number;
    unitPrice?: number;
    discountAmount?: number;
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

// ===== Luồng bán hàng nội bộ =====

export type SalesApprovalType = "PRICE" | "CREDIT" | "EXCEPTION";
export type SalesApprovalStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "STALE"
  | "CANCELLED";

/** Một vi phạm chính sách phát hiện khi gửi kiểm duyệt. */
export type SalesCheckViolation = {
  approvalType: SalesApprovalType;
  code: string;
  message: string;
  detail?: Record<string, unknown>;
};

export type SalesCheckWarning = {
  code: string;
  message: string;
  detail?: Record<string, unknown>;
};

export type SalesOrderCheckResult = {
  violations: SalesCheckViolation[];
  warnings: SalesCheckWarning[];
  orderValue: string;
  creditExposure: string;
  creditLimit: string | null;
};

export type SalesApprovalRequest = {
  id: string;
  salesOrderId: string | null;
  withdrawalRequestId: string | null;
  approvalCycle: number;
  type: SalesApprovalType;
  typeLabel?: string;
  status: SalesApprovalStatus;
  reasonDetail?: { violations?: SalesCheckViolation[] } | null;
  decisionNote?: string | null;
  decidedAt?: string | null;
  createdAt: string;
  canDecide?: boolean;
  salesOrder?: {
    id: string;
    orderNo: string;
    kind: SalesOrderKind;
    status: SalesOrderStatus;
    orderDate: string;
    approvalCycle: number;
    customer: { id: string; code?: string | null; name: string };
  } | null;
  /** Yêu cầu duyệt của phiếu rút lô thì không có salesOrder. */
  withdrawalRequest?: {
    id: string;
    requestNo: string;
    requestDate: string;
    status: string;
    vehiclePlate?: string | null;
    driverName?: string | null;
    salesOrder?: { id: string; orderNo: string } | null;
    customer: { id: string; code?: string | null; name: string };
  } | null;
};

export type CreateInternalSalesOrderPayload = {
  kind: Exclude<SalesOrderKind, "DAY_TRADE">;
  customerPartyId: string;
  orderDate?: string;
  note?: string;
  contractId?: string;
  paymentTermType?: "SAME_DAY" | "NET_DAYS";
  paymentTermDays?: number;
  lines: Array<{
    productId: string;
    issueWarehouseId: string;
    orderedActualQty: number;
    unitPrice: number;
    discountAmount?: number;
    taxRate?: number;
    vehiclePlate?: string;
    driverName?: string;
    note?: string;
  }>;
};

export type UpdateSalesOrderPayload = Partial<
  Pick<CreateInternalSalesOrderPayload, "orderDate" | "note" | "contractId" | "paymentTermType" | "paymentTermDays" | "lines">
>;

/** Kết quả submit: kèm kết quả kiểm tra để hiển thị ngay vì sao phải duyệt. */
export type SubmitSalesOrderResult = SalesOrder & {
  submitResult?: SalesOrderCheckResult;
  autoApproved?: boolean;
};

// ===== Rút lô =====

export type SalesWithdrawalStatus =
  | "DRAFT"
  | "NEED_SOURCE"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "RESERVED"
  | "WAREHOUSE_PROCESSING"
  | "ISSUED"
  | "REJECTED"
  | "CANCELLED";

type EntityRef = { id: string; code?: string | null; name: string };
type ProductRef = EntityRef & { uom: string };

export type SalesWithdrawalLine = {
  id: string;
  lineNo: number;
  productId: string;
  warehouseId: string;
  salesOrderLineId?: string | null;
  requestedQty: string;
  requestedV15Qty?: string | null;
  product: ProductRef;
  warehouse: EntityRef | null;
};

/** Số dư của một dòng đơn lô: tổng / đã rút / đang giữ / còn lại. */
export type SalesLotBalance = {
  salesOrderLineId: string;
  totalQty: string;
  issuedQty: string;
  adjustedQty?: string;
  heldQty: string;
  remainingQty: string;
};

export type SalesWithdrawalRequest = {
  id: string;
  requestNo: string;
  requestDate: string;
  status: SalesWithdrawalStatus;
  vehiclePlate: string;
  driverName: string;
  note?: string | null;
  customerPartyId: string;
  salesOrderId?: string | null;
  customer: EntityRef;
  salesOrder?: {
    id: string;
    orderNo: string;
    orderDate: string;
    status: SalesOrderStatus;
  } | null;
  lines: SalesWithdrawalLine[];
  deliveries: Array<{ id: string; deliveryNo: string; status: string; warehouseId: string }>;
  sourceBalances?: SalesLotBalance[];
};

/** Một đơn lô có thể phục vụ lần rút này — Sale chọn, hệ thống không tự trừ. */
export type WithdrawalSourceCandidate = {
  salesOrderId: string;
  orderNo: string;
  orderDate: string;
  salesOrderLineId: string;
  product: ProductRef;
  warehouse: EntityRef | null;
  totalQty: string;
  issuedQty: string;
  heldQty: string;
  remainingQty: string;
};

export type WithdrawalSourceResult = {
  candidates: WithdrawalSourceCandidate[];
  /** Nhiều lô cùng phù hợp: màn hình bắt buộc Sale chọn. */
  mustChoose: boolean;
  suggestedSalesOrderId: string | null;
};

export type CreateWithdrawalPayload = {
  customerPartyId: string;
  /** Bỏ trống nếu chưa biết lô nguồn; hệ thống sẽ đề xuất. */
  salesOrderId?: string;
  requestDate?: string;
  vehiclePlate: string;
  driverName: string;
  note?: string;
  lines: Array<{
    productId: string;
    warehouseId: string;
    requestedQty: number;
    requestedV15Qty?: number;
  }>;
};

// ===== Lệnh xuất kho =====

export type SalesDeliveryStatus = "DRAFT" | "READY" | "RETURNED" | "POSTED" | "VOIDED";

export type SalesDeliveryLine = {
  id: string;
  lineNo: number;
  salesOrderLineId: string;
  ownerPartyId: string;
  plannedActualQty: string;
  plannedV15Qty?: string | null;
  actualQty?: string | null;
  v15Qty?: string | null;
  temperatureC?: string | null;
  vcf?: string | null;
  postedAt?: string | null;
  orderLine: {
    id: string;
    lineNo: number;
    productId: string;
    orderedActualQty: string;
    note?: string | null;
    product: ProductRef;
  };
};

export type SalesDelivery = {
  id: string;
  deliveryNo: string;
  status: SalesDeliveryStatus;
  salesOrderId: string;
  withdrawalRequestId?: string | null;
  warehouseId: string;
  plannedAt?: string | null;
  deliveredAt?: string | null;
  note?: string | null;
  vehiclePlate?: string | null;
  driverName?: string | null;
  issueDocNo?: string | null;
  sourceFileName?: string | null;
  sourceFileUrl?: string | null;
  confirmedAt?: string | null;
  returnedReason?: string | null;
  returnedAt?: string | null;
  revisionOfId?: string | null;
  warehouse: EntityRef;
  salesOrder: {
    id: string;
    orderNo: string;
    kind: SalesOrderKind;
    status: SalesOrderStatus;
    orderDate: string;
    customer: EntityRef;
  };
  lines: SalesDeliveryLine[];
};

/** Đề xuất FIFO cho một dòng; kho được sửa trước khi xác nhận. */
export type DeliveryFifoLine = {
  salesDeliveryLineId: string;
  lineNo: number;
  productId: string;
  productName: string;
  plannedActualQty: string;
  suggestion: Array<{
    inventoryLotId: string;
    lotNo: string;
    actualQty: string;
    availableQty: string;
  }>;
  /** Mọi lô còn hàng, để kho xuất khác kế hoạch vẫn chọn được. */
  availableLots: Array<{
    inventoryLotId: string;
    lotNo: string;
    receivedAt: string;
    availableQty: string;
  }>;
  /** Còn thiếu so với kế hoạch — kho phải xử lý trước khi xác nhận. */
  shortageQty: string;
};

export type DeliveryFifoSuggestion = {
  salesDeliveryId: string;
  deliveryNo: string;
  lines: DeliveryFifoLine[];
};

export type ConfirmDeliveryPayload = {
  issueDocNo?: string;
  sourceFileName?: string;
  sourceFileUrl?: string;
  issuedAt?: string;
  lines: Array<{
    salesDeliveryLineId: string;
    actualQty: number;
    v15Qty?: number;
    temperatureC?: number;
    vcf?: number;
    allocations: Array<{ inventoryLotId: string; actualQty: number; v15Qty?: number }>;
  }>;
};

// ===== Đối soát =====

export type SalesReconciliationStatus = "OPEN" | "MATCHED" | "VARIANCE" | "RESOLVED";

export type SalesReconciliationLine = {
  id: string;
  salesOrderLineId: string;
  salesDeliveryId: string;
  salesDeliveryLineId: string;
  warehouseId: string;
  orderedQty: string;
  plannedQty: string;
  warehouseConfirmedQty: string;
  docQty?: string | null;
  actualQty: string;
  v15Qty?: string | null;
  status: SalesReconciliationStatus;
  varianceNote?: string | null;
  resolvedAt?: string | null;
  supersededById?: string | null;
  /** actualQty − orderedQty, do backend tính sẵn. */
  varianceQty: string;
  /** Dòng còn hiệu lực: chưa bị chứng từ điều chỉnh thay thế và lệnh xuất chưa hủy. */
  isEffective: boolean;
  orderLine: { id: string; lineNo: number; product: ProductRef };
  delivery: {
    id: string;
    deliveryNo: string;
    status: SalesDeliveryStatus;
    issueDocNo?: string | null;
    warehouse: EntityRef;
  };
};

export type SalesReconciliation = {
  id: string;
  salesOrderId?: string | null;
  withdrawalRequestId?: string | null;
  status: SalesReconciliationStatus;
  resolvedAt?: string | null;
  salesOrder?: {
    id: string;
    orderNo: string;
    status: SalesOrderStatus;
    customer: EntityRef;
  } | null;
  lines: SalesReconciliationLine[];
};

// ===== Hóa đơn MISA =====

export type SalesInvoiceStatus =
  | "DRAFT"
  | "PENDING_ISSUE"
  | "ISSUED"
  | "ISSUE_FAILED"
  | "CANCELLED";

export type SalesInvoiceDocumentType = "ORIGINAL" | "ADJUSTMENT" | "REPLACEMENT";

export type SalesInvoiceLine = {
  id: string;
  lineNo: number;
  salesOrderLineId: string;
  salesDeliveryLineId?: string | null;
  productId: string;
  description: string;
  uom: string;
  qty: string;
  unitPrice: string;
  discountAmount: string;
  taxRate?: string | null;
  netAmount: string;
  taxAmount: string;
  lineTotal: string;
  product?: ProductRef;
};

/** Một lần gọi MISA, ghi cả trước và sau request để sự cố giữa chừng còn dấu vết. */
export type SalesInvoiceIssuance = {
  id: string;
  attempt: number;
  action: string;
  status: string;
  httpStatus?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  startedAt: string;
  finishedAt?: string | null;
};

export type SalesInvoice = {
  id: string;
  invoiceNoInternal: string;
  salesOrderId?: string | null;
  withdrawalRequestId?: string | null;
  documentType: SalesInvoiceDocumentType;
  originalInvoiceId?: string | null;
  status: SalesInvoiceStatus;
  buyerName: string;
  buyerTaxCode?: string | null;
  buyerAddress?: string | null;
  buyerEmail?: string | null;
  currency: string;
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  grandTotal: string;
  invoiceDate: string;
  paymentTermDays?: number | null;
  dueDate?: string | null;
  note?: string | null;
  misaInvoiceNo?: string | null;
  misaTemplateNo?: string | null;
  misaSerial?: string | null;
  issuedAt?: string | null;
  cancelledAt?: string | null;
  customer: EntityRef & { taxCode?: string | null };
  salesOrder?: { id: string; orderNo: string; orderDate?: string; kind?: SalesOrderKind } | null;
  withdrawalRequest?: { id: string; requestNo: string; requestDate?: string } | null;
  lines?: SalesInvoiceLine[];
  issuances?: SalesInvoiceIssuance[];
  receivableItem?: {
    id: string;
    outstandingAmount: string;
    status: string;
    dueDate?: string | null;
  } | null;
  corrections?: Array<{
    id: string;
    invoiceNoInternal: string;
    documentType: SalesInvoiceDocumentType;
    status: SalesInvoiceStatus;
  }>;
};

/** Xem trước nội dung hóa đơn — đọc từ những gì đã thực xuất, không ghi gì. */
export type SalesInvoicePreview = {
  buyer: {
    name: string;
    taxCode?: string | null;
    address?: string | null;
    email?: string | null;
  };
  currency: string;
  lines: Array<
    Omit<SalesInvoiceLine, "id" | "product"> & {
      salesOrderLineId: string;
      salesDeliveryLineId: string | null;
    }
  >;
  totals: {
    subtotal: string;
    discountTotal: string;
    taxTotal: string;
    grandTotal: string;
  };
};

/** Đúng một nguồn: cả đơn lấy 1 lần, hoặc một lần rút lô. */
export type InvoiceSource = { salesOrderId?: string; withdrawalRequestId?: string };

// ===== Công nợ phải thu =====

export type ReceivableStatus = "OPEN" | "PARTIALLY_SETTLED" | "SETTLED" | "VOIDED";
export type ReceivableEntryType =
  | "OPEN"
  | "RECEIPT"
  | "CREDIT_NOTE"
  | "FX_DIFFERENCE"
  | "REVERSAL";

export type ReceivableLedgerEntry = {
  id: string;
  type: ReceivableEntryType;
  amount: string;
  effectiveAt: string;
  note?: string | null;
  allocationId?: string | null;
};

export type ReceivableAllocation = {
  id: string;
  bankTransactionId: string;
  amountInItemCurrency: string;
  amountInBankCurrency: string;
  status: "ACTIVE" | "REVERSED";
  reversalOfId?: string | null;
  allocatedAt: string;
  bankTransaction?: {
    id: string;
    txnDate: string;
    amount: string;
    description?: string | null;
  } | null;
};

export type ReceivableOpenItem = {
  id: string;
  salesInvoiceId?: string | null;
  salesOrderId?: string | null;
  withdrawalRequestId?: string | null;
  customerPartyId: string;
  currency: string;
  originalAmount: string;
  outstandingAmount: string;
  dueDate?: string | null;
  note?: string | null;
  status: ReceivableStatus;
  createdAt: string;
  customer: EntityRef & { taxCode?: string | null };
  salesOrder?: { id: string; orderNo: string; orderDate?: string } | null;
  withdrawalRequest?: { id: string; requestNo: string; requestDate?: string } | null;
  entries?: ReceivableLedgerEntry[];
  allocations?: ReceivableAllocation[];
  /** Backend tính sẵn để mọi màn hình cùng một mốc "hôm nay". */
  isOverdue: boolean;
  overdueDays: number;
};

export type ReceivableListResult = {
  items: ReceivableOpenItem[];
  total: number;
  page: number;
  limit: number;
  totals: { originalAmount: string; outstandingAmount: string };
};

export type ReceivableAgingRow = {
  customer: EntityRef;
  CURRENT: string;
  D1_30: string;
  D31_60: string;
  D61_90: string;
  D90_PLUS: string;
  NO_DUE_DATE: string;
  total: string;
};

/** Hai chiều công nợ của cùng một đối tác: họ nợ mình và mình nợ họ. */
export type PartyDebtRow = {
  party: EntityRef;
  receivableOutstanding: string;
  receivableOverdue: string;
  payableOutstanding: string;
  payableOverdue: string;
  /** Dương = đối tác đang nợ mình. */
  netPosition: string;
};

export type CustomerBalance = {
  openItems: number;
  outstandingAmount: string;
  overdueAmount: string;
  hasOverdue: boolean;
};

export type AllocateReceivablePayload = {
  bankTransactionId: string;
  openItemId: string;
  amount: number;
  idempotencyKey?: string;
};

// ===== Tồn kho thương mại của khách =====

export type CustomerStockSummaryRow = {
  customer: EntityRef;
  product: ProductRef;
  totalQty: string;
  issuedQty: string;
  heldQty: string;
  remainingQty: string;
  lotOrders: number;
};

export type CustomerStockDetailRow = {
  customer: EntityRef;
  salesOrderId: string;
  orderNo: string;
  orderDate: string;
  salesOrderLineId: string;
  product: ProductRef;
  warehouse: EntityRef | null;
  totalQty: string;
  issuedQty: string;
  adjustedQty: string;
  heldQty: string;
  remainingQty: string;
};

export type CustomerStockResult = {
  summary: CustomerStockSummaryRow[];
  details: CustomerStockDetailRow[];
};

// ===== Nhập nhanh =====

export type QuickEntryKind = "SINGLE" | "LOT" | "WITHDRAWAL";

export type QuickEntryCandidate = {
  id: string;
  code: string | null;
  name: string;
  score: number;
  matchedBy: string;
};

/** Một trường đã đọc được: giá trị gốc, kết quả khớp và độ tin cậy. */
export type QuickEntryField = {
  rawText: string | null;
  entityId: string | null;
  entityName: string | null;
  confidence: number;
  matchedBy: string | null;
  candidates: QuickEntryCandidate[];
  needsAttention: boolean;
};

export type QuickEntryLine = {
  product: QuickEntryField;
  warehouse: QuickEntryField;
  quantity: number | null;
  quantityText: string;
  needsAttention: boolean;
};

export type QuickEntryPreview = {
  logId: string;
  usedAi: boolean;
  orderKind: QuickEntryKind | null;
  messageNo: string | null;
  orderDate: string;
  customer: QuickEntryField;
  plate: string | null;
  driver: string | null;
  lines: QuickEntryLine[];
  warnings: string[];
  /** Còn chỗ chưa chắc chắn: màn hình phải bắt Sale xác nhận. */
  requiresReview: boolean;
};

/** SINGLE/LOT trả về đơn bán, WITHDRAWAL trả về phiếu rút lô. */
export type QuickEntryConfirmResult = {
  id: string;
  orderNo?: string;
  requestNo?: string;
};

export type ConfirmQuickEntryPayload = {
  logId?: string;
  orderKind: QuickEntryKind;
  customerPartyId: string;
  orderDate?: string;
  vehiclePlate?: string;
  driverName?: string;
  customerRawText?: string;
  learnAliases?: boolean;
  lines: Array<{
    productId: string;
    warehouseId: string;
    quantity: number;
    unitPrice?: number;
    productRawText?: string;
    warehouseRawText?: string;
  }>;
};
