import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notify } from "../../shared/lib/notification";
import { extractApiError } from "../../shared/lib/httpError";
import { TermPurchaseOrdersApi } from "./api";
import type {
  CreateTermGoodsReceiptPayload,
  CreateTermLogisticsCostPayload,
  CreateTermPricingPayload,
  CreateTermPurchaseOrderPayload,
  CreateTermShipmentPayload,
  TermPurchaseOrderListQuery,
  UpdateTermLogisticsCostPayload,
  UpdateTermShipmentPayload,
} from "./types";

const qk = {
  root: ["purchase-terms"] as const,
  list: (q: TermPurchaseOrderListQuery) => ["term-purchase-orders", "list", q] as const,
  detail: (id?: string) => ["purchase-terms", "detail", id] as const,
};

function invalidateTerm(qc: ReturnType<typeof useQueryClient>, id?: string) {
  qc.invalidateQueries({ queryKey: qk.root });
  qc.invalidateQueries({ queryKey: ["term-purchase-orders"] });
  qc.invalidateQueries({ queryKey: ["purchase-orders"] });
  if (id) qc.invalidateQueries({ queryKey: qk.detail(id) });
}

export function useTermPurchaseOrderList(q: TermPurchaseOrderListQuery) {
  return useQuery({
    queryKey: qk.list(q),
    queryFn: () => TermPurchaseOrdersApi.list(q),
  });
}

export function useCreateTermPurchaseOrder() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTermPurchaseOrderPayload) => TermPurchaseOrdersApi.create(data),
    onSuccess: () => {
      invalidateTerm(qc);
      notify.success("Đã tạo hồ sơ TERM");
    },
    onError: (e: any) => notify.error(e?.message || "Tạo hồ sơ TERM thất bại"),
  });
}

export function useTermPurchaseOrderDetail(id?: string) {
  return useQuery({
    queryKey: qk.detail(id),
    queryFn: () => TermPurchaseOrdersApi.detail(id!),
    enabled: !!id,
  });
}

export function useValidateTermPurchaseContract(params?: {
  supplierCustomerId?: string;
  orderDate?: string;
}) {
  return useQuery({
    queryKey: ["purchase-terms", "validate-contract", params],
    queryFn: () =>
      TermPurchaseOrdersApi.validateContract({
        supplierCustomerId: params!.supplierCustomerId!,
        orderDate: params?.orderDate,
      }),
    enabled: !!params?.supplierCustomerId,
  });
}

export function useApproveTermPurchaseOrder() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => TermPurchaseOrdersApi.approve(id),
    onSuccess: (_, id) => {
      invalidateTerm(qc, id);
      notify.success("Đã sinh đơn đặt hàng TERM");
    },
    onError: (e: any) => notify.error(e?.message || "Sinh đơn đặt hàng TERM thất bại"),
  });
}

export function useCompleteTermPurchaseOrder() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => TermPurchaseOrdersApi.complete(id),
    onSuccess: (_, id) => {
      invalidateTerm(qc, id);
      notify.success("Đã hoàn tất hồ sơ TERM");
    },
    onError: (e: any) => notify.error(e?.message || "Hoàn tất hồ sơ TERM thất bại"),
  });
}

export function useCreateTermReceipt(orderId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTermGoodsReceiptPayload) =>
      TermPurchaseOrdersApi.createReceipt(orderId!, data),
    onSuccess: () => {
      invalidateTerm(qc, orderId);
      notify.success("Đã tạo phiếu nhận hàng");
    },
    onError: (e: any) => notify.error(e?.message || "Tạo phiếu nhận hàng thất bại"),
  });
}

export function useConfirmTermReceipt(orderId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => TermPurchaseOrdersApi.confirmReceipt(id),
    onSuccess: () => {
      invalidateTerm(qc, orderId);
      notify.success("Đã xác nhận phiếu nhận hàng");
    },
    onError: (e: any) => notify.error(e?.message || "Xác nhận phiếu nhận hàng thất bại"),
  });
}

export function useCreateTermEstimatePricing(orderId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTermPricingPayload) =>
      TermPurchaseOrdersApi.createEstimatePricing(orderId!, data),
    onSuccess: () => {
      invalidateTerm(qc, orderId);
      notify.success("Đã lập bảng giá tạm tính");
    },
    onError: (e: any) => notify.error(extractApiError(e).message || "Lập bảng giá tạm tính thất bại"),
  });
}

export function useCreateTermBillNormalizePricing(orderId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTermPricingPayload) =>
      TermPurchaseOrdersApi.createBillNormalizePricing(orderId!, data),
    onSuccess: () => {
      invalidateTerm(qc, orderId);
      notify.success("Đã lập bảng xuất hóa đơn");
    },
    onError: (e: any) => notify.error(extractApiError(e).message || "Lập bảng xuất hóa đơn thất bại"),
  });
}

export function useCreateTermFinalPricing(orderId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTermPricingPayload) =>
      TermPurchaseOrdersApi.createFinalPricing(orderId!, data),
    onSuccess: () => {
      invalidateTerm(qc, orderId);
      notify.success("Đã lập bảng giá chính thức");
    },
    onError: (e: any) => notify.error(extractApiError(e).message || "Lập bảng giá chính thức thất bại"),
  });
}

export function useCreateTermBossSheetPricing(orderId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTermPricingPayload) =>
      TermPurchaseOrdersApi.createBossSheetPricing(orderId!, data),
    onSuccess: () => {
      invalidateTerm(qc, orderId);
      notify.success("Đã lập bảng tổng hợp");
    },
    onError: (e: any) => notify.error(extractApiError(e).message || "Lập bảng tổng hợp thất bại"),
  });
}

export function useGenerateTermOrderDocument(orderId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => TermPurchaseOrdersApi.generateOrderDocument(orderId!),
    onSuccess: () => {
      invalidateTerm(qc, orderId);
      notify.success("Đã sinh đơn đặt hàng");
    },
    onError: (e: any) => notify.error(extractApiError(e).message || "Sinh đơn đặt hàng thất bại"),
  });
}

export function usePrintTermOrderDocuments() {
  return useMutation({
    mutationFn: (data: { ids: string[]; autoGenerate?: boolean }) =>
      TermPurchaseOrdersApi.printOrderDocuments(data),
    onError: (e: any) => notify.error(extractApiError(e).message || "Lấy dữ liệu in đơn đặt hàng thất bại"),
  });
}

export function useCreateTermPaymentRequest(orderId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => TermPurchaseOrdersApi.createPaymentRequest(orderId!),
    onSuccess: () => {
      invalidateTerm(qc, orderId);
      notify.success("Đã lập đề nghị thanh toán");
    },
    onError: (e: any) => notify.error(extractApiError(e).message || "Lập đề nghị thanh toán thất bại"),
  });
}

export function useCreateTermBankInstruction(orderId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => TermPurchaseOrdersApi.createBankInstruction(orderId!),
    onSuccess: () => {
      invalidateTerm(qc, orderId);
      notify.success("Đã lập ủy nhiệm chi");
    },
    onError: (e: any) => notify.error(extractApiError(e).message || "Lập ủy nhiệm chi thất bại"),
  });
}

export function useMatchTermBankInstruction(orderId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (instructionId: string) => TermPurchaseOrdersApi.matchBankInstruction(orderId!, instructionId),
    onSuccess: () => {
      invalidateTerm(qc, orderId);
      notify.success("Đã đối chiếu giao dịch ngân hàng");
    },
    onError: (e: any) => notify.error(extractApiError(e).message || "Đối chiếu giao dịch ngân hàng thất bại"),
  });
}

export function useCreateTermSettlementAdjustment(orderId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => TermPurchaseOrdersApi.createSettlementAdjustment(orderId!),
    onSuccess: () => {
      invalidateTerm(qc, orderId);
      notify.success("Đã ghi nhận điều chỉnh/hoàn tiền");
    },
    onError: (e: any) => notify.error(extractApiError(e).message || "Ghi nhận điều chỉnh/hoàn tiền thất bại"),
  });
}

export function useFetchVcbFxRate() {
  return useMutation({
    mutationFn: (params?: { date?: string; currencyCode?: string }) =>
      TermPurchaseOrdersApi.getVcbFxRate(params),
  });
}

export function useFetchEnvironmentTax() {
  return useMutation({
    mutationFn: (params: { productId: string; date: string }) =>
      TermPurchaseOrdersApi.getEnvironmentTax(params),
  });
}

export function useCreateTermShipment(orderId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTermShipmentPayload) =>
      TermPurchaseOrdersApi.createShipment(orderId!, data),
    onSuccess: () => {
      invalidateTerm(qc, orderId);
      notify.success("Đã tạo chuyến vận chuyển");
    },
    onError: (e: any) => notify.error(e?.message || "Tạo chuyến vận chuyển thất bại"),
  });
}

export function useUpdateTermShipment(orderId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (args: { shipmentId: string; data: UpdateTermShipmentPayload }) =>
      TermPurchaseOrdersApi.updateShipment(orderId!, args.shipmentId, args.data),
    onSuccess: () => {
      invalidateTerm(qc, orderId);
      notify.success("Đã cập nhật chuyến vận chuyển");
    },
    onError: (e: any) => notify.error(e?.message || "Cập nhật chuyến vận chuyển thất bại"),
  });
}

export function useDeleteTermShipment(orderId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (shipmentId: string) => TermPurchaseOrdersApi.deleteShipment(orderId!, shipmentId),
    onSuccess: () => {
      invalidateTerm(qc, orderId);
      notify.success("Đã xóa chuyến vận chuyển");
    },
    onError: (e: any) => notify.error(e?.message || "Xóa chuyến vận chuyển thất bại"),
  });
}

export function useCreateTermLogisticsCost(orderId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTermLogisticsCostPayload) =>
      TermPurchaseOrdersApi.createLogisticsCost(orderId!, data),
    onSuccess: () => {
      invalidateTerm(qc, orderId);
      notify.success("Đã tạo chi phí logistics");
    },
    onError: (e: any) => notify.error(e?.message || "Tạo chi phí logistics thất bại"),
  });
}

export function useUpdateTermLogisticsCost(orderId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (args: { costId: string; data: UpdateTermLogisticsCostPayload }) =>
      TermPurchaseOrdersApi.updateLogisticsCost(orderId!, args.costId, args.data),
    onSuccess: () => {
      invalidateTerm(qc, orderId);
      notify.success("Đã cập nhật chi phí logistics");
    },
    onError: (e: any) => notify.error(e?.message || "Cập nhật chi phí logistics thất bại"),
  });
}

export function useDeleteTermLogisticsCost(orderId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (costId: string) => TermPurchaseOrdersApi.deleteLogisticsCost(orderId!, costId),
    onSuccess: () => {
      invalidateTerm(qc, orderId);
      notify.success("Đã xóa chi phí logistics");
    },
    onError: (e: any) => notify.error(e?.message || "Xóa chi phí logistics thất bại"),
  });
}

export function useConfirmTermLogisticsCost(orderId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (costId: string) => TermPurchaseOrdersApi.confirmLogisticsCost(orderId!, costId),
    onSuccess: () => {
      invalidateTerm(qc, orderId);
      notify.success("Đã xác nhận chi phí logistics");
    },
    onError: (e: any) => notify.error(e?.message || "Xác nhận chi phí logistics thất bại"),
  });
}

export function useVoidTermLogisticsCost(orderId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (costId: string) => TermPurchaseOrdersApi.voidLogisticsCost(orderId!, costId),
    onSuccess: () => {
      invalidateTerm(qc, orderId);
      notify.success("Đã hủy chi phí logistics");
    },
    onError: (e: any) => notify.error(e?.message || "Hủy chi phí logistics thất bại"),
  });
}
