import type { Dayjs } from "dayjs";

export type UUID = string;

export type BankTxnDirection = "IN" | "OUT";
export type BankTxnMatchStatus =
  | "UNMATCHED"
  | "AUTO_MATCHED"
  | "MANUAL_MATCHED"
  | "PARTIAL_MATCHED";

export type BankImportStatus = "QUEUED" | "PROCESSING" | "DONE" | "FAILED";

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
  direction?: BankTxnDirection;
  confirmed?: "true" | "false" | "";
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
  direction: BankTxnDirection;
  amount: number;
  description: string;
  counterpartyName?: string | null;
  counterpartyAcc?: string | null;
  externalRef?: string | null;
  fingerprint: string;
  isDuplicate: boolean;
  raw?: Record<string, any>;
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
