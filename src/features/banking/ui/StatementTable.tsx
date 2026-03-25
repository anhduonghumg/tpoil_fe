import React from "react";
import { Button, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import type { BankTransactionItem } from "../types";

type Props = {
  data: BankTransactionItem[];
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  onChangePage: (page: number, pageSize: number) => void;
  onOpenMatch: (row: BankTransactionItem) => void;
};

function money(n?: number) {
  return new Intl.NumberFormat("vi-VN").format(Number(n || 0));
}

function statusTag(row: BankTransactionItem) {
  if (row.isConfirmed) return <Tag color="green">Đã xác nhận</Tag>;

  switch (row.matchStatus) {
    case "AUTO_MATCHED":
      return <Tag color="blue">Gợi ý khớp</Tag>;
    case "MANUAL_MATCHED":
      return <Tag color="geekblue">Đã khớp</Tag>;
    case "PARTIAL_MATCHED":
      return <Tag color="orange">Một phần</Tag>;
    default:
      return <Tag>Chưa khớp</Tag>;
  }
}

export function StatementTable({
  data,
  loading,
  page,
  pageSize,
  total,
  onChangePage,
  onOpenMatch,
}: Props) {
  const columns: ColumnsType<BankTransactionItem> = [
    {
      title: "Ngày GD",
      dataIndex: "txnDate",
      width: 120,
      render: (v) => (v ? dayjs(v).format("DD/MM/YYYY") : ""),
    },
    {
      title: "Loại",
      dataIndex: "direction",
      width: 90,
      render: (v) => (v === "OUT" ? "Chi" : "Thu"),
    },
    {
      title: "Số tiền",
      dataIndex: "amount",
      width: 140,
      align: "right",
      render: (v) => money(v),
    },
    {
      title: "Nội dung",
      dataIndex: "description",
      ellipsis: true,
    },
    {
      title: "Đối tác",
      dataIndex: "counterpartyName",
      width: 200,
      ellipsis: true,
      render: (_, r) => r.counterpartyName || r.counterpartyAcc || "",
    },
    {
      title: "Đã phân bổ",
      dataIndex: "allocatedAmount",
      width: 130,
      align: "right",
      render: (v) => money(v),
    },
    {
      title: "Còn lại",
      dataIndex: "remainingAmount",
      width: 130,
      align: "right",
      render: (v) => money(v),
    },
    {
      title: "Trạng thái",
      width: 130,
      render: (_, r) => statusTag(r),
    },
    {
      title: "Thao tác",
      width: 100,
      fixed: "right",
      render: (_, r) => (
        <Button type="link" onClick={() => onOpenMatch(r)}>
          Xử lý
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
      dataSource={data}
      scroll={{ x: 1200 }}
      pagination={{
        current: page,
        pageSize,
        total,
        showSizeChanger: true,
        onChange: onChangePage,
      }}
    />
  );
}
