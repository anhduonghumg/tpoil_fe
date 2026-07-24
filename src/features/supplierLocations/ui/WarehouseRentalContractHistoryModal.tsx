import React, { useMemo } from "react";
import { Button, Modal, Space, Table, Tag, Tooltip } from "antd";
import { EditOutlined, FileAddOutlined, FilePdfOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";
import type { SupplierLocation, WarehouseRentalContract } from "../types";
import { getContractFileUrl } from "../warehouseRentalContract";

type Props = {
  open: boolean;
  warehouse?: SupplierLocation | null;
  onClose: () => void;
  onEdit: (contract: WarehouseRentalContract) => void;
  onRenew: (contract: WarehouseRentalContract) => void;
};

function contractState(contract: WarehouseRentalContract) {
  const today = dayjs().startOf("day");
  const start = dayjs(contract.startDate).startOf("day");
  const end = dayjs(contract.endDate).startOf("day");
  if (contract.status === "Active" && !today.isBefore(start) && !today.isAfter(end)) {
    const remaining = end.diff(today, "day");
    return remaining <= 30 ? { label: `Sắp hết hạn (${remaining} ngày)`, color: "gold" } : { label: "Đang hiệu lực", color: "green" };
  }
  if (today.isAfter(end)) return { label: "Đã hết hạn", color: "volcano" };
  if (today.isBefore(start)) return { label: "Chưa hiệu lực", color: "blue" };
  return { label: "Đã được gia hạn", color: "default" };
}

export const WarehouseRentalContractHistoryModal: React.FC<Props> = ({ open, warehouse, onClose, onEdit, onRenew }) => {
  const rows = useMemo(
    () => [...(warehouse?.rentalContracts ?? [])].sort((a, b) => dayjs(b.endDate).valueOf() - dayjs(a.endDate).valueOf()),
    [warehouse?.rentalContracts]
  );
  const columns: ColumnsType<WarehouseRentalContract> = [
    { title: "Mã HĐ", dataIndex: "code", width: 160 },
    { title: "Hiệu lực", width: 210, render: (_, row) => `${dayjs(row.startDate).format("DD/MM/YYYY")} - ${dayjs(row.endDate).format("DD/MM/YYYY")}` },
    { title: "Tình trạng", width: 170, render: (_, row) => { const state = contractState(row); return <Tag color={state.color}>{state.label}</Tag>; } },
    {
      title: "",
      width: 94,
      align: "center",
      render: (_, row) => {
        const fileUrl = getContractFileUrl(row);
        return (
          <Space size={2}>
            {fileUrl ? <Tooltip title="Xem PDF"><Button size="small" type="text" icon={<FilePdfOutlined />} aria-label="Xem PDF hợp đồng" onClick={() => window.open(fileUrl, "_blank", "noopener,noreferrer")} /></Tooltip> : null}
            <Tooltip title="Sửa hợp đồng / thay PDF"><Button size="small" type="text" icon={<EditOutlined />} aria-label="Sửa hợp đồng" onClick={() => onEdit(row)} /></Tooltip>
            <Tooltip title="Gia hạn từ hợp đồng này"><Button size="small" type="text" icon={<FileAddOutlined />} aria-label="Gia hạn hợp đồng" onClick={() => onRenew(row)} /></Tooltip>
          </Space>
        );
      },
    },
  ];

  return (
    <Modal open={open} title={warehouse ? `Hợp đồng thuê - ${warehouse.code} / ${warehouse.name}` : "Hợp đồng thuê kho"} width={760} footer={null} onCancel={onClose} destroyOnHidden>
      <Table size="small" rowKey="id" columns={columns} dataSource={rows} pagination={false} locale={{ emptyText: "Kho này chưa có hợp đồng thuê." }} />
    </Modal>
  );
};
