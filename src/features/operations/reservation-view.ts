type Ref = { id: string; code?: string | null; name: string };
type Product = Ref & { uom?: string };
export type ReservationStatus = "DRAFT" | "ACTIVE" | "PARTIALLY_RELEASED" | "CONSUMED" | "RELEASED" | "CANCELLED" | "EXPIRED";
export type ReservationRow = {
  id: string;
  reservationNo: string;
  status: ReservationStatus;
  activeQty: string | number;
  expiredAt?: string | null;
  customer?: Ref | null;
  supplierLocation?: Ref | null;
  product?: Product | null;
  salesOrder?: { id: string; orderNo: string } | null;
  salesOrderId?: string | null;
  withdrawalRequestId?: string | null;
  lines?: Array<{
    id: string;
    productId?: string;
    product?: Product;
    warehouse?: Ref;
    activeActualQty: string | number;
    salesOrderLineId?: string | null;
    withdrawalRequestLineId?: string | null;
  }>;
};

export const RESERVATION_STATUS: Record<ReservationStatus, { label: string; color: string }> = {
  DRAFT: { label: "Nháp", color: "default" },
  ACTIVE: { label: "Đang giữ", color: "blue" },
  PARTIALLY_RELEASED: { label: "Đã nhả một phần", color: "orange" },
  CONSUMED: { label: "Đã sử dụng", color: "green" },
  RELEASED: { label: "Đã giải phóng", color: "default" },
  CANCELLED: { label: "Đã hủy", color: "default" },
  EXPIRED: { label: "Hết hạn", color: "red" },
};

export function isSalesManaged(row: ReservationRow) {
  return Boolean(row.salesOrder?.id || row.salesOrderId || row.withdrawalRequestId || row.lines?.some((line) => line.salesOrderLineId || line.withdrawalRequestLineId));
}

export function canReleaseReservation(row: ReservationRow) {
  return !isSalesManaged(row) && (row.status === "ACTIVE" || row.status === "PARTIALLY_RELEASED") && Number(row.activeQty) > 0;
}

/** Group lots for display by product, so different products/units are never added together. */
export function reservationProducts(row: ReservationRow) {
  if (!row.lines?.length) return row.product ? [{ product: row.product, qty: Number(row.activeQty) }] : [];
  const groups = new Map<string, { product: Product; qty: number }>();
  for (const line of row.lines) {
    const product = line.product ?? { id: line.productId ?? line.id, name: "Chưa xác định mặt hàng" };
    const key = `${product.id}:${product.uom ?? ""}`;
    const item = groups.get(key) ?? { product, qty: 0 };
    item.qty += Number(line.activeActualQty);
    groups.set(key, item);
  }
  return Array.from(groups.values());
}

export function reservationWarehouses(row: ReservationRow) {
  const warehouses = new Map<string, Ref>();
  for (const line of row.lines ?? []) if (line.warehouse) warehouses.set(line.warehouse.id, line.warehouse);
  if (!warehouses.size && row.supplierLocation) warehouses.set(row.supplierLocation.id, row.supplierLocation);
  return Array.from(warehouses.values());
}
