import React, { useMemo, useState } from "react";
import { Button, Input, Space, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { ProductsTable } from "../ui/ProductsTable";
import { ProductUpsertOverlay } from "../ui/ProductUpsertOverlay";
import { FilterTags, RefreshButton } from "../../../shared/ui/TableFilter";
import type { ActiveFilterTag } from "../../../shared/ui/TableFilter";
import { useCreateProduct, useProductList, useUpdateProduct } from "../hooks";
import type { Product, ProductUpsertPayload } from "../types";
import "../products-catalog.css";

export const ProductsPage: React.FC = () => {
  const [keyword, setKeyword] = useState<string | undefined>(undefined);
  const [draftKeyword, setDraftKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const listQuery = useProductList({ keyword });
  const rows: Product[] = useMemo(
    () => (Array.isArray(listQuery.data) ? listQuery.data : []) as Product[],
    [listQuery.data],
  );

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<Product | null>(null);

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const submitting = createMutation.isPending || updateMutation.isPending;

  const filterTags: ActiveFilterTag[] = keyword
    ? [
        {
          key: "keyword",
          label: `Từ khóa: ${keyword}`,
          onClear: () => {
            setKeyword(undefined);
            setDraftKeyword("");
            setPage(1);
          },
        },
      ]
    : [];

  const openCreate = () => {
    setMode("create");
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (row: Product) => {
    setMode("edit");
    setEditing(row);
    setOpen(true);
  };

  const onSubmit = async (payload: ProductUpsertPayload) => {
    if (mode === "create") return createMutation.mutateAsync(payload);
    return updateMutation.mutateAsync({ id: editing!.id, data: payload });
  };

  return (
    <div className="products-page">
      <div className="products-toolbar">
        <Typography.Title level={4} style={{ margin: 0 }}>
          Danh mục sản phẩm
        </Typography.Title>

        <Space size={6}>
          <Input.Search
            size="small"
            allowClear
            value={draftKeyword}
            placeholder="Tìm theo mã hoặc tên"
            onChange={(event) => setDraftKeyword(event.target.value)}
            onSearch={(value) => {
              setKeyword(value.trim() || undefined);
              setPage(1);
            }}
            loading={listQuery.isFetching}
            style={{ width: 280 }}
          />
          <RefreshButton loading={listQuery.isFetching} onClick={() => listQuery.refetch()} />
          <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Thêm sản phẩm
          </Button>
        </Space>
      </div>

      <FilterTags items={filterTags} />

      <ProductsTable
        rows={rows}
        loading={listQuery.isFetching}
        page={page}
        pageSize={pageSize}
        onPageChange={(nextPage, nextPageSize) => {
          setPage(nextPage);
          setPageSize(nextPageSize);
        }}
        onEdit={openEdit}
      />

      <ProductUpsertOverlay
        open={open}
        mode={mode}
        initial={editing}
        submitting={submitting}
        onClose={() => setOpen(false)}
        onSubmit={onSubmit}
      />
    </div>
  );
};
