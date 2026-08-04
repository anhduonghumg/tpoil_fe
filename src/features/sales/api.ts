import { apiCall } from "../../shared/lib/api";
import type { ApiResponse } from "../../shared/lib/types";
import type {
  AllocateReceivablePayload,
  ConfirmDeliveryPayload,
  ConfirmQuickEntryPayload,
  CreateInternalSalesOrderPayload,
  CreateSalesOrderFromPurchasePayload,
  CreateSalesOrderPayload,
  CreateWithdrawalPayload,
  CustomerBalance,
  CustomerStockResult,
  DeliveryFifoSuggestion,
  InvoiceSource,
  PartyDebtRow,
  QuickEntryConfirmResult,
  QuickEntryPreview,
  ReceivableAgingRow,
  ReceivableListResult,
  ReceivableOpenItem,
  ReceivableStatus,
  SalesApprovalRequest,
  SalesApprovalStatus,
  SalesApprovalType,
  SalesOrder,
  SalesOrderCheckResult,
  SalesDelivery,
  SalesDeliveryStatus,
  SalesInvoice,
  SalesInvoicePreview,
  SalesInvoiceStatus,
  SalesOrderKind,
  SalesOrderStatus,
  SalesReconciliation,
  SalesWithdrawalRequest,
  SalesWithdrawalStatus,
  SubmitSalesOrderResult,
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
    status?: SalesOrderStatus;
    customerPartyId?: string;
    page?: number;
    limit?: number;
  }) =>
    apiCall<ApiResponse<Paged<SalesOrder>>>("salesOrders.list", { query }).then(
      unwrap<Paged<SalesOrder>>,
    ),

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

export const SalesApprovalsApi = {
  list: (query: {
    status?: SalesApprovalStatus;
    type?: SalesApprovalType;
    salesOrderId?: string;
    withdrawalRequestId?: string;
    mine?: boolean;
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
    salesOrderId?: string;
    withdrawalRequestId?: string;
    page?: number;
    limit?: number;
  }) =>
    apiCall<ApiResponse<Paged<SalesInvoice>>>("salesInvoices.list", { query }).then(
      unwrap<Paged<SalesInvoice>>,
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

export const CustomerStockApi = {
  list: (query: { customerPartyId?: string; productId?: string }) =>
    apiCall<ApiResponse<CustomerStockResult>>("salesCustomerStock.list", { query }).then(
      unwrap<CustomerStockResult>,
    ),
};

export const QuickEntryApi = {
  parse: (text: string) =>
    apiCall<ApiResponse<QuickEntryPreview>>("salesQuickEntry.parse", {
      data: { text },
    }).then(unwrap<QuickEntryPreview>),

  confirm: (payload: ConfirmQuickEntryPayload) =>
    apiCall<ApiResponse<QuickEntryConfirmResult>>("salesQuickEntry.confirm", {
      data: payload,
    }).then(unwrap<QuickEntryConfirmResult>),
};
