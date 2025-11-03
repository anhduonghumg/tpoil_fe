export type CustomerRole = "Agent" | "Retail" | "Wholesale" | "Other";
export type CustomerType = "B2B" | "B2C" | "Distributor" | "Other";
export type CustomerStatus = "Active" | "Inactive" | "Blacklisted";

export interface Customer {
  id: string;
  code: string;
  name: string;
  taxCode?: string;
  taxVerified?: boolean;
  taxSource?: "Sepay" | "Manual" | "Other";
  billingAddress?: string;
  shippingAddress?: string;
  contactEmail?: string;
  contactPhone?: string;
  roles: CustomerRole[];
  type: CustomerType;
  creditLimit?: number;
  paymentTermDays?: number;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CustListQuery {
  keyword?: string;
  status?: CustomerStatus;
  role?: CustomerRole | "";
  page?: number;
  pageSize?: number;
}
