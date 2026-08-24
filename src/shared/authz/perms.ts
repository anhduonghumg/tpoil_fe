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

  // Sales
  SALES_VIEW: "sales.view",
  SALES_CREATE: "sales.create",
  SALES_UPDATE: "sales.update",
  SALES_DELETE: "sales.delete",
  SALES_SUBMIT: "sales.submit",
  SALES_RECALL: "sales.recall",
  SALES_CANCEL: "sales.cancel",
  SALES_APPROVE_ORDER: "sales.approve_order",
  SALES_APPROVE_PRICE: "sales.approve_price",
  SALES_APPROVE_CREDIT: "sales.approve_credit",
  SALES_APPROVE_EXCEPTION: "sales.approve_exception",
  SALES_DELIVERY_CONFIRM: "sales.delivery.confirm",
  SALES_DELIVERY_RETURN: "sales.delivery.return",
  SALES_DELIVERY_VOID: "sales.delivery.void",
  SALES_RECONCILE: "sales.reconcile",
  SALES_INVOICE_VIEW: "sales.invoice.view",
  SALES_INVOICE_ISSUE: "sales.invoice.issue",
  SALES_WITHDRAW_CREATE: "sales.withdraw.create",
  SALES_RECEIVABLE_VIEW: "sales.receivable.view",
  SALES_RECEIVABLE_ALLOCATE: "sales.receivable.allocate",
  SALES_CREDIT_MANAGE: "sales.credit.manage",
  SALES_DISCOUNT_MANAGE: "sales.discount.manage",
  SALES_PROFITABILITY_VIEW: "sales.profitability.view",
  SALES_QUICKENTRY_USE: "sales.quickentry.use",
  SALES_ALIAS_MANAGE: "sales.alias.manage",
} as const;

export type PermCode = (typeof PERMS)[keyof typeof PERMS];
