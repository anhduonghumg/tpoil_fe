// src/features/rbac/roles/types.ts

export interface RoleSummary {
  id: string;
  code: string;
  name: string;
  desc: string | null;
  userCount: number;
}

export interface RoleDetailPermission {
  id: string;
  code: string;
  name: string;
  moduleCode: string;
  moduleName: string;
  assigned: boolean;
}

export interface RoleDetail {
  id: string;
  code: string;
  name: string;
  desc: string | null;
  permissions: RoleDetailPermission[];
}

export interface PermissionItem {
  id: string;
  code: string;
  name: string;
  moduleCode: string;
  moduleName: string;
}

export type RolesListQuery = {
  page?: number;
  pageSize?: number;
  keyword?: string;
};

export type RoleRow = {
  id: string;
  code: string;
  name: string;
  desc?: string | null;
  userCount: number;
  createdAt: string;
  updatedAt: string;
};

export type RolesListRes = {
  page: number;
  pageSize: number;
  total: number;
  items: RoleRow[];
};

export type RoleCreateInput = { code: string; name: string; desc?: string };
export type RoleUpdateInput = { name?: string; desc?: string };
