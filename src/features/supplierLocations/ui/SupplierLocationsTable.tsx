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

const WAREHOUSE_TYPE_LABELS: Record<string, string> = {
  OWNED: "Kho nội bộ",
  THIRD_PARTY: "Kho thuê / đối tác",
  TRANSIT: "Kho trung chuyển",
};

export const SupplierLocationsTable: React.FC<{
  loading: boolean;
  items: SupplierLocation[];
  onEdit: (row: SupplierLocation) => void;
  onDeactivate: (row: SupplierLocation) => void;
  onActivate: (row: SupplierLocation) => void;
  onManageRentalContract: (row: SupplierLocation, contract?: WarehouseRentalContract) => void;
  onEditRentalContract: (row: SupplierLocation, contract: WarehouseRentalContract) => void;
  onViewRentalContracts: (row: SupplierLocation) => void;
}> = ({ loading, items, onEdit, onDeactivate, onActivate, onManageRentalContract, onEditRentalContract, onViewRentalContracts }) => {
  const columns: ColumnsType<SupplierLocation> = [
    { title: "Mã kho", dataIndex: "code", width: 130 },
    {
      title: "Khu vực",
      dataIndex: "area",
      width: 180,
      render: (_, row) => row.area
        ? <span>{row.area.name} <span style={{ color: "#8c8c8c" }}>({row.area.code})</span></span>
        : <Tag color="warning">Chưa gán</Tag>,
    },
    { title: "Tên kho", dataIndex: "name", width: 230 },
    {
      title: "Tên trên hóa đơn",
      dataIndex: "nameInvoice",
      render: (value) => value || <span style={{ color: "#999" }}>-</span>,
    },
    {
      title: "NCC vận hành",
      dataIndex: "parties",
      render: (_, row) => {
        const parties = row.parties ?? (row.supplier ? [{ party: row.supplier }] : []);
        if (!parties.length) return <span style={{ color: "#999" }}>-</span>;
        return (
          <Space size={[4, 4]} wrap>
            {parties.map(({ party }) => (
              <Tooltip key={party.id} title={party.name}>
                <Tag>{party.code || party.name}</Tag>
              </Tooltip>
            ))}
          </Space>
        );
      },
    },
    {
      title: "Loại kho",
      dataIndex: "warehouseType",
      width: 160,
      render: (value) => value ? WAREHOUSE_TYPE_LABELS[value] ?? value : <span style={{ color: "#999" }}>-</span>,
    },
    {
      title: <span style={{ whiteSpace: "nowrap" }}>Hợp đồng</span>,
      key: "rentalContract",
      width: 116,
      align: "center",
      render: (_, row) => {
        const { state, contract } = getWarehouseRentalContractStatus(row);
        if (state === "not-applicable") return <span style={{ color: "#999" }}>-</span>;
        const fileUrl = getContractFileUrl(contract);
        const title = state === "missing"
          ? "Chưa có hợp đồng thuê kho"
          : state === "expired"
            ? `Hợp đồng ${contract?.code} đã hết hạn`
            : state === "expiring"
              ? `Hợp đồng ${contract?.code} sắp hết hạn`
              : `Hợp đồng ${contract?.code} còn hiệu lực`;
        const color = state === "active" ? "#52c41a" : state === "expiring" ? "#faad14" : "#ff4d4f";
        const items = [
          { key: "history", icon: <ClockCircleOutlined />, label: "Lịch sử hợp đồng", onClick: () => onViewRentalContracts(row) },
          ...(fileUrl ? [{ key: "pdf", icon: <FilePdfOutlined />, label: "Xem PDF", onClick: () => window.open(fileUrl, "_blank", "noopener,noreferrer") }] : []),
          ...(contract ? [{ key: "edit", icon: <EditOutlined />, label: "Sửa / thay PDF", onClick: () => onEditRentalContract(row, contract) }] : []),
          { key: "manage", icon: <FileAddOutlined />, label: contract ? "Gia hạn hợp đồng" : "Thêm hợp đồng", onClick: () => onManageRentalContract(row, contract) },
        ];
        return (
          <Space size={2}>
            <Tooltip title={title}>
              <ClockCircleOutlined style={{ color, fontSize: 16 }} />
            </Tooltip>
            <Dropdown menu={{ items }} trigger={["click"]} placement="bottomRight">
              <Button size="small" type="text" icon={<MoreOutlined />} aria-label="Thao tác hợp đồng thuê kho" />
            </Dropdown>
          </Space>
        );
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      width: 92,
      align: "center",
      render: (value) => value ? (
        <Tooltip title="Đang hoạt động"><CheckCircleFilled style={{ color: "#52c41a", fontSize: 17 }} /></Tooltip>
      ) : (
        <Tooltip title="Ngừng hoạt động"><PauseCircleOutlined style={{ color: "#8c8c8c", fontSize: 17 }} /></Tooltip>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 52,
      align: "center",
      render: (_, row) => {
        const items = [
          { key: "edit", icon: <EditOutlined />, label: "Sửa kho", onClick: () => onEdit(row) },
          row.isActive
            ? { key: "deactivate", icon: <StopOutlined />, label: "Ngừng hoạt động", danger: true, onClick: () => onDeactivate(row) }
            : { key: "activate", icon: <CheckCircleOutlined />, label: "Khôi phục hoạt động", onClick: () => onActivate(row) },
        ];
        return (
          <Dropdown menu={{ items }} trigger={["click"]} placement="bottomRight">
            <Button size="small" type="text" icon={<MoreOutlined />} aria-label="Thao tác kho" />
          </Dropdown>
        );
      },
    },
  ];

  return <Table size="small" scroll={{ x: 1200 }} rowKey="id" loading={loading} columns={columns} dataSource={items} pagination={false} />;
};
