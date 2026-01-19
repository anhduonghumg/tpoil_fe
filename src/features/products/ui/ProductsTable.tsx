import React from "react";
import { Button, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { Product } from "../types";

const renderUom = (uom: Product["uom"]) => {
  if (uom === "LITER") return <Tag>LÍT</Tag>;
  if (uom === "KG") return <Tag>KG</Tag>;
  return <Tag>UNIT</Tag>;
};

export const ProductsTable: React.FC<{
  rows: Product[];
  loading?: boolean;
  total?: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
  onEdit: (row: Product) => void;
}> = ({ rows, loading, total, page, pageSize, onPageChange, onEdit }) => {
  const columns: ColumnsType<Product> = [
    { title: "Mã", dataIndex: "code", width: 180, render: (v) => v || "—" },
    { title: "Tên sản phẩm", dataIndex: "name" },
    { title: "ĐVT", dataIndex: "uom", width: 120, render: renderUom },
    {
      title: "",
      width: 120,
      align: "right",
      render: (_, row) => (
        <Space>
          <Button onClick={() => onEdit(row)}>Sửa</Button>
        </Space>
      ),
    },
  ];

  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={rows}
      loading={loading}
      pagination={{
        current: page,
        pageSize,
        total: total || 0,
        showSizeChanger: true,
        onChange: (p, ps) => onPageChange(p, ps),
      }}
    />
  );
};
