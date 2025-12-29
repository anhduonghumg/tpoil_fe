// features/customer-groups/types.ts
export interface CustomerGroup {
  id: string;
  code: string;
  name?: string | null;
  note?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerGroupListQuery {
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export interface CustomerGroupSelectQuery {
  keyword?: string;
  limit?: number;
}

export interface CreateCustomerGroupDto {
  code: string;
  name?: string | null;
  note?: string | null;
}

export interface UpdateCustomerGroupDto {
  code?: string;
  name?: string | null;
  note?: string | null;
}
