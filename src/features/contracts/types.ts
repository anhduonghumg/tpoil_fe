// features/contracts/types.ts
import type { Dayjs } from "dayjs";
// ===== Enums =====
export type ContractExpiryFilterStatus = "expiring" | "expired" | "all";

export type ContractStatus =
  | "Draft"
  | "Pending"
  | "Active"
  | "Terminated"
  | "Cancelled";

export type RiskLevel = "Low" | "Medium" | "High";

export type AttachmentCategory = "ScanSigned" | "Draft" | "Appendix" | "Other";

// ===== Core types =====

export interface ContractAttachment {
  id: string;
  contractId: string;
  fileName: string;
  fileUrl: string | null;
  externalUrl?: string | null;
  category: AttachmentCategory;
}

export interface Contract {
  id: string;
  code: string;
  name: string;

  customerId?: string | null;
  contractTypeId: string;

  startDate: string;
  endDate: string;

  status: ContractStatus;
  paymentTermDays?: number | null;
  creditLimitOverride?: number | null;

  sla?: any | null;
  deliveryScope?: any | null;

  riskLevel: RiskLevel;
  approvalRequestId?: string | null;

  renewalOfId?: string | null;

  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;

  // quan hệ đã include ở detail
  customer?: {
    id: string;
    code: string;
    name: string;
    taxCode?: string | null;
  } | null;

  contractType?: {
    id: string;
    code: string;
    name: string;
  } | null;

  renewalOf?: {
    id: string;
    code: string;
    name: string;
    startDate: string;
    endDate: string;
  } | null;

  renewals?: {
    id: string;
    code: string;
    startDate: string;
    endDate: string;
    status: ContractStatus;
  }[];

  attachments?: ContractAttachment[];
}

// ===== List item =====

export interface ContractListItem {
  id: string;
  code: string;
  name: string;

  customerId?: string | null;
  customerCode?: string | null;
  customerName?: string | null;

  contractTypeId: string;
  contractTypeCode?: string | null;
  contractTypeName?: string | null;

  startDate: string;
  endDate: string;

  status: ContractStatus;
  riskLevel: RiskLevel;

  paymentTermDays?: number | null;
  creditLimitOverride?: number | null;

  // để render icon file/link cột cuối
  attachments?: ContractAttachment[];

  salesOwnerName?: string | null;
  accountingOwnerName?: string | null;
}

// ===== Query & payload types =====

export interface ContractListQuery {
  keyword?: string;
  customerId?: string;
  status?: ContractStatus;
  riskLevel?: RiskLevel;
  startFrom?: string;
  startTo?: string;
  endFrom?: string;
  endTo?: string;
  page?: number;
  pageSize?: number;
}

export interface ContractListResponse {
  items: ContractListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ContractUpsertPayload {
  customerId?: string | null;
  contractTypeId: string;

  code: string;
  name: string;

  startDate: string;
  endDate: string;

  status: ContractStatus;
  paymentTermDays?: number | null;
  creditLimitOverride?: number | null;

  riskLevel: RiskLevel;
  sla?: any | null;
  deliveryScope?: any | null;

  renewalOfId?: string | null;
  approvalRequestId?: string | null;
}

export interface ContractFormValues {
  customerId?: string | null;
  contractTypeId: string;

  code: string;
  name: string;

  startDate: Dayjs;
  endDate: Dayjs;

  status: ContractStatus;
  paymentTermDays?: number | null;
  creditLimitOverride?: number | null;

  riskLevel: RiskLevel;
  sla?: any | null;
  deliveryScope?: any | null;

  renewalOfId?: string | null;
  approvalRequestId?: string | null;
}

export interface ContractExpiryListItem {
  contractId: string;
  contractCode: string;
  contractName: string;
  contractTypeName?: string | null;

  startDate: string;
  endDate: string;
  status: string;
  riskLevel: string;
  paymentTermDays?: number | null;

  customerId?: string | null;
  customerCode?: string | null;
  customerName?: string | null;
  customerTaxCode?: string | null;

  salesOwnerName?: string | null;
  salesOwnerEmail?: string | null;
  accountingOwnerName?: string | null;
  accountingOwnerEmail?: string | null;

  derivedStatus: "expiring" | "expired";
  daysToEnd?: number;
  daysSinceEnd?: number;
}

export interface ContractExpiryListResult {
  referenceDate: string;
  status: ContractExpiryFilterStatus;

  items: ContractExpiryListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;

  expiringCount: number;
  expiredCount: number;
}

export interface ContractExpiryReportQuery {
  referenceDate?: string;
  status?: ContractExpiryFilterStatus;
  page?: number;
  pageSize?: number;
}
