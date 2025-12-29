// features/customer-groups/ui/CustomerGroupTable.tsx
import React from "react";
import { Button, Popconfirm, Space, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { CustomerGroup } from "../types";
import ActionButtons from "../../../shared/ui/ActionButtons";

export const CustomerGroupTable: React.FC<{
  items: CustomerGroup[];
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  onChangePage: (page: number, pageSize: number) => void;
  onEdit: (row: CustomerGroup) => void;
  onDelete: (row: CustomerGroup) => void;
  deletingId?: string | null;
}> = ({
  items,
  loading,
  page,
  pageSize,
  total,
  onChangePage,
  onEdit,
  onDelete,
  deletingId,
}) => {
  const columns: ColumnsType<CustomerGroup> = [
    {
      title: "Mã",
      dataIndex: "code",
      width: 180,
      render: (v) => <Typography.Text strong>{v}</Typography.Text>,
    },
    {
      title: "Tên nhóm",
      dataIndex: "name",
      render: (v) => v || <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: "Ghi chú",
      dataIndex: "note",
      render: (v) => v || <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: "Thao tác",
      key: "actions",
      fixed: "right",
      align: "center",
      width: 100,
      render: (_, record) => (
        <ActionButtons
          onEdit={() => onEdit(record)}
          onDelete={() => onDelete(record)}
          confirmDelete
          size="small"
        />
      ),
    },
  ];

  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={items}
      loading={loading}
      pagination={{
        current: page,
        pageSize,
        total,
        showSizeChanger: true,
        onChange: onChangePage,
      }}
    />
  );
};
