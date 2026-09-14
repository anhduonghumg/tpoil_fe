export interface ContractType {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  /** Loại hợp đồng này có cho phép mua bán xăng dầu không. */
  allowsTrading?: boolean;
  sortOrder?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ContractTypeListQuery {
  keyword?: string;
  isActive?: boolean | null;
  page?: number;
  pageSize?: number;
}

export interface selectContractype {
  id: string;
  name: string;
}
