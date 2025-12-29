import React, { memo } from "react";
import { Table, Tag, Button, Space, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { Customer } from "../types";

const { Link, Text } = Typography;

export interface CustomerTableProps {
  data: Customer[];
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  selectedCustomerId?: string | null;
  onPageChange?: (page: number, pageSize: number) => void;
  onSelect?: (customerId: string) => void;
  onEdit?: (customerId: string) => void;
  onDelete?: (customerId: string, customer: Customer) => void;
  onOpenAddressHistory?: (customerId: string, customerName: string) => void;
}

const statusTag = (status: Customer["status"]) => {
  switch (status) {
    case "Active":
      return <Tag color="green">Đang hoạt động</Tag>;
    case "Inactive":
      return <Tag color="default">Ngừng</Tag>;
    case "Blacklisted":
      return <Tag color="red">Blacklist</Tag>;
    default:
      return <Tag>{status}</Tag>;
  }
};

const CustomerTableBase: React.FC<CustomerTableProps> = ({
  data,
  loading,
  page,
  pageSize,
  total,
  selectedCustomerId,
  onPageChange,
  onSelect,
  onEdit,
  onDelete,
  onOpenAddressHistory,
}) => {
  const columns: ColumnsType<Customer> = [
    {
      title: "Khách hàng",
      key: "customerInfo",
      width: 220,
      ellipsis: true,
      render: (_, r) => (
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 600,
              lineHeight: 1.25,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={r.code}
          >
            {r.code}
          </div>

          <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.25 }}>
            {r.taxCode ? (
              <span title={r.taxCode}>MST: {r.taxCode}</span>
            ) : (
              <span>—</span>
            )}
          </div>

          <div
            style={{
              fontSize: 13,
              color: "#6b7280",
              lineHeight: 1.25,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={r.contactEmail ?? ""}
          >
            {r.contactEmail ? `Email: ${r.contactEmail}` : "—"}
          </div>
        </div>
      ),
    },
    {
      title: "Tên khách hàng",
      dataIndex: "name",
      key: "name",
      ellipsis: true,
      width: 280,
    },
    {
      title: "Địa chỉ",
      key: "address",
      ellipsis: true,
      width: 320,
      render: (_, r) => {
        const text = (r.billingAddress || "").trim();
        const label = text ? text : "Quản lý lịch sử địa chỉ";
        return (
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenAddressHistory?.(r.id, r.name);
            }}
            title={text || "Mở lịch sử địa chỉ"}
            style={{ display: "inline-block", maxWidth: "100%" }}
          >
            {label}
          </a>
        );
      },
      responsive: ["md"],
    },
    {
      title: "Phụ trách",
      key: "owners",
      width: 220,
      render: (_, r) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ fontSize: 14, lineHeight: 1.25 }}>
            KD: {r?.salesOwnerName || "—"}
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.25 }}>
            KT: {r?.accountingOwnerName || "—"}
          </div>
        </div>
      ),
      responsive: ["sm"],
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (_, record) => statusTag(record.status),
      responsive: ["sm"],
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 110,
      fixed: "right",
      render: (_, record) => (
        <Space size={4}>
          {onEdit && (
            <Tooltip title="Sửa">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(record.id);
                }}
              />
            </Tooltip>
          )}
          {onDelete && (
            <Tooltip title="Xóa">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(record.id, record);
                }}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  // console.log("Render CustomerTable", data);
  return (
    <Table<Customer>
      rowKey="id"
      size="middle"
      loading={loading}
      columns={columns}
      dataSource={data}
      pagination={{
        current: page,
        pageSize,
        total,
        showSizeChanger: true,
        onChange: (p, ps) => onPageChange?.(p, ps),
      }}
      onRow={(record) => ({
        onClick: () => onSelect?.(record.id),
      })}
      rowClassName={(record) =>
        record.id === selectedCustomerId ? "ant-table-row-selected" : ""
      }
      scroll={{ x: 900 }}
    />
  );
};

export const CustomerTable = memo(CustomerTableBase);
