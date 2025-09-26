export type DeptType = "board" | "office" | "group" | "branch";

export type Department = {
  id: string;
  code: string;
  name: string;
  type: DeptType;
  parentId?: string | null;
  parentName?: string;
  siteId?: string | null;
  siteName?: string;
  costCenter?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  deletedBy?: string | null;
};

export type DeptOption = {
  id: string;
  name: string;
};

export type DeptListQuery = {
  q?: string;
  type?: DeptType;
  parentId?: string;
  siteId?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "code" | "name" | "updatedAt";
  sortDir?: "asc" | "desc";
};

export type Paged<T> = { items: T[]; total: number };

export type ApiResponse<T = any> = {
  statusCode: number;
  success: boolean;
  message: string;
  timestamp: string;
  requestId?: string;
  data?: T;
  error?: { code: string; details?: any };
};

export type DeptTreeNode = {
  id: string;
  code: string;
  name: string;
  type: DeptType;
  parentId?: string | null;
  deletedAt?: string | null;
  children?: DeptTreeNode[];
};

export type DeptSite = {
  id: string;
  name: string;
  code: string;
};

export const DEPT_CODE = /^[A-Za-z0-9._-]{2,32}$/;
