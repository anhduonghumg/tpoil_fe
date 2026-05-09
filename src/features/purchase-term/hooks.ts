import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notify } from "../../shared/lib/notification";

import type {
  CreateTermGoodsReceiptPayload,
  CreateTermPricingPayload,
  CreateTermPurchaseOrderPayload,
  TermPurchaseOrderListQuery,
} from "./types";
import { TermPurchaseOrdersApi } from "./api";

const qk = {
  list: (q: TermPurchaseOrderListQuery) =>
    ["term-purchase-orders", "list", q] as const,
};

export function useTermPurchaseOrderList(q: TermPurchaseOrderListQuery) {
  return useQuery({
    queryKey: qk.list(q),
    queryFn: () => TermPurchaseOrdersApi.list(q),
  });
}

export function useCreateTermPurchaseOrder() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTermPurchaseOrderPayload) =>
      TermPurchaseOrdersApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["term-purchase-orders"] });
      qc.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
    onError: (e: any) =>
      notify.error(e?.message || "Tạo đơn mua TERM thất bại"),
  });
}

export function useTermPurchaseOrderDetail(id?: string) {
  return useQuery({
    queryKey: ["purchase-terms", "detail", id],
    queryFn: () => TermPurchaseOrdersApi.detail(id!),
    enabled: !!id,
  });
}

export function useApproveTermPurchaseOrder() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => TermPurchaseOrdersApi.approve(id),

    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["purchase-terms"] });
      qc.invalidateQueries({ queryKey: ["purchase-terms", "detail", id] });
      notify.success("Đã duyệt đơn TERM");
    },

    onError: (e: any) => {
      notify.error(e?.message || "Duyệt đơn TERM thất bại");
    },
  });
}

export function useCreateTermReceipt(orderId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTermGoodsReceiptPayload) =>
      TermPurchaseOrdersApi.createReceipt(orderId!, data),

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-terms"] });
      qc.invalidateQueries({ queryKey: ["purchase-terms", "detail", orderId] });
      notify.success("Đã tạo phiếu nhận hàng");
    },

    onError: (e: any) =>
      notify.error(e?.message || "Tạo phiếu nhận hàng thất bại"),
  });
}

export function useConfirmTermReceipt(orderId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => TermPurchaseOrdersApi.confirmReceipt(id),

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-terms"] });
      qc.invalidateQueries({ queryKey: ["purchase-terms", "detail", orderId] });
      notify.success("Đã xác nhận phiếu nhận hàng");
    },

    onError: (e: any) =>
      notify.error(e?.message || "Xác nhận phiếu nhận hàng thất bại"),
  });
}

export function useCreateTermEstimatePricing(orderId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTermPricingPayload) =>
      TermPurchaseOrdersApi.createEstimatePricing(orderId!, data),

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-terms"] });
      qc.invalidateQueries({ queryKey: ["purchase-terms", "detail", orderId] });
      notify.success("Đã tạo bảng giá tạm");
    },

    onError: (e: any) =>
      notify.error(e?.message || "Tạo bảng giá tạm thất bại"),
  });
}

export function useCreateTermBillNormalizePricing(orderId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTermPricingPayload) =>
      TermPurchaseOrdersApi.createBillNormalizePricing(orderId!, data),

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-terms"] });
      qc.invalidateQueries({ queryKey: ["purchase-terms", "detail", orderId] });
      notify.success("Đã tạo bảng xuất hóa đơn");
    },

    onError: (e: any) =>
      notify.error(e?.message || "Tạo bảng xuất hóa đơn thất bại"),
  });
}

export function useCreateTermFinalPricing(orderId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTermPricingPayload) =>
      TermPurchaseOrdersApi.createFinalPricing(orderId!, data),

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-terms"] });
      qc.invalidateQueries({ queryKey: ["purchase-terms", "detail", orderId] });
      notify.success("Đã tạo bảng tỷ giá chính thức");
    },

    onError: (e: any) =>
      notify.error(e?.message || "Tạo bảng tỷ giá chính thức thất bại"),
  });
}
