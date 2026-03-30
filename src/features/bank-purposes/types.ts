export type UUID = string;

export type BankTxnDirection = "IN" | "OUT";
export type CounterpartyType = "SUPPLIER" | "CUSTOMER" | "INTERNAL" | "OTHER";

export interface BankTransactionPurposeItem {
  id: UUID;
  code: string;
  name: string;
  description?: string | null;
  direction?: BankTxnDirection | null;
  module?: string | null;
  counterpartyType?: CounterpartyType | null;
  affectsDebt: boolean;
  isSystem: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface BankTransactionPurposeListQuery {
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export interface UpsertBankTransactionPurposePayload {
  code: string;
  name: string;
  description?: string;
  direction?: BankTxnDirection;
  module?: string;
  counterpartyType?: CounterpartyType;
  affectsDebt?: boolean;
  isSystem?: boolean;
  isActive?: boolean;
  sortOrder?: number;
}
