export type RetailLifecycle =
  | "PENDING_APPROVAL"
  | "PENDING_INVOICE"
  | "PENDING_PAYMENT"
  | "READY_TO_RECEIVE"
  | "RECEIVING"
  | "COMPLETED"
  | "CANCELLED";

export type RetailOrderLine = {
  id: string;
  lineNo: number;
  productId: string;
  orderedQty: string;
  unitPrice?: string | null;
  discountAmount?: string | null;
  taxRate?: string | null;
  product?: { id: string; code: string; name: string; uom: string };
  receivingWarehouse?: { id: string; code: string; name: string } | null;
};

export type RetailReceipt = {
  id: string;
  receiptNo: string;
  receiptDate: string;
  status: "DRAFT" | "CONFIRMED" | "VOID";
  warehouse: { id: string; code: string; name: string };
  lines: Array<{
    id: string;
    lineNo: number;
    actualQty: string;
    v15Qty?: string | null;
    product: { id: string; code: string; name: string; uom: string };
  }>;
};

export type RetailProfitRow = {
  productId: string;
  product?: { id: string; code: string; name: string; uom: string } | null;
  orderedQty: number;
  purchasedQty: number;
  varianceQty: number;
  revenue: number;
  cost: number;
  profit: number;
};

export type RetailPurchaseListItem = {
  id: string;
  orderNo: string;
  orderDate: string;
  status: string;
  releaseCode?: "TP" | "NCC" | null;
  lifecycle: RetailLifecycle;
  orderValue: number;
  supplier: { id: string; code: string; name: string };
  quantities: {
    orderedQty: number;
    invoicedQty: number;
    receivedQty: number;
    remainingToReceive: number;
  };
  salesOrder?: { id: string; orderNo: string } | null;
};

export type RetailPurchaseListResult = {
  items: RetailPurchaseListItem[];
  total: number;
  page: number;
  limit: number;
};

export type RetailPurchaseListQuery = {
  keyword?: string;
  supplierCustomerId?: string;
  lifecycle?: RetailLifecycle;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
};

export type RetailPurchaseDetail = {
  id: string;
  orderNo: string;
  orderDate: string;
  expectedDate?: string | null;
  status: "DRAFT" | "APPROVED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  paymentMode: "PREPAID" | "POSTPAID";
  releaseCode?: "TP" | "NCC" | null;
  note?: string | null;
  lifecycle: RetailLifecycle;
  supplier: {
    id: string;
    code: string;
    name: string;
    taxCode?: string | null;
    bankAccountNo?: string | null;
  };
  contract?: { id: string; code: string; name: string; startDate: string; endDate: string } | null;
  quantities: {
    orderedQty: number;
    invoicedQty: number;
    receivedQty: number;
    remainingToReceive: number;
  };
  payment: {
    payableAmount: number;
    paidAmount: number;
    outstandingAmount: number;
    isPaid: boolean;
  };
  profitAndLoss: {
    items: RetailProfitRow[];
    revenue: number;
    cost: number;
    profit: number;
    marginPercent: number;
    hasSalesOrder: boolean;
  };
  lines: RetailOrderLine[];
  supplierInvoices: Array<{
    id: string;
    invoiceNo: string;
    invoiceSymbol?: string | null;
    invoiceDate: string;
    status: "DRAFT" | "POSTED" | "VOIDED";
    totalAmount: string;
    openItem?: {
      id: string;
      status: "OPEN" | "PARTIALLY_SETTLED" | "SETTLED" | "VOIDED";
      originalAmount: string;
      outstandingAmount: string;
    } | null;
  }>;
  termPaymentRequests: Array<{
    id: string;
    supplierInvoiceId?: string | null;
    requestNo: string;
    requestDate: string;
    amountVnd: string;
    status: string;
    beneficiaryAccountNo?: string | null;
    approvalNote?: string | null;
    bankCheckNote?: string | null;
    returnedReason?: string | null;
    supplierInvoice?: { id: string; invoiceNo: string } | null;
  }>;
  receipts: RetailReceipt[];
  salesOrder?: {
    id: string;
    orderNo: string;
    orderDate: string;
    status: string;
    note?: string | null;
    customer: { id: string; code?: string | null; name: string };
    lines: Array<{
      id: string;
      productId: string;
      orderedActualQty: string;
      unitPrice: string;
      discountAmount?: string | null;
      vehiclePlate?: string | null;
      driverName?: string | null;
      product: { id: string; code: string; name: string; uom: string };
      receivingWarehouse?: { id: string; code: string; name: string } | null;
    }>;
  } | null;
};
