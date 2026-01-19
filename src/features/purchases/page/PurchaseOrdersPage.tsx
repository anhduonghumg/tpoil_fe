import React, { useEffect, useMemo, useState } from "react";
import { Button, Space, Typography } from "antd";
import PurchaseOrderFilters from "../ui/PurchaseOrderFilters";
import PurchaseOrderTable from "../ui/PurchaseOrderTable";
import PurchaseOrderUpsertOverlay from "../ui/PurchaseOrderUpsertOverlay";
import PurchaseOrderDetailDrawer from "../ui/PurchaseOrderDetailDrawer";
import { usePurchaseOrderList } from "../hooks";
import type { PurchaseOrderListQuery, UUID } from "../types";
type ProductOption = { id: UUID; name: string; code?: string | null };

export default function PurchaseOrdersPage() {
  const [query, setQuery] = useState<PurchaseOrderListQuery>({
    keyword: "",
    page: 1,
    limit: 20,
  });

  const listQ = usePurchaseOrderList(query);

  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);

  const [products, setProducts] = useState<ProductOption[]>([]);

  const onSearchProducts = async (keyword: string) => {};

  useEffect(() => {
    if (!listQ.data?.items?.length) return;
    if (selectedPoId) return;
    setSelectedPoId(listQ.data.items[0].id);
  }, [listQ.data?.items, selectedPoId]);

  const openDetail = (id: string) => {
    setSelectedPoId(id);
    setDetailOpen(true);
  };

  const header = useMemo(
    () => (
      <Space style={{ width: "100%", justifyContent: "space-between" }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Đơn mua hàng
          </Typography.Title>
          <Typography.Text type="secondary">
            Tạo đơn nháp → Duyệt → Nhận hàng → Hoá đơn NCC → Thanh toán
          </Typography.Text>
        </div>

        <Button type="primary" onClick={() => setCreateOpen(true)}>
          Thêm đơn
        </Button>
      </Space>
    ),
    []
  );

  return (
    <div style={{ padding: 16 }}>
      {header}

      <div style={{ marginTop: 14, marginBottom: 12 }}>
        <PurchaseOrderFilters value={query} onChange={setQuery} />
      </div>

      <PurchaseOrderTable
        data={listQ.data}
        loading={listQ.isLoading}
        page={query.page ?? 1}
        limit={query.limit ?? 20}
        onPageChange={(p, l) => setQuery((s) => ({ ...s, page: p, limit: l }))}
        onRowClick={openDetail}
      />

      <PurchaseOrderUpsertOverlay
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(poId) => {
          setSelectedPoId(poId);
          setDetailOpen(true);
        }}
        products={products}
        onSearchProducts={onSearchProducts}
        defaultOrderNo=""
      />

      <PurchaseOrderDetailDrawer
        open={detailOpen}
        poId={selectedPoId}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  );
}
