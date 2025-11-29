// features/customers/types.ts
export type CustomerType = "B2B" | "B2C" | "Distributor" | "Other";
export type CustomerStatus = "Active" | "Inactive" | "Blacklisted";
export type CustomerRole = "Agent" | "Retail" | "Wholesale" | "Other";

export interface Customer {
  id: string;
  code: string;
  name: string;

  type: CustomerType;
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

  note?: string | null;

  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

/* ------------------------------------------------------
   CONTRACT TYPES — thêm hoàn toàn mới, không đụng Customer
------------------------------------------------------ */

export type ContractStatus =
  | "Draft"
  | "Pending"
  | "Active"
  | "Terminated"
  | "Cancelled";

export type RiskLevel = "Low" | "Medium" | "High";

// Hợp đồng đã gán cho customer (sidebar hiển thị)
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

// Modal gán hợp đồng
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

/* ------------------------------------------------------
   CUSTOMER OVERVIEW BACKEND TRẢ VỀ
   (bổ sung thêm `contracts`)
------------------------------------------------------ */

export interface CustomerOverview {
  customer: Customer;

  // thêm block hợp đồng (không ảnh hưởng BE cũ, chỉ FE dùng)
  contracts?: CustomerContractOverviewItem[] | null;

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
  type?: CustomerType;
  status?: CustomerStatus;
  page?: number;
  pageSize?: number;
}
