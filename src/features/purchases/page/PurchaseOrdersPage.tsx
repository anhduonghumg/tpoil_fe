import React, { useEffect, useMemo, useState } from "react";
import { Button, Space, Typography } from "antd";
import PurchaseOrderFilters from "../ui/PurchaseOrderFilters";
import PurchaseOrderTable from "../ui/PurchaseOrderTable";
import PurchaseOrderUpsertOverlay from "../ui/PurchaseOrderUpsertOverlay";
import PurchaseOrderDetailDrawer from "../ui/PurchaseOrderDetailDrawer";
import { usePurchaseOrderList } from "../hooks";
import type { PurchaseOrderListQuery, UUID } from "../types";
import { useProductSelect } from "../../products/hooks";
import { useNavigate } from "react-router-dom";
import { PlusOutlined } from "@ant-design/icons";

type ProductOption = { id: UUID; name: string; code?: string | null };

export default function PurchaseOrdersPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState<PurchaseOrderListQuery>({
    keyword: "",
    page: 1,
    limit: 20,
  });

  const listQ = usePurchaseOrderList(query);

  const [createOpen, setCreateOpen] = useState(false);
  // const [detailOpen, setDetailOpen] = useState(false);
  // const [selectedPoId, setSelectedPoId] = useState<string | null>(null);

  const [productKeyword, setProductKeyword] = useState("");
  const productQ = useProductSelect(productKeyword);
  const products: ProductOption[] = productQ.data ?? [];

  const onSearchProducts = async (keyword: string) => {
    setProductKeyword(keyword);
    await productQ.refetch();
  };

  const openDetail = (id: string) => {
    navigate(`/purchase-orders/${id}`);
  };

  // useEffect(() => {
  //   if (!listQ.data?.items?.length) return;
  //   if (selectedPoId) return;
  //   setSelectedPoId(listQ.data.items[0].id);
  // }, [listQ.data?.items, selectedPoId]);

  // const openDetail = (id: string) => {
  //   setSelectedPoId(id);
  //   setDetailOpen(true);
  // };

  const header = useMemo(
    () => (
      <Space
        style={{
          width: "100%",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Đơn mua hàng
          </Typography.Title>
          <Typography.Text type="secondary">
            Theo dõi tiến độ từng đơn từ tạo đơn, duyệt, nhận hàng, hóa đơn NCC
            đến thanh toán.
          </Typography.Text>
        </div>

        <Button
          type="primary"
          onClick={() => setCreateOpen(true)}
          size="small"
          icon={<PlusOutlined />}
        >
          Thêm đơn
        </Button>
      </Space>
    ),
    [],
  );

  return (
    <div style={{ padding: 0 }}>
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
        // onCreated={(poId) => {
        //   setSelectedPoId(poId);
        //   setDetailOpen(true);
        // }}
        onCreated={(poId) => {
          navigate(`/purchases/orders/${poId}`);
        }}
        products={products}
        onSearchProducts={onSearchProducts}
        defaultOrderNo=""
      />

      {/* <PurchaseOrderDetailDrawer
        open={detailOpen}
        poId={selectedPoId}
        onClose={() => setDetailOpen(false)}
      /> */}
    </div>
  );
}
