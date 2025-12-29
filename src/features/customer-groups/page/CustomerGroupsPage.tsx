// features/customer-groups/page/CustomerGroupsPage.tsx
import React, { useMemo, useState } from "react";
import { Card, Space, Typography } from "antd";
import { CustomerGroupFilters } from "../ui/CustomerGroupFilters";
import { CustomerGroupTable } from "../ui/CustomerGroupTable";
import { CustomerGroupUpsertOverlay } from "../ui/CustomerGroupUpsertOverlay";
import { useCustomerGroupList, useDeleteCustomerGroup } from "../hooks";
import type { CustomerGroupListQuery, CustomerGroup } from "../types";
import { notify } from "../../../shared/lib/notification";

export const CustomerGroupsPage: React.FC = () => {
  const [draftKeyword, setDraftKeyword] = useState("");
  const [keyword, setKeyword] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [overlayOpen, setOverlayOpen] = useState(false);
  const [overlayMode, setOverlayMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | undefined>(undefined);

  const query: CustomerGroupListQuery = useMemo(
    () => ({
      keyword: keyword || undefined,
      page,
      pageSize,
    }),
    [keyword, page, pageSize]
  );

  const listQuery = useCustomerGroupList(query);
  const delMut = useDeleteCustomerGroup();

  const paged = listQuery.data;
  const items = paged?.items ?? [];
  const curPage = paged?.page ?? page;
  const curPageSize = paged?.pageSize ?? pageSize;
  const total = paged?.total ?? 0;

  const onSearch = () => {
    setKeyword(draftKeyword.trim());
    setPage(1);
  };

  const onCreate = () => {
    setOverlayMode("create");
    setEditingId(undefined);
    setOverlayOpen(true);
  };

  const onEdit = (row: CustomerGroup) => {
    setOverlayMode("edit");
    setEditingId(row.id);
    setOverlayOpen(true);
  };

  const onDelete = async (row: CustomerGroup) => {
    await delMut.mutateAsync(row.id);
    notify.success("Đã xoá nhóm");
  };

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={12}>
      <CustomerGroupFilters
        draftKeyword={draftKeyword}
        onDraftKeywordChange={setDraftKeyword}
        onSearch={onSearch}
        onCreate={onCreate}
        loading={listQuery.isFetching}
      />
      <CustomerGroupTable
        items={items}
        loading={listQuery.isLoading}
        page={curPage}
        pageSize={curPageSize}
        total={total}
        onChangePage={(p, ps) => {
          setPage(p);
          setPageSize(ps);
        }}
        onEdit={onEdit}
        onDelete={onDelete}
        deletingId={delMut.isPending ? (delMut.variables as any) : null}
      />
      <CustomerGroupUpsertOverlay
        open={overlayOpen}
        mode={overlayMode}
        id={editingId}
        onClose={() => setOverlayOpen(false)}
      />
    </Space>
  );
};
