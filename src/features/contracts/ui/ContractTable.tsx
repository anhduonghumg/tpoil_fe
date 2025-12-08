// features/contracts/ui/ContractTable.tsx
import React, { useMemo } from "react";
import { Space, Table, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { FileOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { Contract, ContractListItem } from "../types";
import ActionButtons from "../../../shared/ui/ActionButtons";

interface ContractTableProps {
  loading: boolean;
  items: ContractListItem[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number, pageSize?: number) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onRowClick?: (id: string) => void;
  onOpenFiles?: (id: string) => void;
}

const STATUS_LABELS: Record<string, string> = {
  Draft: "Nháp",
  Pending: "Chờ duyệt",
  Active: "Đang hiệu lực",
  Terminated: "Kết thúc",
  Cancelled: "Hủy",
};

const STATUS_COLORS: Record<string, string> = {
  Draft: "default",
  Pending: "gold",
  Active: "green",
  Terminated: "volcano",
  Cancelled: "red",
};

export const ContractTable: React.FC<ContractTableProps> = ({
  loading,
  items,
  page,
  pageSize,
  total,
  onPageChange,
  onEdit,
  onDelete,
  onRowClick,
  onOpenFiles,
}) => {
  const renewalChildCounts = useMemo(() => {
    const m = new Map<string, number>();
    items.forEach((c) => {
      if (c.renewalOfId) {
        const current = m.get(c.renewalOfId) ?? 0;
        m.set(c.renewalOfId, current + 1);
      }
    });
    return m;
  }, [items]);

  // console.log(items);

  const columns: ColumnsType<ContractListItem> = [
    {
      title: "Mã HĐ",
      dataIndex: "code",
      key: "code",
      width: 140,
      ellipsis: true,
      render: (value, record) => (
        <Tooltip title={value}>
          <span
            style={{ cursor: onRowClick ? "pointer" : "default" }}
            onClick={() => onRowClick?.(record.id)}
          >
            {value}
          </span>
        </Tooltip>
      ),
    },
    {
      title: "Tên hợp đồng",
      dataIndex: "name",
      key: "name",
      width: 220,
      ellipsis: true,
      render: (value: string) => (
        <Tooltip title={value}>
          <span>{value}</span>
        </Tooltip>
      ),
    },
    {
      // 🔹 Hiển thị mã KH, hover thấy tên
      title: "Khách hàng",
      key: "customer",
      width: 150,
      ellipsis: true,
      render: (_, record) => {
        const code =
          record.customerCode ||
          (record.customerId ? `#${record.customerId}` : "—");
        const name = record.customerName || code;
        return (
          <Tooltip title={name}>
            <span>{code}</span>
          </Tooltip>
        );
      },
    },
    {
      title: "Loại HĐ",
      key: "contractType",
      width: 180,
      ellipsis: true,
      render: (_, record) => {
        const label =
          record.contractTypeName ||
          record.contractTypeCode ||
          record.contractTypeId;
        return (
          <Tooltip title={label}>
            <span>{label}</span>
          </Tooltip>
        );
      },
    },
    {
      title: "Hiệu lực",
      key: "duration",
      width: 180,
      render: (_, record) => {
        const from = dayjs(record.startDate).format("DD/MM/YYYY");
        const to = dayjs(record.endDate).format("DD/MM/YYYY");
        return (
          <span>
            {from} – {to}
          </span>
        );
      },
    },
    {
      title: "Còn lại (ngày)",
      key: "remainingDays",
      width: 120,
      render: (_, record) => {
        const today = dayjs().startOf("day");
        const start = dayjs(record.startDate).startOf("day");
        const end = dayjs(record.endDate).startOf("day");

        if (today.isBefore(start)) {
          const diff = start.diff(today, "day");
          return <Tag>Chưa hiệu lực ({diff})</Tag>;
        }

        const diff = end.diff(today, "day");
        if (diff < 0) return <Tag>Hết hạn</Tag>;
        if (diff === 0) return <Tag color="red">Hết hạn hôm nay</Tag>;
        return <span>{diff}</span>;
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 230,
      render: (status: Contract["status"], record: ContractListItem) => {
        const isRenewChild = !!record.renewalOfId;
        const hasRenewChildren = (renewalChildCounts.get(record.id) ?? 0) > 0;

        return (
          <Space size={4} wrap>
            {/* Trạng thái gốc theo hệ thống */}
            <Tag color={STATUS_COLORS[status] ?? "default"}>
              {STATUS_LABELS[status] ?? status}
            </Tag>

            {/* HĐ mới = gia hạn từ HĐ khác */}
            {isRenewChild && (
              <Tag color="blue">
                Gia hạn từ: {record.renewalOfCode || "HĐ cũ"}
              </Tag>
            )}

            {/* HĐ gốc đã bị thay thế */}
            {hasRenewChildren && !isRenewChild && (
              <Tag color="purple">Đã được gia hạn</Tag>
            )}
          </Space>
        );
      },
    },
    {
      // 🔹 Kinh doanh
      title: "Kinh doanh",
      key: "salesOwner",
      width: 150,
      ellipsis: true,
      render: (_, record) => {
        const name = record.salesOwnerName || "—";
        return (
          <Tooltip title={name}>
            <span>{name}</span>
          </Tooltip>
        );
      },
    },
    {
      // 🔹 Kế toán
      title: "Kế toán",
      key: "accountingOwner",
      width: 150,
      ellipsis: true,
      render: (_, record) => {
        const name = record.accountingOwnerName || "—";
        return (
          <Tooltip title={name}>
            <span>{name}</span>
          </Tooltip>
        );
      },
    },
    {
      // 🔹 File – click để xem
      title: "File",
      key: "attachments",
      width: 80,
      align: "center",
      render: (_, record) => {
        const count = record.attachments?.length ?? 0;
        if (!count) return <span>–</span>;
        // const label = `${count} tệp đính kèm`;
        return (
          <a
            onClick={() => onOpenFiles?.(record.id)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {count} <FileOutlined />
          </a>
        );
      },
    },
    {
      title: "Thao tác",
      key: "actions",
      fixed: "right",
      align: "center",
      width: 100,
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

  // console.log("items", items);

  return (
    <Table<ContractListItem>
      rowKey="id"
      size="small"
      loading={loading}
      columns={columns}
      dataSource={items}
      pagination={{
        current: page,
        pageSize,
        total,
        showSizeChanger: true,
        showTotal: (t, range) => `${range[0]}-${range[1]} / ${t} hợp đồng`,
        onChange: onPageChange,
      }}
      onRow={(record) => ({
        onClick: () => onRowClick?.(record.id),
      })}
      scroll={{ x: 1300 }}
    />
  );
};

export default ContractTable;
