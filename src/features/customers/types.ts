// features/customers/types.ts
export type CustomerType = "B2B" | "B2C" | "Distributor" | "Other";
export type CustomerStatus = "Active" | "Inactive" | "Blacklisted";
export type CustomerRole = "Agent" | "Retail" | "Wholesale" | "Other";
export type PartyType = "SUPPLIER" | "CUSTOMER" | "INTERNAL";
export type OperationalPartnerRole =
  | "SHIP_OWNER"
  | "SEA_CARRIER"
  | "SURVEYOR"
  | "SHIPPING_AGENT"
  | "INSURER"
  | "STORAGE_LESSOR"
  | "ROAD_CARRIER";
export type PartnerRole = PartyType | OperationalPartnerRole;

export interface Customer {
  id: string;
  code: string;
  name: string;

  type: CustomerType;
  partyType: PartyType;
  merchantRole?: MerchantRole | null;
  roles?: CustomerRole[];
  partnerRoles?: OperationalPartnerRole[];

  status: CustomerStatus;

  taxCode?: string | null;
  taxVerified?: boolean;
  taxSource?: string | null;

  billingAddress?: string | null;
  shippingAddress?: string | null;

  contactEmail?: string | null;
  contactPhone?: string | null;
  bankAccountNo?: string | null;

  creditLimit?: number | null;
  paymentTermDays?: number | null;

  salesOwnerEmpId?: string | null;
  accountingOwnerEmpId?: string | null;
  legalOwnerEmpId?: string | null;
  groupId?: string | null;
  documentOwnerEmpId?: string | null;

  salesOwnerName?: string | null;
  accountingOwnerName?: string | null;
  documentOwnerName?: string | null;

  isCustomer: boolean;
  isSupplier: boolean;
  isInternal: boolean;

  note?: string | null;

  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CustomerGroupOption {
  id: string;
  code: string;
  name?: string | null;
}
export interface CustomerAddress {
  id: string;
  customerId: string;
  validFrom: string;
  validTo?: string | null;
  addressLine: string;
  note?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type ContractStatus =
  | "Draft"
  | "Pending"
  | "Active"
  | "Terminated"
  | "Cancelled";

export type RiskLevel = "Low" | "Medium" | "High";

export interface CustomerContractOverviewItem {
  id: string;
  code: string;
  name: string;

  startDate: string;
  endDate: string;

  status: ContractStatus;
  riskLevel: RiskLevel;

  paymentTermDays?: number | null;
  creditLimitOverride?: string | null;

  renewalOfId?: string | null;
}

export interface AssignableContract {
  id: string;
  code: string;
  name: string;

  contractTypeName?: string;

  startDate: string;
  endDate: string;

  status: ContractStatus;
  riskLevel: RiskLevel;
}

export interface CustomerContractGroups {
  active: CustomerContractOverviewItem[];
  expired: CustomerContractOverviewItem[];
  upcoming: CustomerContractOverviewItem[];
  cancelled: CustomerContractOverviewItem[];
  terminated: CustomerContractOverviewItem[];
}

export interface CustomerOverview {
  customer: Customer;
  contracts: CustomerContractGroups;

  debtSummary?: {
    totalReceivable: number;
    overdue: number;
    lastUpdated: string;
  };

  inventorySummary?: {
    totalStock: number;
    totalValue: number;
    lastUpdated: string;
  };
}

export interface CustomerListQuery {
  keyword?: string;
  status?: CustomerStatus;
  // partyType?: PartyType;
  role?: PartnerRole;
  salesOwnerEmpId?: string;
  accountingOwnerEmpId?: string;
  documentOwnerEmpId?: string;
  page?: number;
  pageSize?: number;
}

export interface CustomerContract {
  id: string;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  riskLevel: string;
}

export interface AttachableContract {
  id: string;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  contractType: { name: string };
  riskLevel: string;
  status: string;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CustomerContractBrief {
  id: string;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  riskLevel: string;
}

export interface AttachableContractBrief {
  id: string;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  riskLevel: string;
  contractType: { name: string };
}

export interface AssignContractsResult {
  customerId: string;
  assigned: string[];
  failed: { contractId: string; code: string; reason: string }[];
}

export interface CustomerPurchaseDefaults {
  id: string;
  code: string;
  fullName: string;
  shortName?: string | null;
  defaultPurchaseContractNo?: string | null;
  defaultDeliveryLocation?: string | null;
  updatedAt: string;
}

export interface UpdateCustomerPurchaseDefaultsPayload {
  defaultPurchaseContractNo?: string;
  defaultDeliveryLocation?: string;
}

export interface CustomerListQuery {
  keyword?: string;
  status?: CustomerStatus;
  // partyType?: PartyType;
  role?: PartnerRole;
  salesOwnerEmpId?: string;
  accountingOwnerEmpId?: string;
  documentOwnerEmpId?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Ba loại thương nhân xăng dầu — quyết định chiều được phép giao dịch.
 * TNPP mua và bán, TNDM chỉ mua của họ, TNDL chỉ bán cho họ.
 */
export type MerchantRole = "TNPP" | "TNDM" | "TNDL";

export const MERCHANT_ROLE_LABELS: Record<MerchantRole, string> = {
  TNPP: "Thương nhân phân phối",
  TNDM: "Thương nhân đầu mối",
  TNDL: "Thương nhân đại lý",
};

export const MERCHANT_ROLE_HINTS: Record<MerchantRole, string> = {
  TNPP: "Mua và bán",
  TNDM: "Chỉ mua của họ",
  TNDL: "Chỉ bán cho họ",
};

/** Một kỳ phân loại: loại nào áp dụng từ ngày nào đến ngày nào. */
export type MerchantRolePeriod = {
  id: string;
  role: MerchantRole;
  label: string;
  validFrom: string;
  validTo: string | null;
  note?: string | null;
  isCurrent: boolean;
};
