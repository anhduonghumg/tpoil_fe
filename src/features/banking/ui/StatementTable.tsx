import React from "react";
import { Button, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import type { BankTransactionItem } from "../types";
import { TableRowSelection } from "antd/es/table/interface";

type Props = {
  data: BankTransactionItem[];
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  onChangePage: (page: number, pageSize: number) => void;
  onOpenMatch: (row: BankTransactionItem) => void;
  selectedRowKeys?: React.Key[];
  onChangeSelectedRowKeys?: (keys: React.Key[]) => void;
};

function money(n?: number) {
  return new Intl.NumberFormat("vi-VN").format(Number(n || 0));
}

function matchStatusTag(status?: string) {
  switch (status) {
    case "MANUAL_MATCHED":
    case "AUTO_MATCHED":
      return <Tag color="green">Đã khớp</Tag>;
    case "PARTIAL_MATCHED":
      return <Tag color="blue">Khớp một phần</Tag>;
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
  selectedRowKeys = [],
  onChangeSelectedRowKeys,
}: Props) {
  const columns: ColumnsType<BankTransactionItem> = [
    {
      title: "Ngày",
      dataIndex: "txnDate",
      width: 110,
      render: (v) => (v ? dayjs(v).format("DD/MM/YYYY") : "-"),
    },
    {
      title: "Loại",
      dataIndex: "direction",
      width: 80,
      render: (v) => (v === "OUT" ? "Chi" : "Thu"),
    },
    {
      title: "Số tiền",
      dataIndex: "amount",
      width: 140,
      align: "right",
      render: (v) => <Typography.Text strong>{money(v)}</Typography.Text>,
    },
    {
      title: "Nội dung",
      dataIndex: "description",
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 500 }}>{row.description || "-"}</div>
          <div style={{ color: "#8c8c8c" }}>
            {row.counterpartyName || "-"}
            {row.counterpartyAcc ? ` • ${row.counterpartyAcc}` : ""}
          </div>
        </div>
      ),
    },
    {
      title: "Đã phân bổ",
      dataIndex: "allocatedAmount",
      width: 140,
      align: "right",
      render: (v) => money(v),
    },
    {
      title: "Còn lại",
      dataIndex: "remainingAmount",
      width: 140,
      align: "right",
      render: (v) => money(v),
    },
    {
      title: "Trạng thái",
      dataIndex: "matchStatus",
      width: 130,
      render: (v) => matchStatusTag(v),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 120,
      fixed: "right",
      render: (_, row) => (
        <Space>
          <Button size="small" onClick={() => onOpenMatch(row)}>
            Xử lý
          </Button>
        </Space>
      ),
    },
  ];

  const rowSelection: TableRowSelection<BankTransactionItem> = {
    selectedRowKeys,
    onChange: (keys) => onChangeSelectedRowKeys?.(keys),
    getCheckboxProps: (record) => ({
      disabled:
        record.direction !== "OUT" ||
        Number(record.remainingAmount || 0) <= 0 ||
        record.isConfirmed === true,
    }),
  };

  return (
    <Table
      rowKey="id"
      rowSelection={rowSelection}
      loading={loading}
      columns={columns}
      dataSource={data}
      scroll={{ x: 1200, y: 350 }}
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
