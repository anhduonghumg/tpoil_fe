import React, { useMemo } from "react";
import { Button, Space, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { PurchaseOrderListItem, PurchaseOrderStatus } from "../types";
import { Paged } from "../../../shared/lib/types";
import dayjs from "dayjs";

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

function getWorkflowState(row: PurchaseOrderListItem) {
  const s = row.summary;

  const hasReceipt = s?.hasReceipt ?? (row.receipts?.length ?? 0) > 0;
  const hasInvoice =
    s?.hasInvoice ??
    row.supplierInvoices?.some((x) => x.status !== "VOID") ??
    false;

  const paymentStatus = s?.paymentStatus ?? "UNPAID";

  return {
    hasReceipt,
    hasInvoice,
    createDone: true,
    approveDone:
      row.status === "APPROVED" ||
      row.status === "IN_PROGRESS" ||
      row.status === "COMPLETED",
    receiptDone: hasReceipt,
    invoiceDone: hasInvoice,
    paymentDone: paymentStatus === "PAID",
  };
}

function renderWorkflow(row: PurchaseOrderListItem) {
  const wf = getWorkflowState(row);

  const steps = [
    { key: "create", label: "Tạo đơn", done: wf.createDone, icon: "✓" },
    { key: "approve", label: "Duyệt", done: wf.approveDone, icon: "✓" },
    { key: "receipt", label: "Nhận hàng", done: wf.receiptDone, icon: "📦" },
    { key: "invoice", label: "Hóa đơn NCC", done: wf.invoiceDone, icon: "📄" },
    { key: "payment", label: "Thanh toán", done: wf.paymentDone, icon: "₫" },
  ];

  return (
    <Space size={8}>
      {steps.map((step) => (
        <Tooltip key={step.key} title={step.label}>
          <span
            style={{
              width: 26,
              height: 26,
              borderRadius: 999,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: step.done ? "#f6ffed" : "#f5f5f5",
              border: `1px solid ${step.done ? "#b7eb8f" : "#d9d9d9"}`,
              color: step.done ? "#389e0d" : "#bfbfbf",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {step.icon}
          </span>
        </Tooltip>
      ))}
    </Space>
  );
}

function renderProgressTag(row: PurchaseOrderListItem) {
  const s = row.summary;

  const hasReceipt = s?.hasReceipt ?? (row.receipts?.length ?? 0) > 0;
  const hasInvoice =
    s?.hasInvoice ??
    row.supplierInvoices?.some((x) => x.status !== "VOID") ??
    false;

  const paymentStatus = s?.paymentStatus ?? "UNPAID";

  if (row.status === "CANCELLED") {
    return <Tag color="red">Đã huỷ</Tag>;
  }

  if (paymentStatus === "PAID") {
    return <Tag color="success">Đã thanh toán</Tag>;
  }

  if (paymentStatus === "PARTIALLY_PAID") {
    return <Tag color="processing">Thanh toán một phần</Tag>;
  }

  if (hasInvoice) {
    return <Tag color="lime">Đã có hóa đơn</Tag>;
  }

  if (hasReceipt) {
    return <Tag color="gold">Đã nhận hàng</Tag>;
  }

  if (row.status === "DRAFT") {
    return <Tag>Chờ duyệt</Tag>;
  }

  if (row.status === "APPROVED") {
    return <Tag color="blue">Chờ nhận hàng</Tag>;
  }

  return statusTag(row.status);
}

function renderActions(
  status: PurchaseOrderStatus,
  row: PurchaseOrderListItem,
) {
  const s = row.summary;

  const hasInvoice =
    s?.hasInvoice ??
    row.supplierInvoices?.some((x) => x.status !== "VOID") ??
    false;

  const paymentStatus = s?.paymentStatus ?? "UNPAID";
  const isPaid = paymentStatus === "PAID";

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

  if (isPaid) {
    return <Button size="small">Xem hóa đơn</Button>;
  }

  if (hasInvoice) {
    return <Button size="small">Xem hóa đơn</Button>;
  }

  if (status === "IN_PROGRESS") {
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
  selectedRowKeys?: React.Key[];
  onSelectionChange?: (keys: React.Key[]) => void;
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
        width: 180,
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
        width: 200,
        render: (_, row) => {
          const lines = row.lines ?? [];

          if (!lines.length) {
            return <Typography.Text type="secondary">-</Typography.Text>;
          }

          const visible = lines.slice(0, 2);

          return (
            <div>
              {visible.map((l) => (
                <div key={l.id} style={{ lineHeight: 1.5 }}>
                  <Typography.Text>
                    {l.product?.code ?? "SP"} - {qty(toNumber(l.orderedQty))}
                  </Typography.Text>
                </div>
              ))}

              {lines.length > 2 ? (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  +{lines.length - 2} sản phẩm khác
                </Typography.Text>
              ) : null}
            </div>
          );
        },
      },
      {
        title: "Ngày đặt",
        dataIndex: "orderDate",
        width: 120,
        render: (v) => dayjs(v).format("DD/MM/YYYY"),
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
        render: (v, row) => renderProgressTag(row),
      },
      {
        title: "Tiến độ",
        width: 180,
        render: (_, row) => renderWorkflow(row),
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
      rowSelection={{
        selectedRowKeys: props.selectedRowKeys,
        onChange: props.onSelectionChange,
        
      }}
      pagination={{
        current: page,
        pageSize: limit,
        total: data?.total ?? 0,
        showSizeChanger: true,
        onChange: onPageChange,
        size: "small",
        style: { margin: "2px 0" },
      }}
      onRow={(row) => ({
        onClick: () => onRowClick?.(row.id),
        style: { cursor: "pointer" },
      })}
      scroll={{ x: 1460, y: 380 }}
    />
  );
}
