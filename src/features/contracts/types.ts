export type ContractStatus =
  | "Draft"
  | "Active"
  | "Suspended"
  | "Expired"
  | "Terminated";
export type ContractType = "FRAME" | "SALE" | "SERVICE" | "OTHER";
export type RiskLevel = "Low" | "Medium" | "High" | "Critical";

export interface ContractCustomerRef {
  id: string;
  code: string;
  name: string;
}

export interface Contract {
  id: string;
  code: string;
  customerId: string;
  customer?: ContractCustomerRef;
  type: ContractType;
  startDate: string;
  endDate: string;
  status: ContractStatus;
  paymentTermDays?: number | null;
  creditLimitOverride?: number | null;
  sla?: any;
  deliveryScope?: any;
  riskLevel: RiskLevel;
  approvalRequestId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ContractListQuery {
  keyword?: string;
  customerId?: string;
  type?: ContractType;
  status?: ContractStatus;
  startFrom?: string;
  startTo?: string;
  page?: number;
  pageSize?: number;
}
