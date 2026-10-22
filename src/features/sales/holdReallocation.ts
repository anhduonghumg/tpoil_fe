import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiCall } from "../../shared/lib/api";
import { extractApiError } from "../../shared/lib/httpError";
import { notify } from "../../shared/lib/notification";
import type { ApiResponse } from "../../shared/lib/types";
import type { SalesOrderKind } from "./types";

/**
 * Phân bổ lại hàng giữ: hàng của công ty đang giữ cho đơn A (đã duyệt, chưa xuất kho, chưa
 * hóa đơn) được người duyệt chuyển sang giữ cho đơn B. Đơn A thành "chờ bù" và được bù khi
 * có hàng tự do; lô bù vào cho biết lãi hay lỗ so với lô ban đầu.
 */

export type HoldReallocationStatus =
  | "PLANNED"
  | "PENDING_BACKFILL"
  | "PARTIALLY_BACKFILLED"
  | "BACKFILLED"
  | "CANCELLED";

/** Một đơn đang giữ hàng có thể lấy cho dòng đơn đang thiếu tồn. */
export type HoldDonorOption = {
  donorSalesOrderLineId: string;
  donorSalesOrderId: string;
  orderNo: string;
  orderKind: SalesOrderKind;
  customer: { id: string; code: string; name: string };
  heldQty: string;
  unitCost: string;
  costIsProvisional: boolean;
  lots: Array<{ inventoryLotId: string; lotNo: string; warehouseName: string; qty: string }>;
  /** Đơn lẻ đã có lệnh xuất ở kho: lấy hàng sẽ khóa lệnh đó tới khi bù đủ. */
  openDelivery: { deliveryNo: string; plannedAt: string | null; vehiclePlate: string | null } | null;
  /** Đơn lô đã xuất hóa đơn: hàng của khách đang gửi tại kho. */
  invoiced: boolean;
  orderDate: string;
  /** Lần khách rút gần nhất; null = chưa rút lần nào. */
  lastWithdrawalAt: string | null;
};

/** Hàng có thể dùng để bù trong thời gian tới tại kho của dòng đơn. */
export type HoldIncomingSummary = {
  /** Đã nhập kho, còn chờ hóa đơn NCC — được mở khi hóa đơn ghi sổ. */
  awaitingInvoiceQty: string;
  /** Tồn dự kiến chưa về. */
  expectedQty: string;
  /** Các đơn khác đang chờ bù tại đây, được ưu tiên hàng về trước. */
  alreadyOwedQty: string;
};

export type HoldDonorResult = { donors: HoldDonorOption[]; incoming: HoldIncomingSummary };

/** Lựa chọn nguồn hàng đang giữ đã lưu cho một dòng đơn chờ duyệt (chưa thực hiện). */
export type HoldPlan = {
  id: string;
  reallocationNo: string;
  donorSalesOrderLineId: string;
  donorOrderNo: string;
  donorCustomerName: string;
  plannedQty: string;
};

type OrderRef = {
  id: string;
  orderNo: string;
  kind: SalesOrderKind;
  customer: { id: string; code: string; name: string };
};

export type HoldReallocation = {
  id: string;
  reallocationNo: string;
  status: HoldReallocationStatus;
  createdAt: string;
  executedAt: string | null;
  closedAt: string | null;
  donorOrder: OrderRef;
  recipientOrder: OrderRef;
  donorSalesOrderLineId: string;
  recipientSalesOrderLineId: string;
  product: { id: string; code: string; name: string; uom: string };
  warehouse: { id: string; code: string; name: string } | null;
  takenQty: string;
  backfilledQty: string;
  /** Phần không cần bù nữa: đơn bị lấy đã hủy hoặc giảm lượng. */
  waivedQty: string;
  outstandingQty: string;
  takenUnitCost: string;
  donorNetUnitPrice: string;
  lines: Array<{ inventoryLotId: string; lotNo: string; actualQty: string; unitCost: string; costIsProvisional: boolean }>;
  backfills: Array<{
    inventoryLotId: string;
    lotNo: string;
    actualQty: string;
    /** Giá vốn bù = giá lô + cước + hao hụt. */
    unitCost: string;
    freightUnitCost: string;
    lossUnitCost: string;
    /** Lô bù tới bằng phiếu chuyển từ kho khác. */
    fromTransfer: boolean;
    costIsProvisional: boolean;
    createdAt: string;
  }>;
  /** Lấy từ đơn lô đã xuất hóa đơn (hàng của khách gửi tại kho). */
  donorInvoiced: boolean;
  note: string | null;
  /** Giá bán thuần mỗi đơn vị của đơn nhận (đơn bán vượt). */
  recipientNetUnitPrice: string;
  result: {
    /** Lãi thực = (giá bán cho đơn nhận − giá vốn bù) × lượng đã bù. */
    realProfit: string;
    /** (giá bán cho đơn bị lấy − giá vốn lô bù) × lượng đã bù. */
    backfillProfit: string;
    /** (giá vốn lô đã lấy − giá vốn lô bù) × lượng đã bù; âm là bù đắt hơn. */
    costVariance: string;
    isProvisional: boolean;
  };
  /** Phần chưa bù, ước tính nếu bù hôm nay bằng tồn tự do; null khi không đủ tồn để ước tính. */
  pendingEstimate: { replacementUnitCost: string; profit: string; costVariance: string } | null;
};

/** Tổng hợp bán vượt theo kho × mặt hàng trong một tháng. */
export type OversellSummary = {
  month: string;
  items: Array<{
    warehouse: { id: string; code: string; name: string } | null;
    product: { id: string; code: string; name: string; uom: string };
    count: number;
    takenQty: string;
    backfilledQty: string;
    outstandingQty: string;
    realProfit: string;
    costVariance: string;
    isProvisional: boolean;
  }>;
};

const unwrap = <T,>(response: any) => (response.data?.data ?? response.data) as T;

export const SalesHoldReallocationsApi = {
  list: (query: { status?: string; salesOrderId?: string }) =>
    apiCall<ApiResponse<{ items: HoldReallocation[] }>>("salesHoldReallocations.list", { query }).then(
      unwrap<{ items: HoldReallocation[] }>,
    ),

  donors: (salesOrderLineId: string) =>
    apiCall<ApiResponse<HoldDonorResult>>("salesHoldReallocations.donors", {
      query: { salesOrderLineId },
    }).then(unwrap<HoldDonorResult>),

  /** Thay toàn bộ lựa chọn của dòng đơn; mảng rỗng = bỏ chọn. */
  setPlans: (lineId: string, plans: Array<{ donorSalesOrderLineId: string; qty: number }>, note?: string) =>
    apiCall<ApiResponse<HoldPlan[]>>("salesHoldReallocations.setPlans", {
      params: { lineId },
      data: { plans, note },
    }).then(unwrap<HoldPlan[]>),

  summary: (month: string) =>
    apiCall<ApiResponse<OversellSummary>>("salesHoldReallocations.summary", { query: { month } }).then(
      unwrap<OversellSummary>,
    ),

  backfill: (id: string) =>
    apiCall<ApiResponse<HoldReallocation>>("salesHoldReallocations.backfill", { params: { id } }).then(
      unwrap<HoldReallocation>,
    ),
};

export function useHoldDonors(salesOrderLineId?: string, enabled = true) {
  return useQuery({
    queryKey: ["salesHoldReallocations", "donors", salesOrderLineId],
    queryFn: () => SalesHoldReallocationsApi.donors(salesOrderLineId!),
    enabled: Boolean(salesOrderLineId) && enabled,
    // Lượng giữ của đơn khác đổi liên tục; mỗi lần mở hộp chọn phải đọc lại.
    staleTime: 0,
    retry: false,
  });
}

export function useSetHoldPlans() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      lineId,
      plans,
      note,
    }: {
      lineId: string;
      plans: Array<{ donorSalesOrderLineId: string; qty: number }>;
      note?: string;
    }) => SalesHoldReallocationsApi.setPlans(lineId, plans, note),
    onSuccess: (_, variables) => {
      client.invalidateQueries({ queryKey: ["salesApprovals"] });
      notify.success(
        variables.plans.length
          ? "Đã lưu nguồn hàng. Hàng sẽ chuyển sang đơn này khi đơn được duyệt xong."
          : "Đã bỏ chọn nguồn hàng đang giữ",
      );
    },
    onError: (error) => notify.error(extractApiError(error).message || "Không lưu được nguồn hàng"),
  });
}

export function useHoldReallocations(query: { status?: string; salesOrderId?: string }, enabled = true) {
  return useQuery({
    queryKey: ["salesHoldReallocations", "list", query],
    queryFn: () => SalesHoldReallocationsApi.list(query),
    enabled,
    retry: false,
  });
}

export function useOversellSummary(month: string) {
  return useQuery({
    queryKey: ["salesHoldReallocations", "summary", month],
    queryFn: () => SalesHoldReallocationsApi.summary(month),
    retry: false,
  });
}

export function useBackfillHoldReallocation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => SalesHoldReallocationsApi.backfill(id),
    onSuccess: (row) => {
      client.invalidateQueries({ queryKey: ["salesHoldReallocations"] });
      client.invalidateQueries({ queryKey: ["salesOrders"] });
      client.invalidateQueries({ queryKey: ["salesProfitability"] });
      if (Number(row.outstandingQty) > 0) {
        notify.warning(`Chưa đủ tồn tự do: còn chờ bù ${row.outstandingQty}`);
      } else {
        notify.success("Đã bù đủ hàng cho đơn");
      }
    },
    onError: (error) => notify.error(extractApiError(error).message || "Không bù được hàng"),
  });
}

/** Lượng đang chờ bù theo từng đơn bị lấy — để gắn nhãn "Chờ bù" ở danh sách đơn, lệnh xuất. */
export function useAwaitingBackfillByOrder() {
  const query = useHoldReallocations({});
  const byOrder = new Map<string, number>();
  for (const row of query.data?.items ?? []) {
    byOrder.set(row.donorOrder.id, (byOrder.get(row.donorOrder.id) ?? 0) + Number(row.outstandingQty));
  }
  return byOrder;
}

export const HOLD_REALLOCATION_STATUS_LABELS: Record<HoldReallocationStatus, { label: string; color: string }> = {
  PLANNED: { label: "Đã chọn, chờ duyệt đơn", color: "default" },
  PENDING_BACKFILL: { label: "Chờ bù", color: "orange" },
  PARTIALLY_BACKFILLED: { label: "Bù một phần", color: "gold" },
  BACKFILLED: { label: "Đã bù đủ", color: "green" },
  CANCELLED: { label: "Đã bỏ", color: "default" },
};
