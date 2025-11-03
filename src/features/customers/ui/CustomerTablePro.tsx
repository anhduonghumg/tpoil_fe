import React from "react";
import {
  Badge,
  Button,
  Dropdown,
  Popconfirm,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { MoreOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useCustList, useDeleteCustomer } from "../hooks";
import type { Customer, CustListQuery } from "../types";
import ActionButtons from "../../../shared/ui/ActionButtons";

function money(n?: number | null) {
  if (!n && n !== 0) return "";
  try {
    return n.toLocaleString("vi-VN");
  } catch {
    return String(n);
  }
}
const STATUS_COLOR: Record<string, any> = {
  Active: "success",
  Inactive: "default",
  Blacklisted: "error",
};

export function CustomerTablePro({
  query,
  onEdit,
  onDelete,
  onSelectRows,
}: {
  query: CustListQuery;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onSelectRows?: (ids: string[]) => void;
}) {
  const { data, isLoading } = useCustList(query);
  const [selectedRowKeys, setSelectedRowKeys] = React.useState<React.Key[]>([]);

  React.useEffect(() => {
    onSelectRows?.(selectedRowKeys as string[]);
  }, [selectedRowKeys]);

  const columns: ColumnsType<Customer> = [
    {
      title: "Mã",
      dataIndex: "code",
      width: 140,
      fixed: "left",
      render: (v: string) => (
        <Typography.Text copyable ellipsis={{ tooltip: v }}>
          {v}
        </Typography.Text>
      ),
    },
    {
      title: "Tên khách hàng",
      dataIndex: "name",
      width: 240,
      render: (v: string) => (
        <Typography.Text ellipsis={{ tooltip: v }}>{v}</Typography.Text>
      ),
    },
    {
      title: "Loại hình",
      dataIndex: "type",
      width: 120,
      responsive: ["md"],
      render: (v) => <Tag>{v}</Tag>,
    },
    {
      title: "Vai trò",
      dataIndex: "roles",
      width: 180,
      responsive: ["lg"],
      render: (arr: string[]) => (arr || []).map((r) => <Tag key={r}>{r}</Tag>),
    },
    {
      title: "MST",
      dataIndex: "taxCode",
      width: 140,
      responsive: ["md"],
      ellipsis: true,
    },
    {
      title: "Hạn mức",
      dataIndex: "creditLimit",
      width: 140,
      align: "right",
      responsive: ["lg"],
      render: (v) => money(v),
    },
    {
      title: "Điều khoản",
      dataIndex: "paymentTermDays",
      width: 120,
      align: "center",
      responsive: ["lg"],
      render: (v) => (v ? `${v} ngày` : ""),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 120,
      render: (v) => <Badge status={STATUS_COLOR[v] || "default"} text={v} />,
    },
    {
      title: "Tạo lúc",
      dataIndex: "createdAt",
      width: 140,
      responsive: ["xl"],
      render: (v) => (v ? dayjs(v).format("DD/MM/YYYY") : ""),
    },
    {
      title: "",
      width: 64,
      fixed: "right",
      render: (_, record) => (
        <ActionButtons
          onEdit={() => onEdit(record.id)}
          onDelete={() => onDelete(record.id)}
          confirmDelete
          size="small"
        />
      ),
      //   render: (_, r) => {
      //     const items = [
      //       {
      //         key: "edit",
      //         icon: <EditOutlined />,
      //         label: "Sửa",
      //         onClick: () => onEdit(r.id),
      //       },
      //       {
      //         key: "delete",
      //         icon: <DeleteOutlined />,
      //         danger: true,
      //         label: (
      //           <Popconfirm
      //             title="Xoá khách hàng này?"
      //             onConfirm={() => del.mutate(r.id)}
      //           >
      //             <span>Xoá</span>
      //           </Popconfirm>
      //         ),
      //       },
      //     ];
      //     return (
      //       <Dropdown menu={{ items }} trigger={["click"]}>
      //         <Button type="text" icon={<MoreOutlined />} />
      //       </Dropdown>
      //     );
      //   },
    },
  ];

  return (
    <Table
      size="middle"
      rowKey={(r) => r.id}
      loading={isLoading}
      columns={columns}
      dataSource={data?.items}
      sticky
      scroll={{ x: 1100 }}
      pagination={{
        current: query.page || 1,
        pageSize: query.pageSize || 20,
        total: data?.total || 0,
        onChange: (page, pageSize) =>
          (window as any).setCustQuery?.({ ...query, page, pageSize }),
        showSizeChanger: true,
      }}
      rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
    />
  );
}
