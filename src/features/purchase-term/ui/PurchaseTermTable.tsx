// features/purchase-term/ui/PurchaseTermTable.tsx

import React from "react";
import { Button, Empty, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import type { TermNextAction, TermPurchaseOrderListItem } from "../types";

function money(n?: number | null) {
  if (n == null) return "-";
  return new Intl.NumberFormat("vi-VN").format(Math.round(Number(n)));
}

function qty(n?: number | null) {
  if (n == null) return "-";
  return `${new Intl.NumberFormat("vi-VN").format(Number(n))} L`;
}

function statusTag(status: TermPurchaseOrderListItem["status"]) {
  switch (status) {
    case "DRAFT":
      return <Tag className="tag-sm">Nháp</Tag>;
    case "APPROVED":
      return (
        <Tag color="blue" className="tag-sm">
          Đã duyệt
        </Tag>
      );
    case "IN_PROGRESS":
      return (
        <Tag color="processing" className="tag-sm">
          Đang xử lý
        </Tag>
      );
    case "COMPLETED":
      return (
        <Tag color="green" className="tag-sm">
          Hoàn tất
        </Tag>
      );
    case "CANCELLED":
      return (
        <Tag color="red" className="tag-sm">
          Đã hủy
        </Tag>
      );
    default:
      return <Tag className="tag-sm">{status}</Tag>;
  }
}

function nextActionLabel(action: TermNextAction) {
  const map: Record<TermNextAction, string> = {
    APPROVE_ORDER: "Duyệt đơn",
    CREATE_RECEIPT: "Nhập receipt",
    CALCULATE_ESTIMATE: "Tính tạm",
    CALCULATE_BILL_NORMALIZE: "Chốt bill",
    CALCULATE_FINAL: "Chốt giá",
    COMPLETE_ORDER: "Hoàn tất",
    VIEW_ONLY: "Xem",
  };
  return map[action];
}

function nextActionRender(action: TermNextAction) {
  if (action === "VIEW_ONLY") {
    return <span className="text-slate-600">Xem</span>;
  }
  return (
    <span className="font-medium text-slate-900">
      {nextActionLabel(action)}
    </span>
  );
}

function accountingTag(row: TermPurchaseOrderListItem) {
  if (row.status === "COMPLETED") {
    return (
      <Tag color="green" className="tag-sm">
        Đã xử lý
      </Tag>
    );
  }

  if (row.paymentMode === "POSTPAID") {
    return (
      <Tag color="orange" className="tag-sm">
        Có thể xử lý sau
      </Tag>
    );
  }

  return (
    <Tag color="gold" className="tag-sm">
      Chưa quyết toán
    </Tag>
  );
}

type Props = {
  loading?: boolean;
  items: TermPurchaseOrderListItem[];
  page: number;
  pageSize: number;
  total: number;
  onChangePage: (page: number, pageSize: number) => void;
  onOpenDetail: (id: string) => void;
};

export function PurchaseTermTable({
  loading,
  items,
  page,
  pageSize,
  total,
  onChangePage,
  onOpenDetail,
}: Props) {
  const columns: ColumnsType<TermPurchaseOrderListItem> = [
    {
      title: "MÃ ĐƠN",
      dataIndex: "orderNo",
      width: 140,
      fixed: "left",
      render: (v, r) => (
        <button
          className="font-semibold text-slate-900 hover:text-blue-600"
          onClick={() => onOpenDetail(r.id)}
        >
          {v}
        </button>
      ),
    },
    {
      title: "NCC",
      dataIndex: "supplierName",
      width: 140,
      ellipsis: true,
    },
    {
      title: "MẶT HÀNG",
      dataIndex: "productSummary",
      width: 160,
      ellipsis: true,
    },
    {
      title: "BILL",
      dataIndex: "orderDate",
      width: 110,
      render: (v) => (v ? dayjs(v).format("DD/MM/YYYY") : "-"),
    },
    {
      title: "SL",
      dataIndex: "totalQty",
      width: 110,
      align: "right",
      render: qty,
    },
    {
      title: "TẠM",
      dataIndex: "totalAmount",
      width: 95,
      align: "right",
      render: money,
    },
    {
      title: "BILL",
      dataIndex: "totalAmount",
      width: 95,
      align: "right",
      render: money,
    },
    {
      title: "CHỐT",
      dataIndex: "totalAmount",
      width: 95,
      align: "right",
      render: (v, r) => (r.status === "COMPLETED" ? money(v) : "-"),
    },
    {
      title: "TRẠNG THÁI",
      dataIndex: "status",
      width: 150,
      render: statusTag,
    },
    {
      title: "KT",
      width: 150,
      render: (_, r) => accountingTag(r),
    },
    {
      title: "NEXT",
      dataIndex: "nextAction",
      width: 160,
      render: nextActionRender,
    },
    {
      title: "",
      width: 70,
      fixed: "right",
      render: (_, r) => (
        <Button size="small" type="link" onClick={() => onOpenDetail(r.id)}>
          Mở
        </Button>
      ),
    },
  ];

  return (
    <Table
      rowKey="id"
      size="small"
      loading={loading}
      columns={columns}
      dataSource={items}
      className="term-table"
      locale={{
        emptyText: (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Chưa có đơn TERM"
          />
        ),
      }}
      scroll={{ x: 1400 }}
      pagination={{
        current: page,
        pageSize,
        total,
        size: "small",
        showSizeChanger: true,
        showTotal: (t) => `Tổng ${t} đơn`,
        onChange: onChangePage,
      }}
    />
  );
}
