import React, { useMemo } from "react";
import { Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { PurchaseOrderListItem, PurchaseOrderStatus } from "../types";
import { Paged } from "../../../shared/lib/types";

function money(n: number): string {
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
      { title: "Số đơn", dataIndex: "orderNo", width: 180, fixed: "left" },
      {
        title: "Nhà cung cấp",
        dataIndex: "supplier",
        render: (s: any, row) => s?.name ?? row.supplierCustomerId,
      },
      { title: "Loại", dataIndex: "orderType", width: 110 },
      { title: "Thanh toán", dataIndex: "paymentMode", width: 120 },
      {
        title: "Trạng thái",
        dataIndex: "status",
        width: 120,
        render: (v) => statusTag(v),
      },
      { title: "Ngày", dataIndex: "orderDate", width: 120 },
      {
        title: "Tổng tiền",
        dataIndex: "totalAmount",
        width: 140,
        align: "right",
        render: (v) => (
          <Typography.Text strong>
            {v == null ? "-" : `${money(toNumber(v))} đ`}
          </Typography.Text>
        ),
      },
    ],
    []
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
      scroll={{ x: 980 }}
    />
  );
}
