import React, { useMemo } from "react";
import { Button, Space, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { PurchaseOrderListItem, PurchaseOrderStatus } from "../types";
import { Paged } from "../../../shared/lib/types";

function money(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.round(n));
}

function qty(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.round(n));
}

function toNumber(x: any): number {
  const n = Number(String(x ?? "0").replaceAll(",", ""));
  return Number.isFinite(n) ? n : 0;
}

function statusTag(s: PurchaseOrderStatus) {
  switch (s) {
    case "DRAFT":
      return <Tag>Nháp</Tag>;
    case "APPROVED":
      return <Tag color="blue">Đã duyệt</Tag>;
    case "IN_PROGRESS":
      return <Tag color="gold">Đang thực hiện</Tag>;
    case "COMPLETED":
      return <Tag color="green">Hoàn tất</Tag>;
    case "CANCELLED":
      return <Tag color="red">Đã huỷ</Tag>;
    default:
      return <Tag>{s}</Tag>;
  }
}

function renderWorkflow(status: PurchaseOrderStatus) {
  const steps = [
    { key: "create", label: "Tạo đơn" },
    { key: "approve", label: "Duyệt" },
    { key: "receipt", label: "Nhận hàng" },
    { key: "invoice", label: "Hóa đơn NCC" },
    { key: "payment", label: "Thanh toán" },
  ];

  const doneMap: Record<PurchaseOrderStatus, number> = {
    DRAFT: 1,
    APPROVED: 2,
    IN_PROGRESS: 3,
    COMPLETED: 5,
    CANCELLED: 0,
  };

  const done = doneMap[status] ?? 0;

  return (
    <Space size={8}>
      {steps.map((step, index) => {
        const active = index < done;
        return (
          <Tooltip key={step.key} title={step.label}>
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: 999,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: active ? "#f6ffed" : "#f5f5f5",
                border: `1px solid ${active ? "#b7eb8f" : "#d9d9d9"}`,
                color: active ? "#389e0d" : "#bfbfbf",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {index === 0
                ? "✓"
                : index === 1
                ? "✓"
                : index === 2
                ? "📦"
                : index === 3
                ? "📄"
                : "₫"}
            </span>
          </Tooltip>
        );
      })}
    </Space>
  );
}

function renderActions(
  status: PurchaseOrderStatus,
  row: PurchaseOrderListItem,
) {
  if (status === "DRAFT") {
    return (
      <Space size={4}>
        <Button size="small" type="text">
          Sửa
        </Button>
        <Button size="small" type="text">
          Gửi duyệt
        </Button>
        <Button size="small" danger type="text">
          Xóa
        </Button>
      </Space>
    );
  }

  if (status === "APPROVED") {
    return (
      <Button size="small" type="primary">
        Nhận hàng
      </Button>
    );
  }

  if (status === "IN_PROGRESS") {
    return <Button size="small">Xem</Button>;
  }

  if (status === "COMPLETED") {
    return <Button size="small">Xem</Button>;
  }

  return <Button size="small">Xem</Button>;
}

export type PurchaseOrderTableProps = {
  data?: Paged<PurchaseOrderListItem>;
  loading?: boolean;
  onRowClick?: (id: string) => void;
  page: number;
  limit: number;
  onPageChange: (page: number, limit: number) => void;
};

export default function PurchaseOrderTable(props: PurchaseOrderTableProps) {
  const { data, loading, onRowClick, page, limit, onPageChange } = props;

  const columns: ColumnsType<PurchaseOrderListItem> = useMemo(
    () => [
      {
        title: "Mã đơn",
        dataIndex: "orderNo",
        width: 180,
        fixed: "left",
        render: (v, row) => (
          <div>
            <Typography.Link
              strong
              onClick={(e) => {
                e.stopPropagation();
                onRowClick?.(row.id);
              }}
            >
              {v}
            </Typography.Link>
            <div style={{ color: "#8c8c8c", marginTop: 4 }}>
              {row.totalAmount}
            </div>
          </div>
        ),
      },
      {
        title: "Nhà cung cấp",
        dataIndex: "supplier",
        width: 220,
        render: (s: any, row) => (
          <div>
            <div style={{ fontWeight: 600 }}>
              {s?.code ?? row.supplierCustomerId}
            </div>
            {row.expectedDate ? (
              <div style={{ color: "#8c8c8c", marginTop: 4 }}>
                Nhận: {row.expectedDate.slice(0, 10)}
              </div>
            ) : null}
          </div>
        ),
      },
      {
        title: "Sản phẩm",
        width: 180,
        render: (_, row) => (
          <Typography.Text type="secondary">
            Xem trong chi tiết đơn
          </Typography.Text>
        ),
      },
      {
        title: "Ngày đặt",
        dataIndex: "orderDate",
        width: 120,
        render: (v) => v?.slice(0, 10),
      },
      {
        title: "Số lượng",
        dataIndex: "totalQty",
        width: 120,
        align: "right",
        render: (v) =>
          v == null ? (
            "-"
          ) : (
            <Typography.Text strong>{qty(toNumber(v))}</Typography.Text>
          ),
      },
      {
        title: "Giá trị",
        dataIndex: "totalAmount",
        width: 140,
        align: "right",
        render: (v) =>
          v == null ? (
            "-"
          ) : (
            <Typography.Text strong>{money(toNumber(v))} đ</Typography.Text>
          ),
      },
      {
        title: "Trạng thái",
        dataIndex: "status",
        width: 140,
        render: (v) => statusTag(v),
      },
      {
        title: "Tiến độ",
        dataIndex: "status",
        width: 180,
        render: (v) => renderWorkflow(v),
      },
      {
        title: "Thao tác",
        dataIndex: "status",
        width: 180,
        align: "right",
        render: (v, row) => (
          <div onClick={(e) => e.stopPropagation()}>
            {renderActions(v, row)}
          </div>
        ),
      },
    ],
    [onRowClick],
  );

  return (
    <Table<PurchaseOrderListItem>
      rowKey="id"
      loading={loading}
      columns={columns}
      dataSource={data?.items ?? []}
      pagination={{
        current: page,
        pageSize: limit,
        total: data?.total ?? 0,
        showSizeChanger: true,
        onChange: onPageChange,
      }}
      onRow={(row) => ({
        onClick: () => onRowClick?.(row.id),
        style: { cursor: "pointer" },
      })}
      scroll={{ x: 1460 }}
    />
  );
}
