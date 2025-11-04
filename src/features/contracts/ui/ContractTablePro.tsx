import React from "react";
import { Button, Dropdown, Popconfirm, Table, Tag, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { MoreOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useQueryClient } from "@tanstack/react-query";
import { useContractList, useDeleteContract } from "../hooks";
import type { Contract, ContractListQuery } from "../types";

function money(n?: number | null) {
  if (!n && n !== 0) return "";
  try {
    return n.toLocaleString("vi-VN");
  } catch {
    return String(n);
  }
}

const STATUS_COLOR: Record<string, any> = {
  Draft: "default",
  Active: "success",
  Suspended: "warning",
  Expired: "error",
  Terminated: "processing",
};

export function ContractTablePro({
  query,
  onEdit,
  onSelectRows,
}: {
  query: ContractListQuery;
  onEdit: (id: string) => void;
  onSelectRows?: (ids: string[]) => void;
}) {
  const { data, isLoading } = useContractList(query);
  const del = useDeleteContract();
  const [selectedRowKeys, setSelectedRowKeys] = React.useState<React.Key[]>([]);
  const qc = useQueryClient();

  React.useEffect(() => {
    onSelectRows?.(selectedRowKeys as string[]);
  }, [selectedRowKeys]);

  const handleDeleteRow = async (id: string) => {
    try {
      await del.mutateAsync(id);
      await qc.invalidateQueries({ queryKey: ["contracts", "list"] });
      setSelectedRowKeys([]);
      message.success("Đã xoá hợp đồng");
    } catch {}
  };

  const columns: ColumnsType<Contract> = [
    {
      title: "Hạn mức HĐ",
      dataIndex: "creditLimitOverride",
      width: 140,
      align: "right",
      render: (v) => money(v),
    },
    {
      title: "Thanh toán",
      dataIndex: "paymentTermDays",
      width: 120,
      align: "center",
      render: (v) => (v ? `${v} ngày` : ""),
    },
    {
      title: "Rủi ro",
      dataIndex: "riskLevel",
      width: 120,
      render: (v) => <Tag>{v}</Tag>,
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      width: 140,
      responsive: ["lg"],
      render: (v) => (v ? dayjs(v).format("DD/MM/YYYY") : ""),
    },
    {
      title: "",
      width: 64,
      fixed: "right",
      render: (_, r) => {
        const items = [
          {
            key: "edit",
            icon: <EditOutlined />,
            label: "Sửa",
            onClick: () => onEdit(r.id),
          },
          {
            key: "delete",
            icon: <DeleteOutlined />,
            danger: true,
            label: (
              <Popconfirm
                title="Xoá hợp đồng này?"
                onConfirm={() => handleDeleteRow(r.id)}
              >
                <span>Xoá</span>
              </Popconfirm>
            ),
          },
        ];
        return (
          <Dropdown menu={{ items }} trigger={["click"]}>
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        );
      },
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
          (window as any).setContractQuery?.({ ...query, page, pageSize }),
        showSizeChanger: true,
      }}
      rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
    />
  );
}
