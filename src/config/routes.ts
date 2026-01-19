import type { Method } from "axios";
type RouteTuple = readonly [Method, string];

export const ROUTES = {
  app: {
    bootstrap: ["GET", "/app/bootstrap"] as RouteTuple,
  },
  auth: {
    login: ["POST", "/auth/login"] as const,
    logout: ["POST", "/auth/logout"] as const,
    me: ["GET", "/auth/me"] as const,
  },
  dashboard: {
    index: ["/dashboard"] as const,
  },
  user: {
    list: ["GET", "/users"] as RouteTuple,
    create: ["POST", "/users"] as RouteTuple,
    detail: ["GET", "/users/:id"] as RouteTuple,
    update: ["PUT", "/users/:id"] as RouteTuple,
    delete: ["DELETE", "/users/:id"] as RouteTuple,
    departments: ["GET", "/users/departments"] as RouteTuple,
    roles: ["GET", "/users/roles"] as RouteTuple,
    setRoles: ["PUT", "/users/:id/roles"] as RouteTuple,
    setEmployee: ["PUT", "/users/:id/employee"] as RouteTuple,
    resetPassword: ["PUT", "/users/:id/password"] as RouteTuple,
  },
  department: {
    list: ["GET", "/departments"] as RouteTuple,
    all: ["GET", "/departments/all"] as RouteTuple,
    tree: ["GET", "/departments/tree"] as RouteTuple,
    create: ["POST", "/departments"] as RouteTuple,
    detail: ["GET", "/departments/:id"] as RouteTuple,
    update: ["PATCH", "/departments/:id"] as RouteTuple,
    delete: ["DELETE", "/departments/:id"] as RouteTuple,
    deleteMultiple: ["POST", "/departments/delete-multiple"] as RouteTuple,
    sites: ["GET", "/departments/sites"] as RouteTuple,
  },
  employee: {
    list: ["GET", "/employees"] as RouteTuple,
    create: ["POST", "/employees"] as RouteTuple,
    roles: ["GET", "/employees/roles"] as RouteTuple,
    detail: ["GET", "/employees/:id"] as RouteTuple,
    update: ["PATCH", "/employees/:id"] as RouteTuple,
    delete: ["DELETE", "/employees/:id"] as RouteTuple,
    bulkDelete: ["POST", "/employees/bulk-delete"] as RouteTuple,
    birthdays: ["GET", "/employees/birthdays"] as RouteTuple,
    select: ["GET", "/employees/select"] as RouteTuple,
  },
  customer: {
    list: ["GET", "/customers"] as RouteTuple,
    detail: ["GET", "/customers/:id"] as RouteTuple,
    overview: ["GET", "/customers/:id/overview"] as RouteTuple,
    create: ["POST", "/customers"] as RouteTuple,
    update: ["PATCH", "/customers/:id"] as RouteTuple,
    delete: ["DELETE", "/customers/:id"] as RouteTuple,
    generateCode: ["GET", "/customers/generate-code"] as RouteTuple,
    contracts: ["GET", "/customers/:id/contracts"],
    assignContracts: ["POST", "/customers/:id/contracts/assign"],
    unassignContract: ["POST", "/customers/:id/contracts/unassign"],
    select: ["GET", "/customers/select"] as RouteTuple,
  },
  customerGroups: {
    select: ["GET", "/customer-groups/select"] as RouteTuple,
    list: ["GET", "/customer-groups"] as RouteTuple,
    detail: ["GET", "/customer-groups/:id"] as RouteTuple,
    create: ["POST", "/customer-groups"] as RouteTuple,
    update: ["PATCH", "/customer-groups/:id"] as RouteTuple,
    delete: ["DELETE", "/customer-groups/:id"] as RouteTuple,
  },

  customerAddresses: {
    list: ["GET", "/customers/:customerId/addresses"] as const,
    create: ["POST", "/customers/:customerId/addresses"] as const,
    update: ["PATCH", "/customers/:customerId/addresses/:addressId"] as const,
    delete: ["DELETE", "/customers/:customerId/addresses/:addressId"] as const,
  },
  contracts: {
    list: ["GET", "/contracts"] as RouteTuple,
    detail: ["GET", "/contracts/:id"] as RouteTuple,
    create: ["POST", "/contracts"] as RouteTuple,
    update: ["PATCH", "/contracts/:id"] as RouteTuple,
    delete: ["DELETE", "/contracts/:id"] as RouteTuple,
    expiryReport: ["GET", "/contracts/expiry-report"] as RouteTuple,
    expiryReportExport: [
      "GET",
      "/contracts/expiry-report/export",
    ] as RouteTuple,
    attachable: ["GET", "/contracts/attachable"] as RouteTuple,
    byCustomer: ["GET", "/contracts/by-customer/:customerId"] as RouteTuple,
    importExcel: ["POST", "/contracts/import"] as RouteTuple,
  },
  contractAttachments: {
    byContract: [
      "GET",
      "/contract-attachments/contract/:contractId",
    ] as RouteTuple,
    create: ["POST", "/contract-attachments"] as RouteTuple,
    update: ["PATCH", "/contract-attachments/:id"] as RouteTuple,
    delete: ["DELETE", "/contract-attachments/:id"] as RouteTuple,
  },
  contractTypes: {
    list: ["GET", "/contract-types"] as RouteTuple,
    detail: ["GET", "/contract-types/:id"] as RouteTuple,
    create: ["POST", "/contract-types"] as RouteTuple,
    update: ["PATCH", "/contract-types/:id"] as RouteTuple,
    delete: ["DELETE", "/contract-types/:id"] as RouteTuple,
    deleteMultiple: ["POST", "/contract-types/delete-multiple"] as RouteTuple,
  },
  purchaseOrders: {
    list: ["GET", "/purchase-orders"] as RouteTuple,
    detail: ["GET", "/purchase-orders/:id"] as RouteTuple,
    create: ["POST", "/purchase-orders"] as RouteTuple,
    update: ["PATCH", "/purchase-orders/:id"] as RouteTuple,
    delete: ["DELETE", "/purchase-orders/:id"] as RouteTuple,
    approve: ["POST", "/purchase-orders/:id/approve"] as RouteTuple,
  },
  products: {
    select: ["GET", "/products/select"] as RouteTuple,
    list: ["GET", "/products"] as RouteTuple,
    detail: ["GET", "/products/:id"] as RouteTuple,
    create: ["POST", "/products"] as RouteTuple,
    update: ["PUT", "/products/:id"] as RouteTuple,
  },
  supplierLocations: {
    select: ["GET", "/supplier-locations/select"] as RouteTuple,
    list: ["GET", "/supplier-locations"] as RouteTuple,
    detail: ["GET", "/supplier-locations/:id"] as RouteTuple,
    create: ["POST", "/supplier-locations"] as RouteTuple,
    update: ["PATCH", "/supplier-locations/:id"] as RouteTuple,
    deactivate: ["PATCH", "/supplier-locations/:id/deactivate"] as RouteTuple,
    activate: ["PATCH", "/supplier-locations/:id/activate"] as RouteTuple,
    batchUpdate: ["PATCH", "/supplier-locations/:id/batch"] as RouteTuple,
  },
  priceBulletins: {
    list: ["GET", "/price-bulletins"] as RouteTuple,
    listPriceItems: ["GET", "/price-bulletins/items"] as RouteTuple,
    detail: ["GET", "/price-bulletins/:id"] as RouteTuple,
    create: ["POST", "/price-bulletins"] as RouteTuple,
    update: ["PATCH", "/price-bulletins/:id"] as RouteTuple,
    publish: ["POST", "/price-bulletins/:id/publish"] as RouteTuple,
    void: ["POST", "/price-bulletins/:id/void"] as RouteTuple,

    regionsSelect: ["GET", "/price-bulletins/regions/select"] as RouteTuple,
    quote: ["GET", "/price-bulletins/quote"] as RouteTuple,

    importPdfPreview: ["POST", "/price-bulletins/import-pdf/preview"] as const,
    importPdfStatus: [
      "GET",
      "/price-bulletins/import-pdf/status/:runId",
    ] as const,
    importPdfPreviewData: [
      "GET",
      "/price-bulletins/import-pdf/preview/:runId",
    ] as const,
    importPdfCommit: ["POST", "/price-bulletins/import-pdf/commit"] as const,
  },
  cron: {
    listJobs: ["GET", "/cron-jobs"] as RouteTuple,
    listRuns: ["GET", "/cron-jobs/:id/runs"] as RouteTuple,
  },
  lookups: {
    // getContractTypes: ["GET", "/contract-types"] as RouteTuple,
    contractTypes: ["GET", "/lookups/contract-types"] as RouteTuple,
  },
  rbacAdmin: {
    getRoles: ["GET", "/rbac/admin/roles"],
    getRoleDetail: ["GET", "/rbac/admin/roles/:id"] as RouteTuple,
    listPermissions: ["GET", "/rbac/admin/permissions"] as RouteTuple,
    updateRolePermissions: [
      "PUT",
      "/rbac/admin/roles/:id/permissions",
    ] as RouteTuple,
    createRole: ["POST", "/rbac/admin/roles"] as RouteTuple,
    updateRole: ["PATCH", "/rbac/admin/roles/:id"] as RouteTuple,
    deleteRole: ["DELETE", "/rbac/admin/roles/:id"] as RouteTuple,
  },
};

export function buildPath(
  path: string,
  params?: Record<string, string | number>,
) {
  if (!params) return path;
  return path.replace(/:([A-Za-z0-9_]+)/g, (_, k) =>
    encodeURIComponent(String(params[k] ?? "")),
  );
}
