// features/supplier-locations/ui/SupplierLocationsTable.tsx
import React from "react";
import { Table, Tag, Button, Space } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { SupplierLocation } from "../types";
import { EditOutlined, StopOutlined } from "@ant-design/icons";

export const SupplierLocationsTable: React.FC<{
  loading: boolean;
  items: SupplierLocation[];
  onEdit: (row: SupplierLocation) => void;
  onDeactivate: (row: SupplierLocation) => void;
  onActivate: (row: SupplierLocation) => void;
}> = ({ loading, items, onEdit, onDeactivate, onActivate }) => {
  const columns: ColumnsType<SupplierLocation> = [
    { title: "Mã", dataIndex: "code", width: 120 },
    { title: "Tên kho", dataIndex: "name" },
    {
      title: "Tên kho theo MISA",
      dataIndex: "nameInvoice",
      render: (v) => v || <span style={{ color: "#999" }}>—</span>,
    },
    {
      title: "Nhà cung cấp",
      dataIndex: "supplier",
      render: (_, row) =>
        row.supplier ? (
          `${row.supplier.name} (${row.supplier.code})`
        ) : (
          <span style={{ color: "#999" }}>—</span>
        ),
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      width: 140,
      render: (v) =>
        v ? <Tag color="green">Đang hoạt động</Tag> : <Tag>Ngừng</Tag>,
    },
    {
      title: "",
      key: "actions",
      width: 50,
      render: (_, row) => (
        <Space>
          <Button
            size="small"
            onClick={() => onEdit(row)}
            icon={<EditOutlined />}
          ></Button>
          {row.isActive ? (
            <Button
              size="small"
              danger
              onClick={() => onDeactivate(row)}
              icon={<StopOutlined />}
            ></Button>
          ) : (
            <Button size="small" onClick={() => onActivate(row)}>
              Kích hoạt
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Table
      rowKey="id"
      loading={loading}
      columns={columns}
      dataSource={items}
      pagination={false}
    />
  );
};
