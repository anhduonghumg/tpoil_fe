export type UUID = string;

export type BankImportAmountMode = "DEBIT_CREDIT" | "SIGNED_AMOUNT";

export type BankImportColumnMap = {
  sheetName?: string;
  headerRow: number;
  date: string;
  valueDate?: string;
  description: string;
  amount?: string;
  credit?: string;
  debit?: string;
  direction?: string;
  counterpartyName?: string;
  counterpartyAcc?: string;
  externalRef?: string;
  documentCode?: string;
  purpose?: string;
  balance?: string;
};

export type BankImportNormalizeRule = {
  skipEmptyRows?: boolean;
  inValues?: string[];
  outValues?: string[];
  fileFormat?: "XLSX" | "HTML_XLS" | "BINARY_XLS";
  [key: string]: unknown;
};

export type BankImportTemplate = {
  id: UUID;
  bankCode: string;
  name: string;
  version: number;
  columnMap: BankImportColumnMap;
  normalizeRule?: BankImportNormalizeRule | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BankImportTemplateListQuery = {
  keyword?: string;
  bankCode?: string;
  isActive?: boolean;
};

export type UpsertBankImportTemplatePayload = {
  bankCode: string;
  name: string;
  version: number;
  columnMap: BankImportColumnMap;
  normalizeRule?: BankImportNormalizeRule | null;
  isActive: boolean;
};
