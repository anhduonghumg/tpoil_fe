export type SupplierCompact = {
  id: string;
  code: string;
  name: string;
};

export type WarehousePartyAssignment = {
  partyId: string;
  party: SupplierCompact;
};

export type WarehouseRentalContract = {
  id: string;
  code: string;
  name: string;
  customerId?: string | null;
  startDate: string;
  endDate: string;
  status: "Draft" | "Pending" | "Active" | "Terminated" | "Cancelled";
  renewalOfId?: string | null;
  attachments?: Array<{
    id: string;
    fileName: string;
    fileUrl?: string | null;
    externalUrl?: string | null;
    category: "ScanSigned" | "Draft" | "Appendix" | "Other";
  }>;
};

export type WarehouseArea = {
  id: string;
  code: string;
  name: string;
  note?: string | null;
  sortOrder?: number;
  isActive: boolean;
  _count?: { warehouses: number };
};

export type SupplierLocation = {
  id: string;
  legalEntityId?: string;
  areaId?: string | null;
  area?: WarehouseArea | null;
  code: string;
  name: string;
  nameInvoice?: string | null;
  address?: string | null;
  warehouseType?: string | null;
  isOperationalWarehouse?: boolean;
  note?: string | null;
  isActive: boolean;
  supplierCustomerId?: string | null;
  supplierCustomerIds?: string[];
  supplier?: SupplierCompact | null;
  parties?: WarehousePartyAssignment[];
  rentalContracts?: WarehouseRentalContract[];
};

export type SupplierLocationListQuery = {
  areaId?: string;
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
  areaId: string;
  code: string;
  name: string;
  nameInvoice?: string;
  address?: string;
  isActive?: boolean;
  warehouseType?: string;
  isOperationalWarehouse?: boolean;
  note?: string;
  supplierCustomerIds?: string[];
};

export type UpdateSupplierLocationPayload = {
  areaId?: string;
  code?: string;
  name?: string;
  nameInvoice?: string;
  address?: string;
  isActive?: boolean;
  warehouseType?: string;
  isOperationalWarehouse?: boolean;
  note?: string;
};

export type SupplierOption = {
  id: string;
  code: string;
  name: string;
};

export type SupplierOptionsResult = {
  items: SupplierOption[];
  total?: number;
};

export type BatchUpdateSupplierLocationPayload = {
  supplierCustomerIds?: string[];
} & UpdateSupplierLocationPayload;

export type CreateWarehouseAreaPayload = {
  code: string;
  name: string;
  note?: string;
  sortOrder?: number;
  isActive?: boolean;
};
