import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { extractApiError } from "../../shared/lib/httpError";
import { notify } from "../../shared/lib/notification";
import { CommercialLotsApi } from "./api";
import type {
  CommercialLotListQuery,
  CreateLotWithdrawalPayload,
} from "./types";

const keys = {
  all: ["commercial-lots"] as const,
  list: (query: CommercialLotListQuery) =>
    ["commercial-lots", "list", query] as const,
  detail: (id?: string) => ["commercial-lots", "detail", id] as const,
  contract: (supplierId?: string, orderDate?: string) =>
    ["commercial-lots", "contract", supplierId, orderDate] as const,
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
