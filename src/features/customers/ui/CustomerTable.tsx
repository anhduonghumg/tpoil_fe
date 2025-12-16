import React, { memo } from "react";
import { Table, Tag, Button, Space, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { Customer } from "../types";

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

const typeTag = (type: Customer["type"]) => {
  switch (type) {
    case "B2B":
      return <Tag color="blue">B2B</Tag>;
    case "B2C":
      return <Tag color="purple">B2C</Tag>;
    case "Distributor":
      return <Tag color="geekblue">Nhà phân phối</Tag>;
    case "Other":
      return <Tag color="default">Khác</Tag>;
    default:
      return <Tag>{type}</Tag>;
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
}) => {
  const columns: ColumnsType<Customer> = [
    {
      title: "Mã KH",
      dataIndex: "code",
      key: "code",
      width: 120,
      ellipsis: true,
      render: (value: string) => (
        <span style={{ fontWeight: 500 }}>{value}</span>
      ),
      fixed: "left",
    },
    {
      title: "Tên khách hàng",
      dataIndex: "name",
      key: "name",
      ellipsis: true,
      width: 220,
    },
    {
      title: "Loại",
      dataIndex: "type",
      key: "type",
      width: 110,
      render: (_, record) => typeTag(record.type),
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
      title: "SĐT",
      dataIndex: "contactPhone",
      key: "contactPhone",
      width: 140,
      ellipsis: true,
      responsive: ["md"],
    },
    {
      title: "Email",
      dataIndex: "contactEmail",
      key: "contactEmail",
      width: 200,
      ellipsis: true,
      responsive: ["lg"],
    },
    {
      title: "MST",
      dataIndex: "taxCode",
      key: "taxCode",
      width: 140,
      ellipsis: true,
      responsive: ["lg"],
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
        // showTotal: (t) => `${t} khách hàng`,
        onChange: (p, ps) => onPageChange?.(p, ps),
      }}
      onRow={(record) => ({
        onClick: () => {
          onSelect?.(record.id);
        },
      })}
      rowClassName={(record) =>
        record.id === selectedCustomerId ? "ant-table-row-selected" : ""
      }
      scroll={{ x: 900 }}
    />
  );
};

export const CustomerTable = memo(CustomerTableBase);
