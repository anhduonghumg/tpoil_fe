export type RoleLite = { id: string; code: string; name: string };

export type EmployeeLite = {
  id: string;
  code: string;
  fullName?: string | null;
  status: string;
};

export type UserDetail = {
  id: string;
  username: string;
  email: string;
  name?: string | null;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt?: string | null;

  employee?: EmployeeLite | null;
  rolesGlobal?: RoleLite[];
};

export type CreateUserPayload = {
  username: string;
  email: string;
  name?: string | null;
  isActive?: boolean;
  password: string;

  // V1: gán ngay trong form nhưng gọi API riêng
  employeeId?: string | null;
  roleIds?: string[];
};

export type UpdateUserPayload = {
  email: string;
  name?: string | null;
  isActive?: boolean;

  // đổi mật khẩu (optional)
  password?: string;

  // V1: gán ngay trong form nhưng gọi API riêng
  employeeId?: string | null;
  roleIds?: string[];
};

export type UserRow = {
  id: string;
  username: string;
  email: string;
  name?: string | null;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  employee?: EmployeeLite | null;
  rolesGlobal: RoleLite[];
};

export type UsersListParams = {
  keyword?: string;
  isActive?: 0 | 1;
  hasEmployee?: 0 | 1;
  page?: number;
  limit?: number;
};
