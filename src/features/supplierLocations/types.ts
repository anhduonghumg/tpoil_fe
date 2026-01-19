export type SupplierCompact = {
  id: string;
  code: string;
  name: string;
};

export type SupplierLocation = {
  id: string;
  supplierCustomerId: string;
  code: string;
  name: string;
  nameInvoice?: string | null;
  isActive: boolean;
  supplier?: SupplierCompact | null;
};

export type SupplierLocationListQuery = {
  supplierCustomerId?: string;
  keyword?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
};

export type SupplierLocationListResult = {
  items: SupplierLocation[];
  total: number;
  page: number;
  pageSize: number;
};

export type CreateSupplierLocationPayload = {
  code: string;
  name: string;
  nameInvoice?: string;
  address?: string;
  tankCode?: string;
  tankName?: string;
  isActive?: boolean;
  supplierCustomerIds: string[];
};

export type UpdateSupplierLocationPayload = {
  code?: string;
  name?: string;
  nameInvoice?: string;
  address?: string;
  tankCode?: string;
  tankName?: string;
  isActive?: boolean;
};

export type SupplierOption = {
  id: string;
  code: string;
  name: string;
};

export type BatchUpdateSupplierLocationPayload = {
  supplierCustomerIds: string[];
} & UpdateSupplierLocationPayload;
