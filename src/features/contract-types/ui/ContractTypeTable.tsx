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
      // Cột này quyết định loại hợp đồng có dùng để đặt đơn mua/bán được không, nên nó
      // đáng nhìn ngang với trạng thái chứ không nên giấu trong form.
      title: "Giao dịch",
      dataIndex: "allowsTrading",
      width: 130,
      align: "center",
      render: (v: boolean) =>
        v ? (
          <Tooltip title="Đối tác có hợp đồng loại này thì đặt được đơn mua / đơn bán">
            <Tag color="blue">Cho phép</Tag>
          </Tooltip>
        ) : (
          <Tooltip title="Hợp đồng dịch vụ — không dùng để đặt đơn mua bán xăng dầu">
            <Tag color="default">Không</Tag>
          </Tooltip>
        ),
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
      className="data-grid"
      bordered
      size="small"
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
