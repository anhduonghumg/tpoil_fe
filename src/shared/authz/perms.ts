export const PERMS = {
  // Users
  USERS_VIEW: "users.view",
  USERS_CREATE: "users.create",
  USERS_UPDATE: "users.update",
  USERS_DELETE: "users.delete",
  USERS_ASSIGN_ROLES: "users.assign_roles",
  USERS_ASSIGN_EMPLOYEE: "users.assign_employee",
  USERS_RESET_PASSWORD: "users.reset_password",

  // RBAC
  RBAC_ROLES_VIEW: "rbac.roles.view",
  RBAC_ROLES_CREATE: "rbac.roles.create",
  RBAC_ROLES_UPDATE: "rbac.roles.update",
  RBAC_ROLES_DELETE: "rbac.roles.delete",
  RBAC_PERMS_VIEW: "rbac.perms.view",

  // System
  SYSTEM_RBAC_ADMIN: "system.rbac.admin",
} as const;

export type PermCode = (typeof PERMS)[keyof typeof PERMS];
