export type CommercialLotLifecycle =
  | "PENDING_APPROVAL"
  | "PENDING_INVOICE"
  | "PENDING_PAYMENT"
  | "READY_TO_WITHDRAW"
  | "WITHDRAWING"
  | "COMPLETED"
  | "CANCELLED";

export type CommercialLotStockState =
  | "EXPORTABLE"
  | "TEMPORARY_EXPORT"
  | "NON_EXPORTABLE";

export type CommercialLotPosition = {
  id: string;
  purchaseOrderLineId: string;
  supplierCustomerId: string;
  plannedWarehouseId: string;
  productId: string;
  invoicedQty: string;
  withdrawnQty: string;
  accountingValue: string;
  stockState: CommercialLotStockState;
};

export type CommercialLotOrderLine = {
  id: string;
  lineNo: number;
  productId: string;
  orderedQty: string;
  unitPrice?: string | null;
  taxRate?: string | null;
  discountAmount?: string | null;
  product?: {
    id: string;
    code: string;
    name: string;
    uom: "LITER" | "KG" | "UNIT";
  };
  receivingWarehouse?: {
    id: string;
    code: string;
    name: string;
  } | null;
  commercialLotPosition?: CommercialLotPosition | null;
};

export type CommercialLotWithdrawal = {
  id: string;
  withdrawalNo: string;
  withdrawalDate: string;
  status: "DRAFT" | "CONFIRMED" | "CANCELLED";
  note?: string | null;
  confirmedAt?: string | null;
  destinationWarehouse: {
    id: string;
    code: string;
    name: string;
  };
  lines: Array<{
    id: string;
    lineNo: number;
    actualQty: string;
    v15Qty?: string | null;
    temperatureC?: string | null;
    density?: string | null;
    commercialLotPosition: CommercialLotPosition & {
      product: {
        id: string;
        code: string;
        name: string;
        uom: "LITER" | "KG" | "UNIT";
      };
    };
  }>;
};

export type CommercialLotPurchase = {
  id: string;
  orderNo: string;
  orderDate: string;
  expectedDate?: string | null;
  status: "DRAFT" | "APPROVED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  paymentMode: "PREPAID" | "POSTPAID";
  note?: string | null;
  lifecycle: CommercialLotLifecycle;
  supplier: {
    id: string;
    code: string;
    name: string;
    taxCode?: string | null;
  };
  contract?: {
    id: string;
    code: string;
    name: string;
    startDate: string;
    endDate: string;
  } | null;
  quantities: {
    orderedQty: number;
    invoicedQty: number;
    withdrawnQty: number;
    remainingToWithdraw: number;
    accountingValue: number;
  };
  payment: {
    payableAmount: number;
    paidAmount: number;
    outstandingAmount: number;
    isPaid: boolean;
  };
  lines: CommercialLotOrderLine[];
  supplierInvoices: Array<{
    id: string;
    invoiceNo: string;
    invoiceSymbol?: string | null;
    invoiceDate: string;
    status: "DRAFT" | "POSTED" | "VOIDED";
    totalAmount: string;
    sourceFileName?: string | null;
    sourceFileUrl?: string | null;
    openItem?: {
      id: string;
      status: "OPEN" | "PARTIALLY_SETTLED" | "SETTLED" | "VOIDED";
      originalAmount: string;
      outstandingAmount: string;
    } | null;
  }>;
  commercialLotWithdrawals: CommercialLotWithdrawal[];
};

export type CommercialLotListResult = {
  items: CommercialLotPurchase[];
  total: number;
  page: number;
  limit: number;
};

export type CommercialLotListQuery = {
  keyword?: string;
  supplierCustomerId?: string;
  lifecycle?: CommercialLotLifecycle;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
};

export type CreateLotWithdrawalPayload = {
  withdrawalNo: string;
  destinationWarehouseId: string;
  withdrawalDate: string;
  note?: string;
  lines: Array<{
    commercialLotPositionId: string;
    actualQty: number;
    v15Qty?: number;
    temperatureC?: number;
    density?: number;
  }>;
};

export type ActivePurchaseContractResult = {
  level: "info" | "warning";
  code: "CONTRACT_OK" | "CONTRACT_NONE" | "CONTRACT_EXPIRING_SOON";
  message: string;
  contractId?: string;
  contractCode?: string;
  contractName?: string;
  startDate?: string;
  endDate?: string;
};
