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
  kind?: ContractKind;

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
  renewalOfCode?: string | null;

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
  warehouses?: { id: string; code: string; name: string }[];
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

  renewalOfId?: string | null;
  renewalOfCode?: string | null;
  warehouses?: { id: string; code: string; name: string }[];
}

// ===== Query & payload types =====

/** Chiều của hợp đồng: mình bán hay mình mua. */
export type ContractKind = "SALES" | "PURCHASE";

export interface ContractListQuery {
  keyword?: string;
  customerId?: string;
  contractTypeId?: string;
  /** Loại hợp đồng không muốn liệt kê, vd thuê kho vốn có màn quản lý riêng. */
  excludeTypeCodes?: string[];
  kind?: ContractKind;
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
  kind?: ContractKind;

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
  warehouseIds?: string[];
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

export interface ContractImportRow {
  code: string;
  name: string;
  customerCode: string;
  contractTypeCode: string;
  startDate: string;
  endDate: string;
  status: "Draft" | "Pending" | "Active" | "Terminated" | "Cancelled";
  paymentTermDays?: number | null;
  creditLimitOverride?: number | null;
  riskLevel: "Low" | "Medium" | "High";
  sla?: string | null;
  deliveryScope?: string | null;
  renewalOfCode?: string | null;
}

/* ===== Phụ lục hợp đồng ===== */

/** Giá sàn và điều kiện của một sản phẩm do phụ lục điều chỉnh. */
export interface ContractAppendixItem {
  id?: string;
  productId: string;
  uom: string;
  price: number | string;
  minQty?: number | string | null;
  maxQty?: number | string | null;
  discount?: number | string | null;
  taxRate?: number | string | null;
  note?: string | null;
}

/**
 * Phụ lục là lớp phủ có ngày hiệu lực, không sửa đè hợp đồng gốc.
 * Trường để trống = phụ lục không điều chỉnh điều khoản đó.
 */
export interface ContractAppendix {
  id: string;
  contractId: string;
  code: string;
  effectiveDate: string;
  changeSummary?: string | null;
  docUrl?: string | null;
  paymentTermDays?: number | null;
  creditLimitOverride?: string | number | null;
  items: ContractAppendixItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface UpsertContractAppendixPayload {
  code: string;
  effectiveDate: string;
  changeSummary?: string | null;
  docUrl?: string | null;
  paymentTermDays?: number | null;
  creditLimitOverride?: number | null;
  items?: ContractAppendixItem[];
}

/** Điều khoản đang áp tại một ngày, sau khi chồng phụ lục lên hợp đồng gốc. */
export interface ResolvedContractTerms {
  contractId: string;
  at: string;
  paymentTermDays: number | null;
  creditLimitOverride: string | null;
  appliedAppendices: Array<{
    code: string;
    effectiveDate: string;
    changeSummary: string | null;
  }>;
  items: Array<{
    productId: string;
    uom: string;
    price: string;
    minQty: string | null;
    maxQty: string | null;
    discount: string | null;
    taxRate: string | null;
    note: string | null;
    /** null = vẫn theo hợp đồng gốc; có mã = do phụ lục đó đặt ra. */
    fromAppendixCode: string | null;
  }>;
}
