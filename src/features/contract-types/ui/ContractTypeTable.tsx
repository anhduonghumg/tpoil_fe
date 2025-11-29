import React from "react";
import { Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useContractTypeList } from "../hooks";
import type { ContractType, ContractTypeListQuery } from "../types";
import ActionButtons from "../../../shared/ui/ActionButtons";

export function ContractTypeTable({
  query,
  onEdit,
  onDelete,
  onSelectRows,
}: {
  query: ContractTypeListQuery;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onSelectRows?: (ids: string[]) => void;
}) {
  const { data, isLoading } = useContractTypeList(query);
  const [selectedRowKeys, setSelectedRowKeys] = React.useState<React.Key[]>([]);

  React.useEffect(() => {
    onSelectRows?.(selectedRowKeys as string[]);
  }, [selectedRowKeys]);

  const columns: ColumnsType<ContractType> = [
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
      title: "Tên loại HĐ",
      dataIndex: "name",
      width: 240,
      render: (v: string) => (
        <Typography.Text ellipsis={{ tooltip: v }}>{v}</Typography.Text>
      ),
    },
    {
      title: "Mô tả",
      dataIndex: "description",
      width: 260,
      ellipsis: { showTitle: false },
      render: (v?: string) =>
        v ? (
          <Tooltip title={v}>
            <span>{v}</span>
          </Tooltip>
        ) : (
          ""
        ),
    },
    {
      title: "Thứ tự",
      dataIndex: "sortOrder",
      width: 80,
      align: "center",
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      width: 120,
      render: (v: boolean) =>
        v ? (
          <Tag color="green">Đang dùng</Tag>
        ) : (
          <Tag color="default">Ngừng</Tag>
        ),
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      width: 140,
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
      scroll={{ x: 900 }}
      pagination={{
        current: query.page || 1,
        pageSize: query.pageSize || 20,
        total: data?.total || 0,
        onChange: (page, pageSize) =>
          (window as any).setContractTypeQuery?.({ ...query, page, pageSize }),
        showSizeChanger: true,
      }}
      rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
    />
  );
}
