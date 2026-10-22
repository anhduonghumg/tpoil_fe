import React from "react";
import { Tag, Tooltip } from "antd";
import { CheckCircleFilled, CloseCircleFilled, EditOutlined, StopOutlined, SyncOutlined } from "@ant-design/icons";
import type {
  ReceivableStatus,
  SalesApprovalStatus,
  SalesApprovalType,
  SalesDeliveryStatus,
  SalesInvoiceDocumentType,
  SalesInvoiceStatus,
  SalesOrderKind,
  SalesOrderStatus,
  SalesReconciliationStatus,
  SalesWithdrawalStatus,
} from "../types";

export const ORDER_KIND_LABELS: Record<SalesOrderKind, string> = {
  DAY_TRADE: "Mua bán trong ngày",
  SINGLE: "Lấy 1 lần",
  LOT: "Lấy nhiều lần (đơn lô)",
};

export const ORDER_STATUS_LABELS: Record<SalesOrderStatus, string> = {
  DRAFT: "Nháp",
  PENDING_REVIEW: "Chờ duyệt",
  CONFIRMED: "Đã duyệt",
  REJECTED: "Bị từ chối",
  AWAITING_STOCK: "Chờ hàng",
  PARTIALLY_RESERVED: "Giữ hàng một phần",
  RESERVED: "Đã giữ hàng",
  WAREHOUSE_PROCESSING: "Kho đang xuất",
  PARTIALLY_DELIVERED: "Giao một phần",
  DELIVERED: "Đã giao",
  AWAITING_RECONCILIATION: "Chờ đối soát",
  AWAITING_INVOICE: "Chờ hóa đơn",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
};

const ORDER_STATUS_COLORS: Record<SalesOrderStatus, string> = {
  DRAFT: "default",
  PENDING_REVIEW: "gold",
  CONFIRMED: "blue",
  REJECTED: "red",
  AWAITING_STOCK: "orange",
  PARTIALLY_RESERVED: "orange",
  RESERVED: "cyan",
  WAREHOUSE_PROCESSING: "geekblue",
  PARTIALLY_DELIVERED: "geekblue",
  DELIVERED: "purple",
  AWAITING_RECONCILIATION: "purple",
  AWAITING_INVOICE: "magenta",
  COMPLETED: "green",
  CANCELLED: "default",
};

/** Nhóm trạng thái cho tab "Đang chạy" — mọi đơn Sale còn phải theo dõi. */
export const WORKING_STATUSES: SalesOrderStatus[] = [
  "DRAFT",
  "PENDING_REVIEW",
  "CONFIRMED",
  "REJECTED",
  "AWAITING_STOCK",
  "PARTIALLY_RESERVED",
  "RESERVED",
  "WAREHOUSE_PROCESSING",
  "PARTIALLY_DELIVERED",
  "DELIVERED",
  "AWAITING_RECONCILIATION",
  "AWAITING_INVOICE",
];

export function OrderStatusTag({ status }: { status: SalesOrderStatus }) {
  return (
    <Tag color={ORDER_STATUS_COLORS[status] ?? "default"} style={{ marginInlineEnd: 0 }}>
      {ORDER_STATUS_LABELS[status] ?? status}
    </Tag>
  );
}

/** Nhãn ngắn cho bảng nhiều cột; tên đầy đủ vẫn ở tooltip. */
export const ORDER_KIND_SHORT_LABELS: Record<SalesOrderKind, string> = {
  DAY_TRADE: "Trong ngày",
  SINGLE: "Lấy 1 lần",
  LOT: "Đơn lô",
};

export function OrderKindTag({ kind, short }: { kind: SalesOrderKind; short?: boolean }) {
  const color = kind === "LOT" ? "purple" : kind === "SINGLE" ? "blue" : "default";
  const tag = (
    <Tag color={color} style={{ marginInlineEnd: 0 }}>
      {(short ? ORDER_KIND_SHORT_LABELS[kind] : ORDER_KIND_LABELS[kind]) ?? kind}
    </Tag>
  );
  return short ? <Tooltip title={ORDER_KIND_LABELS[kind] ?? kind}>{tag}</Tooltip> : tag;
}

export const APPROVAL_TYPE_LABELS: Record<SalesApprovalType, string> = {
  STANDARD: "Đơn bán",
  PRICE: "Giá bán",
  CREDIT: "Công nợ",
  EXCEPTION: "Ngoại lệ",
};

export const APPROVAL_STATUS_LABELS: Record<SalesApprovalStatus, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  STALE: "Hết hiệu lực",
  CANCELLED: "Đã hủy",
};

const APPROVAL_STATUS_COLORS: Record<SalesApprovalStatus, string> = {
  PENDING: "gold",
  APPROVED: "green",
  REJECTED: "red",
  STALE: "default",
  CANCELLED: "default",
};

export function ApprovalStatusTag({ status }: { status: SalesApprovalStatus }) {
  return (
    <Tag color={APPROVAL_STATUS_COLORS[status] ?? "default"} style={{ marginInlineEnd: 0 }}>
      {APPROVAL_STATUS_LABELS[status] ?? status}
    </Tag>
  );
}

const APPROVAL_TYPE_COLORS: Record<SalesApprovalType, string> = {
  STANDARD: "green",
  PRICE: "blue",
  CREDIT: "volcano",
  EXCEPTION: "purple",
};

export function ApprovalTypeTag({ type }: { type: SalesApprovalType }) {
  const color = APPROVAL_TYPE_COLORS[type] ?? "default";
  return (
    <Tag color={color} style={{ marginInlineEnd: 0 }}>
      {APPROVAL_TYPE_LABELS[type] ?? type}
    </Tag>
  );
}

export const WITHDRAWAL_STATUS_LABELS: Record<SalesWithdrawalStatus, string> = {
  DRAFT: "Nháp",
  NEED_SOURCE: "Chờ chọn lô nguồn",
  PENDING_REVIEW: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  RESERVED: "Đã giữ hàng",
  WAREHOUSE_PROCESSING: "Kho đang xuất",
  ISSUED: "Đã xuất",
  REJECTED: "Bị từ chối",
  CANCELLED: "Đã hủy",
};

const WITHDRAWAL_STATUS_COLORS: Record<SalesWithdrawalStatus, string> = {
  DRAFT: "default",
  NEED_SOURCE: "red",
  PENDING_REVIEW: "gold",
  APPROVED: "blue",
  RESERVED: "cyan",
  WAREHOUSE_PROCESSING: "geekblue",
  ISSUED: "green",
  REJECTED: "red",
  CANCELLED: "default",
};

export function WithdrawalStatusTag({ status }: { status: SalesWithdrawalStatus }) {
  return (
    <Tag color={WITHDRAWAL_STATUS_COLORS[status] ?? "default"} style={{ marginInlineEnd: 0 }}>
      {WITHDRAWAL_STATUS_LABELS[status] ?? status}
    </Tag>
  );
}

export const DELIVERY_STATUS_LABELS: Record<SalesDeliveryStatus, string> = {
  DRAFT: "Nháp",
  READY: "Chờ kho xuất",
  RETURNED: "Đã trả lại kinh doanh",
  POSTED: "Đã xuất",
  VOIDED: "Đã hủy",
};

const DELIVERY_STATUS_COLORS: Record<SalesDeliveryStatus, string> = {
  DRAFT: "default",
  READY: "gold",
  RETURNED: "red",
  POSTED: "green",
  VOIDED: "default",
};

export function DeliveryStatusTag({ status }: { status: SalesDeliveryStatus }) {
  return (
    <Tag color={DELIVERY_STATUS_COLORS[status] ?? "default"} style={{ marginInlineEnd: 0 }}>
      {DELIVERY_STATUS_LABELS[status] ?? status}
    </Tag>
  );
}

export const RECONCILIATION_STATUS_LABELS: Record<SalesReconciliationStatus, string> = {
  OPEN: "Chờ đối soát",
  MATCHED: "Khớp",
  VARIANCE: "Có chênh lệch",
  RESOLVED: "Đã xử lý",
};

const RECONCILIATION_STATUS_COLORS: Record<SalesReconciliationStatus, string> = {
  OPEN: "gold",
  MATCHED: "green",
  VARIANCE: "red",
  RESOLVED: "blue",
};

export function ReconciliationStatusTag({ status }: { status: SalesReconciliationStatus }) {
  return (
    <Tag color={RECONCILIATION_STATUS_COLORS[status] ?? "default"} style={{ marginInlineEnd: 0 }}>
      {RECONCILIATION_STATUS_LABELS[status] ?? status}
    </Tag>
  );
}

export const INVOICE_STATUS_LABELS: Record<SalesInvoiceStatus, string> = {
  DRAFT: "Nháp",
  PENDING_ISSUE: "Đang phát hành",
  ISSUED: "Đã phát hành",
  ISSUE_FAILED: "Phát hành lỗi",
  CANCELLED: "Đã hủy",
};

const INVOICE_STATUS_COLORS: Record<SalesInvoiceStatus, string> = {
  DRAFT: "default",
  PENDING_ISSUE: "gold",
  ISSUED: "green",
  ISSUE_FAILED: "red",
  CANCELLED: "default",
};

export function InvoiceStatusTag({ status }: { status: SalesInvoiceStatus }) {
  return (
    <Tag color={INVOICE_STATUS_COLORS[status] ?? "default"} style={{ marginInlineEnd: 0 }}>
      {INVOICE_STATUS_LABELS[status] ?? status}
    </Tag>
  );
}

const INVOICE_STATUS_ICONS: Record<SalesInvoiceStatus, React.ReactNode> = {
  DRAFT: <EditOutlined style={{ color: "#8c8c8c" }} />,
  PENDING_ISSUE: <SyncOutlined spin style={{ color: "#d48806" }} />,
  ISSUED: <CheckCircleFilled style={{ color: "#52c41a" }} />,
  ISSUE_FAILED: <CloseCircleFilled style={{ color: "#ff4d4f" }} />,
  CANCELLED: <StopOutlined style={{ color: "#bfbfbf" }} />,
};

/** Bản gọn của InvoiceStatusTag cho cột hẹp trong bảng; tên trạng thái nằm ở tooltip. */
export function InvoiceStatusIcon({ status }: { status: SalesInvoiceStatus }) {
  const label = INVOICE_STATUS_LABELS[status] ?? status;
  return (
    <Tooltip title={label}>
      <span role="img" aria-label={label} style={{ fontSize: 15 }}>{INVOICE_STATUS_ICONS[status] ?? label}</span>
    </Tooltip>
  );
}

export const INVOICE_DOC_TYPE_LABELS: Record<SalesInvoiceDocumentType, string> = {
  ORIGINAL: "Gốc",
  ADJUSTMENT: "Điều chỉnh",
  REPLACEMENT: "Thay thế",
};

export const RECEIVABLE_STATUS_LABELS: Record<ReceivableStatus, string> = {
  OPEN: "Còn nợ",
  PARTIALLY_SETTLED: "Đã thu một phần",
  SETTLED: "Đã thu đủ",
  VOIDED: "Đã hủy",
};

const RECEIVABLE_STATUS_COLORS: Record<ReceivableStatus, string> = {
  OPEN: "gold",
  PARTIALLY_SETTLED: "blue",
  SETTLED: "green",
  VOIDED: "default",
};

export function ReceivableStatusTag({ status }: { status: ReceivableStatus }) {
  return (
    <Tag color={RECEIVABLE_STATUS_COLORS[status] ?? "default"} style={{ marginInlineEnd: 0 }}>
      {RECEIVABLE_STATUS_LABELS[status] ?? status}
    </Tag>
  );
}

const numberFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 });
const moneyFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });

export function formatQty(value?: string | number | null) {
  if (value == null || value === "") return "—";
  const parsed = Number(value);
  return Number.isNaN(parsed) ? String(value) : numberFormat.format(parsed);
}

export function formatMoney(value?: string | number | null) {
  if (value == null || value === "") return "—";
  const parsed = Number(value);
  return Number.isNaN(parsed) ? String(value) : moneyFormat.format(parsed);
}

/**
 * Thành tiền chưa thuế của một dòng.
 *
 * Chiết khấu là chiết khấu TRÊN MỖI ĐƠN VỊ (đúng như đơn đặt hàng giấy: SL × (giá −
 * chiết khấu)), không phải một khoản trừ cho cả dòng.
 */
export function lineNetAmount(line: {
  orderedActualQty?: string | number | null;
  unitPrice?: string | number | null;
  discountAmount?: string | number | null;
  transportFeeUnitPrice?: string | number | null;
}) {
  const qty = Number(line.orderedActualQty ?? 0);
  const price = Number(line.unitPrice ?? 0);
  const discount = Number(line.discountAmount ?? 0);
  const transportFee = Number(line.transportFeeUnitPrice ?? 0);
  if (Number.isNaN(qty) || Number.isNaN(price)) return 0;
  return qty * (price - (Number.isNaN(discount) ? 0 : discount) + (Number.isNaN(transportFee) ? 0 : transportFee));
}

/** Độ tin cậy của nhập nhanh: dưới 0.75 thì bắt Sale nhìn lại. */
export function ConfidenceTag({ value }: { value: number }) {
  const percent = Math.round(value * 100);
  const color = value >= 0.9 ? "green" : value >= 0.75 ? "gold" : "red";
  return (
    <Tooltip title="Độ tin cậy khi khớp dữ liệu">
      <Tag color={color} style={{ marginInlineEnd: 0 }}>
        {percent}%
      </Tag>
    </Tooltip>
  );
}

/* ------------------------------------------------------------------ */
/* Số tiền viết bằng chữ                                               */
/* ------------------------------------------------------------------ */

const ONES = [
  "không",
  "một",
  "hai",
  "ba",
  "bốn",
  "năm",
  "sáu",
  "bảy",
  "tám",
  "chín",
];

/** Nhóm ba chữ số. `full` = nhóm đứng sau, phải đọc đủ cả "không trăm". */
function readTriple(value: number, full: boolean) {
  const hundreds = Math.floor(value / 100);
  const tens = Math.floor((value % 100) / 10);
  const units = value % 10;
  const parts: string[] = [];

  if (full || hundreds > 0) parts.push(`${ONES[hundreds]} trăm`);

  if (tens === 0) {
    if (units > 0) {
      if (hundreds > 0 || full) parts.push("lẻ");
      parts.push(ONES[units]);
    }
  } else if (tens === 1) {
    parts.push("mười");
    if (units === 1) parts.push("một");
    else if (units === 5) parts.push("lăm");
    else if (units > 0) parts.push(ONES[units]);
  } else {
    parts.push(`${ONES[tens]} mươi`);
    if (units === 1) parts.push("mốt");
    else if (units === 4) parts.push("tư");
    else if (units === 5) parts.push("lăm");
    else if (units > 0) parts.push(ONES[units]);
  }

  return parts.join(" ");
}

const SCALES = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];

/**
 * "564.663.000" → "Năm trăm sáu mươi tư triệu sáu trăm sáu mươi ba nghìn đồng".
 * Hóa đơn nào cũng phải có dòng này, và người đọc dùng nó để bắt lỗi lệch chữ số.
 */
export function amountInWords(value?: number | string | null) {
  const amount = Math.floor(Math.abs(Number(value ?? 0)));
  if (!Number.isFinite(amount)) return "—";
  if (amount === 0) return "Không đồng";

  const triples: number[] = [];
  let rest = amount;
  while (rest > 0) {
    triples.push(rest % 1000);
    rest = Math.floor(rest / 1000);
  }

  const chunks: string[] = [];
  for (let index = triples.length - 1; index >= 0; index -= 1) {
    const triple = triples[index];
    if (triple === 0) continue;
    const isLeading = index === triples.length - 1;
    chunks.push(`${readTriple(triple, !isLeading)} ${SCALES[index] ?? ""}`.trim());
  }

  const text = chunks.join(" ").replace(/\s+/g, " ").trim();
  return `${text.charAt(0).toUpperCase()}${text.slice(1)} đồng`;
}
