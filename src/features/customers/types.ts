// features/customers/types.ts
export type CustomerType = "B2B" | "B2C" | "Distributor" | "Other";
export type CustomerStatus = "Active" | "Inactive" | "Blacklisted";
export type CustomerRole = "Agent" | "Retail" | "Wholesale" | "Other";
export type PartyType = "SUPPLIER" | "CUSTOMER" | "INTERNAL";

export interface Customer {
  id: string;
  code: string;
  name: string;

  type: CustomerType;
  partyType: PartyType;
  roles?: CustomerRole[];

  status: CustomerStatus;

  taxCode?: string | null;
  taxVerified?: boolean;
  taxSource?: string | null;

  billingAddress?: string | null;
  shippingAddress?: string | null;

  contactEmail?: string | null;
  contactPhone?: string | null;

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
  role?: PartyType;
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
