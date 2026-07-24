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
  OPERATIONS_VIEW: "operations.view",
  OPERATIONS_CHARTER_MANAGE: "operations.charter.manage",
  OPERATIONS_WAREHOUSE_MANAGE: "operations.warehouse.manage",
  OPERATIONS_ROAD_MANAGE: "operations.road.manage",
  OPERATIONS_PARTNERS_MANAGE: "operations.partners.manage",
  OPERATIONS_TERM_COSTS_POST: "operations.term_costs.post",
  OPERATIONS_VESSEL_DOCUMENTS_OVERRIDE: "operations.charter.vessel_documents.override",
} as const;

export type PermCode = (typeof PERMS)[keyof typeof PERMS];
