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

/**
 * Đơn lô xuất hóa đơn thế nào — quyết định cả mẫu in lẫn cách lập hóa đơn.
 * ON_CONFIRMATION: một hóa đơn cho cả lô ngay sau khi xác nhận đơn hàng.
 * ON_WITHDRAWAL: xuất nhiều lần theo tiến độ khách rút hàng.
 */
export type SalesLotInvoiceMode = "ON_CONFIRMATION" | "ON_WITHDRAWAL";

export type SalesOrderLine = {
  id: string;
  lineNo: number;
  productId: string;
  orderedActualQty: string;
  orderedV15Qty?: string | null;
  unitPrice: string;
  discountBaseAmount?: string | null;
  discountAdjustmentAmount?: string | null;
  discountAmount?: string | null;
  supplySource?: "TP" | "NCC";
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
  lotInvoiceMode?: SalesLotInvoiceMode | null;
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
    supplySource?: "TP" | "NCC";
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

/** STANDARD = duyệt thường lệ: đơn không vi phạm gì nhưng quản lý vẫn phải ký. */
export type SalesApprovalType = "STANDARD" | "PRICE" | "CREDIT" | "EXCEPTION";
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
};
/** Một dòng hàng của đơn đang chờ duyệt. */
export type ApprovalOrderLine = {
  id: string;
  lineNo: number;
  productId: string;
  issueWarehouseId: string | null;
  supplySource: "TP" | "NCC";
  preferredSupplierPartyId?: string | null;
  orderedActualQty: string;
  unitPrice: string;
  /** CK gốc theo bảng công bố — người duyệt không sửa được. */
  discountBaseAmount: string;
  /** CK điều chỉnh — người duyệt sửa được ngay trên hàng đợi. */
  discountAdjustmentAmount: string;
  /** Luôn = gốc + điều chỉnh. */
  discountAmount: string;
  taxRate?: string | null;
  lineNetAmount: string;
  product: { code?: string | null; name: string; uom: string };
  issueWarehouse?: { name: string } | null;
  preferredSupplier?: { id: string; code: string; name: string } | null;
  supplierAllocations?: Array<{
    inventoryLotId: string | null;
    lotNo: string | null;
    supplier: { id: string; code: string; name: string } | null;
    releaseCode: "TP" | "NCC" | null;
    actualQty: string;
  }>;
  supplierPreview?: {
    fifoAllocations: Array<{
      inventoryLotId: string;
      lotNo: string;
      supplierPartyId: string;
      supplierCode: string;
      supplierName: string;
      releaseCode: "TP" | "NCC";
      actualQty: string;
    }>;
    supplierOptions: Array<{
      supplierPartyId: string;
      supplierCode: string;
      supplierName: string;
      availableQty: string;
    }>;
    availableQty: string;
    shortageQty: string;
  } | null;
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
    /** Dòng hàng để người duyệt thấy đủ giá, chiết khấu, thành tiền ngay trên hàng đợi. */
    lines: ApprovalOrderLine[];
    orderNetAmount: string;
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
  /** Bắt buộc về mặt nghiệp vụ cho đơn LOT; backend mặc định ON_WITHDRAWAL. */
  lotInvoiceMode?: SalesLotInvoiceMode;
  paymentTermType?: "SAME_DAY" | "NET_DAYS";
  paymentTermDays?: number;
  lines: Array<{
    productId: string;
    issueWarehouseId: string;
    orderedActualQty: number;
    unitPrice: number;
    /** CK công bố theo bảng thông báo giá, tính trên mỗi đơn vị. */
    discountBaseAmount?: number;
    /** CK điều chỉnh trên mỗi đơn vị; được phép âm. */
    discountAdjustmentAmount?: number;
    /** Giữ lại cho dữ liệu cũ; backend coi như CK gốc nếu không gửi phần tách. */
    discountAmount?: number;
    supplySource?: "TP" | "NCC";
    taxRate?: number;
    vehiclePlate?: string;
    driverName?: string;
    note?: string;
  }>;
};

export type UpdateSalesOrderPayload = Partial<
  Pick<
    CreateInternalSalesOrderPayload,
    | "orderDate"
    | "note"
    | "contractId"
    | "lotInvoiceMode"
    | "paymentTermType"
    | "paymentTermDays"
    | "lines"
  >
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
    supplySource: "TP" | "NCC";
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
    supplierPartyId: string;
    supplierCode: string;
    supplierName: string;
    releaseCode: "TP" | "NCC";
    actualQty: string;
    availableQty: string;
  }>;
  /** Mọi lô còn hàng, để kho xuất khác kế hoạch vẫn chọn được. */
  availableLots: Array<{
    inventoryLotId: string;
    lotNo: string;
    receivedAt: string;
    supplierPartyId: string;
    supplierCode: string;
    supplierName: string;
    releaseCode: "TP" | "NCC";
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
  accountantEmployeeId?: string | null;
  accountantEmployee?: { id: string; code: string; fullName?: string | null } | null;
  customer: EntityRef & { taxCode?: string | null };
  salesOrder?: { id: string; orderNo: string; orderDate?: string; kind?: SalesOrderKind } | null;
  withdrawalRequest?: {
    id: string;
    requestNo: string;
    requestDate?: string;
    salesOrder?: { id: string; orderNo: string; orderDate?: string } | null;
  } | null;
  lines?: Array<Pick<SalesInvoiceLine, "description"> & {
    product?: { code?: string | null; name: string } | null;
  }>;
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

export type UnissuedInvoiceSource = {
  id: string;
  source: { salesOrderId?: string; withdrawalRequestId?: string };
  sourceNo: string;
  sourceType: "SALES_ORDER" | "LOT_ORDER" | "WITHDRAWAL";
  sourceDate: string;
  customer: EntityRef;
  accountantEmployee?: { id: string; code: string; fullName?: string | null } | null;
  itemCodes: string[];
  estimatedGrandTotal: string;
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

// ===== Lãi/lỗ theo nguồn hàng mua =====

/**
 * PROVISIONAL = giá vốn còn là giá tạm của đơn TERM; chốt bảng chính thức xong
 * hệ thống tính lại nên biên lợi nhuận hiện tại chỉ là ước tính.
 */
export type CostStatus = "FINAL" | "PROVISIONAL" | "NO_COST_BASIS";

export type ProfitTotals = {
  revenue: string;
  cost: string;
  profit: string;
  marginPercent: string | null;
};

/** Một lát bán ra rút từ một lô cụ thể của đơn mua này. */
export type PurchaseSourceSaleRow = {
  salesOrderId: string | null;
  orderNo: string | null;
  orderKind: SalesOrderKind | null;
  withdrawalRequestNo: string | null;
  customer: EntityRef | null;
  deliveryNo: string | null;
  deliveredAt: string | null;
  invoiceNo: string | null;
  invoiceStatus: SalesInvoiceStatus | null;
  inventoryLotId: string;
  qty: string;
  revenue: string;
  cost: string;
  profit: string;
  marginPercent: string | null;
};

export type PurchaseSourceReport = {
  purchaseOrder: {
    id: string;
    orderNo: string;
    orderType: string;
    bizType: string;
    orderDate: string;
    supplier: EntityRef;
  };
  quantities: { receivedQty: string; soldQty: string; remainingQty: string };
  totals: ProfitTotals;
  costStatus: CostStatus;
  lots: Array<{
    inventoryLotId: string;
    lotNo: string;
    product: ProductRef;
    receiptNo: string;
    receiptDate: string;
    receivedQty: string;
    remainingQty: string;
    isProvisional: boolean;
  }>;
  sales: PurchaseSourceSaleRow[];
};

/** Nhìn ngược từ đơn bán: hàng bán ra lấy từ những đơn mua nào. */
export type SalesOrderSourceRow = {
  deliveryNo: string;
  lineNo: number;
  product: EntityRef;
  inventoryLotId: string;
  lotNo: string;
  purchaseOrderId: string | null;
  purchaseOrderNo: string | null;
  /** TERM hay thương mại là bizType; orderType chỉ nói lô hay lẻ. */
  purchaseBizType: string | null;
  purchaseOrderType: string | null;
  supplier: EntityRef | null;
  qty: string;
  revenue: string;
  cost: string;
  profit: string;
  /** Phần lô khách chưa rút: giá vốn mới là ước tính, chưa gắn lô mua nào. */
  isEstimated?: boolean;
};

export type SalesOrderProfitability = {
  salesOrder: {
    id: string;
    orderNo: string;
    kind: SalesOrderKind;
    orderDate: string;
    customer: EntityRef;
  };
  totals: ProfitTotals;
  costStatus: CostStatus;
  hasEstimatedCost?: boolean;
  sources: SalesOrderSourceRow[];
};

// ===== Alias: cách khách viết tên =====

export type SalesAliasEntityType = "PARTY" | "WAREHOUSE" | "PRODUCT";
export type SalesAliasSource = "IMPORTED" | "MANUAL" | "LEARNED";

export type SalesEntityAlias = {
  id: string;
  entityType: SalesAliasEntityType;
  externalName: string;
  normalizedName: string;
  source: SalesAliasSource;
  note?: string | null;
  /** Có giá trị = đã ngừng dùng; lịch sử vẫn giữ chứ không xóa. */
  validTo?: string | null;
  createdAt: string;
  party?: EntityRef | null;
  warehouse?: EntityRef | null;
  product?: EntityRef | null;
};

/** Cách viết mà nhập nhanh liên tục không khớp được, nhiều nhất lên đầu. */
export type UnmatchedAlias = {
  entityType: SalesAliasEntityType;
  text: string;
  count: number;
  lastSeenAt: string;
};

export type CreateAliasPayload = {
  entityType: SalesAliasEntityType;
  entityId: string;
  aliases: string[];
  source?: SalesAliasSource;
  note?: string;
};

export type CreateAliasResult = {
  entity: { id: string; code?: string | null; name: string };
  added: number;
  addedAliases: string[];
  skipped: Array<{ alias: string; reason: string; conflictWith?: string }>;
};

export type ImportAliasResult = {
  rows: number;
  matchedEntities: number;
  addedAliases: number;
  unknownEntities: string[];
  duplicates: string[];
  /** Cách viết đang trỏ sang đơn vị khác — hệ thống không tự chuyển chủ. */
  conflicts: Array<{ alias: string; wanted: string; currentlyPointsTo: string }>;
};

// ===== Cấu hình tín dụng (kế toán công nợ) =====

type EmployeeRef = { id: string; code: string; fullName: string | null };

export type CreditCustomerRow = {
  id: string;
  code: string;
  name: string;
  taxCode?: string | null;
  creditLimit: string | null;
  tempLimit: string | null;
  tempFrom: string | null;
  tempTo: string | null;
  paymentTermDays: number | null;
  accountingOwnerEmp: EmployeeRef | null;
  /** Hạn mức đang thực sự áp dụng (ưu tiên hạn mức tạm còn hiệu lực). */
  effectiveLimit: string | null;
  effectiveLimitIsTemp: boolean;
  receivableOutstanding: string;
  overdueAmount: string;
  /** Đơn đã duyệt nhưng chưa lên hóa đơn — vẫn đang chiếm hạn mức. */
  committedOrderValue: string;
  exposure: string;
  availableCredit: string | null;
  isOverLimit: boolean;
  hasOverdue: boolean;
};

export type CreditLimitHistoryRow = {
  id: string;
  oldLimit: string | null;
  newLimit: string | null;
  tempLimit: string | null;
  tempFrom: string | null;
  tempTo: string | null;
  reason: string | null;
  changedBy: string;
  changedAt: string;
};

/** Một kỳ hạn mức: áp dụng từ khi nào đến khi nào, kỳ chưa có ngày kết thúc là kỳ đang chạy. */
export type CreditLimitPeriod = {
  id: string;
  creditLimit: string | null;
  tempLimit: string | null;
  tempFrom: string | null;
  tempTo: string | null;
  validFrom: string;
  validTo: string | null;
  isCurrent: boolean;
  reason: string | null;
  changedBy: string;
  changedByName: string | null;
};

export type CreditCustomerDetail = CreditCustomerRow & {
  salesOwnerEmp: EmployeeRef | null;
  timeline: CreditLimitPeriod[];
  history: CreditLimitHistoryRow[];
};

export type UpdateCustomerCreditPayload = {
  creditLimit?: number | null;
  tempLimit?: number | null;
  tempFrom?: string | null;
  tempTo?: string | null;
  paymentTermDays?: number | null;
  reason: string;
};

// ===== Bảng thông báo chiết khấu =====

export type DiscountBoardStatus = "DRAFT" | "PUBLISHED" | "CANCELLED";

export type DiscountBoardLine = {
  id: string;
  warehouseId: string;
  productId: string;
  /** Đồng trên mỗi lít. */
  discountPerUnit: string;
  note?: string | null;
  warehouse: EntityRef;
  product: ProductRef;
};

export type DiscountBoardRecipient = {
  id: string;
  customerPartyId: string;
  email: string;
  sentAt?: string | null;
  errorMessage?: string | null;
  customer: EntityRef;
};

export type DiscountBoard = {
  id: string;
  status: DiscountBoardStatus;
  effectiveFrom: string;
  announcerName?: string | null;
  note?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  lines: DiscountBoardLine[];
  recipients: DiscountBoardRecipient[];
  /** Bản đang áp dụng ngay lúc này. */
  isCurrent?: boolean;
  /** Chỉ có ở API chi tiết — nội dung để copy gửi khách. */
  announcementText?: string;
};

export type DiscountBoardListResult = {
  items: DiscountBoard[];
  total: number;
  page: number;
  limit: number;
  currentBoardId: string | null;
};

export type DiscountRecipientCandidate = {
  id: string;
  code: string;
  name: string;
  contactEmail: string;
};

/** Đơn đã gửi duyệt trong lúc một bản chiết khấu đang hiệu lực. */
export type DiscountAffectedOrders = {
  window: { from: string; to: string | null } | null;
  items: Array<{
    id: string;
    orderNo: string;
    status: SalesOrderStatus;
    submittedAt: string | null;
    customer: EntityRef;
  }>;
};

export type UpsertDiscountBoardPayload = {
  effectiveFrom?: string;
  /** Chép từ bản nào; bỏ trống thì chép bản đang chạy. */
  cloneFromBoardId?: string;
  announcerName?: string;
  note?: string;
  lines?: Array<{
    warehouseId: string;
    productId: string;
    discountPerUnit: number;
    note?: string;
  }>;
};

export type SendDiscountBoardResult = {
  sent: number;
  failed: number;
  /** Khách được chọn nhưng chưa có email hợp lệ. */
  skipped: string[];
  board: DiscountBoard;
};

export type ResolvedDiscount = {
  warehouseId: string;
  productId: string;
  discountPerUnit: string | null;
  hasDiscount: boolean;
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

export type QuickEntryKind = "SINGLE" | "LOT" | "WITHDRAWAL" | "DAY_TRADE";

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
  entityCode: string | null;
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
  /** A line can override the message-level kind, e.g. "rút tồn + mua mới". */
  orderKind: QuickEntryKind | null;
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
  /** Những cách viết vừa được ghi nhớ trong lần xác nhận này. */
  learnedAliases?: string[];
};

/** Một mốc phải trả của đơn trả chậm. */
export type QuickEntryPaymentPlan = {
  dueDays: number;
  percent?: number;
  amount?: number;
  note?: string;
};

export type ConfirmQuickEntryPayload = {
  logId?: string;
  orderKind: QuickEntryKind;
  /** Điều khoản đơn lô, đặt chung cho cả lượt nhập. */
  lotInvoiceMode?: SalesLotInvoiceMode;
  paymentTermType?: "SAME_DAY" | "NET_DAYS";
  paymentTermDays?: number;
  paymentPlans?: QuickEntryPaymentPlan[];
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
    discountAmount?: number;
    discountBaseAmount?: number;
    discountAdjustmentAmount?: number;
    supplySource?: "TP" | "NCC";
    productRawText?: string;
    warehouseRawText?: string;
  }>;
};

/** Duyệt hàng loạt có thể thành công một phần — phải nói rõ cái nào hỏng và vì sao. */
export type BulkDecideResult = {
  succeeded: number;
  failed: Array<{ id: string; orderNo: string | null; message: string }>;
};

export type AdjustDiscountResult = {
  salesOrderLineId: string;
  salesOrderId: string;
  discountBaseAmount: string;
  discountAdjustmentAmount: string;
  discountAmount: string;
  /** Thành tiền cả đơn sau khi tính lại. */
  orderNetAmount: string;
};
