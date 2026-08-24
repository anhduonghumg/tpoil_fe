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
  SalesAliasApi,
  SalesCreditApi,
  SalesDiscountApi,
  SalesInvoicesApi,
  SalesOrderPrintApi,
  SalesOrdersApi,
  SalesProfitabilityApi,
  SalesReconciliationApi,
  SalesWithdrawalsApi,
} from "./api";
import type {
  AllocateReceivablePayload,
  ConfirmDeliveryPayload,
  ConfirmQuickEntryPayload,
  CreateAliasPayload,
  CreateInternalSalesOrderPayload,
  CreateSalesOrderFromPurchasePayload,
  CreateSalesOrderPayload,
  CreateWithdrawalPayload,
  DiscountBoardStatus,
  InvoiceSource,
  ReceivableStatus,
  SalesAliasEntityType,
  SalesAliasSource,
  SalesApprovalStatus,
  SalesApprovalType,
  SalesDeliveryStatus,
  SalesInvoiceStatus,
  UnissuedInvoiceSource,
  SalesOrderKind,
  SalesOrderStatus,
  SalesWithdrawalStatus,
  UpdateCustomerCreditPayload,
  UpdateSalesOrderPayload,
  UpsertDiscountBoardPayload,
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
  /** Một trạng thái, hoặc nhiều trạng thái ngăn bởi dấu phẩy cho tab gộp. */
  status?: SalesOrderStatus | string;
  customerPartyId?: string;
  page?: number;
  limit?: number;
} = {}) {
  return useQuery({
    queryKey: ["salesOrders", "list", query],
    queryFn: () => InternalSalesApi.list(query),
  });
}

/** Số đơn theo từng trạng thái, để dải tab hiện luôn con số. */
export function useSalesOrderStatusCounts(query: {
  keyword?: string;
  kind?: SalesOrderKind;
  customerPartyId?: string;
} = {}) {
  return useQuery({
    queryKey: ["salesOrders", "status-counts", query],
    queryFn: () => InternalSalesApi.statusCounts(query),
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

// ===== In đơn đặt hàng =====

/**
 * Mở PDF ở tab mới thay vì tải xuống: kế toán thường xem qua rồi mới bấm in.
 * URL blob được thu hồi sau khi tab đã đọc xong.
 */
export function usePrintSalesOrders() {
  return useMutation({
    mutationFn: (payload: {
      ids?: string[];
      customerPartyId?: string;
      dateFrom?: string;
      dateTo?: string;
      kind?: SalesOrderKind;
    }) => SalesOrderPrintApi.batch(payload),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    },
    onError: (error) => notify.error(extractApiError(error).message || "Không in được đơn"),
  });
}

// ===== Phê duyệt =====

export function useSalesApprovals(query: {
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

/** Trả đơn đã duyệt về đúng hàng đợi duyệt lại; backend sẽ giải phóng giữ hàng an toàn. */
export function useReturnSalesApprovalToPending() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (approvalId: string) => SalesApprovalsApi.returnToPending(approvalId),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["salesApprovals"] });
      client.invalidateQueries({ queryKey: ["salesOrders"] });
      client.invalidateQueries({ queryKey: ["salesDeliveries"] });
      notify.success("Đã trả đơn về chờ duyệt");
    },
    onError: (error) => notify.error(extractApiError(error).message || "Không thể trả đơn về chờ duyệt"),
  });
}

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
  dateFrom?: string;
  dateTo?: string;
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
    accountantEmployeeId?: string;
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

export function useUnissuedSalesInvoices(query: {
  customerPartyId?: string;
  accountantEmployeeId?: string;
  page?: number;
  limit?: number;
} = {}, enabled = true) {
  return useQuery({
    queryKey: ["salesInvoices", "unissued", query],
    queryFn: () => SalesInvoicesApi.unissued(query),
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

// ===== Lãi/lỗ theo nguồn hàng mua =====

export function usePurchaseSourceProfit(purchaseOrderId?: string, enabled = true) {
  return useQuery({
    queryKey: ["salesProfitability", "purchaseOrder", purchaseOrderId],
    queryFn: () => SalesProfitabilityApi.byPurchaseOrder(purchaseOrderId!),
    enabled: Boolean(purchaseOrderId) && enabled,
    retry: false,
  });
}

export function useSalesOrderProfit(salesOrderId?: string, enabled = true) {
  return useQuery({
    queryKey: ["salesProfitability", "salesOrder", salesOrderId],
    queryFn: () => SalesProfitabilityApi.bySalesOrder(salesOrderId!),
    enabled: Boolean(salesOrderId) && enabled,
    retry: false,
  });
}

// ===== Alias: cách khách viết tên =====

function useRefreshAliases() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: ["salesAliases"] });
}

export function useSalesAliases(query: {
  entityType?: SalesAliasEntityType;
  entityId?: string;
  source?: SalesAliasSource;
  keyword?: string;
  includeRetired?: boolean;
  page?: number;
  limit?: number;
} = {}) {
  return useQuery({
    queryKey: ["salesAliases", "list", query],
    queryFn: () => SalesAliasApi.list(query),
  });
}

export function useUnmatchedAliases(limit?: number, enabled = true) {
  return useQuery({
    queryKey: ["salesAliases", "unmatched", limit],
    queryFn: () => SalesAliasApi.unmatched(limit),
    enabled,
  });
}

/**
 * Thêm nhiều cách viết một lượt. Cách viết đang thuộc đơn vị khác thì bị bỏ qua kèm
 * lý do chứ không âm thầm đổi chủ — thông báo phải nói rõ đã thêm mấy, bỏ mấy.
 */
export function useCreateAlias() {
  const refresh = useRefreshAliases();
  return useMutation({
    mutationFn: (payload: CreateAliasPayload) => SalesAliasApi.create(payload),
    onSuccess: (result) => {
      refresh();
      const conflicts = result.skipped.filter((row) => row.reason === "CONFLICT").length;
      if (conflicts) {
        notify.warning(
          `Đã thêm ${result.added} cách viết, bỏ qua ${conflicts} vì đang thuộc đơn vị khác`,
        );
      } else if (result.added === 0) {
        notify.info("Không có cách viết nào mới để thêm");
      } else {
        notify.success(`Đã thêm ${result.added} cách viết`);
      }
    },
    onError: (error) => notify.error(extractApiError(error).message || "Không thêm được alias"),
  });
}

export function useImportAliases() {
  const refresh = useRefreshAliases();
  return useMutation({
    mutationFn: (payload: { entityType: SalesAliasEntityType; text: string }) =>
      SalesAliasApi.import(payload),
    onSuccess: (result) => {
      refresh();
      notify.success(
        `Đọc ${result.rows} dòng, khớp ${result.matchedEntities} đơn vị, thêm ${result.addedAliases} cách viết`,
      );
    },
    onError: (error) => notify.error(extractApiError(error).message || "Không nhập được danh sách"),
  });
}

export function useUpdateAlias() {
  const refresh = useRefreshAliases();
  return useMutation({
    mutationFn: ({
      id,
      externalName,
      note,
    }: {
      id: string;
      externalName: string;
      note?: string;
    }) => SalesAliasApi.update(id, { externalName, note }),
    onSuccess: () => {
      refresh();
      notify.success("Đã sửa cách viết");
    },
    onError: (error) => notify.error(extractApiError(error).message || "Không sửa được"),
  });
}

/** Ngừng dùng chứ không xóa, để cách viết cũ vẫn giải thích được dữ liệu cũ. */
export function useRetireAlias() {
  const refresh = useRefreshAliases();
  return useMutation({
    mutationFn: (id: string) => SalesAliasApi.retire(id),
    onSuccess: () => {
      refresh();
      notify.success("Đã ngừng dùng cách viết này");
    },
    onError: (error) => notify.error(extractApiError(error).message || "Không ngừng được"),
  });
}

// ===== Cấu hình tín dụng (kế toán công nợ) =====

export function useCreditCustomers(query: {
  keyword?: string;
  accountingOwnerEmpId?: string;
  missingLimitOnly?: boolean;
  overdueOnly?: boolean;
  overLimitOnly?: boolean;
  page?: number;
  limit?: number;
} = {}) {
  return useQuery({
    queryKey: ["salesCredit", "list", query],
    queryFn: () => SalesCreditApi.list(query),
  });
}

export function useCreditCustomerDetail(customerPartyId?: string) {
  return useQuery({
    queryKey: ["salesCredit", "detail", customerPartyId],
    queryFn: () => SalesCreditApi.detail(customerPartyId!),
    enabled: Boolean(customerPartyId),
  });
}

/** Sửa hạn mức chạm vào cả kiểm tra khi gửi duyệt, nên làm mới luôn danh sách đơn. */
export function useUpdateCustomerCredit() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      customerPartyId,
      payload,
    }: {
      customerPartyId: string;
      payload: UpdateCustomerCreditPayload;
    }) => SalesCreditApi.update(customerPartyId, payload),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["salesCredit"] });
      client.invalidateQueries({ queryKey: ["salesOrders"] });
      notify.success("Đã cập nhật hạn mức");
    },
    onError: (error) => notify.error(extractApiError(error).message || "Không cập nhật được hạn mức"),
  });
}

// ===== Bảng thông báo chiết khấu =====

function useRefreshDiscounts() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: ["salesDiscounts"] });
}

export function useDiscountBoards(query: {
  status?: DiscountBoardStatus;
  page?: number;
  limit?: number;
} = {}) {
  return useQuery({
    queryKey: ["salesDiscounts", "list", query],
    queryFn: () => SalesDiscountApi.list(query),
  });
}

export function useDiscountBoard(id?: string) {
  return useQuery({
    queryKey: ["salesDiscounts", "detail", id],
    queryFn: () => SalesDiscountApi.detail(id!),
    enabled: Boolean(id),
  });
}

/** Bảng đang áp dụng — form đơn bán dùng để tự điền chiết khấu. */
export function useCurrentDiscountBoard(enabled = true) {
  return useQuery({
    queryKey: ["salesDiscounts", "current"],
    queryFn: () => SalesDiscountApi.current(),
    enabled,
    staleTime: 60_000,
  });
}

export function useDiscountRecipientCandidates(enabled = true) {
  return useQuery({
    queryKey: ["salesDiscounts", "recipientCandidates"],
    queryFn: () => SalesDiscountApi.recipientCandidates(),
    enabled,
  });
}

export function useCreateDiscountBoard() {
  const refresh = useRefreshDiscounts();
  return useMutation({
    mutationFn: (payload: UpsertDiscountBoardPayload & { effectiveFrom: string }) =>
      SalesDiscountApi.create(payload),
    onSuccess: () => {
      refresh();
      notify.success("Đã tạo bảng chiết khấu nháp");
    },
    onError: (error) =>
      notify.error(extractApiError(error).message || "Không tạo được bảng chiết khấu"),
  });
}

export function useUpdateDiscountBoard() {
  const refresh = useRefreshDiscounts();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpsertDiscountBoardPayload }) =>
      SalesDiscountApi.update(id, payload),
    onSuccess: () => {
      refresh();
      notify.success("Đã lưu bảng chiết khấu");
    },
    onError: (error) => notify.error(extractApiError(error).message || "Không lưu được"),
  });
}

/** Phát hành xong là đơn bán từ mốc hiệu lực trở đi lấy chiết khấu theo bảng này. */
export function usePublishDiscountBoard() {
  const client = useQueryClient();
  const refresh = useRefreshDiscounts();
  return useMutation({
    mutationFn: (id: string) => SalesDiscountApi.publish(id),
    onSuccess: () => {
      refresh();
      client.invalidateQueries({ queryKey: ["salesOrders"] });
      notify.success("Đã phát hành bảng chiết khấu");
    },
    onError: (error) => notify.error(extractApiError(error).message || "Không phát hành được"),
  });
}

/**
 * Gửi email cho khách. Báo rõ gửi được mấy, lỗi mấy, bỏ qua ai — gửi ra ngoài mà chỉ
 * hiện "thành công" chung chung thì không ai biết khách nào chưa nhận.
 */
export function useSendDiscountBoard() {
  const refresh = useRefreshDiscounts();
  return useMutation({
    mutationFn: ({
      id,
      customerPartyIds,
      resend,
    }: {
      id: string;
      customerPartyIds: string[];
      resend?: boolean;
    }) => SalesDiscountApi.send(id, { customerPartyIds, resend }),
    onSuccess: (result) => {
      refresh();
      const parts = [`gửi ${result.sent}`];
      if (result.failed) parts.push(`lỗi ${result.failed}`);
      if (result.skipped.length) parts.push(`bỏ qua ${result.skipped.length} (chưa có email)`);
      const message = `Đã ${parts.join(", ")}`;
      if (result.failed) notify.warning(message);
      else notify.success(message);
    },
    onError: (error) => notify.error(extractApiError(error).message || "Không gửi được thông báo"),
  });
}

/** Thu hồi bản đã phát hành về nháp để sửa — chỉ được khi chưa tới giờ hiệu lực. */
export function useUnpublishDiscountBoard() {
  const refresh = useRefreshDiscounts();
  return useMutation({
    mutationFn: (id: string) => SalesDiscountApi.unpublish(id),
    onSuccess: () => {
      refresh();
      notify.success("Đã thu hồi về nháp — sửa xong nhớ phát hành lại");
    },
    onError: (error) => notify.error(extractApiError(error).message || "Không thu hồi được"),
  });
}

/** Đơn đã gửi duyệt trong lúc bản này chạy — chỉ hỏi khi người dùng mở xem. */
export function useDiscountAffectedOrders(id?: string, enabled = true) {
  return useQuery({
    queryKey: ["salesDiscounts", "affectedOrders", id],
    queryFn: () => SalesDiscountApi.affectedOrders(id!),
    enabled: Boolean(id) && enabled,
  });
}

export function useCancelDiscountBoard() {
  const refresh = useRefreshDiscounts();
  return useMutation({
    mutationFn: (id: string) => SalesDiscountApi.cancel(id),
    onSuccess: () => {
      refresh();
      notify.success("Đã hủy bảng nháp");
    },
    onError: (error) => notify.error(extractApiError(error).message || "Không hủy được"),
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
    mutationFn: ({ text, useAi }: { text: string; useAi?: boolean }) =>
      QuickEntryApi.parse(text, useAi),
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
      client.invalidateQueries({ queryKey: ["salesAliases"] });
      const created = result.requestNo
        ? `Đã tạo phiếu rút lô ${result.requestNo}`
        : `Đã tạo đơn bán nháp ${result.orderNo ?? ""}`.trim();
      const learned = result.learnedAliases?.length ?? 0;
      notify.success(learned ? `${created} · đã nhớ ${learned} cách viết mới` : created);
    },
    onError: (error) => notify.error(extractApiError(error).message || "Không tạo được đơn"),
  });
}

/**
 * Duyệt/từ chối nhiều yêu cầu. Backend xử lý từng cái độc lập nên kết quả có thể thành
 * công một phần — thông báo phải nói rõ cái nào hỏng, đừng gộp thành "xong".
 */
export function useDecideManyApprovals() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      ids,
      decision,
      note,
    }: {
      ids: string[];
      decision: "APPROVE" | "REJECT";
      note?: string;
    }) =>
      decision === "APPROVE"
        ? SalesApprovalsApi.approveMany(ids, note)
        : SalesApprovalsApi.rejectMany(ids, note ?? ""),
    onSuccess: (result, variables) => {
      client.invalidateQueries({ queryKey: ["salesApprovals"] });
      client.invalidateQueries({ queryKey: ["salesOrders"] });
      client.invalidateQueries({ queryKey: ["salesWithdrawals"] });
      const verb = variables.decision === "APPROVE" ? "duyệt" : "từ chối";
      if (result.failed.length) {
        notify.warning(
          `Đã ${verb} ${result.succeeded}, còn ${result.failed.length} không xử lý được: ` +
            result.failed
              .slice(0, 3)
              .map((row) => `${row.orderNo ?? row.id} (${row.message})`)
              .join("; "),
        );
      } else {
        notify.success(`Đã ${verb} ${result.succeeded} đơn`);
      }
    },
    onError: (error) => notify.error(extractApiError(error).message || "Không xử lý được"),
  });
}

/** Sửa CK điều chỉnh ngay trên hàng đợi; thành tiền đơn được backend tính lại. */
export function useAdjustLineDiscount() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      lineId,
      discountAdjustmentAmount,
    }: {
      lineId: string;
      discountAdjustmentAmount: number;
    }) => SalesApprovalsApi.adjustLineDiscount(lineId, discountAdjustmentAmount),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["salesApprovals"] });
      client.invalidateQueries({ queryKey: ["salesOrders"] });
      notify.success("Đã cập nhật chiết khấu, thành tiền tính lại theo mức mới");
    },
    onError: (error) =>
      notify.error(extractApiError(error).message || "Không sửa được chiết khấu"),
  });
}

/** Quản lý đổi Mã NCC ngay trên hàng đợi duyệt; null là quay lại AUTO FIFO. */
export function useAdjustLineSupplier() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ lineId, supplierPartyId }: { lineId: string; supplierPartyId: string | null }) =>
      SalesApprovalsApi.adjustLineSupplier(lineId, supplierPartyId),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["salesApprovals"] });
      notify.success("Đã cập nhật Mã NCC");
    },
    onError: (error) => notify.error(extractApiError(error).message || "Không đổi được Mã NCC"),
  });
}
