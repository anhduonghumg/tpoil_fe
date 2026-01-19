import React, { useMemo, useState } from "react";
import { Button, Space } from "antd";
import { ProductsFilters } from "../ui/ProductsFilters";
import { ProductsTable } from "../ui/ProductsTable";
import { ProductUpsertOverlay } from "../ui/ProductUpsertOverlay";
import { useCreateProduct, useProductList, useUpdateProduct } from "../hooks";
import type { Product, ProductUpsertPayload } from "../types";

export const ProductsPage: React.FC = () => {
  const [keyword, setKeyword] = useState<string | undefined>(undefined);
  const [query, setQuery] = useState({
    page: 1,
    pageSize: 50,
    keyword: undefined as string | undefined,
  });

  const listQ = useProductList(query);
  const paged = listQ?.data;
  const rows: Product[] = useMemo(() => (paged ?? []) as any, [paged]);
  const total = paged?.total ?? 0;

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<Product | null>(null);

  const createM = useCreateProduct();
  const updateM = useUpdateProduct();
  const submitting = createM.isPending || updateM.isPending;

  const onSearch = (kw?: string) => {
    setKeyword(kw);
    setQuery((q) => ({ ...q, page: 1, keyword: kw }));
  };
  const onPageChange = (page: number, pageSize: number) => {
    setQuery((q) => ({ ...q, page, pageSize }));
  };

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
    if (mode === "create") return createM.mutateAsync(payload);
    return updateM.mutateAsync({ id: editing!.id, data: payload });
  };

  //   console.log("paged", paged);
  //   console.log("rows", rows);

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={12}>
      <ProductsFilters
        defaultKeyword={keyword}
        loading={listQ.isFetching}
        onSearch={onSearch}
        onCreate={openCreate}
      />
      <ProductsTable
        rows={rows}
        loading={listQ.isFetching}
        total={total}
        page={query.page}
        pageSize={query.pageSize}
        onPageChange={onPageChange}
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
    </Space>
  );
};
