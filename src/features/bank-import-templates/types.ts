export type UUID = string;

export type BankImportTemplate = {
  id: UUID;
  bankCode: string;
  name: string;
  version: number;
  columnMap: Record<string, any>;
  normalizeRule?: Record<string, any> | null;
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
  columnMap: Record<string, any>;
  normalizeRule?: Record<string, any> | null;
  isActive: boolean;
};
