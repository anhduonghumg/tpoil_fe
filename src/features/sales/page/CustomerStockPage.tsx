import React, { useState } from "react";
import { Button, Card, Select, Space, Table, Tabs, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { PartySelect } from "../../../shared/ui/PartySelect";
import {
  FilterButton,
  FilterTags,
  RefreshButton,
} from "../../../shared/ui/TableFilter";
import type { ActiveFilterTag } from "../../../shared/ui/TableFilter";
import { useProductSelect } from "../../products/hooks";
import { useCustomerStock } from "../hooks";
import type { CustomerStockDetailRow, CustomerStockSummaryRow } from "../types";
import { formatQty } from "../ui/labels";

/**
 * "Khách X còn bao nhiêu mặt hàng Y trong kho mình" — số liệu tính từ đơn lô đã
 * duyệt trừ đi phần đã rút và phần đang giữ.
 */
export default function CustomerStockPage() {
  const navigate = useNavigate();
  const [customerPartyId, setCustomerPartyId] = useState<string>();
  const [productId, setProductId] = useState<string>();
  const [productKeyword, setProductKeyword] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const productsQuery = useProductSelect(productKeyword);
  const query = useCustomerStock({ customerPartyId, productId });

  const productName = (productsQuery.data ?? []).find((row) => row.id === productId)?.name;

  const filterTags = [
    customerPartyId && {
      key: "customer",
      label: "Đang lọc theo khách hàng",
      onClear: () => setCustomerPartyId(undefined),
    },
    productId && {
      key: "product",
      label: `Mặt hàng: ${productName ?? "đã chọn"}`,
      onClear: () => setProductId(undefined),
    },
  ].filter(Boolean) as ActiveFilterTag[];

  const filterPanel = (
    <div className="table-filter-panel">
      <div style={{ marginBottom: 10 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Khách hàng
        </Typography.Text>
        <PartySelect
          partyRole="CUSTOMER"
          allowClear
          style={{ width: "100%" }}
          placeholder="Mọi khách hàng"
          value={customerPartyId}
          onChange={(value) => setCustomerPartyId(value ?? undefined)}
        />
      </div>
      <div style={{ marginBottom: 10 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Mặt hàng
        </Typography.Text>
        <Select
          allowClear
          showSearch
          size="small"
          filterOption={false}
          style={{ width: "100%" }}
          placeholder="Mọi mặt hàng"
          value={productId}
          loading={productsQuery.isFetching}
          onSearch={setProductKeyword}
          onChange={(value) => setProductId(value)}
          options={(productsQuery.data ?? []).map((product) => ({
            value: product.id,
            label: `${product.code} - ${product.name}`,
          }))}
        />
      </div>
      <div style={{ textAlign: "right" }}>
        <Button
          size="small"
          onClick={() => {
            setCustomerPartyId(undefined);
            setProductId(undefined);
          }}
        >
          Đặt lại
        </Button>
      </div>
    </div>
  );

  const summaryColumns: ColumnsType<CustomerStockSummaryRow> = [
    { title: "Khách hàng", key: "customer", render: (_, row) => row.customer.name },
    {
      title: "Mặt hàng",
      key: "product",
      render: (_, row) => `${row.product.code ? `${row.product.code} - ` : ""}${row.product.name}`,
    },
    {
      title: "Tổng đặt",
      dataIndex: "totalQty",
      width: 120,
      align: "right",
      render: (value) => formatQty(value),
    },
    {
      title: "Đã rút",
      dataIndex: "issuedQty",
      width: 120,
      align: "right",
      render: (value) => formatQty(value),
    },
    {
      title: "Đang giữ",
      dataIndex: "heldQty",
      width: 120,
      align: "right",
      render: (value) => formatQty(value),
    },
    {
      title: "Còn lại",
      dataIndex: "remainingQty",
      width: 130,
      align: "right",
      render: (value, row) => (
        <strong>
          {formatQty(value)} {row.product.uom}
        </strong>
      ),
    },
    { title: "Số đơn lô", dataIndex: "lotOrders", width: 100, align: "right" },
  ];

  const detailColumns: ColumnsType<CustomerStockDetailRow> = [
    { title: "Khách hàng", key: "customer", render: (_, row) => row.customer.name },
    {
      title: "Đơn lô",
      key: "order",
      width: 150,
      render: (_, row) => (
        <Button
          type="link"
          style={{ padding: 0 }}
          onClick={() => navigate(`/sales/orders/${row.salesOrderId}`)}
        >
          {row.orderNo}
        </Button>
      ),
    },
    {
      title: "Ngày",
      dataIndex: "orderDate",
      width: 100,
      render: (value: string) => dayjs(value).format("DD/MM/YYYY"),
    },
    { title: "Mặt hàng", key: "product", render: (_, row) => row.product.name },
    { title: "Kho", key: "warehouse", width: 170, render: (_, row) => row.warehouse?.name ?? "—" },
    {
      title: "Tổng",
      dataIndex: "totalQty",
      width: 110,
      align: "right",
      render: (value) => formatQty(value),
    },
    {
      title: "Đã rút",
      dataIndex: "issuedQty",
      width: 110,
      align: "right",
      render: (value) => formatQty(value),
    },
    {
      title: "Điều chỉnh",
      dataIndex: "adjustedQty",
      width: 110,
      align: "right",
      render: (value) => formatQty(value),
    },
    {
      title: "Đang giữ",
      dataIndex: "heldQty",
      width: 110,
      align: "right",
      render: (value) => formatQty(value),
    },
    {
      title: "Còn lại",
      dataIndex: "remainingQty",
      width: 120,
      align: "right",
      render: (value) => <strong>{formatQty(value)}</strong>,
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          Tồn kho thương mại của khách
        </Typography.Title>
        <Space>
          <FilterButton
            count={Number(Boolean(customerPartyId)) + Number(Boolean(productId))}
            open={filterOpen}
            onOpenChange={setFilterOpen}
            content={filterPanel}
          />
          <RefreshButton loading={query.isFetching} onClick={() => query.refetch()} />
        </Space>
      </div>

      <FilterTags items={filterTags} />

      <Card size="small">
        <Tabs
          items={[
            {
              key: "summary",
              label: "Theo khách × mặt hàng",
              children: (
                <Table<CustomerStockSummaryRow>
                  rowKey={(row) => `${row.customer.id}-${row.product.id}`}
                  size="small"
                  loading={query.isLoading}
                  columns={summaryColumns}
                  dataSource={query.data?.summary ?? []}
                  scroll={{ x: 900 }}
                  pagination={{ pageSize: 20, showSizeChanger: false }}
                />
              ),
            },
            {
              key: "details",
              label: "Chi tiết theo đơn lô",
              children: (
                <Table<CustomerStockDetailRow>
                  rowKey="salesOrderLineId"
                  size="small"
                  loading={query.isLoading}
                  columns={detailColumns}
                  dataSource={query.data?.details ?? []}
                  scroll={{ x: 1250 }}
                  pagination={{ pageSize: 20, showSizeChanger: false }}
                />
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
