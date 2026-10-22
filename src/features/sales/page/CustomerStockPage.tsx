import React, { useState } from "react";
import { Alert, Button, Empty, Pagination, Select, Skeleton, Space, Table, Tabs, Typography } from "antd";
import { FilterOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { Link } from "react-router-dom";
import { PartySelect } from "../../../shared/ui/PartySelect";
import { FilterButton, FilterTags, RefreshButton } from "../../../shared/ui/TableFilter";
import type { ActiveFilterTag } from "../../../shared/ui/TableFilter";
import { MobileActiveFilters, MobileList, MobileListItem, MobileListToolbar, MobileListValues } from "../../../shared/ui/MobileList";
import { mobileListSummary, useIsMobile } from "../../../shared/ui/mobile";
import { useProductSelect } from "../../products/hooks";
import { useCustomerStock } from "../hooks";
import type { CustomerStockDetailRow, CustomerStockSummaryRow } from "../types";
import { formatQty } from "../ui/labels";
import "../../../shared/ui/page-shell.css";
import "../../../shared/ui/data-grid.css";
import "../customer-stock.css";

type StockTab = "summary" | "details";
const PAGE_SIZE = 20;

function Quantity({ value, unit, strong = false }: { value: string; unit: string; strong?: boolean }) {
  return (
    <span className={`data-grid-num${strong ? " data-grid-strong" : ""}`}>
      {formatQty(value)} <span className="customer-stock-unit">{unit}</span>
    </span>
  );
}

function Identity({ name, code }: { name: string; code?: string | null }) {
  return (
    <div className="customer-stock-identity">
      <span className="data-grid-strong">{name}</span>
      {code ? <span className="data-grid-sub">{code}</span> : null}
    </div>
  );
}

function StockRow({ row }: { row: CustomerStockSummaryRow | CustomerStockDetailRow }) {
  const detail = "salesOrderLineId" in row ? row : null;
  return (
    <MobileListItem title={row.customer.name}
      moreLabel={`Thông tin hàng của ${row.customer.name}${detail ? `, đơn ${detail.orderNo}` : ""}`}
      detailsTitle="Chi tiết hàng của khách"
      description={<><span>{row.product.name}</span>{detail ? <span><Link to={`/sales/orders/${detail.salesOrderId}`}>{detail.orderNo}</Link></span> : null}</>}
      details={<dl>
        <div><dt>Khách hàng</dt><dd>{row.customer.name}{row.customer.code ? ` · ${row.customer.code}` : ""}</dd></div>
        <div><dt>Mặt hàng</dt><dd>{row.product.name}{row.product.code ? ` · ${row.product.code}` : ""}</dd></div>
        {detail ? <>
          <div><dt>Đơn lô</dt><dd><Link to={`/sales/orders/${detail.salesOrderId}`}>{detail.orderNo}</Link></dd></div>
          <div><dt>Ngày đặt</dt><dd>{dayjs(detail.orderDate).format("DD/MM/YYYY")}</dd></div>
          <div><dt>Kho</dt><dd>{detail.warehouse?.name ?? "Chưa xác định"}</dd></div>
        </> : null}
        <div><dt>Tổng đặt</dt><dd><Quantity value={row.totalQty} unit={row.product.uom} /></dd></div>
        <div><dt>Đã rút</dt><dd><Quantity value={row.issuedQty} unit={row.product.uom} /></dd></div>
        <div><dt>Đang giữ cho phiếu rút</dt><dd><Quantity value={row.heldQty} unit={row.product.uom} /></dd></div>
        {detail ? (
          <div><dt>Điều chỉnh</dt><dd><Quantity value={detail.adjustedQty} unit={detail.product.uom} /></dd></div>
        ) : (
          <div><dt>Số đơn lô</dt><dd>{"lotOrders" in row ? formatQty(row.lotOrders) : "—"}</dd></div>
        )}
      </dl>}
    >
      <MobileListValues items={[
        { label: "Còn có thể rút", value: <Quantity value={row.remainingQty} unit={row.product.uom} strong /> },
        { label: "Đang giữ", value: <Quantity value={row.heldQty} unit={row.product.uom} /> },
      ]} />
    </MobileListItem>
  );
}

/** Commercial balances from active lot orders; quantities are supplied by the sales API. */
export default function CustomerStockPage() {
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<StockTab>("summary");
  const [pages, setPages] = useState({ summary: 1, details: 1 });
  const [customerPartyId, setCustomerPartyId] = useState<string>();
  const [productId, setProductId] = useState<string>();
  const [productLabel, setProductLabel] = useState<string>();
  const [productKeyword, setProductKeyword] = useState("");
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const productsQuery = useProductSelect(productKeyword);
  const query = useCustomerStock({ customerPartyId, productId });
  const summary = query.data?.summary ?? [];
  const details = query.data?.details ?? [];
  const filterCount = Number(Boolean(customerPartyId)) + Number(Boolean(productId));
  const total = tab === "summary" ? summary.length : details.length;
  const page = Math.min(pages[tab], Math.max(1, Math.ceil(total / PAGE_SIZE)));
  const offset = (page - 1) * PAGE_SIZE;
  const summaryPage = summary.slice(offset, offset + PAGE_SIZE);
  const detailPage = details.slice(offset, offset + PAGE_SIZE);
  const hasData = query.data != null;
  const initialLoading = !hasData && query.isPending;

  const resetPages = () => setPages({ summary: 1, details: 1 });
  const clearFilters = () => {
    setCustomerPartyId(undefined);
    setProductId(undefined);
    setProductLabel(undefined);
    setProductKeyword("");
    resetPages();
  };
  const filterTags: ActiveFilterTag[] = [];
  if (customerPartyId) {
    const customer = summary.find((row) => row.customer.id === customerPartyId)?.customer;
    filterTags.push({
      key: "customer",
      label: customer ? `Khách hàng: ${customer.name}` : "Đang lọc theo khách hàng",
      onClear: () => { setCustomerPartyId(undefined); resetPages(); },
    });
  }
  if (productId) {
    filterTags.push({
      key: "product",
      label: `Mặt hàng: ${productLabel ?? "đã chọn"}`,
      onClear: () => { setProductId(undefined); setProductLabel(undefined); setProductKeyword(""); resetPages(); },
    });
  }

  const filterPanel = (
    <div className="page-shell-filter-panel customer-stock-filter-panel">
      <div className="customer-stock-filter-field">
        <label htmlFor="customer-stock-customer">Khách hàng</label>
        <PartySelect
          id="customer-stock-customer"
          partyRole="CUSTOMER"
          allowClear
          styles={{ popup: { root: { minWidth: 0, maxWidth: "calc(100vw - 32px)" } } }}
          size="small"
          placeholder="Mọi khách hàng"
          value={customerPartyId}
          onChange={(value) => { setCustomerPartyId(value ?? undefined); resetPages(); }}
        />
      </div>
      <div className="customer-stock-filter-field">
        <label htmlFor="customer-stock-product">Mặt hàng</label>
        <Select
          id="customer-stock-product"
          allowClear
          showSearch
          size="small"
          filterOption={false}
          placeholder="Mọi mặt hàng"
          value={productId}
          loading={productsQuery.isFetching}
          onSearch={setProductKeyword}
          onChange={(value: string | undefined) => {
            setProductId(value);
            setProductLabel(productsQuery.data?.find((product) => product.id === value)?.name);
            setProductKeyword("");
            resetPages();
          }}
          options={(productsQuery.data ?? []).map((product) => ({ value: product.id, label: `${product.code} - ${product.name}` }))}
        />
        {productsQuery.isError ? (
          <Typography.Text type="danger" role="alert">Không tải được danh mục mặt hàng. Hãy thử lại khi mở bộ lọc.</Typography.Text>
        ) : null}
      </div>
      <Space className="customer-stock-filter-footer">
        <Button size="small" disabled={!filterCount} onClick={clearFilters}>Xóa bộ lọc</Button>
        <Button size="small" type="primary" onClick={() => setActiveTool(null)}>Đóng</Button>
      </Space>
    </div>
  );

  const quantityColumn = (title: string, key: "totalQty" | "issuedQty" | "heldQty" | "remainingQty", width = 125): ColumnsType<CustomerStockSummaryRow>[number] => ({
    title, key, width, align: "right",
    render: (_, row) => <Quantity value={row[key]} unit={row.product.uom} strong={key === "remainingQty"} />,
  });
  const summaryColumns: ColumnsType<CustomerStockSummaryRow> = [
    { title: "Khách hàng", key: "customer", width: 210, render: (_, row) => <Identity name={row.customer.name} code={row.customer.code} /> },
    { title: "Mặt hàng", key: "product", width: 190, render: (_, row) => <Identity name={row.product.name} code={row.product.code} /> },
    quantityColumn("Tổng đặt", "totalQty"),
    quantityColumn("Đã rút", "issuedQty"),
    quantityColumn("Đang giữ", "heldQty"),
    quantityColumn("Còn có thể rút", "remainingQty", 150),
    { title: "Số đơn lô", dataIndex: "lotOrders", width: 95, align: "right", render: (value) => <span className="data-grid-num">{formatQty(value)}</span> },
  ];
  const detailColumns: ColumnsType<CustomerStockDetailRow> = [
    { title: "Đơn lô", key: "order", width: 150, render: (_, row) => (
      <div className="customer-stock-identity">
        <Link to={`/sales/orders/${row.salesOrderId}`}>{row.orderNo}</Link>
        <span className="data-grid-sub">{dayjs(row.orderDate).format("DD/MM/YYYY")}</span>
      </div>
    ) },
    { title: "Khách hàng", key: "customer", width: 200, render: (_, row) => <Identity name={row.customer.name} code={row.customer.code} /> },
    { title: "Mặt hàng / Kho", key: "product", width: 240, render: (_, row) => (
      <div className="customer-stock-identity">
        <span className="data-grid-strong">{row.product.name}</span>
        <span className="data-grid-sub">{row.product.code} · {row.warehouse?.name ?? "Chưa xác định kho"}</span>
      </div>
    ) },
    ...([ ["Tổng đặt", "totalQty"], ["Đã rút", "issuedQty"], ["Điều chỉnh", "adjustedQty"], ["Đang giữ", "heldQty"], ["Còn có thể rút", "remainingQty"] ] as const).map(([title, key]) => ({
      title, key, width: key === "remainingQty" ? 150 : 125, align: "right" as const,
      render: (_: unknown, row: CustomerStockDetailRow) => <Quantity value={row[key]} unit={row.product.uom} strong={key === "remainingQty"} />,
    })),
  ];
  const empty = (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={filterCount ? "Không có đơn lô phù hợp với bộ lọc." : "Chưa có tồn thương mại từ đơn lô đã duyệt."}
    >
      {filterCount ? <Button size="small" onClick={clearFilters}>Xóa bộ lọc</Button> : null}
    </Empty>
  );
  const changeTool = (key: string | null) => {
    setActiveTool(key);
    if (key === "filter" && productsQuery.isError) void productsQuery.refetch();
  };
  const pagination = total > PAGE_SIZE ? <Pagination
    className="customer-stock-pagination" current={page} pageSize={PAGE_SIZE} total={total}
    size="small" simple={isMobile} showSizeChanger={false}
    onChange={(nextPage) => setPages((previous) => ({ ...previous, [tab]: nextPage }))}
  /> : null;

  return (
    <div className="page-shell customer-stock-page">
      <Tabs
        size="small"
        className="page-shell-tabs"
        activeKey={tab}
        onChange={(key) => setTab(key as StockTab)}
        items={[{ key: "summary", label: isMobile ? "Tổng hợp" : "Theo khách & mặt hàng" }, { key: "details", label: "Chi tiết đơn lô" }]}
        tabBarExtraContent={isMobile ? undefined : { right: (
          <Space size={6} className="customer-stock-actions">
            <FilterButton count={filterCount} open={activeTool === "filter"} onOpenChange={(open) => changeTool(open ? "filter" : null)} content={filterPanel} />
            <RefreshButton loading={query.isFetching} onClick={() => { void query.refetch(); }} />
          </Space>
        ) }}
      />
      {isMobile ? <MobileActiveFilters items={filterTags} /> : <FilterTags items={filterTags} />}
      {query.isError ? (
        <Alert
          type={hasData ? "warning" : "error"}
          showIcon
          message={hasData ? "Chưa làm mới được dữ liệu" : "Không tải được tồn kho thương mại"}
          description={hasData ? "Đang hiển thị dữ liệu của lần tải thành công trước. Vui lòng thử lại." : "Vui lòng thử lại. Chưa thể xác định số lượng tồn từ lần tải này."}
          action={<Button size="small" loading={query.isFetching} onClick={() => { void query.refetch(); }}>Thử lại</Button>}
        />
      ) : null}
      {initialLoading ? (
        <div className="customer-stock-loading" role="status" aria-label="Đang tải tồn kho thương mại">
          <Skeleton active paragraph={{ rows: 5 }} />
        </div>
      ) : hasData ? (
        <div className="customer-stock-results" aria-busy={query.isFetching}>
          {!isMobile ? <div className="customer-stock-result-meta" role="status">
            <span>{formatQty(total)} {tab === "summary" ? "nhóm khách hàng / mặt hàng" : "dòng đơn lô"}</span>
            <span>{query.isFetching ? "Đang làm mới…" : `Cập nhật ${dayjs(query.dataUpdatedAt).format("HH:mm DD/MM/YYYY")}`}</span>
          </div> : null}
          {isMobile ? (
            total ? <MobileList>
              {tab === "summary"
                ? summaryPage.map((row) => <StockRow key={`${row.customer.id}-${row.product.id}`} row={row} />)
                : detailPage.map((row) => <StockRow key={row.salesOrderLineId} row={row} />)}
            </MobileList> : empty
          ) : tab === "summary" ? (
            <Table<CustomerStockSummaryRow>
              className="data-grid customer-stock-grid" size="small" bordered tableLayout="fixed"
              rowKey={(row) => `${row.customer.id}-${row.product.id}`} columns={summaryColumns}
              dataSource={summaryPage} scroll={{ x: 1020 }} pagination={false} locale={{ emptyText: empty }}
            />
          ) : (
            <Table<CustomerStockDetailRow>
              className="data-grid customer-stock-grid" size="small" bordered tableLayout="fixed"
              rowKey="salesOrderLineId" columns={detailColumns}
              dataSource={detailPage} scroll={{ x: 1365 }} pagination={false} locale={{ emptyText: empty }}
            />
          )}
          {!isMobile ? pagination : null}
        </div>
      ) : null}
      {isMobile ? <MobileListToolbar openTool={activeTool} onToolChange={changeTool}
        tools={[{ key: "filter", label: "Mở bộ lọc", title: "Lọc hàng của khách", icon: <FilterOutlined />, active: Boolean(filterCount), content: filterPanel }]}
        actions={<RefreshButton loading={query.isFetching} onClick={() => { void query.refetch(); }} />}
        summary={mobileListSummary(query, total, Boolean(filterCount))} pagination={pagination}
      /> : null}
    </div>
  );
}
