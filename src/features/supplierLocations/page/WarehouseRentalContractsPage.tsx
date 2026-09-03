import React, { useMemo, useState } from "react";
import {
  Button,
  Divider,
  Dropdown,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  FilePdfOutlined,
  MoreOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";
import { useContractList, useDeleteContract } from "../../contracts/hooks";
import { notify } from "../../../shared/lib/notification";
import type { ContractListItem, ContractStatus } from "../../contracts/types";
import { useContractTypeOptions } from "../../../shared/hook/seContractTypeOptions";
import { useSupplierLocationList } from "../hooks";
import { WarehouseRentalContractModal } from "../ui/WarehouseRentalContractModal";
import { FilterButton, FilterTags, RefreshButton } from "../../../shared/ui/TableFilter";
import type { ActiveFilterTag } from "../../../shared/ui/TableFilter";
import { toAbsUrl } from "../../../shared/lib/url";
import type { WarehouseRentalContract } from "../types";
import "../../../shared/ui/data-grid.css";
import "../warehouse-catalog.css";

const STATUS_OPTIONS: { value: ContractStatus; label: string }[] = [
  { value: "Draft", label: "Nháp" },
  { value: "Pending", label: "Chờ duyệt" },
  { value: "Active", label: "Hiệu lực" },
  { value: "Terminated", label: "Kết thúc" },
  { value: "Cancelled", label: "Hủy" },
];

const EMPTY = <span className="data-grid-empty">—</span>;

/** Số kho hiện thẳng trong ô; phần dư gói vào "+N" có tooltip liệt kê đủ. */
const VISIBLE_WAREHOUSE_TAGS = 2;

function displayState(contract: ContractListItem) {
  const today = dayjs().startOf("day");
  const start = dayjs(contract.startDate).startOf("day");
  const end = dayjs(contract.endDate).startOf("day");
  if (contract.status === "Active" && !today.isBefore(start) && !today.isAfter(end)) {
    const remaining = end.diff(today, "day");
    return remaining <= 30
      ? { label: `Sắp hết hạn (${remaining} ngày)`, color: "gold" }
      : { label: "Đang hiệu lực", color: "green" };
  }
  if (today.isAfter(end)) return { label: "Đã hết hạn", color: "volcano" };
  if (today.isBefore(start)) return { label: "Chưa hiệu lực", color: "blue" };
  return { label: "Đã được gia hạn", color: "default" };
}

export const WarehouseRentalContractsPage: React.FC = () => {
  const { data: contractTypes } = useContractTypeOptions(true);
  const warehouseRentalType = (contractTypes as any)?.data?.find(
    (item: any) => item.code === "WAREHOUSE_RENTAL",
  );

  const [keywordDraft, setKeywordDraft] = useState("");
  const [keyword, setKeyword] = useState<string | undefined>();
  const [statusDraft, setStatusDraft] = useState<ContractStatus | undefined>();
  const [status, setStatus] = useState<ContractStatus | undefined>();
  const [filterOpen, setFilterOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<ContractListItem | null>(null);

  const deleteMutation = useDeleteContract();
  const contractsQuery = useContractList(
    { contractTypeId: warehouseRentalType?.id, keyword, status, page: 1, pageSize: 100 },
    !!warehouseRentalType?.id,
  );
  const warehousesQuery = useSupplierLocationList({ page: 1, pageSize: 100 });
  const warehouses = useMemo(
    () =>
      (warehousesQuery.data?.items ?? []).filter(
        (warehouse) => warehouse.warehouseType === "THIRD_PARTY",
      ),
    [warehousesQuery.data?.items],
  );
  const activeWarehouses = useMemo(
    () => warehouses.filter((warehouse) => warehouse.isActive),
    [warehouses],
  );
  const editingWarehouse = useMemo(
    () =>
      warehouses.find((warehouse) => warehouse.id === editingContract?.warehouses?.[0]?.id) ??
      null,
    [editingContract?.warehouses, warehouses],
  );

  const confirmDelete = (row: ContractListItem) => {
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
  };

  const columns: ColumnsType<ContractListItem> = [
    {
      // Tên hợp đồng trước đây tìm được nhưng không hiện ra; đưa xuống dòng phụ của mã
      // để nhận ra hợp đồng mà không tốn thêm một cột.
      title: "Mã HĐ",
      dataIndex: "code",
      width: 172,
      fixed: "left",
      render: (_, row) => (
        <div className="data-grid-stack">
          <Tooltip title={row.code}>
            <span className="data-grid-clip data-grid-strong">{row.code}</span>
          </Tooltip>
          <Tooltip title={row.name}>
            <span className="data-grid-clip data-grid-sub">{row.name || "Chưa đặt tên"}</span>
          </Tooltip>
        </div>
      ),
    },
    {
      title: "Kho thuê",
      key: "warehouses",
      width: 196,
      render: (_, row) => {
        const list = row.warehouses ?? [];
        if (!list.length) return EMPTY;
        const shown = list.slice(0, VISIBLE_WAREHOUSE_TAGS);
        const hidden = list.slice(VISIBLE_WAREHOUSE_TAGS);
        return (
          <span className="data-grid-tags">
            {shown.map((warehouse) => (
              <Tooltip key={warehouse.id} title={warehouse.name}>
                <Tag>{warehouse.code || warehouse.name}</Tag>
              </Tooltip>
            ))}
            {hidden.length ? (
              <Tooltip title={hidden.map((warehouse) => warehouse.name).join(", ")}>
                <Tag className="data-grid-tag-more">+{hidden.length}</Tag>
              </Tooltip>
            ) : null}
          </span>
        );
      },
    },
    {
      title: "Bên cho thuê",
      dataIndex: "customerName",
      width: 186,
      render: (value: string | null, row) =>
        value ? (
          <Tooltip title={row.customerCode ? `${value} (${row.customerCode})` : value}>
            <span className="data-grid-clip">{value}</span>
          </Tooltip>
        ) : (
          EMPTY
        ),
    },
    {
      title: "Hiệu lực",
      key: "period",
      width: 172,
      align: "center",
      render: (_, row) => (
        <span className="data-grid-num">
          {dayjs(row.startDate).format("DD/MM/YYYY")} → {dayjs(row.endDate).format("DD/MM/YYYY")}
        </span>
      ),
    },
    {
      title: "Tình trạng",
      key: "state",
      width: 154,
      render: (_, row) => {
        const item = displayState(row);
        return <Tag color={item.color}>{item.label}</Tag>;
      },
    },
    {
      title: "PDF",
      key: "pdf",
      width: 58,
      align: "center",
      render: (_, row) => {
        const file = row.attachments?.find((item) => item.fileUrl || item.externalUrl);
        const url = toAbsUrl(file?.fileUrl || file?.externalUrl);
        return url ? (
          <Tooltip title="Xem PDF">
            <Button
              size="small"
              type="text"
              icon={<FilePdfOutlined />}
              aria-label={`Xem PDF hợp đồng ${row.code}`}
              onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
            />
          </Tooltip>
        ) : (
          EMPTY
        );
      },
    },
    {
      title: "",
      key: "actions",
      width: 46,
      align: "center",
      fixed: "right",
      render: (_, row) => (
        <Dropdown
          menu={{
            items: [
              {
                key: "edit",
                icon: <EditOutlined />,
                label: "Sửa / thay PDF",
                disabled: !row.warehouses?.[0],
                onClick: () => setEditingContract(row),
              },
              {
                key: "delete",
                icon: <DeleteOutlined />,
                label: "Xóa hợp đồng",
                danger: true,
                onClick: () => confirmDelete(row),
              },
            ],
          }}
          trigger={["click"]}
          placement="bottomRight"
        >
          <Button
            size="small"
            type="text"
            icon={<MoreOutlined />}
            aria-label={`Thao tác hợp đồng ${row.code}`}
          />
        </Dropdown>
      ),
    },
  ];

  const filterTags: ActiveFilterTag[] = [
    ...(status
      ? [
          {
            key: "status",
            label: `Trạng thái: ${STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status}`,
            onClear: () => {
              setStatus(undefined);
              setStatusDraft(undefined);
            },
          },
        ]
      : []),
    ...(keyword
      ? [
          {
            key: "keyword",
            label: `Từ khóa: ${keyword}`,
            onClear: () => {
              setKeyword(undefined);
              setKeywordDraft("");
            },
          },
        ]
      : []),
  ];

  const filterPanel = (
    <div className="table-filter-panel" style={{ width: 260 }}>
      <div className="table-filter-label">Trạng thái hợp đồng</div>
      <Select
        allowClear
        size="small"
        style={{ width: "100%" }}
        value={statusDraft}
        options={STATUS_OPTIONS}
        placeholder="Tất cả trạng thái"
        onChange={setStatusDraft}
      />
      <Divider style={{ margin: "12px 0" }} />
      <Space style={{ width: "100%", justifyContent: "flex-end" }}>
        <Button
          size="small"
          type="text"
          onClick={() => {
            setStatusDraft(undefined);
            setStatus(undefined);
            setFilterOpen(false);
          }}
        >
          Xóa lọc
        </Button>
        <Button
          size="small"
          type="primary"
          onClick={() => {
            setStatus(statusDraft);
            setFilterOpen(false);
          }}
        >
          Áp dụng
        </Button>
      </Space>
    </div>
  );

  return (
    <div className="warehouse-page">
      <div className="warehouse-toolbar">
        <Typography.Title level={4} style={{ margin: 0 }}>
          Hợp đồng thuê kho
        </Typography.Title>

        <Space size={6}>
          <Input.Search
            size="small"
            allowClear
            value={keywordDraft}
            placeholder="Tìm mã hoặc tên hợp đồng"
            onChange={(event) => setKeywordDraft(event.target.value)}
            onSearch={(value) => setKeyword(value.trim() || undefined)}
            loading={contractsQuery.isFetching}
            style={{ width: 280 }}
          />
          <FilterButton
            count={Number(Boolean(status))}
            open={filterOpen}
            onOpenChange={setFilterOpen}
            content={filterPanel}
          />
          <RefreshButton
            loading={contractsQuery.isFetching}
            onClick={() => contractsQuery.refetch()}
          />
          <Button
            size="small"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateOpen(true)}
          >
            Thêm hợp đồng
          </Button>
        </Space>
      </div>

      <FilterTags items={filterTags} />

      <Table<ContractListItem>
        className="data-grid"
        size="small"
        bordered
        tableLayout="fixed"
        scroll={{ x: 984 }}
        rowKey="id"
        loading={
          contractsQuery.isFetching || deleteMutation.isPending || !warehouseRentalType
        }
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
    </div>
  );
};
