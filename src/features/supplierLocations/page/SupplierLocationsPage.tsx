import React, { useMemo, useState } from "react";
import { Alert, Button, Modal, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { SupplierLocationsFilters } from "../ui/SupplierLocationsFilters";
import { SupplierLocationsTable } from "../ui/SupplierLocationsTable";
import { SupplierLocationUpsertModal } from "../ui/SupplierLocationUpsertModal";
import { WarehouseRentalContractModal } from "../ui/WarehouseRentalContractModal";
import { WarehouseRentalContractHistoryModal } from "../ui/WarehouseRentalContractHistoryModal";
import { getWarehouseRentalContractStatus } from "../warehouseRentalContract";
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

export const SupplierLocationsPage: React.FC = () => {
  const [applied, setApplied] = useState<Required<Pick<SupplierLocationListQuery, "isActive">> & SupplierLocationListQuery>({
    supplierCustomerId: undefined,
    areaId: undefined,
    keyword: undefined,
    isActive: true,
    page: 1,
    pageSize: 50,
  });
  const listQuery = useSupplierLocationList(applied);
  const createMutation = useCreateSupplierLocation();
  const deactivateMutation = useDeactivateSupplierLocation();
  const activateMutation = useActivateSupplierLocation();
  const updateMutation = useBatchUpdateSupplierLocation();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<SupplierLocation | null>(null);
  const [rentalContractTarget, setRentalContractTarget] = useState<{ warehouse: SupplierLocation; contract?: WarehouseRentalContract; mode: "create" | "renew" | "edit" } | null>(null);
  const [rentalHistoryWarehouse, setRentalHistoryWarehouse] = useState<SupplierLocation | null>(null);

  const rentalAlerts = useMemo(() => {
    const counts = { missing: 0, expiring: 0, expired: 0 };
    (listQuery.data?.items ?? []).forEach((warehouse) => {
      const state = getWarehouseRentalContractStatus(warehouse).state;
      if (state in counts) counts[state as keyof typeof counts] += 1;
    });
    return counts;
  }, [listQuery.data?.items]);

  const onSearch = (next: { supplierCustomerId?: string; areaId?: string; keyword?: string; isActive?: boolean }) => {
    setApplied((previous) => ({ ...previous, ...next, isActive: next.isActive ?? true, page: 1 }));
  };

  const onCreate = async (payload: CreateSupplierLocationPayload) => {
    await createMutation.mutateAsync(payload);
    setModalOpen(false);
    notify.success("Đã tạo kho.");
  };

  const onUpdate = async (args: { id: string; supplierCustomerIds: string[]; data: UpdateSupplierLocationPayload }) => {
    await updateMutation.mutateAsync({ id: args.id, data: { ...args.data, supplierCustomerIds: args.supplierCustomerIds } });
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
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Typography.Title level={4} style={{ marginTop: 0 }}>Danh mục kho</Typography.Title>
        <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => {
          setModalMode("create");
          setEditing(null);
          setModalOpen(true);
        }}>
          Thêm kho
        </Button>
      </div>
      <SupplierLocationsFilters
        defaultSupplierId={applied.supplierCustomerId}
        defaultAreaId={applied.areaId}
        defaultKeyword={applied.keyword}
        defaultIsActive={applied.isActive}
        loading={listQuery.isFetching}
        onSearch={onSearch}
        onRefresh={() => listQuery.refetch()}
      />
      {(rentalAlerts.missing || rentalAlerts.expiring || rentalAlerts.expired) ? (
        <Alert
          showIcon
          type={rentalAlerts.expired || rentalAlerts.missing ? "warning" : "info"}
          style={{ marginBottom: 12 }}
          message={`Hợp đồng thuê kho: ${rentalAlerts.missing} chưa có, ${rentalAlerts.expiring} sắp hết hạn, ${rentalAlerts.expired} đã hết hạn.`}
        />
      ) : null}
      <SupplierLocationsTable
        loading={listQuery.isFetching}
        items={listQuery.data?.items ?? []}
        onEdit={(row) => {
          setModalMode("edit");
          setEditing(row);
          setModalOpen(true);
        }}
        onDeactivate={onDeactivate}
        onActivate={onActivate}
        onManageRentalContract={(warehouse, contract) => setRentalContractTarget({ warehouse, contract, mode: contract ? "renew" : "create" })}
        onEditRentalContract={(warehouse, contract) => setRentalContractTarget({ warehouse, contract, mode: "edit" })}
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
    </>
  );
};
