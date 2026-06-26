export type ProductItem = {
  id: string;
  code?: string | null;
  name: string;
};

export type EnvironmentTaxRate = {
  id: string;
  productId: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  taxVndPerLiter: number | string;
  status: "ACTIVE" | "INACTIVE" | string;
  note?: string | null;
  product?: ProductItem | null;
  createdAt?: string;
  updatedAt?: string;
};

export type EnvironmentTaxListQuery = {
  productId?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
};

export type EnvironmentTaxListResult = {
  items: EnvironmentTaxRate[];
  total: number;
};

export type UpsertEnvironmentTaxPayload = {
  productId: string;
  effectiveFrom: string;
  effectiveTo?: string;
  taxVndPerLiter: number;
  status?: string;
  note?: string;
};

export type DeleteEnvironmentTaxResult = {
  id: string;
};
