import type { Method } from "axios";
type RouteTuple = readonly [Method, string];

export const ROUTES = {
  app: {
    bootstrap: ["GET", "/app/bootstrap"] as RouteTuple,
  },
  notifications: {
    list: ["GET", "/notifications"] as RouteTuple,
    unreadCount: ["GET", "/notifications/unread-count"] as RouteTuple,
    markRead: ["PATCH", "/notifications/:id/read"] as RouteTuple,
    markAllRead: ["PATCH", "/notifications/read-all"] as RouteTuple,
    preferences: ["GET", "/notifications/preferences"] as RouteTuple,
    updatePreference: ["PATCH", "/notifications/preferences"] as RouteTuple,
    registerDevice: ["POST", "/notifications/devices"] as RouteTuple,
    disableDevice: ["DELETE", "/notifications/devices/:deviceId"] as RouteTuple,
  },
  auth: {
    login: ["POST", "/auth/login"] as const,
    logout: ["POST", "/auth/logout"] as const,
    me: ["GET", "/auth/me"] as const,
  },
  me: {
    workspaces: ["GET", "/me/workspaces"] as RouteTuple,
    currentWorkspace: ["GET", "/me/workspaces/current"] as RouteTuple,
    menu: ["GET", "/me/menu"] as RouteTuple,
  },
  dashboards: {
    detail: ["GET", "/dashboards/:dashboardKey"] as RouteTuple,
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
    merchantRole: ["GET", "/customers/:id/merchant-role"] as RouteTuple,
    setMerchantRole: ["PATCH", "/customers/:id/merchant-role"] as RouteTuple,
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
    updateActualReceived: ["PATCH", "/purchase-orders/:id/actual-received"] as RouteTuple,
    delete: ["DELETE", "/purchase-orders/:id"] as RouteTuple,
    approve: ["POST", "/purchase-orders/:id/approve"] as RouteTuple,
    cancel: ["POST", "/purchase-orders/:id/cancel"] as RouteTuple,
    validateContract: ["GET", "/purchase-orders/validate-contract"] as RouteTuple,
    paymentRequestPrint: ["GET", "/purchase-orders/payment-requests/:requestId/print"] as RouteTuple,

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
    importPricingSheet: [
      "POST",
      "/purchase-terms/pricing/import-preview",
    ] as RouteTuple,
    importReceiptDocument: [
      "POST",
      "/purchase-terms/:orderId/receipts/import-preview",
    ] as RouteTuple,
    generateOrderDocument: [
      "POST",
      "/purchase-terms/:orderId/order-document/generate",
    ] as RouteTuple,
    orderDocument: ["GET", "/purchase-terms/:orderId/order-document"] as RouteTuple,
    printOrderDocuments: [
      "POST",
      "/purchase-terms/order-documents/print",
    ] as RouteTuple,
    createPaymentRequest: [
      "POST",
      "/purchase-terms/:orderId/payment-request",
    ] as RouteTuple,
    createBankInstruction: [
      "POST",
      "/purchase-terms/:orderId/bank-instruction",
    ] as RouteTuple,
    matchBankInstruction: [
      "POST",
      "/purchase-terms/:orderId/bank-instruction/:instructionId/match",
    ] as RouteTuple,
    createSettlementAdjustment: [
      "POST",
      "/purchase-terms/:orderId/settlement-adjustment",
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
  // Invoice-based payment requests shared by lot and retail commercial purchases.
  commercialPayments: {
    list: ["GET", "/commercial-purchases/payment-requests"] as RouteTuple,
    createPaymentRequest: [
      "POST",
      "/commercial-purchases/:id/payment-requests",
    ] as RouteTuple,
    approvePaymentRequest: ["POST", "/commercial-purchases/:id/payment-requests/:requestId/approve"] as RouteTuple,
    rejectPaymentRequest: ["POST", "/commercial-purchases/:id/payment-requests/:requestId/reject"] as RouteTuple,
    resubmitPaymentRequest: ["POST", "/commercial-purchases/:id/payment-requests/:requestId/resubmit"] as RouteTuple,
    bankVerifyPaymentRequest: ["POST", "/commercial-purchases/:id/payment-requests/:requestId/bank-verify"] as RouteTuple,
    bankReturnPaymentRequest: ["POST", "/commercial-purchases/:id/payment-requests/:requestId/bank-return"] as RouteTuple,
    recordPayment: ["POST", "/commercial-purchases/:id/payment-requests/:requestId/payments"] as RouteTuple,
  },
  commercialRetail: {
    list: ["GET", "/commercial-retail-purchases"] as RouteTuple,
    detail: ["GET", "/commercial-retail-purchases/:id"] as RouteTuple,
  },
  commercialLots: {
    list: ["GET", "/commercial-lot-purchases"] as RouteTuple,
    listWithdrawals: ["GET", "/commercial-lot-purchases/withdrawals"] as RouteTuple,
    detail: ["GET", "/commercial-lot-purchases/:id"] as RouteTuple,
    createWithdrawal: [
      "POST",
      "/commercial-lot-purchases/:id/withdrawals",
    ] as RouteTuple,
    confirmWithdrawal: [
      "POST",
      "/commercial-lot-purchases/:id/withdrawals/:withdrawalId/confirm",
    ] as RouteTuple,
    cancelWithdrawal: [
      "POST",
      "/commercial-lot-purchases/:id/withdrawals/:withdrawalId/cancel",
    ] as RouteTuple,
  },

  salesOrders: {
    list: ["GET", "/sales-orders"] as RouteTuple,
    statusCounts: ["GET", "/sales-orders/status-counts"] as RouteTuple,
    create: ["POST", "/sales-orders"] as RouteTuple,
    detail: ["GET", "/sales-orders/:id"] as RouteTuple,
    createFromPurchaseOrder: [
      "POST",
      "/sales-orders/from-purchase-order/:purchaseOrderId",
    ] as RouteTuple,
    attachPurchaseOrder: [
      "POST",
      "/sales-orders/:id/attach/:purchaseOrderId",
    ] as RouteTuple,
    unlinkPurchaseOrder: ["DELETE", "/sales-orders/link/:purchaseOrderId"] as RouteTuple,

    // Luồng bán hàng nội bộ (SINGLE/LOT)
    update: ["PATCH", "/sales-orders/:id"] as RouteTuple,
    remove: ["DELETE", "/sales-orders/:id"] as RouteTuple,
    checks: ["GET", "/sales-orders/:id/checks"] as RouteTuple,
    print: ["GET", "/sales-orders/:id/print"] as RouteTuple,
    printBatch: ["POST", "/sales-orders/print-batch"] as RouteTuple,
    submit: ["POST", "/sales-orders/:id/submit"] as RouteTuple,
    reserve: ["POST", "/sales-orders/:id/reserve"] as RouteTuple,
    recall: ["POST", "/sales-orders/:id/recall"] as RouteTuple,
    cancel: ["POST", "/sales-orders/:id/cancel"] as RouteTuple,
  },

  salesApprovals: {
    list: ["GET", "/sales-approvals"] as RouteTuple,
    approve: ["POST", "/sales-approvals/:id/approve"] as RouteTuple,
    reject: ["POST", "/sales-approvals/:id/reject"] as RouteTuple,
    returnToPending: ["POST", "/sales-approvals/:id/return-to-pending"] as RouteTuple,
    approveMany: ["POST", "/sales-approvals/approve-many"] as RouteTuple,
    rejectMany: ["POST", "/sales-approvals/reject-many"] as RouteTuple,
    adjustLineDiscount: ["PATCH", "/sales-approvals/lines/:lineId/discount"] as RouteTuple,
    adjustLineSupplier: ["PATCH", "/sales-approvals/lines/:lineId/supplier"] as RouteTuple,
  },

  salesDeliveries: {
    list: ["GET", "/sales-deliveries"] as RouteTuple,
    detail: ["GET", "/sales-deliveries/:id"] as RouteTuple,
    fifoSuggestion: ["GET", "/sales-deliveries/:id/fifo-suggestion"] as RouteTuple,
    confirm: ["POST", "/sales-deliveries/:id/confirm"] as RouteTuple,
    returnToSales: ["POST", "/sales-deliveries/:id/return"] as RouteTuple,
    resend: ["POST", "/sales-deliveries/:id/resend"] as RouteTuple,
    voidPosted: ["POST", "/sales-deliveries/:id/void"] as RouteTuple,
  },

  salesReconciliations: {
    byOrder: ["GET", "/sales-reconciliations/order/:salesOrderId"] as RouteTuple,
    byWithdrawal: [
      "GET",
      "/sales-reconciliations/withdrawal/:withdrawalRequestId",
    ] as RouteTuple,
    updateLine: ["POST", "/sales-reconciliations/lines/:lineId"] as RouteTuple,
    resolveLine: ["POST", "/sales-reconciliations/lines/:lineId/resolve"] as RouteTuple,
  },

  salesLotOrders: {
    detail: ["GET", "/sales-lot-orders/:id"] as RouteTuple,
    createAdjustment: ["POST", "/sales-lot-orders/adjustments"] as RouteTuple,
    approveAdjustment: ["POST", "/sales-lot-orders/adjustments/:id/approve"] as RouteTuple,
    rejectAdjustment: ["POST", "/sales-lot-orders/adjustments/:id/reject"] as RouteTuple,
  },

  salesWithdrawals: {
    list: ["GET", "/sales-withdrawals"] as RouteTuple,
    sourceCandidates: ["GET", "/sales-withdrawals/source-candidates"] as RouteTuple,
    detail: ["GET", "/sales-withdrawals/:id"] as RouteTuple,
    create: ["POST", "/sales-withdrawals"] as RouteTuple,
    selectSource: ["POST", "/sales-withdrawals/:id/select-source"] as RouteTuple,
    submit: ["POST", "/sales-withdrawals/:id/submit"] as RouteTuple,
    cancel: ["POST", "/sales-withdrawals/:id/cancel"] as RouteTuple,
  },

  salesCustomerStock: {
    list: ["GET", "/sales-customer-stock"] as RouteTuple,
  },

  salesInvoices: {
    list: ["GET", "/sales-invoices"] as RouteTuple,
    unissued: ["GET", "/sales-invoices/unissued"] as RouteTuple,
    preview: ["POST", "/sales-invoices/preview"] as RouteTuple,
    createDraft: ["POST", "/sales-invoices/drafts"] as RouteTuple,
    detail: ["GET", "/sales-invoices/:id"] as RouteTuple,
    issue: ["POST", "/sales-invoices/:id/issue"] as RouteTuple,
    retry: ["POST", "/sales-invoices/:id/retry"] as RouteTuple,
    cancel: ["POST", "/sales-invoices/:id/cancel"] as RouteTuple,
  },

  receivables: {
    list: ["GET", "/receivables"] as RouteTuple,
    aging: ["GET", "/receivables/aging"] as RouteTuple,
    partyDebt: ["GET", "/receivables/party-debt"] as RouteTuple,
    customerBalance: [
      "GET",
      "/receivables/customers/:customerPartyId/balance",
    ] as RouteTuple,
    detail: ["GET", "/receivables/:id"] as RouteTuple,
    allocate: ["POST", "/receivables/allocations"] as RouteTuple,
    reverseAllocation: ["POST", "/receivables/allocations/:id/reverse"] as RouteTuple,
  },

  salesCredit: {
    list: ["GET", "/sales-credit"] as RouteTuple,
    detail: ["GET", "/sales-credit/:customerPartyId"] as RouteTuple,
    update: ["PATCH", "/sales-credit/:customerPartyId"] as RouteTuple,
  },

  salesDiscounts: {
    list: ["GET", "/sales-discounts"] as RouteTuple,
    current: ["GET", "/sales-discounts/current"] as RouteTuple,
    resolve: ["GET", "/sales-discounts/resolve"] as RouteTuple,
    recipientCandidates: ["GET", "/sales-discounts/recipient-candidates"] as RouteTuple,
    detail: ["GET", "/sales-discounts/:id"] as RouteTuple,
    create: ["POST", "/sales-discounts"] as RouteTuple,
    update: ["PATCH", "/sales-discounts/:id"] as RouteTuple,
    publish: ["POST", "/sales-discounts/:id/publish"] as RouteTuple,
    unpublish: ["POST", "/sales-discounts/:id/unpublish"] as RouteTuple,
    affectedOrders: ["GET", "/sales-discounts/:id/affected-orders"] as RouteTuple,
    send: ["POST", "/sales-discounts/:id/send"] as RouteTuple,
    cancel: ["DELETE", "/sales-discounts/:id"] as RouteTuple,
  },

  salesProfitability: {
    byPurchaseOrder: [
      "GET",
      "/sales-profitability/purchase-orders/:purchaseOrderId",
    ] as RouteTuple,
    bySalesOrder: ["GET", "/sales-profitability/sales-orders/:salesOrderId"] as RouteTuple,
  },

  salesAliases: {
    list: ["GET", "/sales-aliases"] as RouteTuple,
    unmatched: ["GET", "/sales-aliases/unmatched"] as RouteTuple,
    create: ["POST", "/sales-aliases"] as RouteTuple,
    import: ["POST", "/sales-aliases/import"] as RouteTuple,
    update: ["PATCH", "/sales-aliases/:id"] as RouteTuple,
    retire: ["DELETE", "/sales-aliases/:id"] as RouteTuple,
  },

  salesQuickEntry: {
    parse: ["POST", "/sales-quick-entry/parse"] as RouteTuple,
    confirm: ["POST", "/sales-quick-entry/confirm"] as RouteTuple,
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
  vatRates: {
    list: ["GET", "/vat-rates"] as RouteTuple,
    select: ["GET", "/vat-rates/select"] as RouteTuple,
    create: ["POST", "/vat-rates"] as RouteTuple,
    update: ["PATCH", "/vat-rates/:id"] as RouteTuple,
    delete: ["DELETE", "/vat-rates/:id"] as RouteTuple,
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
    createManualTransaction: ["POST", "/banking/transactions/manual"] as RouteTuple,
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
    termPaymentPendingRequests: [
      "GET",
      "/banking/term-payment-batches/pending-requests",
    ] as RouteTuple,
    termPaymentBatches: ["GET", "/banking/term-payment-batches"] as RouteTuple,
    createTermPaymentBatch: ["POST", "/banking/term-payment-batches"] as RouteTuple,
    termPaymentBatchDetail: ["GET", "/banking/term-payment-batches/:id"] as RouteTuple,
    sendTermPaymentBatch: ["POST", "/banking/term-payment-batches/:id/send"] as RouteTuple,
    uploadTermPaymentBatchFile: ["POST", "/banking/term-payment-batches/:id/files"] as RouteTuple,
    matchTermPaymentBatchItem: [
      "POST",
      "/banking/term-payment-batches/:id/items/:itemId/match",
    ] as RouteTuple,
    confirmTermPaymentBatchItemPaid: [
      "POST",
      "/banking/term-payment-batches/:id/items/:itemId/confirm-paid",
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
    stockCard: ["GET", "/goods-receipts/stock-card"] as RouteTuple,
    create: ["POST", "/goods-receipts"] as RouteTuple,
    update: ["PATCH", "/goods-receipts/:id"] as RouteTuple,
    delete: ["DELETE", "/goods-receipts/:id"] as RouteTuple,

    createRequest: ["POST", "/goods-receipts/requests"] as RouteTuple,
    confirm: ["POST", "/goods-receipts/:id/confirm"] as RouteTuple,
    void: ["POST", "/goods-receipts/:id/void"] as RouteTuple,
  },
  products: {
    select: ["GET", "/products/select"] as RouteTuple,
    list: ["GET", "/products"] as RouteTuple,
    detail: ["GET", "/products/:id"] as RouteTuple,
    create: ["POST", "/products"] as RouteTuple,
    update: ["PUT", "/products/:id"] as RouteTuple,
  },
  supplierLocations: {
    areas: ["GET", "/supplier-locations/areas"] as RouteTuple,
    createArea: ["POST", "/supplier-locations/areas"] as RouteTuple,
    updateArea: ["PATCH", "/supplier-locations/areas/:id"] as RouteTuple,
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
