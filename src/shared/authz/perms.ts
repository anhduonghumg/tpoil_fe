export const PERMS = {
  // Users
  USERS_VIEW: "users.view",
  USERS_CREATE: "users.create",
  USERS_UPDATE: "users.update",
  USERS_DELETE: "users.delete",
  USERS_ASSIGN_ROLES: "users.assign_roles",
  USERS_ASSIGN_EMPLOYEE: "users.assign_employee",
  USERS_RESET_PASSWORD: "users.reset_password",

  // System
  SYSTEM_RBAC_ADMIN: "system.rbac.admin",
} as const;

export type PermCode = (typeof PERMS)[keyof typeof PERMS];
