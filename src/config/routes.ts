import type { Method } from "axios";
type RouteTuple = readonly [Method, string];

export const ROUTES = {
  // app: {
  //   bootstrap: ["GET", "/app/bootstrap"],
  // },
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
    assignContracts: ["POST", "/customers/:id/assign-contracts"],
    unassignContract: ["DELETE", "/customers/:id/contracts/:contractId"],
    select: ["GET", "/customers/select"] as RouteTuple,
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
  cron: {
    listJobs: ["GET", "/cron-jobs"] as RouteTuple,
    listRuns: ["GET", "/cron-jobs/:id/runs"] as RouteTuple,
  },
  lookups: {
    // getContractTypes: ["GET", "/contract-types"] as RouteTuple,
    contractTypes: ["GET", "/lookups/contract-types"] as RouteTuple,
  },
};

export function buildPath(
  path: string,
  params?: Record<string, string | number>
) {
  if (!params) return path;
  return path.replace(/:([A-Za-z0-9_]+)/g, (_, k) =>
    encodeURIComponent(String(params[k] ?? ""))
  );
}
