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
    purchaseDefaults: ["GET", "/customers/:id/purchase-defaults"] as RouteTuple,
    updatePurchaseDefaults: [
      "PATCH",
      "/customers/:id/purchase-defaults",
    ] as RouteTuple,
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
    cancel: ["POST", "/purchase-orders/:id/cancel"] as RouteTuple,

    approveMany: ["POST", "/purchase-orders/approve-many"] as RouteTuple,
    cancelMany: ["POST", "/purchase-orders/cancel-many"] as RouteTuple,
    tabCounts: ["GET", "/purchase-orders/tab-counts"] as RouteTuple,

    printBatch: ["POST", "/purchase-orders/print-batch"] as RouteTuple,
    printBatchStatus: [
      "GET",
      "/purchase-orders/print-batch/:runId",
    ] as RouteTuple,
    printBatchDownload: [
      "GET",
      "/purchase-orders/print-batch/:runId/download",
    ] as RouteTuple,
  },

  // purchaseTerm: {
  //   orders: {
  //     list: ["GET", "/purchase-term/orders"] as RouteTuple,
  //     detail: ["GET", "/purchase-term/orders/:id"] as RouteTuple,
  //     create: ["POST", "/purchase-term/orders"] as RouteTuple,
  //     update: ["PATCH", "/purchase-term/orders/:id"] as RouteTuple,
  //     approve: ["POST", "/purchase-term/orders/:id/approve"] as RouteTuple,
  //     cancel: ["POST", "/purchase-term/orders/:id/cancel"] as RouteTuple,
  //     nextAction: [
  //       "GET",
  //       "/purchase-term/orders/:id/next-action",
  //     ] as RouteTuple,
  //     complete: ["POST", "/purchase-term/orders/:id/complete"] as RouteTuple,
  //   },
  // },

  purchaseTerm: {
    list: ["GET", "/purchase-terms"] as RouteTuple,
    detail: ["GET", "/purchase-terms/:id"] as RouteTuple,
    create: ["POST", "/purchase-terms"] as RouteTuple,
    update: ["PATCH", "/purchase-terms/:id"] as RouteTuple,
    approve: ["POST", "/purchase-terms/:id/approve"] as RouteTuple,
    validateContract: ["GET", "/purchase-terms/validate-contract"] as RouteTuple,
    cancel: ["POST", "/purchase-terms/:id/cancel"] as RouteTuple,
    nextAction: ["GET", "/purchase-terms/:id/next-action"] as RouteTuple,
    complete: ["POST", "/purchase-terms/:id/complete"] as RouteTuple,

    receipts: ["GET", "/purchase-terms/:orderId/receipts"] as RouteTuple,
    createReceipt: ["POST", "/purchase-terms/:orderId/receipts"] as RouteTuple,
    receiptDetail: ["GET", "/purchase-terms/receipts/:id"] as RouteTuple,
    updateReceipt: ["PATCH", "/purchase-terms/receipts/:id"] as RouteTuple,
    confirmReceipt: [
      "POST",
      "/purchase-terms/receipts/:id/confirm",
    ] as RouteTuple,
    voidReceipt: ["POST", "/purchase-terms/receipts/:id/void"] as RouteTuple,

    createEstimatePricing: [
      "POST",
      "/purchase-terms/:orderId/pricing/estimate",
    ] as RouteTuple,
    createBillNormalizePricing: [
      "POST",
      "/purchase-terms/:orderId/pricing/bill",
    ] as RouteTuple,
    createFinalPricing: [
      "POST",
      "/purchase-terms/:orderId/pricing/final",
    ] as RouteTuple,
    createBossSheetPricing: [
      "POST",
      "/purchase-terms/:orderId/pricing/boss-sheet",
    ] as RouteTuple,
    getVcbFxRate: ["GET", "/purchase-terms/vcb-fx-rate"] as RouteTuple,
    getPlattsAverage: ["GET", "/purchase-terms/platts-average"] as RouteTuple,
    getEnvironmentTax: [
      "GET",
      "/purchase-terms/environment-tax",
    ] as RouteTuple,

    shipments: ["GET", "/purchase-terms/:purchaseOrderId/shipments"] as RouteTuple,
    createShipment: [
      "POST",
      "/purchase-terms/:purchaseOrderId/shipments",
    ] as RouteTuple,
    updateShipment: [
      "PATCH",
      "/purchase-terms/:purchaseOrderId/shipments/:shipmentId",
    ] as RouteTuple,
    deleteShipment: [
      "DELETE",
      "/purchase-terms/:purchaseOrderId/shipments/:shipmentId",
    ] as RouteTuple,

    logisticsCosts: [
      "GET",
      "/purchase-terms/:purchaseOrderId/logistics-costs",
    ] as RouteTuple,
    createLogisticsCost: [
      "POST",
      "/purchase-terms/:purchaseOrderId/logistics-costs",
    ] as RouteTuple,
    logisticsCostDetail: [
      "GET",
      "/purchase-terms/:purchaseOrderId/logistics-costs/:costId",
    ] as RouteTuple,
    updateLogisticsCost: [
      "PATCH",
      "/purchase-terms/:purchaseOrderId/logistics-costs/:costId",
    ] as RouteTuple,
    deleteLogisticsCost: [
      "DELETE",
      "/purchase-terms/:purchaseOrderId/logistics-costs/:costId",
    ] as RouteTuple,
    confirmLogisticsCost: [
      "POST",
      "/purchase-terms/:purchaseOrderId/logistics-costs/:costId/confirm",
    ] as RouteTuple,
    voidLogisticsCost: [
      "POST",
      "/purchase-terms/:purchaseOrderId/logistics-costs/:costId/void",
    ] as RouteTuple,
  },

  commodityPriceQuotes: {
    list: ["GET", "/commodity-price-quotes"] as RouteTuple,
    upsert: ["POST", "/commodity-price-quotes/upsert"] as RouteTuple,
    delete: ["DELETE", "/commodity-price-quotes/:id"] as RouteTuple,
  },

  vcbFxRates: {
    list: ["GET", "/vcb-fx-rates"] as RouteTuple,
    upsert: ["POST", "/vcb-fx-rates/upsert"] as RouteTuple,
    fetchFromVcb: ["POST", "/vcb-fx-rates/fetch"] as RouteTuple,
    delete: ["DELETE", "/vcb-fx-rates/:id"] as RouteTuple,
  },

  environmentTaxes: {
    list: ["GET", "/environment-taxes"] as RouteTuple,
    create: ["POST", "/environment-taxes"] as RouteTuple,
    update: ["PATCH", "/environment-taxes/:id"] as RouteTuple,
    delete: ["DELETE", "/environment-taxes/:id"] as RouteTuple,
  },

  supplierInvoices: {
    create: ["POST", "/supplier-invoices"] as RouteTuple,
    importPdf: ["POST", "/supplier-invoices/import-pdf"] as RouteTuple,
    importPdfResult: [
      "GET",
      "/supplier-invoices/import-pdf/result/:runId",
    ] as RouteTuple,
    detail: ["GET", "/supplier-invoices"] as RouteTuple,
    post: ["POST", "/supplier-invoices/:id/post"] as RouteTuple,
  },

  banking: {
    transactions: ["GET", "/banking/transactions"] as RouteTuple,
    transactionDetail: ["GET", "/banking/transactions/:id"] as RouteTuple,
    transactionSuggestions: [
      "GET",
      "/banking/transactions/:id/suggestions",
    ] as RouteTuple,
    confirmTransaction: [
      "POST",
      "/banking/transactions/:id/confirm",
    ] as RouteTuple,
    templates: ["GET", "/banking/templates"] as RouteTuple,
    importDetail: ["GET", "/banking/imports/:id"] as RouteTuple,
    importPreview: ["POST", "/banking/imports/preview"] as RouteTuple,
    importCommit: ["POST", "/banking/imports/commit"] as RouteTuple,

    deleteTransaction: ["DELETE", "/banking/transactions/:id"] as RouteTuple,
    deleteMultipleTransactions: [
      "POST",
      "/banking/transactions/delete-multiple",
    ] as RouteTuple,
  },

  bankPurposes: {
    list: ["GET", "/bank/purposes"] as RouteTuple,
    all: ["GET", "/bank/purposes/all"] as RouteTuple,
    detail: ["GET", "/bank/purposes/:id"] as RouteTuple,
    create: ["POST", "/bank/purposes"] as RouteTuple,
    update: ["PATCH", "/bank/purposes/:id"] as RouteTuple,
    delete: ["DELETE", "/bank/purposes/:id"] as RouteTuple,
  },

  bankAccounts: {
    list: ["GET", "/bank-accounts"],
    detail: ["GET", "/bank-accounts/:id"],
    create: ["POST", "/bank-accounts"],
    update: ["PATCH", "/bank-accounts/:id"],
  },

  bankImportTemplates: {
    list: ["GET", "/bank-import-templates"],
    detail: ["GET", "/bank-import-templates/:id"],
    create: ["POST", "/bank-import-templates"],
    update: ["PATCH", "/bank-import-templates/:id"],
  },

  goodsReceipts: {
    list: ["GET", "/goods-receipts"] as RouteTuple,
    detail: ["GET", "/goods-receipts/:id"] as RouteTuple,
    create: ["POST", "/goods-receipts"] as RouteTuple,
    update: ["PATCH", "/goods-receipts/:id"] as RouteTuple,
    delete: ["DELETE", "/goods-receipts/:id"] as RouteTuple,

    createAutoConfirm: ["POST", "/goods-receipts/auto-confirm"] as RouteTuple,
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
    quoteBatch: ["POST", "/price-bulletins/quote-batch"] as RouteTuple,

    importPdfPreview: [
      "POST",
      "/price-bulletins/import-pdf/preview",
    ] as RouteTuple,
    importPdfStatus: [
      "GET",
      "/price-bulletins/import-pdf/status/:runId",
    ] as RouteTuple,
    getImportPreviewData: [
      "GET",
      "/price-bulletins/import-pdf/preview/:runId",
    ] as RouteTuple,
    updatePreviewLine: [
      "PATCH",
      "/price-bulletins/import-pdf/preview/:runId/line/:rowNo",
    ] as RouteTuple,
    importPdfCommit: [
      "POST",
      "/price-bulletins/import-pdf/commit",
    ] as RouteTuple,
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
