import React from "react";
import { Tag } from "antd";
import dayjs from "dayjs";
import type { BankAccountOption } from "../types";

/* Định dạng và nhãn trạng thái dùng chung cho mọi màn ngân hàng: trước đây mỗi
   panel tự khai báo một bản, nên cùng một trạng thái mỗi nơi gọi một kiểu. */

export const formatMoney = (value?: string | number | null) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Math.round(Number(value ?? 0)));

export const dateText = (value?: string | null) => (value ? dayjs(value).format("DD/MM/YYYY") : "—");

export const accountText = (account?: Pick<BankAccountOption, "bankCode" | "accountNo"> | null) =>
  account ? `${account.bankCode} · ${account.accountNo}` : "—";

export type StatusMeta = { label: string; color?: string };

/** Trạng thái hồ sơ chi ngoài mua hàng. */
export const GENERAL_REQUEST_STATUS: Record<string, StatusMeta> = {
  PENDING_APPROVAL: { label: "Chờ phê duyệt", color: "gold" },
  REJECTED: { label: "Từ chối", color: "red" },
  APPROVED: { label: "Chờ kiểm tra", color: "blue" },
  BANK_VERIFIED: { label: "Sẵn sàng lập lệnh", color: "cyan" },
  BANK_RETURNED: { label: "Trả lại hồ sơ", color: "orange" },
  PARTIALLY_PAID: { label: "Trả một phần", color: "geekblue" },
  PAID: { label: "Đã thanh toán", color: "green" },
  CANCELLED: { label: "Đã hủy" },
};

/** Trạng thái đề nghị thanh toán mua hàng (lô thương mại / TERM). */
export const COMMERCIAL_REQUEST_STATUS: Record<string, StatusMeta> = {
  PENDING_DIRECTOR_APPROVAL: { label: "Chờ phê duyệt", color: "gold" },
  DIRECTOR_REJECTED: { label: "Từ chối", color: "red" },
  SUBMITTED: { label: "Chờ kiểm tra", color: "blue" },
  BANK_VERIFIED: { label: "Sẵn sàng lập lệnh", color: "cyan" },
  BANK_RETURNED: { label: "Trả lại hồ sơ", color: "orange" },
  PARTIALLY_PAID: { label: "Trả một phần", color: "geekblue" },
  PAID: { label: "Đã thanh toán", color: "green" },
  CANCELLED: { label: "Đã hủy" },
};

/** Trạng thái đối soát của một dòng sao kê. */
export const RECONCILIATION_STATUS: Record<string, StatusMeta> = {
  PENDING: { label: "Chờ đối soát", color: "gold" },
  SUGGESTED: { label: "Có gợi ý", color: "blue" },
  PARTIALLY_ALLOCATED: { label: "Phân bổ một phần", color: "orange" },
  ALLOCATED: { label: "Đã đối soát", color: "green" },
  IGNORED: { label: "Bỏ qua" },
};

export const MATCH_STATUS: Record<string, StatusMeta> = {
  UNMATCHED: { label: "Chưa khớp", color: "gold" },
  AUTO_MATCHED: { label: "Đã khớp", color: "green" },
  MANUAL_MATCHED: { label: "Đã khớp", color: "green" },
  PARTIAL_MATCHED: { label: "Khớp một phần", color: "blue" },
};

export const statusTag = (map: Record<string, StatusMeta>, status?: string | null) => {
  const meta = (status && map[status]) || { label: status || "—" };
  return <Tag color={meta.color}>{meta.label}</Tag>;
};

export const isReconciled = (status?: string | null) => ["ALLOCATED", "IGNORED"].includes(status ?? "PENDING");

/** Số tiền có dấu và màu theo chiều: tiền vào xanh, tiền ra đỏ. */
export const SignedAmount: React.FC<{ direction: "IN" | "OUT"; value?: number | string | null }> = ({ direction, value }) => (
  <span className={`data-grid-num data-grid-strong banking-amount-${direction === "IN" ? "in" : "out"}`}>
    {direction === "IN" ? "+" : "−"}
    {formatMoney(value)}
  </span>
);

/** Ô hai dòng theo chuẩn .data-grid. */
export const stack = (main: React.ReactNode, sub?: React.ReactNode, strong = false) => (
  <div className="data-grid-stack">
    <span className={`data-grid-clip${strong ? " data-grid-strong" : ""}`}>{main || "—"}</span>
    <span className="data-grid-clip data-grid-sub">{sub || "—"}</span>
  </div>
);

export const downloadCsv = (fileName: string, rows: unknown[][]) => {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};
