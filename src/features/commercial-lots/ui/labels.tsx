import React from "react";
import { Tag } from "antd";
import type {
  CommercialLotLifecycle,
  CommercialLotStockState,
} from "../types";

export const LIFECYCLE_LABELS: Record<CommercialLotLifecycle, string> = {
  PENDING_APPROVAL: "Chờ duyệt",
  PENDING_INVOICE: "Chờ hóa đơn",
  PENDING_PAYMENT: "Chờ thanh toán",
  READY_TO_WITHDRAW: "Sẵn sàng rút",
  WITHDRAWING: "Đang rút lô",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
};

const LIFECYCLE_COLORS: Record<CommercialLotLifecycle, string> = {
  PENDING_APPROVAL: "gold",
  PENDING_INVOICE: "cyan",
  PENDING_PAYMENT: "orange",
  READY_TO_WITHDRAW: "blue",
  WITHDRAWING: "geekblue",
  COMPLETED: "green",
  CANCELLED: "default",
};

export function LifecycleTag({
  value,
}: {
  value: CommercialLotLifecycle;
}) {
  return (
    <Tag color={LIFECYCLE_COLORS[value]}>{LIFECYCLE_LABELS[value]}</Tag>
  );
}

export const STOCK_STATE_LABELS: Record<CommercialLotStockState, string> = {
  EXPORTABLE: "Hàng được xuất",
  TEMPORARY_EXPORT: "Hàng tạm xuất",
  NON_EXPORTABLE: "Hàng không được xuất",
};

export function formatQty(value?: number | string | null) {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 3,
  }).format(Number(value ?? 0));
}

export function formatMoney(value?: number | string | null) {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}
