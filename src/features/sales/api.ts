import { apiCall } from "../../shared/lib/api";
import { http } from "../../shared/lib/http";
import type { ApiResponse } from "../../shared/lib/types";
import type {
  AllocateReceivablePayload,
  ConfirmDeliveryPayload,
  ConfirmQuickEntryPayload,
  CreateAliasPayload,
  CreateAliasResult,
  CreateInternalSalesOrderPayload,
  CreditCustomerDetail,
  CreditCustomerRow,
  CreateSalesOrderFromPurchasePayload,
  CreateSalesOrderPayload,
  CreateWithdrawalPayload,
  CustomerBalance,
  CustomerStockResult,
  DeliveryFifoSuggestion,
  DiscountAffectedOrders,
  DiscountBoard,
  DiscountBoardListResult,
  DiscountBoardStatus,
  DiscountRecipientCandidate,
  ImportAliasResult,
  InvoiceSource,
  PartyDebtRow,
  PurchaseSourceReport,
  QuickEntryConfirmResult,
  QuickEntryPreview,
  ReceivableAgingRow,
  ReceivableListResult,
  ReceivableOpenItem,
  ReceivableStatus,
  ResolvedDiscount,
  SalesAliasEntityType,
  SalesAliasSource,
  AdjustDiscountResult,
  BulkDecideResult,
  SalesApprovalRequest,
  SalesApprovalStatus,
  SalesApprovalType,
  SalesEntityAlias,
  SalesOrder,
  SalesOrderCheckResult,
  SalesOrderProfitability,
  SalesDelivery,
  SalesDeliveryStatus,
  SalesInvoice,
  SalesInvoicePreview,
  SalesInvoiceStatus,
  UnissuedInvoiceSource,
  SalesOrderKind,
  SalesOrderStatus,
  SalesReconciliation,
  SalesWithdrawalRequest,
  SalesWithdrawalStatus,
  SendDiscountBoardResult,
  SubmitSalesOrderResult,
  UnmatchedAlias,
  UpsertDiscountBoardPayload,
  UpdateCustomerCreditPayload,
  UpdateSalesOrderPayload,
  WithdrawalSourceResult,
} from "./types";

const unwrap = <T,>(response: any) => (response.data?.data ?? response.data) as T;

export const SalesOrdersApi = {
  detail: (id: string) =>
    apiCall<ApiResponse<SalesOrder>>("salesOrders.detail", { params: { id } }).then(
      unwrap<SalesOrder>,
    ),

  create: (payload: CreateSalesOrderPayload) =>
    apiCall<ApiResponse<SalesOrder>>("salesOrders.create", { data: payload }).then(
      unwrap<SalesOrder>,
    ),

  createFromPurchaseOrder: (
    purchaseOrderId: string,
    payload: CreateSalesOrderFromPurchasePayload,
  ) =>
    apiCall<ApiResponse<SalesOrder>>("salesOrders.createFromPurchaseOrder", {
      params: { purchaseOrderId },
      data: payload,
    }).then(unwrap<SalesOrder>),

  list: (query: { keyword?: string; page?: number; limit?: number }) =>
    apiCall<ApiResponse<{ items: SalesOrder[]; total: number; page: number; limit: number }>>(
      "salesOrders.list",
      { query },
    ).then(unwrap<{ items: SalesOrder[]; total: number; page: number; limit: number }>),

  attachPurchaseOrder: (id: string, purchaseOrderId: string) =>
    apiCall<ApiResponse<SalesOrder>>("salesOrders.attachPurchaseOrder", {
      params: { id, purchaseOrderId },
      data: {},
    }).then(unwrap<SalesOrder>),

  unlinkPurchaseOrder: (purchaseOrderId: string) =>
    apiCall("salesOrders.unlinkPurchaseOrder", { params: { purchaseOrderId } }).then(
      unwrap<{ success: boolean }>,
    ),
};

// ===== Luồng bán hàng nội bộ (SINGLE/LOT) =====

type Paged<T> = { items: T[]; total: number; page: number; limit: number };

export const InternalSalesApi = {
  list: (query: {
    keyword?: string;
    kind?: SalesOrderKind;
    /** Một trạng thái, hoặc nhiều trạng thái ngăn bởi dấu phẩy cho tab gộp. */
    status?: SalesOrderStatus | string;
    customerPartyId?: string;
    page?: number;
    limit?: number;
  }) =>
    apiCall<ApiResponse<Paged<SalesOrder>>>("salesOrders.list", { query }).then(
      unwrap<Paged<SalesOrder>>,
    ),

  statusCounts: (query: {
    keyword?: string;
    kind?: SalesOrderKind;
    customerPartyId?: string;
  }) =>
    apiCall<ApiResponse<{ byStatus: Record<string, number>; total: number }>>(
      "salesOrders.statusCounts",
      { query },
    ).then(unwrap<{ byStatus: Record<string, number>; total: number }>),

  create: (payload: CreateInternalSalesOrderPayload) =>
    apiCall<ApiResponse<SalesOrder>>("salesOrders.create", { data: payload }).then(
      unwrap<SalesOrder>,
    ),

  update: (id: string, payload: UpdateSalesOrderPayload) =>
    apiCall<ApiResponse<SalesOrder>>("salesOrders.update", { params: { id }, data: payload }).then(
      unwrap<SalesOrder>,
    ),

  remove: (id: string) =>
    apiCall<ApiResponse<{ success: boolean }>>("salesOrders.remove", { params: { id } }).then(
      unwrap<{ success: boolean }>,
    ),

  /** Xem trước kết quả kiểm tra nội bộ trước khi gửi duyệt. */
  checks: (id: string) =>
    apiCall<ApiResponse<SalesOrderCheckResult>>("salesOrders.checks", { params: { id } }).then(
      unwrap<SalesOrderCheckResult>,
    ),

  submit: (id: string) =>
    apiCall<ApiResponse<SubmitSalesOrderResult>>("salesOrders.submit", {
      params: { id },
      data: {},
    }).then(unwrap<SubmitSalesOrderResult>),

  /** Thử giữ hàng lại cho đơn đang chờ hàng. */
  reserve: (id: string) =>
    apiCall<ApiResponse<SalesOrder>>("salesOrders.reserve", { params: { id }, data: {} }).then(
      unwrap<SalesOrder>,
    ),

  recall: (id: string) =>
    apiCall<ApiResponse<SalesOrder>>("salesOrders.recall", { params: { id }, data: {} }).then(
      unwrap<SalesOrder>,
    ),

  cancel: (id: string, reason?: string) =>
    apiCall<ApiResponse<SalesOrder>>("salesOrders.cancel", {
      params: { id },
      data: { reason },
    }).then(unwrap<SalesOrder>),
};

export const SalesOrderPrintApi = {
  /**
   * Trả PDF gộp. Dùng http trực tiếp vì apiCall không hỗ trợ responseType blob.
   */
  batch: (payload: {
    ids?: string[];
    customerPartyId?: string;
    dateFrom?: string;
    dateTo?: string;
    kind?: SalesOrderKind;
  }) =>
    http
      .request<Blob>({
        method: "POST",
        url: "/sales-orders/print-batch",
        data: payload,
        responseType: "blob",
      })
      .then((response) => response.data),
};

export const SalesApprovalsApi = {
  list: (query: {
    status?: SalesApprovalStatus;
    type?: SalesApprovalType;
    salesOrderId?: string;
    withdrawalRequestId?: string;
    mine?: boolean;
    keyword?: string;
    customerPartyId?: string;
    kind?: SalesOrderKind;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) =>
    apiCall<ApiResponse<Paged<SalesApprovalRequest>>>("salesApprovals.list", { query }).then(
      unwrap<Paged<SalesApprovalRequest>>,
    ),

  approve: (id: string, note?: string) =>
    apiCall<ApiResponse<SalesApprovalRequest>>("salesApprovals.approve", {
      params: { id },
      data: { note },
    }).then(unwrap<SalesApprovalRequest>),

  /** Từ chối bắt buộc có lý do. */
  reject: (id: string, note: string) =>
    apiCall<ApiResponse<SalesApprovalRequest>>("salesApprovals.reject", {
      params: { id },
      data: { note },
    }).then(unwrap<SalesApprovalRequest>),

  returnToPending: (id: string) =>
    apiCall<ApiResponse<{ salesOrderId: string; status: SalesOrderStatus }>>("salesApprovals.returnToPending", {
      params: { id },
      data: {},
    }).then(unwrap<{ salesOrderId: string; status: SalesOrderStatus }>),

  /** Duyệt hàng loạt; backend xử lý từng cái độc lập nên có thể thành công một phần. */
  approveMany: (ids: string[], note?: string) =>
    apiCall<ApiResponse<BulkDecideResult>>("salesApprovals.approveMany", {
      data: { ids, note },
    }).then(unwrap<BulkDecideResult>),

  rejectMany: (ids: string[], note: string) =>
    apiCall<ApiResponse<BulkDecideResult>>("salesApprovals.rejectMany", {
      data: { ids, note },
    }).then(unwrap<BulkDecideResult>),

  /** Người duyệt sửa CK điều chỉnh; trả về thành tiền đơn đã tính lại. */
  adjustLineDiscount: (lineId: string, discountAdjustmentAmount: number) =>
    apiCall<ApiResponse<AdjustDiscountResult>>("salesApprovals.adjustLineDiscount", {
      params: { lineId },
      data: { discountAdjustmentAmount },
    }).then(unwrap<AdjustDiscountResult>),

  /** Chọn Mã NCC cụ thể; null = để hệ thống tự phân bổ FIFO. */
  adjustLineSupplier: (lineId: string, supplierPartyId: string | null) =>
    apiCall<ApiResponse<{ id: string; preferredSupplierPartyId: string | null }>>(
      "salesApprovals.adjustLineSupplier",
      { params: { lineId }, data: { supplierPartyId } },
    ).then(unwrap<{ id: string; preferredSupplierPartyId: string | null }>),
};

export const SalesWithdrawalsApi = {
  list: (query: {
    status?: SalesWithdrawalStatus;
    customerPartyId?: string;
    salesOrderId?: string;
    page?: number;
    limit?: number;
  }) =>
    apiCall<ApiResponse<Paged<SalesWithdrawalRequest>>>("salesWithdrawals.list", { query }).then(
      unwrap<Paged<SalesWithdrawalRequest>>,
    ),

  detail: (id: string) =>
    apiCall<ApiResponse<SalesWithdrawalRequest>>("salesWithdrawals.detail", {
      params: { id },
    }).then(unwrap<SalesWithdrawalRequest>),

  /** Các đơn lô còn hàng có thể phục vụ lần rút này. */
  sourceCandidates: (query: {
    customerPartyId: string;
    productId: string;
    warehouseId?: string;
    qty?: number;
  }) =>
    apiCall<ApiResponse<WithdrawalSourceResult>>("salesWithdrawals.sourceCandidates", {
      query,
    }).then(unwrap<WithdrawalSourceResult>),

  create: (payload: CreateWithdrawalPayload) =>
    apiCall<ApiResponse<SalesWithdrawalRequest>>("salesWithdrawals.create", {
      data: payload,
    }).then(unwrap<SalesWithdrawalRequest>),

  selectSource: (id: string, salesOrderId: string) =>
    apiCall<ApiResponse<SalesWithdrawalRequest>>("salesWithdrawals.selectSource", {
      params: { id },
      data: { salesOrderId },
    }).then(unwrap<SalesWithdrawalRequest>),

  submit: (id: string) =>
    apiCall<ApiResponse<SalesWithdrawalRequest>>("salesWithdrawals.submit", {
      params: { id },
      data: {},
    }).then(unwrap<SalesWithdrawalRequest>),

  cancel: (id: string, reason?: string) =>
    apiCall<ApiResponse<SalesWithdrawalRequest>>("salesWithdrawals.cancel", {
      params: { id },
      data: { reason },
    }).then(unwrap<SalesWithdrawalRequest>),
};

export const SalesDeliveriesApi = {
  list: (query: {
    status?: SalesDeliveryStatus;
    warehouseId?: string;
    salesOrderId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) =>
    apiCall<ApiResponse<Paged<SalesDelivery>>>("salesDeliveries.list", { query }).then(
      unwrap<Paged<SalesDelivery>>,
    ),

  detail: (id: string) =>
    apiCall<ApiResponse<SalesDelivery>>("salesDeliveries.detail", { params: { id } }).then(
      unwrap<SalesDelivery>,
    ),

  fifoSuggestion: (id: string) =>
    apiCall<ApiResponse<DeliveryFifoSuggestion>>("salesDeliveries.fifoSuggestion", {
      params: { id },
    }).then(unwrap<DeliveryFifoSuggestion>),

  confirm: (id: string, payload: ConfirmDeliveryPayload) =>
    apiCall<ApiResponse<SalesDelivery>>("salesDeliveries.confirm", {
      params: { id },
      data: payload,
    }).then(unwrap<SalesDelivery>),

  /** Kho không sửa dữ liệu bán — sai thì trả về cho Sale kèm lý do. */
  returnToSales: (id: string, reason: string) =>
    apiCall<ApiResponse<SalesDelivery>>("salesDeliveries.returnToSales", {
      params: { id },
      data: { reason },
    }).then(unwrap<SalesDelivery>),

  resend: (id: string) =>
    apiCall<ApiResponse<SalesDelivery>>("salesDeliveries.resend", {
      params: { id },
      data: {},
    }).then(unwrap<SalesDelivery>),

  voidPosted: (id: string, payload: { reason: string; createRevision?: boolean }) =>
    apiCall<ApiResponse<SalesDelivery>>("salesDeliveries.voidPosted", {
      params: { id },
      data: payload,
    }).then(unwrap<SalesDelivery>),
};

export const SalesReconciliationApi = {
  byOrder: (salesOrderId: string) =>
    apiCall<ApiResponse<SalesReconciliation>>("salesReconciliations.byOrder", {
      params: { salesOrderId },
    }).then(unwrap<SalesReconciliation>),

  byWithdrawal: (withdrawalRequestId: string) =>
    apiCall<ApiResponse<SalesReconciliation>>("salesReconciliations.byWithdrawal", {
      params: { withdrawalRequestId },
    }).then(unwrap<SalesReconciliation>),

  updateLine: (lineId: string, payload: { docQty?: number; varianceNote?: string }) =>
    apiCall<ApiResponse<SalesReconciliation>>("salesReconciliations.updateLine", {
      params: { lineId },
      data: payload,
    }).then(unwrap<SalesReconciliation>),

  /** Chấp nhận chênh lệch kèm giải trình; lệch lớn cần quyền duyệt ngoại lệ. */
  resolveLine: (lineId: string, payload: { varianceNote: string; docQty?: number }) =>
    apiCall<ApiResponse<SalesReconciliation>>("salesReconciliations.resolveLine", {
      params: { lineId },
      data: payload,
    }).then(unwrap<SalesReconciliation>),
};

export const SalesInvoicesApi = {
  list: (query: {
    status?: SalesInvoiceStatus;
    customerPartyId?: string;
    accountantEmployeeId?: string;
    salesOrderId?: string;
    withdrawalRequestId?: string;
    page?: number;
    limit?: number;
  }) =>
    apiCall<ApiResponse<Paged<SalesInvoice>>>("salesInvoices.list", { query }).then(
      unwrap<Paged<SalesInvoice>>,
    ),

  unissued: (query: {
    customerPartyId?: string;
    accountantEmployeeId?: string;
    page?: number;
    limit?: number;
  }) =>
    apiCall<ApiResponse<Paged<UnissuedInvoiceSource>>>("salesInvoices.unissued", { query }).then(
      unwrap<Paged<UnissuedInvoiceSource>>,
    ),

  detail: (id: string) =>
    apiCall<ApiResponse<SalesInvoice>>("salesInvoices.detail", { params: { id } }).then(
      unwrap<SalesInvoice>,
    ),

  preview: (source: InvoiceSource) =>
    apiCall<ApiResponse<SalesInvoicePreview>>("salesInvoices.preview", { data: source }).then(
      unwrap<SalesInvoicePreview>,
    ),

  createDraft: (source: InvoiceSource) =>
    apiCall<ApiResponse<SalesInvoice>>("salesInvoices.createDraft", { data: source }).then(
      unwrap<SalesInvoice>,
    ),

  issue: (id: string) =>
    apiCall<ApiResponse<SalesInvoice>>("salesInvoices.issue", { params: { id }, data: {} }).then(
      unwrap<SalesInvoice>,
    ),

  /** Cùng một lệnh: hỏi MISA trước nên không bao giờ phát hành hai lần. */
  retry: (id: string) =>
    apiCall<ApiResponse<SalesInvoice>>("salesInvoices.retry", { params: { id }, data: {} }).then(
      unwrap<SalesInvoice>,
    ),

  cancel: (id: string, reason: string) =>
    apiCall<ApiResponse<SalesInvoice>>("salesInvoices.cancel", {
      params: { id },
      data: { reason },
    }).then(unwrap<SalesInvoice>),
};

export const ReceivablesApi = {
  list: (query: {
    customerPartyId?: string;
    status?: ReceivableStatus;
    onlyOpen?: boolean;
    overdueOnly?: boolean;
    page?: number;
    limit?: number;
  }) =>
    apiCall<ApiResponse<ReceivableListResult>>("receivables.list", { query }).then(
      unwrap<ReceivableListResult>,
    ),

  detail: (id: string) =>
    apiCall<ApiResponse<ReceivableOpenItem>>("receivables.detail", { params: { id } }).then(
      unwrap<ReceivableOpenItem>,
    ),

  aging: (customerPartyId?: string) =>
    apiCall<ApiResponse<ReceivableAgingRow[]>>("receivables.aging", {
      query: { customerPartyId },
    }).then(unwrap<ReceivableAgingRow[]>),

  partyDebt: (partyId?: string) =>
    apiCall<ApiResponse<PartyDebtRow[]>>("receivables.partyDebt", { query: { partyId } }).then(
      unwrap<PartyDebtRow[]>,
    ),

  customerBalance: (customerPartyId: string) =>
    apiCall<ApiResponse<CustomerBalance>>("receivables.customerBalance", {
      params: { customerPartyId },
    }).then(unwrap<CustomerBalance>),

  allocate: (payload: AllocateReceivablePayload) =>
    apiCall<ApiResponse<ReceivableOpenItem>>("receivables.allocate", { data: payload }).then(
      unwrap<ReceivableOpenItem>,
    ),

  reverseAllocation: (id: string) =>
    apiCall<ApiResponse<ReceivableOpenItem>>("receivables.reverseAllocation", {
      params: { id },
      data: {},
    }).then(unwrap<ReceivableOpenItem>),
};

export const SalesProfitabilityApi = {
  byPurchaseOrder: (purchaseOrderId: string) =>
    apiCall<ApiResponse<PurchaseSourceReport>>("salesProfitability.byPurchaseOrder", {
      params: { purchaseOrderId },
    }).then(unwrap<PurchaseSourceReport>),

  bySalesOrder: (salesOrderId: string) =>
    apiCall<ApiResponse<SalesOrderProfitability>>("salesProfitability.bySalesOrder", {
      params: { salesOrderId },
    }).then(unwrap<SalesOrderProfitability>),
};

export const SalesAliasApi = {
  list: (query: {
    entityType?: SalesAliasEntityType;
    entityId?: string;
    source?: SalesAliasSource;
    keyword?: string;
    includeRetired?: boolean;
    page?: number;
    limit?: number;
  }) =>
    apiCall<ApiResponse<Paged<SalesEntityAlias>>>("salesAliases.list", { query }).then(
      unwrap<Paged<SalesEntityAlias>>,
    ),

  unmatched: (limit?: number) =>
    apiCall<ApiResponse<UnmatchedAlias[]>>("salesAliases.unmatched", { query: { limit } }).then(
      unwrap<UnmatchedAlias[]>,
    ),

  create: (payload: CreateAliasPayload) =>
    apiCall<ApiResponse<CreateAliasResult>>("salesAliases.create", { data: payload }).then(
      unwrap<CreateAliasResult>,
    ),

  /** Dán thẳng bảng Excel: mỗi dòng là tên đơn vị + danh sách cách viết. */
  import: (payload: { entityType: SalesAliasEntityType; text: string }) =>
    apiCall<ApiResponse<ImportAliasResult>>("salesAliases.import", { data: payload }).then(
      unwrap<ImportAliasResult>,
    ),

  update: (id: string, payload: { externalName: string; note?: string }) =>
    apiCall<ApiResponse<SalesEntityAlias>>("salesAliases.update", {
      params: { id },
      data: payload,
    }).then(unwrap<SalesEntityAlias>),

  retire: (id: string) =>
    apiCall<ApiResponse<SalesEntityAlias>>("salesAliases.retire", { params: { id } }).then(
      unwrap<SalesEntityAlias>,
    ),
};

export const SalesCreditApi = {
  list: (query: {
    keyword?: string;
    accountingOwnerEmpId?: string;
    missingLimitOnly?: boolean;
    overdueOnly?: boolean;
    overLimitOnly?: boolean;
    page?: number;
    limit?: number;
  }) =>
    apiCall<ApiResponse<Paged<CreditCustomerRow>>>("salesCredit.list", { query }).then(
      unwrap<Paged<CreditCustomerRow>>,
    ),

  detail: (customerPartyId: string) =>
    apiCall<ApiResponse<CreditCustomerDetail>>("salesCredit.detail", {
      params: { customerPartyId },
    }).then(unwrap<CreditCustomerDetail>),

  update: (customerPartyId: string, payload: UpdateCustomerCreditPayload) =>
    apiCall<ApiResponse<CreditCustomerRow>>("salesCredit.update", {
      params: { customerPartyId },
      data: payload,
    }).then(unwrap<CreditCustomerRow>),
};

export const SalesDiscountApi = {
  list: (query: { status?: DiscountBoardStatus; page?: number; limit?: number }) =>
    apiCall<ApiResponse<DiscountBoardListResult>>("salesDiscounts.list", { query }).then(
      unwrap<DiscountBoardListResult>,
    ),

  current: () =>
    apiCall<ApiResponse<DiscountBoard | null>>("salesDiscounts.current").then(
      unwrap<DiscountBoard | null>,
    ),

  detail: (id: string) =>
    apiCall<ApiResponse<DiscountBoard>>("salesDiscounts.detail", { params: { id } }).then(
      unwrap<DiscountBoard>,
    ),

  /** Chiết khấu đang áp dụng cho một kho × mặt hàng, để form đơn bán tự điền. */
  resolve: (query: { warehouseId: string; productId: string; at?: string }) =>
    apiCall<ApiResponse<ResolvedDiscount>>("salesDiscounts.resolve", { query }).then(
      unwrap<ResolvedDiscount>,
    ),

  recipientCandidates: () =>
    apiCall<ApiResponse<DiscountRecipientCandidate[]>>(
      "salesDiscounts.recipientCandidates",
    ).then(unwrap<DiscountRecipientCandidate[]>),

  create: (payload: UpsertDiscountBoardPayload & { effectiveFrom: string }) =>
    apiCall<ApiResponse<DiscountBoard>>("salesDiscounts.create", { data: payload }).then(
      unwrap<DiscountBoard>,
    ),

  update: (id: string, payload: UpsertDiscountBoardPayload) =>
    apiCall<ApiResponse<DiscountBoard>>("salesDiscounts.update", {
      params: { id },
      data: payload,
    }).then(unwrap<DiscountBoard>),

  publish: (id: string) =>
    apiCall<ApiResponse<DiscountBoard>>("salesDiscounts.publish", {
      params: { id },
      data: {},
    }).then(unwrap<DiscountBoard>),

  unpublish: (id: string) =>
    apiCall<ApiResponse<DiscountBoard>>("salesDiscounts.unpublish", {
      params: { id },
      data: {},
    }).then(unwrap<DiscountBoard>),

  affectedOrders: (id: string) =>
    apiCall<ApiResponse<DiscountAffectedOrders>>("salesDiscounts.affectedOrders", {
      params: { id },
    }).then(unwrap<DiscountAffectedOrders>),

  send: (id: string, payload: { customerPartyIds: string[]; resend?: boolean }) =>
    apiCall<ApiResponse<SendDiscountBoardResult>>("salesDiscounts.send", {
      params: { id },
      data: payload,
    }).then(unwrap<SendDiscountBoardResult>),

  cancel: (id: string) =>
    apiCall<ApiResponse<DiscountBoard>>("salesDiscounts.cancel", { params: { id } }).then(
      unwrap<DiscountBoard>,
    ),
};

export const CustomerStockApi = {
  list: (query: { customerPartyId?: string; productId?: string }) =>
    apiCall<ApiResponse<CustomerStockResult>>("salesCustomerStock.list", { query }).then(
      unwrap<CustomerStockResult>,
    ),
};

export const QuickEntryApi = {
  /** useAi is opt-in: the screen retries with it only when the template alone fell short. */
  parse: (text: string, useAi = false) =>
    apiCall<ApiResponse<QuickEntryPreview>>("salesQuickEntry.parse", {
      data: { text, useAi },
    }).then(unwrap<QuickEntryPreview>),

  confirm: (payload: ConfirmQuickEntryPayload) =>
    apiCall<ApiResponse<QuickEntryConfirmResult>>("salesQuickEntry.confirm", {
      data: payload,
    }).then(unwrap<QuickEntryConfirmResult>),
};
