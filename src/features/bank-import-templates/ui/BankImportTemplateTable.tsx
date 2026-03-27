import React from "react";
import { Button, Space, Switch, Table, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { BankImportTemplate } from "../types";

type Props = {
  data: BankImportTemplate[];
  loading?: boolean;
  onEdit: (row: BankImportTemplate) => void;
  onToggleActive: (row: BankImportTemplate) => void;
};

export default function BankImportTemplateTable({
  data,
  loading,
  onEdit,
  onToggleActive,
}: Props) {
  const columns: ColumnsType<BankImportTemplate> = [
    {
      title: "Bank",
      dataIndex: "bankCode",
      key: "bankCode",
      width: 120,
    },
    {
      title: "Tên template",
      dataIndex: "name",
      key: "name",
      width: 220,
    },
    {
      title: "Version",
      dataIndex: "version",
      key: "version",
      width: 100,
    },
    {
      title: "columnMap",
      key: "columnMap",
      render: (_, row) => (
        <Tooltip
          title={
            <pre style={{ margin: 0 }}>
              {JSON.stringify(row.columnMap, null, 2)}
            </pre>
          }
        >
          <span className="line-clamp-1 cursor-pointer text-blue-600">
            {JSON.stringify(row.columnMap)}
          </span>
        </Tooltip>
      ),
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
      scroll={{ x: 1200 }}
      pagination={{ pageSize: 20, showSizeChanger: false }}
    />
  );
}
