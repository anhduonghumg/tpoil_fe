import React from "react";
import { Button, Popconfirm, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import type { BankTransactionItem } from "../types";
import { TableRowSelection } from "antd/es/table/interface";
import { DeleteOutlined } from "@ant-design/icons";

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

  onDeleteOne: (row: BankTransactionItem) => void;
  onDeleteMany: (ids: React.Key[]) => void;
  deleting?: boolean;
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

function canDeleteRow(row: BankTransactionItem) {
  return row.matchStatus === "UNMATCHED" && row.isConfirmed !== true;
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
  onDeleteOne,
  onDeleteMany,
  deleting,
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
      width: "10%",
      // fixed: "right",
      render: (_, row) => {
        const canDelete = canDeleteRow(row);

        return (
          <Space>
            <Button size="small" onClick={() => onOpenMatch(row)}>
              Xử lý
            </Button>

            <Popconfirm
              title="Xóa giao dịch này?"
              description="Chỉ có thể xóa giao dịch chưa khớp và chưa xác nhận."
              okText="Xóa"
              cancelText="Hủy"
              disabled={!canDelete}
              onConfirm={() => onDeleteOne(row)}
            >
              <Button
                icon={<DeleteOutlined />}
                size="small"
                danger
                disabled={!canDelete}
              ></Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const rowSelection: TableRowSelection<BankTransactionItem> = {
    selectedRowKeys,
    onChange: (keys) => onChangeSelectedRowKeys?.(keys),
    getCheckboxProps: (record) => ({
      disabled: !canDeleteRow(record),
    }),
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 12,
        }}
      >
        <Popconfirm
          title={`Xóa ${selectedRowKeys.length} giao dịch đã chọn?`}
          description="Chỉ các giao dịch chưa khớp và chưa xác nhận mới được xóa."
          okText="Xóa"
          cancelText="Hủy"
          disabled={!selectedRowKeys.length}
          onConfirm={() => onDeleteMany(selectedRowKeys)}
        >
          <Button
            icon={<DeleteOutlined />}
            size="small"
            danger
            disabled={!selectedRowKeys.length}
            loading={deleting}
          >
            Xóa đã chọn
          </Button>
        </Popconfirm>
      </div>

      <Table
        rowKey="id"
        rowSelection={rowSelection}
        loading={loading}
        columns={columns}
        dataSource={data}
        scroll={{ y: 350 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          onChange: onChangePage,
        }}
      />
    </div>
  );
}
