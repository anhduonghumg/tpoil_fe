export type UUID = string;

export type BankAccount = {
  id: UUID;
  bankCode: string;
  bankName?: string | null;
  accountNo: string;
  accountName?: string | null;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BankAccountListQuery = {
  keyword?: string;
  isActive?: boolean;
};

export type UpsertBankAccountPayload = {
  bankCode: string;
  bankName?: string | null;
  accountNo: string;
  accountName?: string | null;
  currency: string;
  isActive: boolean;
};
