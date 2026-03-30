import { Button, Popconfirm, Space, Switch, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { BankTransactionPurposeItem } from "../types";
import { useDeleteBankPurpose, useUpdateBankPurpose } from "../hooks";

interface Props {
  loading?: boolean;
  data: BankTransactionPurposeItem[];
  total: number;
  page: number;
  pageSize: number;
  onChangePage: (page: number, pageSize: number) => void;
  onEdit: (row: BankTransactionPurposeItem) => void;
}

function directionTag(v?: string | null) {
  if (!v) return "-";
  if (v === "IN") return <Tag color="green">Thu</Tag>;
  if (v === "OUT") return <Tag color="orange">Chi</Tag>;
  return <Tag>{v}</Tag>;
}

function counterpartyTag(v?: string | null) {
  if (!v) return "-";
  switch (v) {
    case "SUPPLIER":
      return <Tag color="blue">NCC</Tag>;
    case "CUSTOMER":
      return <Tag color="purple">Khách hàng</Tag>;
    case "INTERNAL":
      return <Tag color="cyan">Nội bộ</Tag>;
    default:
      return <Tag>Khác</Tag>;
  }
}

export function BankPurposesTable({
  loading,
  data,
  total,
  page,
  pageSize,
  onChangePage,
  onEdit,
}: Props) {
  const deleteMut = useDeleteBankPurpose();
  const updateMut = useUpdateBankPurpose();

  const columns: ColumnsType<BankTransactionPurposeItem> = [
    {
      title: "Mã",
      dataIndex: "code",
      width: "10%",
      fixed: "left",
    },
    {
      title: "Tên mục đích",
      dataIndex: "name",
      width: 240,
    },
    {
      title: "Chiều GD",
      dataIndex: "direction",
      width: 100,
      render: (v) => directionTag(v),
    },
    // {
    //   title: "Phân hệ",
    //   dataIndex: "module",
    //   width: 120,
    //   render: (v) => v || "-",
    // },
    // {
    //   title: "Đối tác",
    //   dataIndex: "counterpartyType",
    //   width: 120,
    //   render: (v) => counterpartyTag(v),
    // },
    // {
    //   title: "Công nợ",
    //   dataIndex: "affectsDebt",
    //   width: 100,
    //   render: (v) => (v ? <Tag color="blue">Có</Tag> : "-"),
    // },
    // {
    //   title: "Hệ thống",
    //   dataIndex: "isSystem",
    //   width: 100,
    //   render: (v) => (v ? <Tag color="gold">System</Tag> : "-"),
    // },
    // {
    //   title: "Thứ tự",
    //   dataIndex: "sortOrder",
    //   width: 90,
    // },
    {
      title: "Hoạt động",
      dataIndex: "isActive",
      width: 110,
      render: (checked, row) => (
        <Switch
          size="small"
          checked={checked}
          loading={updateMut.isPending}
          onChange={(v) =>
            updateMut.mutate({
              id: row.id,
              payload: { isActive: v },
            })
          }
        />
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      fixed: "right",
      width: 150,
      render: (_, row) => (
        <Space size={6}>
          <Button size="small" onClick={() => onEdit(row)}>
            Sửa
          </Button>

          <Popconfirm
            title="Xóa mục đích giao dịch?"
            okText="Xóa"
            cancelText="Hủy"
            disabled={row.isSystem}
            onConfirm={() => deleteMut.mutate(row.id)}
          >
            <Button size="small" danger disabled={row.isSystem}>
              Xóa
            </Button>
          </Popconfirm>
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
    //   scroll={{ y: 1400 }}
      pagination={{
        current: page,
        pageSize,
        total,
        showSizeChanger: true,
        onChange: onChangePage,
      }}
    />
  );
}
