import React from "react";
import { Button, Space, Switch, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { BankAccount } from "../types";

type Props = {
  data: BankAccount[];
  loading?: boolean;
  onEdit: (row: BankAccount) => void;
  onToggleActive: (row: BankAccount) => void;
};

export default function BankAccountTable({
  data,
  loading,
  onEdit,
  onToggleActive,
}: Props) {
  const columns: ColumnsType<BankAccount> = [
    {
      title: "Mã NH",
      dataIndex: "bankCode",
      key: "bankCode",
      width: 120,
    },
    {
      title: "Ngân hàng",
      dataIndex: "bankName",
      key: "bankName",
      render: (v) => v || "-",
    },
    {
      title: "Số tài khoản",
      dataIndex: "accountNo",
      key: "accountNo",
      width: 180,
    },
    {
      title: "Tên tài khoản",
      dataIndex: "accountName",
      key: "accountName",
      render: (v) => v || "-",
    },
    {
      title: "Tiền tệ",
      dataIndex: "currency",
      key: "currency",
      width: 100,
    },
    {
      title: "Trạng thái",
      key: "isActive",
      width: 120,
      render: (_, row) =>
        row.isActive ? (
          <Tag color="green">Đang dùng</Tag>
        ) : (
          <Tag>Ngưng dùng</Tag>
        ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 180,
      fixed: "right",
      render: (_, row) => (
        <Space>
          <Button size="small" onClick={() => onEdit(row)}>
            Sửa
          </Button>
          <Switch checked={row.isActive} onChange={() => onToggleActive(row)} />
        </Space>
      ),
    },
  ];

  return (
    <Table
      rowKey="id"
      loading={loading}
      columns={columns}
      dataSource={data}
      scroll={{ x: 980 }}
      pagination={{ pageSize: 20, showSizeChanger: false }}
    />
  );
}
