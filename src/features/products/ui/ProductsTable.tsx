import React from "react";
import { Button, Dropdown, Table, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { EditOutlined, MoreOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { Product } from "../types";
import "../../../shared/ui/data-grid.css";

const UOM_LABELS: Record<Product["uom"], string> = {
  LITER: "LÍT",
  KG: "KG",
  UNIT: "UNIT",
};

const EMPTY = <span className="data-grid-empty">—</span>;

export const ProductsTable: React.FC<{
  rows: Product[];
  loading?: boolean;
  page: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
  onEdit: (row: Product) => void;
}> = ({ rows, loading, page, pageSize, onPageChange, onEdit }) => {
  const columns: ColumnsType<Product> = [
    {
      title: "Mã",
      dataIndex: "code",
      width: 150,
      fixed: "left",
      render: (value: string | null) =>
        value ? (
          <Tooltip title={value}>
            <span className="data-grid-clip data-grid-strong">{value}</span>
          </Tooltip>
        ) : (
          EMPTY
        ),
    },
    {
      // Tên MISA gộp làm dòng phụ: nó chỉ là biến thể chính tả của tên sản phẩm,
      // tách riêng một cột thì cột nào cũng hẹp mà nội dung gần như trùng nhau.
      title: "Tên sản phẩm",
      dataIndex: "name",
      render: (_, row) => (
        <div className="data-grid-stack">
          <Tooltip title={row.name}>
            <span className="data-grid-clip">{row.name}</span>
          </Tooltip>
          <Tooltip title={row.nameMisa ? `Tên trên MISA: ${row.nameMisa}` : undefined}>
            <span className="data-grid-clip data-grid-sub">
              {row.nameMisa || "Chưa đặt tên MISA"}
            </span>
          </Tooltip>
        </div>
      ),
    },
    {
      title: "ĐVT",
      dataIndex: "uom",
      width: 90,
      align: "center",
      render: (value: Product["uom"]) => <Tag>{UOM_LABELS[value] ?? value}</Tag>,
    },
    {
      title: "Cập nhật",
      dataIndex: "updatedAt",
      width: 132,
      align: "center",
      render: (value: string) =>
        value ? (
          <Tooltip title={dayjs(value).format("DD/MM/YYYY HH:mm")}>
            <span className="data-grid-num">{dayjs(value).format("DD/MM/YYYY")}</span>
          </Tooltip>
        ) : (
          EMPTY
        ),
    },
    {
      title: "",
      key: "actions",
      width: 46,
      align: "center",
      fixed: "right",
      render: (_, row) => (
        <Dropdown
          menu={{
            items: [
              {
                key: "edit",
                icon: <EditOutlined />,
                label: "Sửa sản phẩm",
                onClick: () => onEdit(row),
              },
            ],
          }}
          trigger={["click"]}
          placement="bottomRight"
        >
          <Button
            size="small"
            type="text"
            icon={<MoreOutlined />}
            aria-label={`Thao tác sản phẩm ${row.code ?? row.name}`}
          />
        </Dropdown>
      ),
    },
  ];

  return (
    <Table<Product>
      className="data-grid"
      size="small"
      bordered
      tableLayout="fixed"
      scroll={{ x: 860 }}
      rowKey="id"
      columns={columns}
      dataSource={rows}
      loading={loading}
      // API trả về toàn bộ danh mục trong một lượt (không phân trang phía máy chủ),
      // nên để antd tự chia trang trên mảng đã có — trước đây truyền total = 0 nên
      // thanh phân trang luôn hiện "0 mục" mà danh sách vẫn đổ hết ra một trang.
      pagination={{
        current: page,
        pageSize,
        showSizeChanger: true,
        showTotal: (total) => `${total} sản phẩm`,
        onChange: onPageChange,
      }}
    />
  );
};
