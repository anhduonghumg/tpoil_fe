import React, { useState } from "react";
import { Card, Modal } from "antd";
import { SupplierLocationsFilters } from "../ui/SupplierLocationsFilters";
import { SupplierLocationsTable } from "../ui/SupplierLocationsTable";
import { SupplierLocationUpsertModal } from "../ui/SupplierLocationUpsertModal";
import {
  useSupplierLocationList,
  useCreateSupplierLocation,
  useDeactivateSupplierLocation,
  useActivateSupplierLocation,
  useBatchUpdateSupplierLocation,
} from "../hooks";
import type { SupplierLocation, SupplierLocationListQuery } from "../types";
import { notify } from "../../../shared/lib/notification";

export const SupplierLocationsPage: React.FC = () => {
  const [applied, setApplied] = useState<
    Required<Pick<SupplierLocationListQuery, "isActive">> &
      SupplierLocationListQuery
  >({
    supplierCustomerId: undefined,
    keyword: undefined,
    isActive: true,
    page: 1,
    pageSize: 50,
  });

  const listQ = useSupplierLocationList(applied, true);

  const createMut = useCreateSupplierLocation();
  //   const updateMut = useUpdateSupplierLocation();
  const deactMut = useDeactivateSupplierLocation();
  const actMut = useActivateSupplierLocation();
  const batchUpdateMut = useBatchUpdateSupplierLocation();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<SupplierLocation | null>(null);

  const items = listQ.data?.items ?? [];
  const loading = listQ.isFetching;

  const onSearch = (next: {
    supplierCustomerId?: string;
    keyword?: string;
    isActive?: boolean;
  }) => {
    setApplied((prev) => ({
      ...prev,
      supplierCustomerId: next.supplierCustomerId,
      keyword: next.keyword,
      isActive: next.isActive ?? true,
      page: 1,
    }));
  };

  const openCreate = () => {
    setModalMode("create");
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (row: SupplierLocation) => {
    setModalMode("edit");
    setEditing(row);
    setModalOpen(true);
  };

  const onCreate = async (payload: any) => {
    const r: any = await createMut.mutateAsync(payload);
    setModalOpen(false);
    const skipped = r.skippedCount || 0;
    if (skipped > 0)
      notify.warning(
        `Đã tạo ${r.createdCount} kho (${skipped} NCC đã tồn tại mã kho).`
      );
    else notify.success(`Đã tạo ${r.createdCount} kho.`);
  };

  const onUpdate = async (args: {
    id: string;
    supplierCustomerIds: string[];
    data: any;
  }) => {
    await batchUpdateMut.mutateAsync({
      id: args.id,
      data: {
        supplierCustomerIds: args.supplierCustomerIds ?? [],
        ...args.data,
      },
    });

    setModalOpen(false);
    notify.success("Đã cập nhật kho.");
  };

  const onDeactivate = (row: SupplierLocation) => {
    Modal.confirm({
      title: "Ngừng hoạt động kho?",
      content: `Kho "${row.name}" sẽ không còn được chọn cho nghiệp vụ mới.`,
      okText: "Ngừng",
      okButtonProps: { danger: true },
      cancelText: "Hủy",
      onOk: async () => {
        await deactMut.mutateAsync(row.id);
        notify.success("Đã ngừng hoạt động.");
      },
    });
  };

  const onActivate = (row: SupplierLocation) => {
    Modal.confirm({
      title: "Khôi phục kho?",
      okText: "Khôi phục",
      cancelText: "Hủy",
      onOk: async () => {
        await actMut.mutateAsync(row.id);
        notify.success("Đã khôi phục.");
      },
    });
  };

  return (
    <>
      <SupplierLocationsFilters
        defaultSupplierId={applied.supplierCustomerId}
        defaultKeyword={applied.keyword}
        defaultIsActive={applied.isActive}
        loading={loading}
        onSearch={onSearch}
        onCreate={openCreate}
      />

      <SupplierLocationsTable
        loading={loading}
        items={items}
        onEdit={openEdit}
        onDeactivate={onDeactivate}
        onActivate={onActivate}
      />

      <SupplierLocationUpsertModal
        open={modalOpen}
        mode={modalMode}
        initial={editing}
        saving={createMut.isPending || batchUpdateMut.isPending}
        onCancel={() => setModalOpen(false)}
        onCreate={onCreate}
        onUpdate={onUpdate}
      />
    </>
  );
};
