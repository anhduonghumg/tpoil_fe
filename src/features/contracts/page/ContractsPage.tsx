// features/contracts/page/ContractsPage.tsx
import React, { useState } from "react";
import { Button, Card, Flex, Space, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useContractList, useDeleteContract } from "../hooks";
import type { ContractListQuery } from "../types";
import { ContractUpsertOverlay } from "../ui/ContractUpsertOverlay";
// Bạn sẽ tự tạo 2 component này theo props gợi ý
import { ContractFilters } from "../ui/ContractFilters";
import { ContractTable } from "../ui/ContractTable";
import { notify } from "../../../shared/lib/notification";

const { Title } = Typography;

const DEFAULT_PAGE_SIZE = 20;

export const ContractsPage: React.FC = () => {
  // ===== Query state =====
  const [query, setQuery] = useState<ContractListQuery>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  const { data, isLoading } = useContractList(query);
  const deleteMutation = useDeleteContract();

  // ===== Overlay state =====
  const [isOverlayOpen, setOverlayOpen] = useState(false);
  const [overlayMode, setOverlayMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | undefined>(undefined);

  // ===== Data helpers =====
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const page = data?.page ?? query.page ?? 1;
  const pageSize = data?.pageSize ?? query.pageSize ?? DEFAULT_PAGE_SIZE;

  // console.log("items:", items);

  // ===== Handlers =====

  // Khi filter submit
  const handleFilterChange = (
    next: Omit<ContractListQuery, "page" | "pageSize">
  ) => {
    setQuery((prev) => ({
      ...prev,
      ...next,
      page: 1,
    }));
  };

  // Khi đổi page / pageSize từ Table
  const handlePageChange = (nextPage: number, nextPageSize?: number) => {
    setQuery((prev) => ({
      ...prev,
      page: nextPage,
      pageSize: nextPageSize ?? prev.pageSize ?? DEFAULT_PAGE_SIZE,
    }));
  };

  // Thêm mới
  const handleCreate = () => {
    setOverlayMode("create");
    setEditingId(undefined);
    setOverlayOpen(true);
  };

  // Sửa
  const handleEdit = (id: string) => {
    setOverlayMode("edit");
    setEditingId(id);
    setOverlayOpen(true);
  };

  // Xoá
  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      notify.success("Đã xoá hợp đồng");
      setEditingId(undefined);
    } catch (err) {
      notify.error("Xoá hợp đồng thất bại");
    }
  };

  // Sau khi tạo / cập nhật thành công
  const handleUpsertSuccess = (id: string) => {
    notify.success(
      overlayMode === "create"
        ? "Tạo hợp đồng thành công"
        : "Cập nhật hợp đồng thành công"
    );
    setOverlayOpen(false);
    setEditingId(undefined);
  };

  const loadingTable = isLoading || deleteMutation.isPending;

  return (
    <Flex vertical gap={16} style={{ height: "100%", padding: 16 }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        {/* Filters */}
        <ContractFilters
          value={query}
          onChange={handleFilterChange}
          // nếu cần thêm props khác (options, enum list, ...) bạn bổ sung sau
        />
        <Button
          size="small"
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
        >
          Thêm mới
        </Button>

        <ContractTable
          loading={loadingTable}
          items={items}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={handlePageChange}
          onEdit={handleEdit}
          onDelete={handleDelete}
          // onRowClick={...} // sau này bạn có thể dùng để set selectedId cho Overview
        />
      </Space>

      <ContractUpsertOverlay
        open={isOverlayOpen}
        mode={overlayMode}
        contractId={overlayMode === "edit" ? editingId : undefined}
        onClose={() => {
          setOverlayOpen(false);
          setEditingId(undefined);
        }}
        onSuccess={handleUpsertSuccess}
      />
    </Flex>
  );
};

export default ContractsPage;
