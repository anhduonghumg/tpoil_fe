import React, { useMemo, useState } from "react";
import { Badge, Button, Input, Modal, Popover, Select, Space, Table, Tag, Tooltip, Typography } from "antd";
import { DeleteOutlined, EditOutlined, FilePdfOutlined, FilterOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";
import { useContractList, useDeleteContract } from "../../contracts/hooks";
import { notify } from "../../../shared/lib/notification";
import type { ContractListItem, ContractStatus } from "../../contracts/types";
import { useContractTypeOptions } from "../../../shared/hook/seContractTypeOptions";
import { useSupplierLocationList } from "../hooks";
import { WarehouseRentalContractModal } from "../ui/WarehouseRentalContractModal";
import { toAbsUrl } from "../../../shared/lib/url";
import type { WarehouseRentalContract } from "../types";

const STATUS_OPTIONS: { value: ContractStatus; label: string }[] = [
  { value: "Draft", label: "Nháp" },
  { value: "Pending", label: "Chờ duyệt" },
  { value: "Active", label: "Hiệu lực" },
  { value: "Terminated", label: "Kết thúc" },
  { value: "Cancelled", label: "Hủy" },
];

function displayState(contract: ContractListItem) {
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

export const WarehouseRentalContractsPage: React.FC = () => {
  const { data: contractTypes } = useContractTypeOptions(true);
  const warehouseRentalType = (contractTypes as any)?.data?.find((item: any) => item.code === "WAREHOUSE_RENTAL");
  const [keywordDraft, setKeywordDraft] = useState("");
  const [keyword, setKeyword] = useState<string | undefined>();
  const [statusDraft, setStatusDraft] = useState<ContractStatus | undefined>();
  const [status, setStatus] = useState<ContractStatus | undefined>();
  const [filterOpen, setFilterOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<ContractListItem | null>(null);
  const deleteMutation = useDeleteContract();
  const contractsQuery = useContractList({ contractTypeId: warehouseRentalType?.id, keyword, status, page: 1, pageSize: 100 }, !!warehouseRentalType?.id);
  const warehousesQuery = useSupplierLocationList({ page: 1, pageSize: 100 });
  const warehouses = useMemo(() => (warehousesQuery.data?.items ?? []).filter((warehouse) => warehouse.warehouseType === "THIRD_PARTY"), [warehousesQuery.data?.items]);
  const activeWarehouses = useMemo(() => warehouses.filter((warehouse) => warehouse.isActive), [warehouses]);
  const editingWarehouse = useMemo(
    () => warehouses.find((warehouse) => warehouse.id === editingContract?.warehouses?.[0]?.id) ?? null,
    [editingContract?.warehouses, warehouses]
  );

  const columns: ColumnsType<ContractListItem> = [
    { title: "Mã HĐ", dataIndex: "code", width: 150 },
    {
      title: "Kho thuê",
      key: "warehouses",
      width: 260,
      render: (_, row) => row.warehouses?.length ? row.warehouses.map((warehouse) => warehouse.code || warehouse.name).join(", ") : "-",
    },
    { title: "Bên cho thuê", dataIndex: "customerName", width: 220, render: (value) => value || "-" },
    { title: "Hiệu lực", width: 210, render: (_, row) => `${dayjs(row.startDate).format("DD/MM/YYYY")} - ${dayjs(row.endDate).format("DD/MM/YYYY")}` },
    { title: "Tình trạng", width: 170, render: (_, row) => { const item = displayState(row); return <Tag color={item.color}>{item.label}</Tag>; } },
    {
      title: "PDF",
      width: 72,
      align: "center",
      render: (_, row) => {
        const file = row.attachments?.find((item) => item.fileUrl || item.externalUrl);
        const url = toAbsUrl(file?.fileUrl || file?.externalUrl);
        return url ? <Tooltip title="Xem PDF"><Button size="small" type="text" icon={<FilePdfOutlined />} aria-label="Xem PDF hợp đồng" onClick={() => window.open(url, "_blank", "noopener,noreferrer")} /></Tooltip> : "-";
      },
    },
    {
      title: "",
      width: 80,
      align: "center",
      render: (_, row) => (
        <Space size={2}>
          <Tooltip title="Sửa hợp đồng / thay PDF">
            <Button
              size="small"
              type="text"
              icon={<EditOutlined />}
              aria-label="Sửa hợp đồng"
              disabled={!row.warehouses?.[0]}
              onClick={() => setEditingContract(row)}
            />
          </Tooltip>
          <Tooltip title="Xóa hợp đồng">
            <Button
              size="small"
              type="text"
              danger
              icon={<DeleteOutlined />}
              aria-label="Xóa hợp đồng"
              onClick={() => {
                Modal.confirm({
                  title: "Xóa hợp đồng thuê kho?",
                  content: `Hợp đồng ${row.code} và các file đã tải lên sẽ bị xóa.`,
                  okText: "Xóa",
                  cancelText: "Hủy",
                  okButtonProps: { danger: true },
                  onOk: async () => {
                    await deleteMutation.mutateAsync(row.id);
                    notify.success("Đã xóa hợp đồng thuê kho.");
                    await contractsQuery.refetch();
                  },
                });
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const applyFilters = () => {
    setKeyword(keywordDraft.trim() || undefined);
    setStatus(statusDraft);
    setFilterOpen(false);
  };
  const clearFilters = () => {
    setKeywordDraft("");
    setKeyword(undefined);
    setStatusDraft(undefined);
    setStatus(undefined);
    setFilterOpen(false);
  };
  const filterContent = (
    <div style={{ width: 260 }}>
      <div style={{ color: "#596579", fontSize: 12, marginBottom: 6 }}>Trạng thái hợp đồng</div>
      <Select allowClear size="small" style={{ width: "100%" }} value={statusDraft} options={STATUS_OPTIONS} placeholder="Tất cả trạng thái" onChange={setStatusDraft} />
      <Space style={{ width: "100%", justifyContent: "flex-end", marginTop: 14 }}>
        <Button size="small" type="text" onClick={clearFilters}>Xóa lọc</Button>
        <Button size="small" type="primary" onClick={applyFilters}>Áp dụng</Button>
      </Space>
    </div>
  );

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Typography.Title level={4} style={{ marginTop: 0 }}>Hợp đồng thuê kho</Typography.Title>
        <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>Thêm hợp đồng</Button>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
        <Input.Search size="small" allowClear value={keywordDraft} onChange={(event) => setKeywordDraft(event.target.value)} onSearch={applyFilters} placeholder="Tìm mã hợp đồng hoặc tên hợp đồng" style={{ width: 425, maxWidth: "100%" }} />
        <Space size={6}>
          <Popover open={filterOpen} onOpenChange={setFilterOpen} content={filterContent} trigger="click" placement="bottomRight">
            <Badge count={Number(Boolean(status))} size="small" offset={[-3, 3]}><Button size="small" icon={<FilterOutlined />}>Bộ lọc</Button></Badge>
          </Popover>
          <Button size="small" icon={<ReloadOutlined spin={contractsQuery.isFetching} />} aria-label="Làm mới" onClick={() => contractsQuery.refetch()} />
        </Space>
      </div>
      <Table
        size="small"
        rowKey="id"
        scroll={{ x: 980 }}
        loading={contractsQuery.isFetching || deleteMutation.isPending || !warehouseRentalType}
        columns={columns}
        dataSource={(contractsQuery.data?.items ?? []) as ContractListItem[]}
        pagination={false}
      />
      <WarehouseRentalContractModal
        open={createOpen}
        availableWarehouses={activeWarehouses}
        onClose={() => setCreateOpen(false)}
        onSaved={() => contractsQuery.refetch()}
      />
      <WarehouseRentalContractModal
        open={!!editingContract && !!editingWarehouse}
        warehouse={editingWarehouse}
        contract={editingContract as WarehouseRentalContract | null}
        mode="edit"
        onClose={() => setEditingContract(null)}
        onSaved={() => contractsQuery.refetch()}
      />
    </>
  );
};
