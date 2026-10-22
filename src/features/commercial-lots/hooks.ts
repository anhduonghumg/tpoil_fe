import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { extractApiError } from "../../shared/lib/httpError";
import { notify } from "../../shared/lib/notification";
import { CommercialLotsApi } from "./api";
import type {
  CommercialLotListQuery,
  CommercialLotWithdrawalListQuery,
  CommercialLotWithdrawalListResult,
  CreateLotWithdrawalPayload,
  CommercialPaymentRequest,
} from "./types";

const keys = {
  all: ["commercial-lots"] as const,
  list: (query: CommercialLotListQuery) =>
    ["commercial-lots", "list", query] as const,
  detail: (id?: string) => ["commercial-lots", "detail", id] as const,
  contract: (supplierId?: string, orderDate?: string) =>
    ["commercial-lots", "contract", supplierId, orderDate] as const,
  paymentRequests: ["commercial-lots", "payment-requests"] as const,
  withdrawalsQueue: (query: CommercialLotWithdrawalListQuery) =>
    ["commercial-lots", "withdrawals-queue", query] as const,
};

export function useCommercialLotList(query: CommercialLotListQuery) {
  return useQuery({
    queryKey: keys.list(query),
    queryFn: () => CommercialLotsApi.list(query),
  });
}

export function useCommercialLotDetail(id?: string) {
  return useQuery({
    queryKey: keys.detail(id),
    queryFn: () => CommercialLotsApi.detail(id!),
    enabled: Boolean(id),
  });
}

export function useCommercialLotPaymentRequests() {
  return useQuery<CommercialPaymentRequest[]>({
    queryKey: keys.paymentRequests,
    queryFn: CommercialLotsApi.listPaymentRequests,
  });
}

export function useActivePurchaseContract(
  supplierId?: string,
  orderDate?: string,
) {
  return useQuery({
    queryKey: keys.contract(supplierId, orderDate),
    queryFn: () =>
      CommercialLotsApi.validateContract(supplierId!, orderDate!),
    enabled: Boolean(supplierId && orderDate),
    retry: false,
  });
}

function useRefreshLot(id?: string) {
  const client = useQueryClient();
  return () => {
    client.invalidateQueries({ queryKey: keys.all });
    if (id) client.invalidateQueries({ queryKey: keys.detail(id) });
    client.invalidateQueries({ queryKey: ["purchaseOrders"] });
  };
}

function showLotError(error: unknown, fallback: string) {
  const { message } = extractApiError(error);
  notify.error(message || fallback);
}

export function useCreateCommercialLot() {
  const refresh = useRefreshLot();
  return useMutation({
    mutationFn: CommercialLotsApi.createOrder,
    onSuccess: () => {
      refresh();
      notify.success("Đã tạo đơn mua lô");
    },
    onError: (error) => showLotError(error, "Không tạo được đơn mua lô"),
  });
}

export function useUpdateCommercialLot(id?: string) {
  const refresh = useRefreshLot(id);
  return useMutation({
    mutationFn: (payload: any) => CommercialLotsApi.updateOrder(id!, payload),
    onSuccess: () => { refresh(); notify.success("Đã cập nhật đơn mua lô"); },
    onError: (error) => showLotError(error, "Không cập nhật được đơn mua lô"),
  });
}

export function useUpdateCommercialLotActualReceived(id?: string) {
  const refresh = useRefreshLot(id);
  return useMutation({
    mutationFn: (lines: Array<{ purchaseOrderLineId: string; actualReceivedQty: number }>) =>
      CommercialLotsApi.updateActualReceived(id!, lines),
    onSuccess: () => { refresh(); notify.success("Đã cập nhật số lượng thực nhận"); },
    onError: (error) => showLotError(error, "Không cập nhật được số lượng thực nhận"),
  });
}

export function useCreateCommercialLotPaymentRequest(id?: string) {
  const refresh = useRefreshLot(id);
  return useMutation({
    mutationFn: (data: { supplierInvoiceId: string; beneficiaryAccountNo?: string; note?: string }) =>
      CommercialLotsApi.createPaymentRequest(id!, data),
    onSuccess: () => {
      refresh();
      notify.success("Đã gửi đề nghị thanh toán sang bộ phận ngân hàng");
    },
    onError: (error) =>
      showLotError(error, "Không tạo được đề nghị thanh toán"),
  });
}

export function useCommercialLotPaymentAction(id?: string) {
  const refresh = useRefreshLot(id);
  return useMutation({
    mutationFn: ({ requestId, action, note }: any) => CommercialLotsApi.paymentAction(id!, requestId, action, note),
    onSuccess: refresh,
    onError: (error) => showLotError(error, "Không cập nhật được đề nghị thanh toán"),
  });
}

export function useResubmitCommercialLotPaymentRequest(id?: string) {
  const refresh = useRefreshLot(id);
  return useMutation({
    mutationFn: ({ requestId, data }: { requestId: string; data: { note?: string; beneficiaryAccountNo?: string } }) =>
      CommercialLotsApi.resubmitPaymentRequest(id!, requestId, data),
    onSuccess: () => {
      refresh();
      notify.success("Đã gửi lại đề nghị thanh toán cho ngân hàng lập kế hoạch");
    },
    onError: (error) => showLotError(error, "Không gửi lại được đề nghị thanh toán"),
  });
}

export function useRecordCommercialLotPayment(id?: string) {
  const refresh = useRefreshLot(id);
  return useMutation({
    mutationFn: ({ requestId, data }: any) => CommercialLotsApi.recordPayment(id!, requestId, data),
    onSuccess: refresh,
    onError: (error) => showLotError(error, "Không ghi nhận được thanh toán"),
  });
}

export function useApproveCommercialLot(id?: string) {
  const refresh = useRefreshLot(id);
  return useMutation({
    mutationFn: (orderId: string) => CommercialLotsApi.approveOrder(orderId),
    onSuccess: () => {
      refresh();
      notify.success("Đã duyệt đơn mua lô");
    },
    onError: (error) => showLotError(error, "Không duyệt được đơn mua lô"),
  });
}

export function useCancelCommercialLot(id?: string) {
  const refresh = useRefreshLot(id);
  return useMutation({
    mutationFn: (orderId: string) => CommercialLotsApi.cancelOrder(orderId),
    onSuccess: () => {
      refresh();
      notify.success("Đã hủy đơn mua lô");
    },
    onError: (error) => showLotError(error, "Không hủy được đơn mua lô"),
  });
}

export function useCreateLotWithdrawal(id: string) {
  const refresh = useRefreshLot(id);
  return useMutation({
    mutationFn: (payload: CreateLotWithdrawalPayload) =>
      CommercialLotsApi.createWithdrawal(id, payload),
    onSuccess: () => {
      refresh();
      notify.success("Đã tạo phiếu rút lô");
    },
    onError: (error) => showLotError(error, "Không tạo được phiếu rút lô"),
  });
}

export function useConfirmLotWithdrawal(id: string) {
  const refresh = useRefreshLot(id);
  return useMutation({
    mutationFn: (withdrawalId: string) =>
      CommercialLotsApi.confirmWithdrawal(id, withdrawalId),
    onSuccess: () => {
      refresh();
      notify.success("Đã xác nhận rút lô và cập nhật tồn thực tế");
    },
    onError: (error) => showLotError(error, "Không xác nhận được phiếu rút lô"),
  });
}

export function useCancelLotWithdrawal(id: string) {
  const refresh = useRefreshLot(id);
  return useMutation({
    mutationFn: (withdrawalId: string) =>
      CommercialLotsApi.cancelWithdrawal(id, withdrawalId),
    onSuccess: () => {
      refresh();
      notify.success("Đã hủy phiếu rút lô");
    },
    onError: (error) => showLotError(error, "Không hủy được phiếu rút lô"),
  });
}

export function useCommercialLotWithdrawalsQueue(
  query: CommercialLotWithdrawalListQuery,
) {
  return useQuery<CommercialLotWithdrawalListResult>({
    queryKey: keys.withdrawalsQueue(query),
    queryFn: () => CommercialLotsApi.listWithdrawals(query),
  });
}

function useRefreshWithdrawalsQueue() {
  const client = useQueryClient();
  return () => {
    client.invalidateQueries({ queryKey: ["commercial-lots", "withdrawals-queue"] });
    client.invalidateQueries({ queryKey: keys.all });
  };
}

export function useConfirmLotWithdrawalQueueItem() {
  const refresh = useRefreshWithdrawalsQueue();
  return useMutation({
    mutationFn: ({ orderId, withdrawalId }: { orderId: string; withdrawalId: string }) =>
      CommercialLotsApi.confirmWithdrawal(orderId, withdrawalId),
    onSuccess: () => {
      refresh();
      notify.success("Đã xác nhận rút lô và cập nhật tồn thực tế");
    },
    onError: (error) => showLotError(error, "Không xác nhận được phiếu rút lô"),
  });
}

export function useCancelLotWithdrawalQueueItem() {
  const refresh = useRefreshWithdrawalsQueue();
  return useMutation({
    mutationFn: ({ orderId, withdrawalId }: { orderId: string; withdrawalId: string }) =>
      CommercialLotsApi.cancelWithdrawal(orderId, withdrawalId),
    onSuccess: () => {
      refresh();
      notify.success("Đã hủy phiếu rút lô");
    },
    onError: (error) => showLotError(error, "Không hủy được phiếu rút lô"),
  });
}
