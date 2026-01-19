// features/price-bulletins/page/PriceBulletinsPage.tsx
import React, { useState } from "react";
import { Modal } from "antd";
import type { PriceBulletinListQuery } from "../types";
import { PriceBulletinsFilters } from "../ui/PriceBulletinsFilters";
import { PriceBulletinsTable } from "../ui/PriceBulletinsTable";
import { PriceBulletinUpsertModal } from "../ui/PriceBulletinUpsertModal";
import {
  useCreatePriceBulletin,
  usePriceBulletinDetail,
  usePriceBulletinList,
  usePublishPriceBulletin,
  useUpdatePriceBulletin,
  useVoidPriceBulletin,
} from "../hooks";
import { notify } from "../../../shared/lib/notification";
import { ActionKey } from "../../../shared/ui/CommonActionMenu";
import { PriceImportPdfModal } from "../ui/ImportPricePdfModal";

export const PriceBulletinsPage: React.FC = () => {
  const [applied, setApplied] = useState<PriceBulletinListQuery>({
    page: 1,
    pageSize: 50,
  });

  const listQ = usePriceBulletinList(applied);
  const items = listQ.data?.items ?? [];
  const loading = listQ.isFetching;

  const createMut = useCreatePriceBulletin();
  const updateMut = useUpdatePriceBulletin();
  const publishMut = usePublishPriceBulletin();
  const voidMut = useVoidPriceBulletin();

  const [modalOpenPdf, setModalOpenPdf] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);

  const detailQ = usePriceBulletinDetail(
    editingId ?? undefined,
    modalOpen && modalMode === "edit",
  );

  const initial = detailQ.data ?? null;

  const onSearch = (q: { keyword?: string; status?: any }) => {
    setApplied((prev) => ({ ...prev, ...q, page: 1 }));
  };

  const openCreate = () => {
    setModalMode("create");
    setEditingId(null);
    setModalOpen(true);
  };

  const openCreatePdf = () => {
    setModalOpenPdf(true);
  };

  const openEdit = (id: any) => {
    setModalMode("edit");
    setEditingId(id);
    setModalOpen(true);
  };

  const onCreate = async (data: any) => {
    await createMut.mutateAsync(data);
    setModalOpen(false);
    notify.success("Đã tạo bảng giá (DRAFT).");
  };

  const onUpdate = async (args: { id: string; data: any }) => {
    await updateMut.mutateAsync(args);
    setModalOpen(false);
    notify.success("Đã cập nhật bảng giá.");
  };

  const onPublish = (id: any) => {
    Modal.confirm({
      title: "Phát hành bảng giá?",
      content:
        "Sau khi phát hành, bảng giá có hiệu lực và không nên sửa trực tiếp (chỉ sửa khi ở bản nháp).",
      okText: "Phát hành",
      cancelText: "Hủy",
      onOk: async () => {
        await publishMut.mutateAsync(id);
        notify.success("Đã phát hành.");
      },
    });
  };

  const onVoid = (id: any) => {
    Modal.confirm({
      title: "Hủy bỏ bảng giá?",
      content: "Bản ghi sẽ không còn được dùng để quote giá.",
      okText: "Xác nhận",
      okButtonProps: { danger: true },
      cancelText: "Hủy",
      onOk: async () => {
        await voidMut.mutateAsync(id);
        notify.success("Đã hủy bỏ.");
      },
    });
  };

  const onAction = (id: string, action: ActionKey) => {
    if (action === "edit") return openEdit(id);
    if (action === "public") return onPublish(id);
    if (action === "void") return onVoid(id);
  };

  return (
    <>
      <PriceBulletinsFilters
        defaultKeyword={applied.keyword}
        defaultStatus={applied.status as any}
        loading={loading}
        onSearch={onSearch}
        onCreate={openCreate}
        onCreatePdf={openCreatePdf}
      />

      <PriceBulletinsTable
        loading={loading}
        items={items}
        onAction={onAction}
      />

      <PriceBulletinUpsertModal
        open={modalOpen}
        mode={modalMode}
        initial={initial}
        saving={
          createMut.isPending || updateMut.isPending || detailQ.isFetching
        }
        onCancel={() => setModalOpen(false)}
        onCreate={onCreate}
        onUpdate={onUpdate}
      />
      <PriceImportPdfModal
        open={modalOpenPdf}
        onClose={() => setModalOpenPdf(false)}
        productOptions={[]}
      />
    </>
  );
};
