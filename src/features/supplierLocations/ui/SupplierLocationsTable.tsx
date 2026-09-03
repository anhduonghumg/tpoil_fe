import React from "react";
import { Button, Dropdown, Space, Table, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { SupplierLocation, WarehouseRentalContract } from "../types";
import { getContractFileUrl, getWarehouseRentalContractStatus } from "../warehouseRentalContract";
import {
  CheckCircleFilled,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EditOutlined,
  FileAddOutlined,
  FilePdfOutlined,
  MoreOutlined,
  PauseCircleOutlined,
  StopOutlined,
} from "@ant-design/icons";
import "../../../shared/ui/data-grid.css";

const WAREHOUSE_TYPE_LABELS: Record<string, string> = {
  OWNED: "Kho nội bộ",
  THIRD_PARTY: "Kho thuê / đối tác",
  TRANSIT: "Kho trung chuyển",
};

const EMPTY = <span className="data-grid-empty">—</span>;

/** Số thẻ đối tác hiện thẳng trong ô; phần dư gói vào "+N" có tooltip liệt kê đủ. */
const VISIBLE_PARTY_TAGS = 2;

export const SupplierLocationsTable: React.FC<{
  loading: boolean;
  items: SupplierLocation[];
  onEdit: (row: SupplierLocation) => void;
  onDeactivate: (row: SupplierLocation) => void;
  onActivate: (row: SupplierLocation) => void;
  onManageRentalContract: (row: SupplierLocation, contract?: WarehouseRentalContract) => void;
  onEditRentalContract: (row: SupplierLocation, contract: WarehouseRentalContract) => void;
  onViewRentalContracts: (row: SupplierLocation) => void;
}> = ({
  loading,
  items,
  onEdit,
  onDeactivate,
  onActivate,
  onManageRentalContract,
  onEditRentalContract,
  onViewRentalContracts,
}) => {
  const columns: ColumnsType<SupplierLocation> = [
    {
      title: "Mã kho",
      dataIndex: "code",
      width: 116,
      fixed: "left",
      render: (value: string) => (
        <Tooltip title={value}>
          <span className="data-grid-clip data-grid-strong">{value}</span>
        </Tooltip>
      ),
    },
    {
      // Tên trên hóa đơn gộp làm dòng phụ của tên kho: nó chỉ khác tên kho vài chữ,
      // tách riêng một cột thì cột nào cũng hẹp và cả hai cùng xuống dòng.
      title: "Tên kho",
      dataIndex: "name",
      width: 250,
      render: (_, row) => (
        <div className="data-grid-stack">
          <Tooltip title={row.name}>
            <span className="data-grid-clip">{row.name}</span>
          </Tooltip>
          <Tooltip title={row.nameInvoice ? `Tên trên hóa đơn: ${row.nameInvoice}` : undefined}>
            <span className="data-grid-clip data-grid-sub">
              {row.nameInvoice || "Chưa đặt tên hóa đơn"}
            </span>
          </Tooltip>
        </div>
      ),
    },
    {
      title: "Khu vực",
      dataIndex: "area",
      width: 150,
      render: (_, row) =>
        row.area ? (
          <Tooltip title={`${row.area.name} (${row.area.code})`}>
            <span className="data-grid-clip">
              {row.area.name} <span className="data-grid-sub-inline">({row.area.code})</span>
            </span>
          </Tooltip>
        ) : (
          <Tag color="warning">Chưa gán</Tag>
        ),
    },
    {
      title: "Đối tác vận hành",
      dataIndex: "parties",
      width: 210,
      render: (_, row) => {
        const parties = row.parties ?? (row.supplier ? [{ party: row.supplier }] : []);
        if (!parties.length) return EMPTY;

        const shown = parties.slice(0, VISIBLE_PARTY_TAGS);
        const hidden = parties.slice(VISIBLE_PARTY_TAGS);

        return (
          <span className="data-grid-tags">
            {shown.map(({ party }) => (
              <Tooltip key={party.id} title={party.name}>
                <Tag>{party.code || party.name}</Tag>
              </Tooltip>
            ))}
            {hidden.length ? (
              <Tooltip title={hidden.map(({ party }) => party.name).join(", ")}>
                <Tag className="data-grid-tag-more">+{hidden.length}</Tag>
              </Tooltip>
            ) : null}
          </span>
        );
      },
    },
    {
      title: "Loại kho",
      dataIndex: "warehouseType",
      width: 148,
      render: (value: string | null) =>
        value ? (
          <span className="data-grid-clip">{WAREHOUSE_TYPE_LABELS[value] ?? value}</span>
        ) : (
          EMPTY
        ),
    },
    {
      title: "Hợp đồng",
      key: "rentalContract",
      width: 96,
      align: "center",
      render: (_, row) => {
        const { state, contract } = getWarehouseRentalContractStatus(row);
        if (state === "not-applicable") return EMPTY;
        const fileUrl = getContractFileUrl(contract);
        const title =
          state === "missing"
            ? "Chưa có hợp đồng thuê kho"
            : state === "expired"
              ? `Hợp đồng ${contract?.code} đã hết hạn`
              : state === "expiring"
                ? `Hợp đồng ${contract?.code} sắp hết hạn`
                : `Hợp đồng ${contract?.code} còn hiệu lực`;
        const color =
          state === "active" ? "#52c41a" : state === "expiring" ? "#faad14" : "#ff4d4f";
        const menuItems = [
          {
            key: "history",
            icon: <ClockCircleOutlined />,
            label: "Lịch sử hợp đồng",
            onClick: () => onViewRentalContracts(row),
          },
          ...(fileUrl
            ? [
                {
                  key: "pdf",
                  icon: <FilePdfOutlined />,
                  label: "Xem PDF",
                  onClick: () => window.open(fileUrl, "_blank", "noopener,noreferrer"),
                },
              ]
            : []),
          ...(contract
            ? [
                {
                  key: "edit",
                  icon: <EditOutlined />,
                  label: "Sửa / thay PDF",
                  onClick: () => onEditRentalContract(row, contract),
                },
              ]
            : []),
          {
            key: "manage",
            icon: <FileAddOutlined />,
            label: contract ? "Gia hạn hợp đồng" : "Thêm hợp đồng",
            onClick: () => onManageRentalContract(row, contract),
          },
        ];
        return (
          <Space size={0}>
            <Tooltip title={title}>
              <ClockCircleOutlined style={{ color, fontSize: 15 }} />
            </Tooltip>
            <Dropdown menu={{ items: menuItems }} trigger={["click"]} placement="bottomRight">
              <Button
                size="small"
                type="text"
                icon={<MoreOutlined />}
                aria-label={`Thao tác hợp đồng thuê kho ${row.code}`}
              />
            </Dropdown>
          </Space>
        );
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      width: 88,
      align: "center",
      render: (value: boolean) =>
        value ? (
          <Tooltip title="Đang hoạt động">
            <CheckCircleFilled style={{ color: "#52c41a", fontSize: 16 }} />
          </Tooltip>
        ) : (
          <Tooltip title="Ngừng hoạt động">
            <PauseCircleOutlined style={{ color: "#8c8c8c", fontSize: 16 }} />
          </Tooltip>
        ),
    },
    {
      title: "",
      key: "actions",
      width: 46,
      align: "center",
      fixed: "right",
      render: (_, row) => {
        const menuItems = [
          {
            key: "edit",
            icon: <EditOutlined />,
            label: "Sửa kho",
            onClick: () => onEdit(row),
          },
          row.isActive
            ? {
                key: "deactivate",
                icon: <StopOutlined />,
                label: "Ngừng hoạt động",
                danger: true,
                onClick: () => onDeactivate(row),
              }
            : {
                key: "activate",
                icon: <CheckCircleOutlined />,
                label: "Khôi phục hoạt động",
                onClick: () => onActivate(row),
              },
        ];
        return (
          <Dropdown menu={{ items: menuItems }} trigger={["click"]} placement="bottomRight">
            <Button
              size="small"
              type="text"
              icon={<MoreOutlined />}
              aria-label={`Thao tác kho ${row.code}`}
            />
          </Dropdown>
        );
      },
    },
  ];

  return (
    <Table<SupplierLocation>
      className="data-grid"
      size="small"
      bordered
      tableLayout="fixed"
      scroll={{ x: 1104 }}
      rowKey="id"
      loading={loading}
      columns={columns}
      dataSource={items}
      pagination={false}
    />
  );
};
