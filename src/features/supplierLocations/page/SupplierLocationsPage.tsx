import React, { useMemo, useState } from "react";
import { Alert, Button, Input, Modal, Space, Tabs, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { SupplierLocationsFilterPanel } from "../ui/SupplierLocationsFilters";
import { SupplierLocationsTable } from "../ui/SupplierLocationsTable";
import { SupplierLocationUpsertModal } from "../ui/SupplierLocationUpsertModal";
import { WarehouseRentalContractModal } from "../ui/WarehouseRentalContractModal";
import { WarehouseRentalContractHistoryModal } from "../ui/WarehouseRentalContractHistoryModal";
import { getWarehouseRentalContractStatus } from "../warehouseRentalContract";
import {
  FilterButton,
  FilterTags,
  RefreshButton,
} from "../../../shared/ui/TableFilter";
import type { ActiveFilterTag } from "../../../shared/ui/TableFilter";
import {
  useActivateSupplierLocation,
  useBatchUpdateSupplierLocation,
  useCreateSupplierLocation,
  useDeactivateSupplierLocation,
  useSupplierLocationList,
} from "../hooks";
import type {
  CreateSupplierLocationPayload,
  SupplierLocation,
  SupplierLocationListQuery,
  UpdateSupplierLocationPayload,
  WarehouseRentalContract,
} from "../types";
import { notify } from "../../../shared/lib/notification";
import "../warehouse-catalog.css";

/** Trạng thái hoạt động lên tab thay vì nằm trong panel lọc — đây là lát cắt hay dùng nhất. */
const STATUS_TABS = [
  { key: "ACTIVE", label: "Đang hoạt động", isActive: true as boolean | undefined },
  { key: "INACTIVE", label: "Ngừng hoạt động", isActive: false as boolean | undefined },
  { key: "ALL", label: "Tất cả", isActive: undefined },
];

export const SupplierLocationsPage: React.FC = () => {
  const [status, setStatus] = useState("ACTIVE");
  const [keyword, setKeyword] = useState<string | undefined>(undefined);
  const [draftKeyword, setDraftKeyword] = useState("");
  const [filters, setFilters] = useState<{ areaId?: string; supplierCustomerId?: string }>({});
  const [filterOpen, setFilterOpen] = useState(false);

  const applied: SupplierLocationListQuery = {
    ...filters,
    keyword,
    isActive: STATUS_TABS.find((tab) => tab.key === status)?.isActive,
    page: 1,
    pageSize: 50,
  };

  const listQuery = useSupplierLocationList(applied);
  const createMutation = useCreateSupplierLocation();
  const deactivateMutation = useDeactivateSupplierLocation();
  const activateMutation = useActivateSupplierLocation();
  const updateMutation = useBatchUpdateSupplierLocation();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<SupplierLocation | null>(null);
  const [rentalContractTarget, setRentalContractTarget] = useState<{
    warehouse: SupplierLocation;
    contract?: WarehouseRentalContract;
    mode: "create" | "renew" | "edit";
  } | null>(null);
  const [rentalHistoryWarehouse, setRentalHistoryWarehouse] = useState<SupplierLocation | null>(
    null,
  );

  const items = listQuery.data?.items ?? [];

  const rentalAlerts = useMemo(() => {
    const counts = { missing: 0, expiring: 0, expired: 0 };
    items.forEach((warehouse) => {
      const state = getWarehouseRentalContractStatus(warehouse).state;
      if (state in counts) counts[state as keyof typeof counts] += 1;
    });
    return counts;
  }, [items]);

  // Tên đối tác/khu vực chỉ có trong panel lọc, nên thẻ hiển thị mã cho chắc chắn đúng.
  const filterTags: ActiveFilterTag[] = [
    ...(filters.areaId
      ? [
          {
            key: "area",
            label: "Đang lọc theo khu vực",
            onClear: () => setFilters((current) => ({ ...current, areaId: undefined })),
          },
        ]
      : []),
    ...(filters.supplierCustomerId
      ? [
          {
            key: "supplier",
            label: "Đang lọc theo đối tác vận hành",
            onClear: () =>
              setFilters((current) => ({ ...current, supplierCustomerId: undefined })),
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
              setDraftKeyword("");
            },
          },
        ]
      : []),
  ];

  const onCreate = async (payload: CreateSupplierLocationPayload) => {
    await createMutation.mutateAsync(payload);
    setModalOpen(false);
    notify.success("Đã tạo kho.");
  };

  const onUpdate = async (args: {
    id: string;
    supplierCustomerIds: string[];
    data: UpdateSupplierLocationPayload;
  }) => {
    await updateMutation.mutateAsync({
      id: args.id,
      data: { ...args.data, supplierCustomerIds: args.supplierCustomerIds },
    });
    setModalOpen(false);
    notify.success("Đã cập nhật kho.");
  };

  const onDeactivate = (row: SupplierLocation) => {
    Modal.confirm({
      title: "Ngừng hoạt động kho?",
      content: `Kho "${row.name}" sẽ không còn được chọn cho nghiệp vụ mới. Dữ liệu chứng từ và tồn kho lịch sử vẫn được giữ nguyên.`,
      okText: "Ngừng hoạt động",
      okButtonProps: { danger: true },
      cancelText: "Hủy",
      onOk: async () => {
        await deactivateMutation.mutateAsync(row.id);
        notify.success("Đã ngừng hoạt động kho.");
      },
    });
  };

  const onActivate = (row: SupplierLocation) => {
    Modal.confirm({
      title: "Khôi phục kho?",
      okText: "Khôi phục",
      cancelText: "Hủy",
      onOk: async () => {
        await activateMutation.mutateAsync(row.id);
        notify.success("Đã khôi phục kho.");
      },
    });
  };

  return (
    <div className="warehouse-page">
      <div className="warehouse-toolbar">
        <Typography.Title level={4} style={{ margin: 0 }}>
          Danh mục kho
        </Typography.Title>
        <Button
          size="small"
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setModalMode("create");
            setEditing(null);
            setModalOpen(true);
          }}
        >
          Thêm kho
        </Button>
      </div>

      {/* Ô tìm và nút lọc nằm cùng hàng với tab, dồn phải — đỡ một dòng chiều cao và
          mắt không phải nhảy lên xuống giữa tab và bộ lọc. */}
      <Tabs
        className="warehouse-status-tabs"
        activeKey={status}
        onChange={setStatus}
        items={STATUS_TABS.map((tab) => ({ key: tab.key, label: tab.label }))}
        tabBarExtraContent={{
          right: (
            <Space size={6}>
              <Input.Search
                size="small"
                allowClear
                value={draftKeyword}
                placeholder="Tìm mã hoặc tên kho"
                onChange={(event) => setDraftKeyword(event.target.value)}
                onSearch={(value) => setKeyword(value.trim() || undefined)}
                loading={listQuery.isFetching}
                style={{ width: 260 }}
              />
              <FilterButton
                count={
                  Number(Boolean(filters.areaId)) + Number(Boolean(filters.supplierCustomerId))
                }
                open={filterOpen}
                onOpenChange={setFilterOpen}
                content={
                  <SupplierLocationsFilterPanel
                    value={filters}
                    onApply={(next) => {
                      setFilters(next);
                      setFilterOpen(false);
                    }}
                    onClear={() => {
                      setFilters({});
                      setFilterOpen(false);
                    }}
                  />
                }
              />
              <RefreshButton
                loading={listQuery.isFetching}
                onClick={() => listQuery.refetch()}
              />
            </Space>
          ),
        }}
      />

      <FilterTags items={filterTags} />

      {rentalAlerts.missing || rentalAlerts.expiring || rentalAlerts.expired ? (
        <Alert
          showIcon
          type={rentalAlerts.expired || rentalAlerts.missing ? "warning" : "info"}
          style={{ marginBottom: 8 }}
          message={`Hợp đồng thuê kho: ${rentalAlerts.missing} chưa có, ${rentalAlerts.expiring} sắp hết hạn, ${rentalAlerts.expired} đã hết hạn.`}
        />
      ) : null}

      <SupplierLocationsTable
        loading={listQuery.isFetching}
        items={items}
        onEdit={(row) => {
          setModalMode("edit");
          setEditing(row);
          setModalOpen(true);
        }}
        onDeactivate={onDeactivate}
        onActivate={onActivate}
        onManageRentalContract={(warehouse, contract) =>
          setRentalContractTarget({ warehouse, contract, mode: contract ? "renew" : "create" })
        }
        onEditRentalContract={(warehouse, contract) =>
          setRentalContractTarget({ warehouse, contract, mode: "edit" })
        }
        onViewRentalContracts={setRentalHistoryWarehouse}
      />

      <SupplierLocationUpsertModal
        open={modalOpen}
        mode={modalMode}
        initial={editing}
        saving={createMutation.isPending || updateMutation.isPending}
        onCancel={() => setModalOpen(false)}
        onCreate={onCreate}
        onUpdate={onUpdate}
      />
      <WarehouseRentalContractModal
        open={!!rentalContractTarget}
        warehouse={rentalContractTarget?.warehouse}
        contract={rentalContractTarget?.contract}
        mode={rentalContractTarget?.mode}
        onClose={() => setRentalContractTarget(null)}
        onSaved={() => listQuery.refetch()}
      />
      <WarehouseRentalContractHistoryModal
        open={!!rentalHistoryWarehouse}
        warehouse={rentalHistoryWarehouse}
        onClose={() => setRentalHistoryWarehouse(null)}
        onEdit={(contract) => {
          if (!rentalHistoryWarehouse) return;
          setRentalHistoryWarehouse(null);
          setRentalContractTarget({ warehouse: rentalHistoryWarehouse, contract, mode: "edit" });
        }}
        onRenew={(contract) => {
          if (!rentalHistoryWarehouse) return;
          setRentalHistoryWarehouse(null);
          setRentalContractTarget({ warehouse: rentalHistoryWarehouse, contract, mode: "renew" });
        }}
      />
    </div>
  );
};
