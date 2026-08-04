import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { extractApiError } from "../../shared/lib/httpError";
import { notify } from "../../shared/lib/notification";
import {
  CustomerStockApi,
  InternalSalesApi,
  QuickEntryApi,
  SalesApprovalsApi,
  SalesDeliveriesApi,
  ReceivablesApi,
  SalesInvoicesApi,
  SalesOrdersApi,
  SalesReconciliationApi,
  SalesWithdrawalsApi,
} from "./api";
import type {
  AllocateReceivablePayload,
  ConfirmDeliveryPayload,
  ConfirmQuickEntryPayload,
  CreateInternalSalesOrderPayload,
  CreateSalesOrderFromPurchasePayload,
  CreateSalesOrderPayload,
  CreateWithdrawalPayload,
  InvoiceSource,
  ReceivableStatus,
  SalesApprovalStatus,
  SalesApprovalType,
  SalesDeliveryStatus,
  SalesInvoiceStatus,
  SalesOrderKind,
  SalesOrderStatus,
  SalesWithdrawalStatus,
  UpdateSalesOrderPayload,
} from "./types";

export function useSalesOrders(query: { keyword?: string; page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: ["salesOrders", "list", query],
    queryFn: () => SalesOrdersApi.list(query),
  });
}

export function useSalesOrderDetail(id?: string) {
  return useQuery({
    queryKey: ["salesOrders", "detail", id],
    queryFn: () => SalesOrdersApi.detail(id!),
    enabled: Boolean(id),
  });
}

export function useCreateSalesOrder() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSalesOrderPayload) => SalesOrdersApi.create(payload),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["salesOrders"] });
      notify.success("Đã tạo đơn đặt hàng và thông báo cho mua hàng");
    },
    onError: (error) =>
      notify.error(extractApiError(error).message || "Không tạo được đơn đặt hàng"),
  });
}

function useRefreshLinkedOrders(purchaseOrderId?: string) {
  const client = useQueryClient();
  return () => {
    client.invalidateQueries({ queryKey: ["purchaseOrders"] });
    if (purchaseOrderId) {
      client.invalidateQueries({
        queryKey: ["purchaseOrders", "detail", purchaseOrderId],
      });
    }
  };
}

export function useCreateSalesOrderFromPurchase(purchaseOrderId?: string) {
  const refresh = useRefreshLinkedOrders(purchaseOrderId);
  return useMutation({
    mutationFn: (payload: CreateSalesOrderFromPurchasePayload) =>
      SalesOrdersApi.createFromPurchaseOrder(purchaseOrderId!, payload),
    onSuccess: () => {
      refresh();
      notify.success("Đã tạo đơn đặt hàng kinh doanh và gắn với đơn mua");
    },
    onError: (error) =>
      notify.error(extractApiError(error).message || "Không tạo được đơn đặt hàng"),
  });
}

export function useUnlinkSalesOrder(purchaseOrderId?: string) {
  const refresh = useRefreshLinkedOrders(purchaseOrderId);
  return useMutation({
    mutationFn: () => SalesOrdersApi.unlinkPurchaseOrder(purchaseOrderId!),
    onSuccess: () => {
      refresh();
      notify.success("Đã bỏ liên kết đơn đặt hàng");
    },
    onError: (error) =>
      notify.error(extractApiError(error).message || "Không bỏ được liên kết"),
  });
}

// ===== Luồng bán hàng nội bộ =====

/** Làm mới mọi thứ phụ thuộc vào một đơn: danh sách, chi tiết, hàng đợi duyệt. */
function useRefreshSalesOrder(id?: string) {
  const client = useQueryClient();
  return () => {
    client.invalidateQueries({ queryKey: ["salesOrders"] });
    client.invalidateQueries({ queryKey: ["salesApprovals"] });
    if (id) client.invalidateQueries({ queryKey: ["salesOrders", "detail", id] });
  };
}

export function useInternalSalesOrders(query: {
  keyword?: string;
  kind?: SalesOrderKind;
  status?: SalesOrderStatus;
  customerPartyId?: string;
  page?: number;
  limit?: number;
} = {}) {
  return useQuery({
    queryKey: ["salesOrders", "list", query],
    queryFn: () => InternalSalesApi.list(query),
  });
}

/** Kết quả kiểm tra nội bộ; chỉ hỏi khi đơn còn sửa được. */
export function useSalesOrderChecks(id?: string, enabled = true) {
  return useQuery({
    queryKey: ["salesOrders", "checks", id],
    queryFn: () => InternalSalesApi.checks(id!),
    enabled: Boolean(id) && enabled,
  });
}

export function useCreateInternalSalesOrder() {
  const refresh = useRefreshSalesOrder();
  return useMutation({
    mutationFn: (payload: CreateInternalSalesOrderPayload) => InternalSalesApi.create(payload),
    onSuccess: () => {
      refresh();
      notify.success("Đã tạo đơn bán nháp");
    },
    onError: (error) => notify.error(extractApiError(error).message || "Không tạo được đơn bán"),
  });
}

export function useUpdateSalesOrder(id?: string) {
  const refresh = useRefreshSalesOrder(id);
  return useMutation({
    mutationFn: (payload: UpdateSalesOrderPayload) => InternalSalesApi.update(id!, payload),
    onSuccess: () => {
      refresh();
      notify.success("Đã lưu thay đổi");
    },
    onError: (error) => notify.error(extractApiError(error).message || "Không lưu được thay đổi"),
  });
}

export function useDeleteSalesOrder() {
  const refresh = useRefreshSalesOrder();
  return useMutation({
    mutationFn: (id: string) => InternalSalesApi.remove(id),
    onSuccess: () => {
      refresh();
      notify.success("Đã xóa đơn nháp");
    },
    onError: (error) => notify.error(extractApiError(error).message || "Không xóa được đơn"),
  });
}

/**
 * Gửi kiểm duyệt. Đơn sạch thì tự duyệt luôn, còn vướng chính sách thì chuyển
 * sang chờ duyệt — thông báo phải nói rõ để Sale biết chuyện gì đã xảy ra.
 */
export function useSubmitSalesOrder(id?: string) {
  const refresh = useRefreshSalesOrder(id);
  return useMutation({
    mutationFn: (orderId: string) => InternalSalesApi.submit(orderId),
    onSuccess: (result) => {
      refresh();
      if (result.autoApproved) {
        notify.success("Đơn đạt mọi điều kiện và đã được duyệt tự động");
      } else {
        const count = result.submitResult?.violations.length ?? 0;
        notify.warning(
          count
            ? `Đơn đã gửi kiểm duyệt (${count} điểm cần phê duyệt)`
            : "Đơn đã gửi kiểm duyệt",
        );
      }
    },
    onError: (error) => notify.error(extractApiError(error).message || "Không gửi được kiểm duyệt"),
  });
}

export function useReserveSalesOrder(id?: string) {
  const refresh = useRefreshSalesOrder(id);
  return useMutation({
    mutationFn: (orderId: string) => InternalSalesApi.reserve(orderId),
    onSuccess: () => {
      refresh();
      notify.success("Đã thử giữ hàng lại");
    },
    onError: (error) => notify.error(extractApiError(error).message || "Không giữ được hàng"),
  });
}

export function useRecallSalesOrder(id?: string) {
  const refresh = useRefreshSalesOrder(id);
  return useMutation({
    mutationFn: (orderId: string) => InternalSalesApi.recall(orderId),
    onSuccess: () => {
      refresh();
      notify.success("Đã thu hồi đơn về nháp");
    },
    onError: (error) => notify.error(extractApiError(error).message || "Không thu hồi được đơn"),
  });
}

export function useCancelSalesOrder(id?: string) {
  const refresh = useRefreshSalesOrder(id);
  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason?: string }) =>
      InternalSalesApi.cancel(orderId, reason),
    onSuccess: () => {
      refresh();
      notify.success("Đã hủy đơn");
    },
    onError: (error) => notify.error(extractApiError(error).message || "Không hủy được đơn"),
  });
}

// ===== Phê duyệt =====

export function useSalesApprovals(query: {
  status?: SalesApprovalStatus;
  type?: SalesApprovalType;
  salesOrderId?: string;
  withdrawalRequestId?: string;
  mine?: boolean;
  page?: number;
  limit?: number;
} = {}, enabled = true) {
  return useQuery({
    queryKey: ["salesApprovals", "list", query],
    queryFn: () => SalesApprovalsApi.list(query),
    enabled,
  });
}

export function useDecideSalesApproval() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      decision,
      note,
    }: {
      id: string;
      decision: "APPROVE" | "REJECT";
      note?: string;
    }) =>
      decision === "APPROVE"
        ? SalesApprovalsApi.approve(id, note)
        : SalesApprovalsApi.reject(id, note ?? ""),
    onSuccess: (_result, variables) => {
      client.invalidateQueries({ queryKey: ["salesApprovals"] });
      client.invalidateQueries({ queryKey: ["salesOrders"] });
      // Yêu cầu duyệt có thể thuộc phiếu rút lô, không chỉ đơn bán.
      client.invalidateQueries({ queryKey: ["salesWithdrawals"] });
      notify.success(variables.decision === "APPROVE" ? "Đã duyệt" : "Đã từ chối");
    },
    onError: (error) => notify.error(extractApiError(error).message || "Không xử lý được yêu cầu"),
  });
}

// ===== Rút lô =====

function useRefreshWithdrawals() {
  const client = useQueryClient();
  return () => {
    client.invalidateQueries({ queryKey: ["salesWithdrawals"] });
    client.invalidateQueries({ queryKey: ["salesCustomerStock"] });
  };
}

export function useSalesWithdrawals(query: {
  status?: SalesWithdrawalStatus;
  customerPartyId?: string;
  salesOrderId?: string;
  page?: number;
  limit?: number;
} = {}) {
  return useQuery({
    queryKey: ["salesWithdrawals", "list", query],
    queryFn: () => SalesWithdrawalsApi.list(query),
  });
}

export function useSalesWithdrawalDetail(id?: string) {
  return useQuery({
    queryKey: ["salesWithdrawals", "detail", id],
    queryFn: () => SalesWithdrawalsApi.detail(id!),
    enabled: Boolean(id),
  });
}

/**
 * Đơn lô nào phục vụ được lần rút này. Chỉ hỏi khi đã đủ khách + mặt hàng, vì
 * kết quả phụ thuộc cả hai.
 */
export function useWithdrawalSourceCandidates(params: {
  customerPartyId?: string;
  productId?: string;
  warehouseId?: string;
  qty?: number;
}) {
  const enabled = Boolean(params.customerPartyId && params.productId);
  return useQuery({
    queryKey: ["salesWithdrawals", "sourceCandidates", params],
    queryFn: () =>
      SalesWithdrawalsApi.sourceCandidates({
        customerPartyId: params.customerPartyId!,
        productId: params.productId!,
        warehouseId: params.warehouseId,
        qty: params.qty,
      }),
    enabled,
  });
}

export function useCreateWithdrawal() {
  const refresh = useRefreshWithdrawals();
  return useMutation({
    mutationFn: (payload: CreateWithdrawalPayload) => SalesWithdrawalsApi.create(payload),
    onSuccess: (request) => {
      refresh();
      notify.success(
        request.status === "NEED_SOURCE"
          ? `Đã tạo phiếu rút ${request.requestNo} — cần chọn lô nguồn`
          : `Đã tạo phiếu rút ${request.requestNo}`,
      );
    },
    onError: (error) => notify.error(extractApiError(error).message || "Không tạo được phiếu rút"),
  });
}

export function useSelectWithdrawalSource(id?: string) {
  const client = useQueryClient();
  const refresh = useRefreshWithdrawals();
  return useMutation({
    mutationFn: ({ requestId, salesOrderId }: { requestId: string; salesOrderId: string }) =>
      SalesWithdrawalsApi.selectSource(requestId, salesOrderId),
    onSuccess: () => {
      refresh();
      if (id) client.invalidateQueries({ queryKey: ["salesWithdrawals", "detail", id] });
      notify.success("Đã chọn lô nguồn");
    },
    onError: (error) => notify.error(extractApiError(error).message || "Không chọn được lô nguồn"),
  });
}

export function useSubmitWithdrawal(id?: string) {
  const client = useQueryClient();
  const refresh = useRefreshWithdrawals();
  return useMutation({
    mutationFn: (requestId: string) => SalesWithdrawalsApi.submit(requestId),
    onSuccess: () => {
      refresh();
      client.invalidateQueries({ queryKey: ["salesApprovals"] });
      if (id) client.invalidateQueries({ queryKey: ["salesWithdrawals", "detail", id] });
      notify.success("Đã gửi phiếu rút");
    },
    onError: (error) => notify.error(extractApiError(error).message || "Không gửi được phiếu rút"),
  });
}

export function useCancelWithdrawal(id?: string) {
  const client = useQueryClient();
  const refresh = useRefreshWithdrawals();
  return useMutation({
    mutationFn: ({ requestId, reason }: { requestId: string; reason?: string }) =>
      SalesWithdrawalsApi.cancel(requestId, reason),
    onSuccess: () => {
      refresh();
      if (id) client.invalidateQueries({ queryKey: ["salesWithdrawals", "detail", id] });
      notify.success("Đã hủy phiếu rút");
    },
    onError: (error) => notify.error(extractApiError(error).message || "Không hủy được phiếu rút"),
  });
}

// ===== Lệnh xuất kho =====

/** Xuất hàng chạm vào tồn, đơn bán và phiếu rút — làm mới hết một lượt. */
function useRefreshDeliveries(id?: string) {
  const client = useQueryClient();
  return () => {
    client.invalidateQueries({ queryKey: ["salesDeliveries"] });
    client.invalidateQueries({ queryKey: ["salesOrders"] });
    client.invalidateQueries({ queryKey: ["salesWithdrawals"] });
    client.invalidateQueries({ queryKey: ["salesCustomerStock"] });
    if (id) client.invalidateQueries({ queryKey: ["salesDeliveries", "detail", id] });
  };
}

export function useSalesDeliveries(query: {
  status?: SalesDeliveryStatus;
  warehouseId?: string;
  salesOrderId?: string;
  page?: number;
  limit?: number;
} = {}) {
  return useQuery({
    queryKey: ["salesDeliveries", "list", query],
    queryFn: () => SalesDeliveriesApi.list(query),
  });
}

export function useSalesDeliveryDetail(id?: string) {
  return useQuery({
    queryKey: ["salesDeliveries", "detail", id],
    queryFn: () => SalesDeliveriesApi.detail(id!),
    enabled: Boolean(id),
  });
}

/** Chỉ hỏi khi kho sắp xác nhận — đây là ảnh chụp tồn tại thời điểm mở form. */
export function useDeliveryFifoSuggestion(id?: string, enabled = true) {
  return useQuery({
    queryKey: ["salesDeliveries", "fifo", id],
    queryFn: () => SalesDeliveriesApi.fifoSuggestion(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 0,
  });
}

export function useConfirmDelivery(id?: string) {
  const refresh = useRefreshDeliveries(id);
  return useMutation({
    mutationFn: ({
      deliveryId,
      payload,
    }: {
      deliveryId: string;
      payload: ConfirmDeliveryPayload;
    }) => SalesDeliveriesApi.confirm(deliveryId, payload),
    onSuccess: () => {
      refresh();
      notify.success("Đã ghi nhận xuất hàng");
    },
    onError: (error) =>
      notify.error(extractApiError(error).message || "Không ghi nhận được xuất hàng"),
  });
}

export function useReturnDeliveryToSales(id?: string) {
  const refresh = useRefreshDeliveries(id);
  return useMutation({
    mutationFn: ({ deliveryId, reason }: { deliveryId: string; reason: string }) =>
      SalesDeliveriesApi.returnToSales(deliveryId, reason),
    onSuccess: () => {
      refresh();
      notify.success("Đã trả lệnh xuất về cho kinh doanh");
    },
    onError: (error) => notify.error(extractApiError(error).message || "Không trả lại được"),
  });
}

export function useResendDelivery(id?: string) {
  const refresh = useRefreshDeliveries(id);
  return useMutation({
    mutationFn: (deliveryId: string) => SalesDeliveriesApi.resend(deliveryId),
    onSuccess: () => {
      refresh();
      notify.success("Đã gửi lại lệnh xuất cho kho");
    },
    onError: (error) => notify.error(extractApiError(error).message || "Không gửi lại được"),
  });
}

export function useVoidDelivery(id?: string) {
  const refresh = useRefreshDeliveries(id);
  return useMutation({
    mutationFn: ({
      deliveryId,
      reason,
      createRevision,
    }: {
      deliveryId: string;
      reason: string;
      createRevision?: boolean;
    }) => SalesDeliveriesApi.voidPosted(deliveryId, { reason, createRevision }),
    onSuccess: (_result, variables) => {
      refresh();
      notify.success(
        variables.createRevision
          ? "Đã hủy phiếu xuất và tạo lệnh xuất mới để làm lại"
          : "Đã hủy phiếu xuất đã ghi sổ",
      );
    },
    onError: (error) => notify.error(extractApiError(error).message || "Không hủy được phiếu xuất"),
  });
}

// ===== Đối soát =====

/**
 * Bản đối soát chỉ tồn tại sau khi kho xuất lần đầu, nên 404 là trạng thái bình
 * thường — màn hình ẩn panel thay vì báo lỗi, và không retry cho khỏi ồn.
 */
export function useSalesReconciliation(target: {
  salesOrderId?: string;
  withdrawalRequestId?: string;
}) {
  const enabled = Boolean(target.salesOrderId || target.withdrawalRequestId);
  return useQuery({
    queryKey: ["salesReconciliations", target],
    queryFn: () =>
      target.withdrawalRequestId
        ? SalesReconciliationApi.byWithdrawal(target.withdrawalRequestId)
        : SalesReconciliationApi.byOrder(target.salesOrderId!),
    enabled,
    retry: false,
  });
}

function useRefreshReconciliation() {
  const client = useQueryClient();
  return () => {
    client.invalidateQueries({ queryKey: ["salesReconciliations"] });
    client.invalidateQueries({ queryKey: ["salesOrders"] });
    client.invalidateQueries({ queryKey: ["salesWithdrawals"] });
  };
}

export function useUpdateReconciliationLine() {
  const refresh = useRefreshReconciliation();
  return useMutation({
    mutationFn: ({
      lineId,
      docQty,
      varianceNote,
    }: {
      lineId: string;
      docQty?: number;
      varianceNote?: string;
    }) => SalesReconciliationApi.updateLine(lineId, { docQty, varianceNote }),
    onSuccess: () => {
      refresh();
      notify.success("Đã lưu đối soát");
    },
    onError: (error) => notify.error(extractApiError(error).message || "Không lưu được đối soát"),
  });
}

export function useResolveReconciliationLine() {
  const refresh = useRefreshReconciliation();
  return useMutation({
    mutationFn: ({
      lineId,
      varianceNote,
      docQty,
    }: {
      lineId: string;
      varianceNote: string;
      docQty?: number;
    }) => SalesReconciliationApi.resolveLine(lineId, { varianceNote, docQty }),
    onSuccess: () => {
      refresh();
      notify.success("Đã xử lý chênh lệch");
    },
    onError: (error) =>
      notify.error(extractApiError(error).message || "Không xử lý được chênh lệch"),
  });
}

// ===== Hóa đơn MISA =====

function useRefreshInvoices(id?: string) {
  const client = useQueryClient();
  return () => {
    client.invalidateQueries({ queryKey: ["salesInvoices"] });
    client.invalidateQueries({ queryKey: ["salesOrders"] });
    client.invalidateQueries({ queryKey: ["receivables"] });
    if (id) client.invalidateQueries({ queryKey: ["salesInvoices", "detail", id] });
  };
}

export function useSalesInvoices(query: {
  status?: SalesInvoiceStatus;
  customerPartyId?: string;
  salesOrderId?: string;
  withdrawalRequestId?: string;
  page?: number;
  limit?: number;
} = {}, enabled = true) {
  return useQuery({
    queryKey: ["salesInvoices", "list", query],
    queryFn: () => SalesInvoicesApi.list(query),
    enabled,
  });
}

export function useSalesInvoiceDetail(id?: string) {
  return useQuery({
    queryKey: ["salesInvoices", "detail", id],
    queryFn: () => SalesInvoicesApi.detail(id!),
    enabled: Boolean(id),
  });
}

/** Chỉ đọc; dùng để soi trước khi tạo nháp. */
export function useInvoicePreview(source: InvoiceSource, enabled = true) {
  const key = source.withdrawalRequestId ?? source.salesOrderId;
  return useQuery({
    queryKey: ["salesInvoices", "preview", source],
    queryFn: () => SalesInvoicesApi.preview(source),
    enabled: Boolean(key) && enabled,
    retry: false,
  });
}

export function useCreateInvoiceDraft() {
  const refresh = useRefreshInvoices();
  return useMutation({
    mutationFn: (source: InvoiceSource) => SalesInvoicesApi.createDraft(source),
    onSuccess: (invoice) => {
      refresh();
      notify.success(`Đã tạo hóa đơn nháp ${invoice.invoiceNoInternal}`);
    },
    onError: (error) => notify.error(extractApiError(error).message || "Không tạo được hóa đơn"),
  });
}

/**
 * Phát hành và thử lại là cùng một lệnh. Thất bại có thể chỉ là mất kết nối sau khi
 * MISA đã nhận, nên thông báo phải nói rõ là "thử lại", không phải "phát hành mới".
 */
export function useIssueInvoice(id?: string) {
  const refresh = useRefreshInvoices(id);
  return useMutation({
    mutationFn: ({ invoiceId, isRetry }: { invoiceId: string; isRetry?: boolean }) =>
      isRetry ? SalesInvoicesApi.retry(invoiceId) : SalesInvoicesApi.issue(invoiceId),
    onSuccess: (invoice) => {
      refresh();
      if (invoice.status === "ISSUED") {
        notify.success(`Đã phát hành hóa đơn ${invoice.misaInvoiceNo ?? invoice.invoiceNoInternal}`);
      } else {
        notify.warning(`Hóa đơn đang ở trạng thái ${invoice.status} — kiểm tra nhật ký gọi MISA`);
      }
    },
    onError: (error) =>
      notify.error(extractApiError(error).message || "Không phát hành được hóa đơn"),
  });
}

export function useCancelInvoice(id?: string) {
  const refresh = useRefreshInvoices(id);
  return useMutation({
    mutationFn: ({ invoiceId, reason }: { invoiceId: string; reason: string }) =>
      SalesInvoicesApi.cancel(invoiceId, reason),
    onSuccess: () => {
      refresh();
      notify.success("Đã hủy hóa đơn");
    },
    onError: (error) => notify.error(extractApiError(error).message || "Không hủy được hóa đơn"),
  });
}

// ===== Công nợ phải thu =====

export function useReceivables(query: {
  customerPartyId?: string;
  status?: ReceivableStatus;
  onlyOpen?: boolean;
  overdueOnly?: boolean;
  page?: number;
  limit?: number;
} = {}) {
  return useQuery({
    queryKey: ["receivables", "list", query],
    queryFn: () => ReceivablesApi.list(query),
  });
}

export function useReceivableDetail(id?: string) {
  return useQuery({
    queryKey: ["receivables", "detail", id],
    queryFn: () => ReceivablesApi.detail(id!),
    enabled: Boolean(id),
  });
}

export function useReceivableAging(customerPartyId?: string, enabled = true) {
  return useQuery({
    queryKey: ["receivables", "aging", customerPartyId],
    queryFn: () => ReceivablesApi.aging(customerPartyId),
    enabled,
  });
}

export function usePartyDebt(partyId?: string, enabled = true) {
  return useQuery({
    queryKey: ["receivables", "partyDebt", partyId],
    queryFn: () => ReceivablesApi.partyDebt(partyId),
    enabled,
  });
}

export function useCustomerBalance(customerPartyId?: string) {
  return useQuery({
    queryKey: ["receivables", "customerBalance", customerPartyId],
    queryFn: () => ReceivablesApi.customerBalance(customerPartyId!),
    enabled: Boolean(customerPartyId),
  });
}

function useRefreshReceivables() {
  const client = useQueryClient();
  return () => {
    client.invalidateQueries({ queryKey: ["receivables"] });
    client.invalidateQueries({ queryKey: ["salesInvoices"] });
    client.invalidateQueries({ queryKey: ["bankTransactions"] });
  };
}

export function useAllocateReceivable() {
  const refresh = useRefreshReceivables();
  return useMutation({
    mutationFn: (payload: AllocateReceivablePayload) => ReceivablesApi.allocate(payload),
    onSuccess: () => {
      refresh();
      notify.success("Đã đối trừ tiền về vào công nợ");
    },
    onError: (error) => notify.error(extractApiError(error).message || "Không đối trừ được"),
  });
}

/** Đảo phân bổ bằng bút toán ngược — sổ công nợ chỉ ghi thêm, không sửa. */
export function useReverseAllocation() {
  const refresh = useRefreshReceivables();
  return useMutation({
    mutationFn: (allocationId: string) => ReceivablesApi.reverseAllocation(allocationId),
    onSuccess: () => {
      refresh();
      notify.success("Đã đảo phân bổ");
    },
    onError: (error) => notify.error(extractApiError(error).message || "Không đảo được phân bổ"),
  });
}

// ===== Tồn kho thương mại của khách =====

export function useCustomerStock(query: { customerPartyId?: string; productId?: string } = {}) {
  return useQuery({
    queryKey: ["salesCustomerStock", "list", query],
    queryFn: () => CustomerStockApi.list(query),
  });
}

// ===== Nhập nhanh =====

/** Chỉ đọc và đề xuất — không tạo gì cho tới khi Sale xác nhận. */
export function useParseQuickEntry() {
  return useMutation({
    mutationFn: (text: string) => QuickEntryApi.parse(text),
    onError: (error) => notify.error(extractApiError(error).message || "Không đọc được nội dung"),
  });
}

export function useConfirmQuickEntry() {
  const client = useQueryClient();
  const refresh = useRefreshSalesOrder();
  return useMutation({
    mutationFn: (payload: ConfirmQuickEntryPayload) => QuickEntryApi.confirm(payload),
    onSuccess: (result) => {
      refresh();
      client.invalidateQueries({ queryKey: ["salesWithdrawals"] });
      notify.success(
        result.requestNo
          ? `Đã tạo phiếu rút lô ${result.requestNo}`
          : `Đã tạo đơn bán nháp ${result.orderNo ?? ""}`.trim(),
      );
    },
    onError: (error) => notify.error(extractApiError(error).message || "Không tạo được đơn"),
  });
}
