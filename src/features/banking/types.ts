import type { Dayjs } from "dayjs";

export type UUID = string;

export type BankTxnDirection = "IN" | "OUT";
export type BankTxnMatchStatus =
  | "UNMATCHED"
  | "AUTO_MATCHED"
  | "MANUAL_MATCHED"
  | "PARTIAL_MATCHED"
  | "IGNORED";

export type BankTxnReconciliationStatus =
  | "PENDING"
  | "SUGGESTED"
  | "PARTIALLY_ALLOCATED"
  | "ALLOCATED"
  | "IGNORED";

export type BankImportStatus = "QUEUED" | "PROCESSING" | "DONE" | "FAILED";
export type TermPaymentBatchStatus =
  | "DRAFT"
  | "SENT_TO_BANK"
  | "PARTIALLY_PAID"
  | "PAID"
  | "CANCELLED";
export type TermPaymentBatchItemStatus =
  | "PENDING"
  | "SENT"
  | "PARTIALLY_PAID"
  | "PAID"
  | "FAILED"
  | "CANCELLED";
export type TermPaymentBatchFileType = "EXPORTED_LIST" | "BANK_RETURN" | "UNC" | "OTHER";

export type PagedMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type Paged<T> = {
  data: T[];
  meta: PagedMeta;
};

export type BankAccountOption = {
  id: UUID;
  bankCode: string;
  bankName?: string | null;
  accountNo: string;
  accountName?: string | null;
  currency?: string;
  isActive?: boolean;
};

export type BankImportTemplateOption = {
  id: UUID;
  bankCode: string;
  name: string;
  version: number;
  isActive?: boolean;
};

export type GeneralPaymentRequestCategory =
  | "INTERNAL_EXPENSE"
  | "FIXED_ASSET"
  | "TAX_AND_FEE"
  | "ADVANCE"
  | "OTHER";

export type GeneralPaymentRequestStatus =
  | "PENDING_APPROVAL"
  | "REJECTED"
  | "APPROVED"
  | "BANK_VERIFIED"
  | "BANK_RETURNED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "CANCELLED";

export type GeneralPaymentRequestPayment = {
  id: UUID;
  fundingSource: "OWN_BANK" | "DIRECT_DISBURSEMENT";
  sourceBankAccount?: BankAccountOption | null;
  lenderBankName?: string | null;
  creditFacilityRef?: string | null;
  disbursementNo?: string | null;
  amountVnd: number;
  paidAt: string;
  proofFileUrl?: string | null;
  proofFileName?: string | null;
  note?: string | null;
};

export type GeneralPaymentRequest = {
  id: UUID;
  requestNo: string;
  requestDate: string;
  category: GeneralPaymentRequestCategory;
  beneficiaryName: string;
  beneficiaryTaxCode?: string | null;
  beneficiaryAccountNo?: string | null;
  beneficiaryAccountName?: string | null;
  beneficiaryBankName?: string | null;
  content: string;
  referenceNo?: string | null;
  invoiceNo?: string | null;
  amountVnd: number;
  remainingAmount: number;
  paidAmount: number;
  currency: string;
  paymentDeadline?: string | null;
  status: GeneralPaymentRequestStatus;
  note?: string | null;
  approvalNote?: string | null;
  returnedReason?: string | null;
  payments: GeneralPaymentRequestPayment[];
  createdAt: string;
  updatedAt: string;
};

export type GeneralPaymentReconciliationCandidate = {
  paymentId: UUID;
  requestNo: string;
  beneficiaryName: string;
  content: string;
  amountVnd: number;
  paidAt: string;
  score: number;
};

export type GeneralPaymentReconciliationQueueItem = {
  id: UUID;
  bankAccountId: UUID;
  txnDate: string;
  amount: number;
  allocatedAmount: number;
  remainingAmount: number;
  description: string;
  counterpartyName?: string | null;
  counterpartyAcc?: string | null;
  externalRef?: string | null;
  bankAccount: { bankCode: string; accountNo: string };
  candidates: GeneralPaymentReconciliationCandidate[];
};

export type GeneralPaymentReconciliation = {
  id: UUID;
  reconciledAt: string;
  bankTransaction: { txnDate: string; amount: number; description: string };
  payment: { amountVnd: number; paymentRequest: { requestNo: string; beneficiaryName: string } };
};

/* Việc chờ lập bảng kê. kind = LINE: một đợt của kế hoạch thanh toán đã duyệt (id là id của đợt);
   kind = REQUEST: đề nghị lập trước khi có kế hoạch, cả đề nghị là một dòng (id là id đề nghị). */
export type TermPaymentPendingRequest = {
  id: UUID;
  kind?: "LINE" | "REQUEST";
  paymentRequestId?: UUID;
  planLineId?: UUID | null;
  lineNo?: number;
  lineCount?: number;
  plannedDate?: string;
  method?: "TRANSFER" | "DISBURSEMENT";
  lenderBankName?: string | null;
  bankAccount?: BankAccountOption | null;
  beneficiaryBankName?: string | null;
  beneficiaryAccountNo?: string | null;
  requestNo: string;
  requestDate: string;
  purchaseOrderId: UUID;
  orderNo: string;
  supplierName?: string | null;
  amountVnd: number;
  currency: string;
  paymentDeadline?: string | null;
  content?: string | null;
  status: string;
  createdAt: string;
};

export type TermPaymentBatchFile = {
  id: UUID;
  batchId: UUID;
  fileType: TermPaymentBatchFileType;
  fileName: string;
  fileUrl: string;
  fileChecksum?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  note?: string | null;
  createdAt: string;
};

export type TermPaymentBatchItem = {
  id: UUID;
  batchId: UUID;
  paymentRequestId: UUID;
  purchaseOrderId: UUID;
  bankTransactionId?: UUID | null;
  supplierName: string;
  amountVnd: number;
  paidAmountVnd: number;
  beneficiaryName?: string | null;
  beneficiaryBankAccount?: string | null;
  beneficiaryBankName?: string | null;
  transferContent?: string | null;
  status: TermPaymentBatchItemStatus;
  /** Có ở cả danh sách lẫn chi tiết bảng kê. */
  purchaseOrder?: { orderNo: string } | null;
  /** Chỉ có ở chi tiết bảng kê. */
  paymentRequest?: { requestNo: string } | null;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TermPaymentBatch = {
  id: UUID;
  batchNo: string;
  batchDate: string;
  bankAccountId?: UUID | null;
  totalAmountVnd: number;
  itemCount: number;
  status: TermPaymentBatchStatus;
  note?: string | null;
  items?: TermPaymentBatchItem[];
  files?: TermPaymentBatchFile[];
  createdAt: string;
  updatedAt: string;
};

export type SupplierBrief = {
  id: UUID;
  code?: string;
  name: string;
};

export type SupplierInvoiceBrief = {
  id: UUID;
  invoiceNo: string;
  invoiceSymbol?: string | null;
  invoiceDate?: string | null;
  totalAmount?: number | null;
};

export type SettlementBrief = {
  id: UUID;
  supplier?: SupplierBrief;
  invoices?: SupplierInvoiceBrief[];
  amountTotal?: number;
  amountSettled?: number;
  remainingAmount?: number;
  dueDate?: string | null;
};

export type PaymentAllocationItem = {
  id: UUID;
  settlementId: UUID;
  bankTransactionId: UUID;
  allocatedAmount: number;
  isAuto?: boolean;
  score?: number | null;
  sortOrder?: number | null;
  note?: string | null;
  createdAt?: string;
  settlement?: SettlementBrief;
};

export type BankTransactionItem = {
  id: UUID;
  bankAccountId: UUID;
  importId?: UUID | null;
  txnDate: string;
  direction: BankTxnDirection;
  amount: number;
  description: string;
  counterpartyName?: string | null;
  counterpartyAcc?: string | null;
  externalRef?: string | null;
  matchStatus: BankTxnMatchStatus;
  reconciliationStatus?: BankTxnReconciliationStatus;
  source?: "MANUAL" | "EXCEL" | "SEPAY" | "JETPAY";
  valueDate?: string | null;
  isConfirmed?: boolean;
  confirmedAt?: string | null;
  confirmedBy?: UUID | null;
  allocatedAmount?: number;
  remainingAmount?: number;
  allocations?: PaymentAllocationItem[];
  bankAccount?: BankAccountOption;
  createdAt?: string;
  updatedAt?: string;
};

export type BankTransactionListQuery = {
  page?: number;
  pageSize?: number;
  bankAccountId?: UUID;
  fromDate?: string;
  toDate?: string;
  keyword?: string;
  matchStatus?: BankTxnMatchStatus;
  reconciliationStatus?: BankTxnReconciliationStatus;
  direction?: BankTxnDirection;
  confirmed?: "true" | "false" | "";
};

export type CreateManualBankTransactionPayload = {
  bankAccountId: UUID;
  txnDate: string;
  direction: BankTxnDirection;
  amount: number;
  description: string;
  counterpartyName?: string;
  counterpartyAcc?: string;
  externalRef?: string;
  documentCode?: string;
  purposeRaw?: string;
  purposeId?: UUID;
  note?: string;
};

export type MatchSuggestionItem = {
  settlementId: UUID;
  supplier?: SupplierBrief;
  invoices?: SupplierInvoiceBrief[];
  amountTotal: number;
  amountSettled: number;
  remainingAmount: number;
  dueDate?: string | null;
  score: number;
  suggestedAllocatedAmount: number;
};

export type MatchSuggestionResponse = {
  transaction: {
    id: UUID;
    amount: number;
    direction: BankTxnDirection;
    description: string;
    counterpartyName?: string | null;
    counterpartyAcc?: string | null;
    allocatedAmount: number;
    remainingAmount: number;
  };
  suggestions: MatchSuggestionItem[];
};

export type ConfirmBankTransactionAllocationPayload = {
  settlementId: UUID;
  allocatedAmount: number;
  score?: number;
  isAuto?: boolean;
  sortOrder?: number;
  note?: string;
};

export type ConfirmBankTransactionPayload = {
  allocations: ConfirmBankTransactionAllocationPayload[];
  note?: string;
};

export type PreviewBankImportPayload = {
  bankAccountId: UUID;
  templateId?: UUID;
  file: File;
};

export type CommitBankImportPayload = {
  bankAccountId: UUID;
  templateId?: UUID;
  fileChecksum: string;
  rows: BankImportPreviewRow[];
};

export type BankImportPreviewRow = {
  rowNo: number;
  txnDate: string;
  valueDate?: string | null;
  direction: BankTxnDirection;
  amount: number;
  description: string;
  counterpartyName?: string | null;
  counterpartyAcc?: string | null;
  externalRef?: string | null;
  fingerprint: string;
  isDuplicate: boolean;
  raw?: Record<string, any>;
  recognition?: BankRecognition | null;
};

export type RecognitionKind = "CUSTOMER" | "SUPPLIER" | "INTERNAL" | "BANK_FEE" | "UNKNOWN";
export type RecognitionConfidence = "HIGH" | "MEDIUM" | "LOW";
export type RecognitionParty = { partyId: UUID; partyCode: string; partyName: string; reason: string };

/** Đề xuất đối tượng của một dòng sao kê; chỉ là gợi ý, công nợ đổi khi kế toán ghi nhận. */
export type BankRecognition = {
  kind: RecognitionKind;
  confidence: RecognitionConfidence;
  reason: string;
  party?: RecognitionParty;
  candidates: RecognitionParty[];
  payerName: string | null;
  payerAccount: string | null;
  undeclaredCompanyAccount?: string;
  reportedReceipt?: { id: UUID; status: "REPORTED" | "CONFIRMED"; receivedAt: string };
};

/** Hồ sơ chi có thể ghép với một dòng tiền ra (tìm theo mã đơn trong nội dung chuyển khoản). */
export type PaymentMatch =
  | { type: "COMMERCIAL_PAYMENT"; paymentId: UUID; requestNo: string; orderNo: string; supplierName: string; remaining: number; paidAt: string }
  | { type: "COMMERCIAL_REQUEST"; paymentRequestId: UUID; requestNo: string; orderNo: string; supplierName: string; remaining: number }
  | { type: "TERM_BATCH_ITEM"; batchId: UUID; batchNo: string; itemId: UUID; orderNo: string; supplierName: string; remaining: number; hasUnc: boolean };

export type BankTransactionRecognition = BankRecognition & {
  id: UUID;
  paymentMatches?: PaymentMatch[];
  /** Dòng đối ứng của chuyển nội bộ ở tài khoản công ty kia. */
  pairedTransaction?: { id: UUID; bankCode: string; accountNo: string; txnDate: string; reconciliationStatus: string } | null;
};

export type BankImportPreviewResponse = {
  fileName: string;
  fileChecksum: string;
  existedImport?: {
    id: UUID;
    createdAt?: string;
  } | null;
  bankAccount: {
    id: UUID;
    bankCode: string;
    accountNo: string;
    accountName?: string | null;
  };
  template?: {
    id: UUID;
    bankCode: string;
    name: string;
    version: number;
  } | null;
  summary: {
    totalRows: number;
    previewCount: number;
    validCount: number;
    duplicatedCount: number;
    inCount?: number;
    outCount?: number;
    customerRecognizedCount?: number;
    customerHighCount?: number;
    internalCount?: number;
    bankFeeCount?: number;
    undeclaredCompanyAccounts?: string[];
  };
  rows: BankImportPreviewRow[];
};

export type BankImportDetail = {
  id: UUID;
  bankAccountId: UUID;
  templateId?: UUID | null;
  status: BankImportStatus;
  fileUrl: string;
  fileChecksum?: string | null;
  importedCount: number;
  duplicatedCount: number;
  failedCount: number;
  errorMessage?: string | null;
  createdAt?: string;
  updatedAt?: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  bankAccount?: BankAccountOption;
  template?: BankImportTemplateOption | null;
  bankTransactions?: BankTransactionItem[];
};

export type BankStatementFilters = {
  bankAccountId?: UUID;
  range?: [Dayjs | null, Dayjs | null] | null;
  matchStatus?: BankTxnMatchStatus | "";
  direction?: BankTxnDirection | "";
  confirmed?: "true" | "false" | "";
  keyword?: string;
};

/* ===== Kế hoạch thanh toán cho đề nghị thanh toán đơn TE/TM ===== */

export type PaymentPlanMethod = "TRANSFER" | "DISBURSEMENT";
export type PaymentPlanStatus = "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED";

export type SupplierBankAccount = {
  id: UUID;
  bankName: string;
  bankCode?: string | null;
  accountNo: string;
  accountName: string;
  isDefault?: boolean;
};

export type PaymentPlanLine = {
  id: UUID;
  sortOrder: number;
  plannedDate: string;
  amountVnd: string;
  method: PaymentPlanMethod;
  bankAccountId: UUID;
  bankAccount?: BankAccountOption | null;
  beneficiaryBankAccountId?: UUID | null;
  beneficiaryBankName?: string | null;
  beneficiaryAccountNo?: string | null;
  beneficiaryAccountName?: string | null;
  lenderBankName?: string | null;
  creditFacilityRef?: string | null;
  status: "PLANNED" | "PARTIALLY_PAID" | "PAID";
  note?: string | null;
  paidAmount: string;
  remainingAmount: string;
  disbursementTransaction?: { id: UUID; txnDate: string; amount: string; description: string; externalRef?: string | null } | null;
  /** Đơn TE: dòng bảng kê đang giữ đợt này. */
  batchItems?: Array<{ id: UUID; status: string; amountVnd: string; paidAmountVnd: string; batch: { id: UUID; batchNo: string; batchDate: string } }>;
};

export type PaymentPlan = {
  id: UUID;
  version: number;
  status: PaymentPlanStatus;
  note?: string | null;
  decisionNote?: string | null;
  lines: PaymentPlanLine[];
};

export type PaymentPlanRequestPayment = {
  id: UUID;
  planLineId?: UUID | null;
  fundingSource?: "OWN_BANK" | "DIRECT_DISBURSEMENT";
  amountVnd: string;
  paidAt: string;
  lenderBankName?: string | null;
  disbursementNo?: string | null;
  proofFileUrl?: string | null;
  proofFileName?: string | null;
  note?: string | null;
  sourceBankAccount?: BankAccountOption | null;
};

/** Đề nghị thanh toán đơn TE/TM kèm kế hoạch thanh toán của ngân hàng. */
export type PaymentPlanRequest = {
  id: UUID;
  purchaseOrderId: UUID;
  requestNo: string;
  requestDate: string;
  amountVnd: string;
  paidAmount: string;
  remainingAmount: string;
  paymentDeadline?: string | null;
  status: string;
  content?: string | null;
  note?: string | null;
  beneficiaryBankAccountId?: UUID | null;
  beneficiaryAccountNo?: string | null;
  beneficiaryAccountName?: string | null;
  beneficiaryBankName?: string | null;
  approvalNote?: string | null;
  returnedReason?: string | null;
  purchaseOrder: {
    id: UUID;
    orderNo: string;
    bizType: "COMMERCIAL" | "TERM";
    supplier: { code: string; name: string; bankAccounts: SupplierBankAccount[] };
  };
  supplierInvoice?: { id: UUID; invoiceNo: string; invoiceDate: string } | null;
  payments: PaymentPlanRequestPayment[];
  plan?: PaymentPlan | null;
};

export type SavePaymentPlanPayload = {
  note?: string;
  lines: Array<{
    id?: UUID;
    plannedDate: string;
    amountVnd: number;
    method: PaymentPlanMethod;
    bankAccountId: UUID;
    beneficiaryBankAccountId: UUID;
    lenderBankName?: string;
    creditFacilityRef?: string;
    note?: string;
  }>;
};

/* ===== Tiền tại ngân hàng ===== */

export type CashOpening = { amount: number; cutoverDate: string; batchNo: string };

export type CashAccountRow = {
  bankAccountId: UUID;
  bankCode: string;
  bankName?: string | null;
  accountNo: string;
  accountName?: string | null;
  /** Chưa có số dư đầu kỳ thì các con số chỉ là tiền vào trừ tiền ra đã ghi nhận. */
  hasOpening: boolean;
  opening: CashOpening | null;
  periodOpening: number;
  periodIncoming: number;
  periodOutgoing: number;
  periodClosing: number;
  periodCount: number;
  current: number;
  changeToday: number;
  changeThisMonth: number;
  lastTransactionDate: string | null;
  pendingReconciliation: number;
  upcomingTransfer: number;
  upcomingDisbursement: number;
  upcomingLineCount: number;
  upcomingOverdueCount: number;
  projected: number;
};

export type CashBankRow = {
  bankCode: string;
  bankName?: string | null;
  current: number;
  accountCount: number;
  lastTransactionDate: string | null;
  upcomingTransfer: number;
  missingOpening: number;
};

export type CashPositionOverview = {
  asOf: string;
  fromDate: string;
  toDate: string;
  upcomingDays: number;
  totals: {
    current: number;
    changeToday: number;
    changeThisMonth: number;
    periodIncoming: number;
    periodOutgoing: number;
    upcomingTransfer: number;
    upcomingDisbursement: number;
    projected: number;
    missingOpeningCount: number;
  };
  banks: CashBankRow[];
  accounts: CashAccountRow[];
};

export type CashLedger = {
  account: { id: UUID; bankCode: string; bankName?: string | null; accountNo: string; accountName?: string | null };
  fromDate: string;
  toDate: string;
  hasOpening: boolean;
  opening: CashOpening | null;
  openingBalance: number;
  closingBalance: number;
  truncated: boolean;
  transactions: Array<{
    id: UUID;
    txnDate: string;
    direction: "IN" | "OUT";
    amount: number;
    description: string;
    counterpartyName?: string | null;
    externalRef?: string | null;
    reconciliationStatus?: string | null;
    balanceAfter: number;
  }>;
};
