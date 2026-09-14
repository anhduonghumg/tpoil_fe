import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  DatePicker,
  Input,
  Progress,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import {
  DownloadOutlined,
  FallOutlined,
  RiseOutlined,
  ShoppingOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useNavigate } from "react-router-dom";
import { FilterButton, FilterTags, FilterToolbar, RefreshButton } from "../../../shared/ui/TableFilter";
import { PartySelect } from "../../../shared/ui/PartySelect";
import { EmployeeSelect } from "../../../shared/ui/EmployeeSelect";
import { exportExcelWorkbook } from "../../../shared/utils/exportExcelExcelJS";
import { useProductSelect } from "../../products/hooks";
import { useWarehouseSelect } from "../../purchases/hooks";
import { SalesManagementReportApi } from "../api";
import { useSalesManagementReport } from "../hooks";
import type {
  SalesManagementOrderRow,
  SalesManagementReportQuery,
  SalesManagementWithdrawalRow,
  SalesReportCostStatus,
} from "../types";
import { OrderStatusTag, WithdrawalStatusTag } from "../ui/labels";
import "../sales-management-report.css";

const numberFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });
const oneDecimalFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });
const money = (value: number) => `${numberFormat.format(value || 0)} đ`;
const qty = (value: number) => numberFormat.format(value || 0);
const compactMoney = (value: number) => {
  const abs = Math.abs(value || 0);
  if (abs >= 1_000_000_000) return `${oneDecimalFormat.format(value / 1_000_000_000)} tỷ`;
  if (abs >= 1_000_000) return `${oneDecimalFormat.format(value / 1_000_000)} tr`;
  return numberFormat.format(value || 0);
};

const COST_LABELS: Record<SalesReportCostStatus, string> = {
  FINAL: "Giá vốn chính thức",
  PROVISIONAL: "Giá vốn tạm tính",
  NO_COST_BASIS: "Thiếu giá vốn",
};

function CostTag({ value, hasDelivery = true }: { value: SalesReportCostStatus; hasDelivery?: boolean }) {
  if (!hasDelivery) return <Tag>Chưa phát sinh</Tag>;
  return <Tag color={value === "FINAL" ? "green" : value === "PROVISIONAL" ? "gold" : "red"}>{COST_LABELS[value]}</Tag>;
}

function Kpi({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "good" | "bad" | "neutral" }) {
  return (
    <div className={`smr-kpi ${tone ? `is-${tone}` : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </div>
  );
}

export default function SalesManagementReportPage() {
  const navigate = useNavigate();
  const [dates, setDates] = useState<[Dayjs, Dayjs]>([dayjs().startOf("month"), dayjs().endOf("month")]);
  const [dateBasis, setDateBasis] = useState<"ORDER_DATE" | "DELIVERY_DATE">("ORDER_DATE");
  const [keyword, setKeyword] = useState("");
  const [customerPartyId, setCustomerPartyId] = useState<string>();
  const [salesOwnerEmpId, setSalesOwnerEmpId] = useState<string>();
  const [productId, setProductId] = useState<string>();
  const [warehouseId, setWarehouseId] = useState<string>();
  const [areaId, setAreaId] = useState<string>();
  const [kind, setKind] = useState<"DAY_TRADE" | "SINGLE" | "LOT">();
  const [costStatus, setCostStatus] = useState<SalesReportCostStatus>();
  const [lossOnly, setLossOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [filterOpen, setFilterOpen] = useState(false);
  const [productKeyword, setProductKeyword] = useState("");
  const [warehouseKeyword, setWarehouseKeyword] = useState("");
  const [exporting, setExporting] = useState(false);

  const productsQuery = useProductSelect(productKeyword);
  const warehousesQuery = useWarehouseSelect(warehouseKeyword);
  const warehouseOptions = warehousesQuery.data ?? [];
  const areaOptions = useMemo(
    () => [...new Map(warehouseOptions.filter((row) => row.area).map((row) => [row.area!.id, row.area!])).values()],
    [warehouseOptions],
  );

  const baseQuery: SalesManagementReportQuery = {
    dateFrom: dates[0].format("YYYY-MM-DD"),
    dateTo: dates[1].format("YYYY-MM-DD"),
    dateBasis,
    keyword: keyword || undefined,
    customerPartyId,
    salesOwnerEmpId,
    productId,
    warehouseId,
    areaId,
    kind,
    costStatus,
    lossOnly: lossOnly || undefined,
  };
  const reportQuery = useSalesManagementReport({ ...baseQuery, page, limit });
  const report = reportQuery.data;

  const clearAdvancedFilters = () => {
    setCustomerPartyId(undefined);
    setSalesOwnerEmpId(undefined);
    setProductId(undefined);
    setWarehouseId(undefined);
    setAreaId(undefined);
    setKind(undefined);
    setCostStatus(undefined);
    setLossOnly(false);
    setPage(1);
  };
  const filterCount = [customerPartyId, salesOwnerEmpId, productId, warehouseId, areaId, kind, costStatus].filter(Boolean).length + Number(lossOnly);

  const filterPanel = (
    <div className="smr-filter-panel">
      <label>Khách hàng<PartySelect partyRole="CUSTOMER" placeholder="Tất cả khách hàng" value={customerPartyId} onChange={(value) => { setCustomerPartyId(value ?? undefined); setPage(1); }} /></label>
      <label>Sale phụ trách<EmployeeSelect placeholder="Tất cả Sale" value={salesOwnerEmpId} onChange={(value) => { setSalesOwnerEmpId(value ?? undefined); setPage(1); }} /></label>
      <label>Mặt hàng<Select showSearch allowClear filterOption={false} placeholder="Tất cả mặt hàng" value={productId} onSearch={setProductKeyword} onChange={(value) => { setProductId(value); setPage(1); }} loading={productsQuery.isFetching} options={(productsQuery.data ?? []).map((row) => ({ value: row.id, label: `${row.code ?? ""} - ${row.name}` }))} /></label>
      <label>Khu vực<Select allowClear placeholder="Tất cả khu vực" value={areaId} onChange={(value) => { setAreaId(value); setPage(1); }} options={areaOptions.map((row) => ({ value: row.id, label: row.name }))} /></label>
      <label>Kho<Select showSearch allowClear filterOption={false} placeholder="Tất cả kho" value={warehouseId} onSearch={setWarehouseKeyword} onChange={(value) => { setWarehouseId(value); setPage(1); }} loading={warehousesQuery.isFetching} options={warehouseOptions.map((row) => ({ value: row.id, label: row.label || `${row.code} - ${row.name}` }))} /></label>
      <label>Loại đơn<Select allowClear placeholder="Tất cả loại đơn" value={kind} onChange={(value) => { setKind(value); setPage(1); }} options={[{ value: "DAY_TRADE", label: "Đơn ngày" }, { value: "SINGLE", label: "Đơn lẻ" }, { value: "LOT", label: "Đơn lô" }]} /></label>
      <label>Giá vốn<Select allowClear placeholder="Mọi trạng thái" value={costStatus} onChange={(value) => { setCostStatus(value); setPage(1); }} options={Object.entries(COST_LABELS).map(([value, label]) => ({ value, label }))} /></label>
      <label className="smr-check"><Checkbox checked={lossOnly} onChange={(event) => { setLossOnly(event.target.checked); setPage(1); }}>Chỉ xem đơn đang lỗ</Checkbox></label>
      <div className="smr-filter-actions"><Button size="small" onClick={clearAdvancedFilters}>Đặt lại</Button><Button size="small" type="primary" onClick={() => setFilterOpen(false)}>Xong</Button></div>
    </div>
  );

  const exportReport = async () => {
    setExporting(true);
    try {
      const first = await SalesManagementReportApi.get({ ...baseQuery, page: 1, limit: 100 });
      const rows = [...first.orders.items];
      const pages = Math.ceil(first.orders.total / 100);
      for (let current = 2; current <= pages; current += 1) {
        const next = await SalesManagementReportApi.get({ ...baseQuery, page: current, limit: 100 });
        rows.push(...next.orders.items);
      }
      await exportExcelWorkbook("bao-cao-dieu-hanh-ban-hang", (workbook) => {
        const orders = workbook.addWorksheet("Đơn hàng", { views: [{ state: "frozen", ySplit: 1 }] });
        orders.columns = [
          ["Số đơn", "orderNo", 24], ["Ngày", "orderDate", 13], ["Loại", "kind", 12], ["Khách hàng", "customer", 28], ["Sale", "sale", 22], ["Số lượng đặt", "orderedQty", 16], ["Đã xuất", "deliveredQty", 16], ["Còn lại", "remainingQty", 16], ["Doanh thu", "revenue", 18], ["Giá vốn", "cost", 18], ["Lãi/lỗ", "profit", 18], ["Biên lãi (%)", "margin", 14], ["Giá vốn", "costStatus", 20],
        ].map(([header, key, width]) => ({ header, key, width }));
        rows.forEach((row) => orders.addRow({ orderNo: row.orderNo, orderDate: dayjs(row.orderDate).format("DD/MM/YYYY"), kind: row.kind, customer: `${row.customer.code} - ${row.customer.name}`, sale: row.salesOwner?.fullName ?? "Chưa gán", orderedQty: row.orderedQty, deliveredQty: row.deliveredQty, remainingQty: row.remainingQty, revenue: row.revenue, cost: row.cost, profit: row.profit, margin: row.marginPercent, costStatus: COST_LABELS[row.costStatus] }));
        const sales = workbook.addWorksheet("Hiệu quả Sale", { views: [{ state: "frozen", ySplit: 1 }] });
        sales.columns = [["Sale", "name", 28], ["Số đơn", "orderCount", 12], ["Sản lượng", "deliveredQty", 16], ["Doanh thu", "revenue", 18], ["Lãi/lỗ", "profit", 18], ["Biên lãi (%)", "marginPercent", 14]].map(([header, key, width]) => ({ header, key, width }));
        first.salespeople.forEach((row) => sales.addRow(row));
        [orders, sales].forEach((sheet) => {
          const header = sheet.getRow(1); header.font = { bold: true, color: { argb: "FFFFFFFF" } }; header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF237804" } }; header.alignment = { vertical: "middle", horizontal: "center" }; header.height = 22;
          sheet.autoFilter = { from: "A1", to: sheet.getRow(1).getCell(sheet.columnCount).address };
          sheet.eachRow((row, rowNumber) => { if (rowNumber > 1) row.eachCell((cell) => { cell.border = { top: { style: "thin", color: { argb: "FFD9E2D0" } }, left: { style: "thin", color: { argb: "FFD9E2D0" } }, bottom: { style: "thin", color: { argb: "FFD9E2D0" } }, right: { style: "thin", color: { argb: "FFD9E2D0" } } }; }); });
        });
      });
    } finally {
      setExporting(false);
    }
  };

  const withdrawalColumns = [
    { title: "Phiếu rút", dataIndex: "requestNo", width: 190, render: (value: string) => <Typography.Text strong>{value}</Typography.Text> },
    { title: "Ngày", dataIndex: "requestDate", width: 105, render: (value: string) => dayjs(value).format("DD/MM/YYYY") },
    { title: "Kho rút", width: 210, render: (_: unknown, row: SalesManagementWithdrawalRow) => row.warehouses.map((item) => item.name).join(", ") },
    { title: "Yêu cầu", dataIndex: "requestedQty", align: "right" as const, width: 120, render: qty },
    { title: "Đã xuất", dataIndex: "issuedQty", align: "right" as const, width: 120, render: qty },
    { title: "Trạng thái", dataIndex: "status", width: 150, render: (value: SalesManagementWithdrawalRow["status"]) => <WithdrawalStatusTag status={value} /> },
  ];

  const orderColumns = [
    { title: "Đơn hàng", dataIndex: "orderNo", width: 210, fixed: "left" as const, render: (value: string, row: SalesManagementOrderRow) => <button className="smr-link" onClick={() => navigate(`/sales/orders/${row.id}`)}><strong>{value}</strong><small>{dayjs(row.orderDate).format("DD/MM/YYYY")} · {row.kind === "LOT" ? "Đơn lô" : row.kind === "SINGLE" ? "Đơn lẻ" : "Đơn ngày"}</small></button> },
    { title: "Khách / Sale", width: 230, render: (_: unknown, row: SalesManagementOrderRow) => <div className="smr-two-line"><strong>{row.customer.code}</strong><span>{row.salesOwner?.fullName || "Chưa gán Sale"}</span></div> },
    { title: "Mặt hàng", width: 190, render: (_: unknown, row: SalesManagementOrderRow) => [...new Map(row.products.map((item) => [item.id, item])).values()].map((item) => item.code).join(", ") },
    { title: "Tiến độ", width: 185, render: (_: unknown, row: SalesManagementOrderRow) => <div className="smr-progress"><Progress percent={row.progressPercent} size="small" strokeColor={row.remainingQty <= 0 ? "#389e0d" : "#1677ff"} /><small>{qty(row.totalDeliveredQty)} / {qty(row.orderedQty)}{row.kind === "LOT" ? ` · còn ${qty(row.remainingQty)}` : ""}</small></div> },
    { title: "Doanh thu", dataIndex: "revenue", align: "right" as const, width: 135, render: money },
    { title: "Lãi/lỗ", dataIndex: "profit", align: "right" as const, width: 135, sorter: (a: SalesManagementOrderRow, b: SalesManagementOrderRow) => a.profit - b.profit, render: (value: number, row: SalesManagementOrderRow) => <div className={`smr-money ${value < 0 ? "is-loss" : "is-profit"}`}><strong>{money(value)}</strong><small>{row.marginPercent == null ? "—" : `${row.marginPercent}%`}</small></div> },
    { title: "Giá vốn", dataIndex: "costStatus", width: 155, render: (value: SalesReportCostStatus, row: SalesManagementOrderRow) => <CostTag value={value} hasDelivery={row.deliveredQty > 0} /> },
    { title: "Trạng thái", dataIndex: "status", width: 150, render: (value: SalesManagementOrderRow["status"]) => <OrderStatusTag status={value} /> },
  ];

  const orderTable = (rows: SalesManagementOrderRow[], paged: boolean) => <Table<SalesManagementOrderRow> rowKey="id" size="small" loading={reportQuery.isFetching} dataSource={rows} columns={orderColumns} scroll={{ x: 1390 }} expandable={{ rowExpandable: (row) => row.kind === "LOT", expandedRowRender: (row) => <div className="smr-withdrawals"><div className="smr-withdrawal-head"><strong>{row.withdrawalCount} lần rút</strong><span>Đang xử lý: {qty(row.processingQty)} · Còn rút: {qty(row.remainingQty)}</span></div><Table<SalesManagementWithdrawalRow> rowKey="id" size="small" pagination={false} columns={withdrawalColumns} dataSource={row.withdrawals} locale={{ emptyText: "Chưa có phiếu rút" }} /></div> }} pagination={paged ? { current: page, pageSize: limit, total: report?.orders.total ?? 0, showSizeChanger: true, pageSizeOptions: [20, 50, 100], showTotal: (total) => `${total} đơn`, onChange: (next, size) => { setPage(next); setLimit(size); } } : false} />;

  const salespersonColumns = [
    { title: "#", width: 55, align: "center" as const, render: (_: unknown, __: unknown, index: number) => index + 1 },
    { title: "Sale phụ trách", dataIndex: "name", render: (value: string, row: { code: string | null }) => <div className="smr-sale-name"><strong>{value}</strong>{row.code ? <span>{row.code}</span> : null}</div> },
    { title: "Số đơn", dataIndex: "orderCount", width: 100, align: "right" as const, render: qty },
    { title: "Sản lượng", dataIndex: "deliveredQty", width: 145, align: "right" as const, render: qty },
    { title: "Doanh thu", dataIndex: "revenue", width: 160, align: "right" as const, render: money },
    { title: "Lãi thực hiện", dataIndex: "profit", width: 170, align: "right" as const, sorter: (a: { profit: number }, b: { profit: number }) => a.profit - b.profit, defaultSortOrder: "descend" as const, render: (value: number) => <strong className={value < 0 ? "smr-loss" : "smr-profit"}>{money(value)}</strong> },
    { title: "Biên lãi", dataIndex: "marginPercent", width: 115, align: "right" as const, render: (value: number | null) => value == null ? "—" : `${value}%` },
  ];

  const advancedTags = [
    customerPartyId ? { key: "customer", label: "Đã lọc khách hàng", onClear: () => setCustomerPartyId(undefined) } : null,
    salesOwnerEmpId ? { key: "sale", label: "Đã lọc Sale", onClear: () => setSalesOwnerEmpId(undefined) } : null,
    productId ? { key: "product", label: "Đã lọc mặt hàng", onClear: () => setProductId(undefined) } : null,
    warehouseId ? { key: "warehouse", label: "Đã lọc kho", onClear: () => setWarehouseId(undefined) } : null,
    areaId ? { key: "area", label: "Đã lọc khu vực", onClear: () => setAreaId(undefined) } : null,
    kind ? { key: "kind", label: `Loại: ${kind === "LOT" ? "Đơn lô" : kind === "SINGLE" ? "Đơn lẻ" : "Đơn ngày"}`, onClear: () => setKind(undefined) } : null,
    costStatus ? { key: "cost", label: COST_LABELS[costStatus], onClear: () => setCostStatus(undefined) } : null,
    lossOnly ? { key: "loss", label: "Chỉ đơn lỗ", onClear: () => setLossOnly(false) } : null,
  ].filter(Boolean) as Array<{ key: string; label: string; onClear: () => void }>;

  const summary = report?.summary;
  const lotRows = (report?.orders.items ?? []).filter((row) => row.kind === "LOT").slice(0, 6);
  return (
    <main className="sales-management-report">
      <header className="smr-header"><div><Typography.Title level={3}>Báo cáo điều hành bán hàng</Typography.Title><Typography.Text type="secondary">Đơn lẻ, đơn lô, tiến độ rút và lãi/lỗ thực hiện</Typography.Text></div><Tag color="blue">Dành cho quản lý</Tag></header>
      <section className="smr-toolbar-card">
        <FilterToolbar left={<Space size={8} wrap><DatePicker.RangePicker size="small" value={dates} format="DD/MM/YYYY" allowClear={false} onChange={(value) => { if (value?.[0] && value?.[1]) { setDates([value[0], value[1]]); setPage(1); } }} /><Select size="small" value={dateBasis} className="smr-date-basis" onChange={(value) => { setDateBasis(value); setPage(1); }} options={[{ value: "ORDER_DATE", label: "Theo ngày đơn" }, { value: "DELIVERY_DATE", label: "Theo ngày xuất kho" }]} /><Input.Search size="small" allowClear placeholder="Số đơn hoặc khách hàng" className="smr-search" onSearch={(value) => { setKeyword(value.trim()); setPage(1); }} /></Space>} right={<Space size={8}><Button size="small" className="smr-export" icon={<DownloadOutlined />} loading={exporting} onClick={exportReport}>Xuất Excel</Button><FilterButton count={filterCount} open={filterOpen} onOpenChange={setFilterOpen} content={filterPanel} /><RefreshButton loading={reportQuery.isFetching} onClick={() => reportQuery.refetch()} /></Space>} />
        <FilterTags items={advancedTags} />
      </section>

      {reportQuery.isError ? <Alert type="error" showIcon message="Không tải được báo cáo bán hàng" /> : null}
      {summary && (summary.noCostOrders > 0 || summary.provisionalOrders > 0) ? (
        <Alert
          className="smr-alert"
          type="warning"
          showIcon
          message={[
            summary.noCostOrders > 0 ? `${summary.noCostOrders} đơn thiếu giá vốn` : null,
            summary.provisionalOrders > 0 ? `${summary.provisionalOrders} đơn đang dùng giá vốn tạm tính` : null,
          ].filter(Boolean).join(" · ") + " — lãi sẽ tự cập nhật khi giá vốn được chốt."}
        />
      ) : null}

      <section className="smr-kpis">
        <Kpi label="Doanh thu thực hiện" value={compactMoney(summary?.revenue ?? 0)} hint={money(summary?.revenue ?? 0)} />
        <Kpi label="Lãi thực hiện" value={compactMoney(summary?.profit ?? 0)} hint={`Biên ${summary?.marginPercent ?? 0}%`} tone={(summary?.profit ?? 0) < 0 ? "bad" : "good"} />
        <Kpi label="Sản lượng đã xuất" value={qty(summary?.deliveredQty ?? 0)} hint={`${summary?.orderCount ?? 0} đơn`} />
        <Kpi label="Lô còn lại" value={qty(summary?.remainingLotQty ?? 0)} hint={`${summary?.completedLotOrders ?? 0}/${summary?.lotOrders ?? 0} lô hoàn thành`} />
        <Kpi label="Đơn đang lỗ" value={qty(summary?.lossOrders ?? 0)} hint="Theo giá vốn hiện tại" tone={(summary?.lossOrders ?? 0) > 0 ? "bad" : "neutral"} />
      </section>

      <Tabs className="smr-tabs" defaultActiveKey="overview" items={[
        { key: "overview", label: <span><ShoppingOutlined /> Tổng quan</span>, children: <div className="smr-overview-grid"><section className="smr-panel"><div className="smr-panel-title"><div><strong>Tiến độ đơn lô</strong><span>Những lô cần theo dõi rút hàng</span></div></div>{orderTable(lotRows, false)}</section><section className="smr-panel"><div className="smr-panel-title"><div><strong>Sale tạo lãi tốt nhất</strong><span>Xếp theo số lãi thực hiện, không theo sản lượng</span></div><TrophyOutlined /></div><Table size="small" rowKey={(row) => row.employeeId ?? "UNASSIGNED"} pagination={false} columns={salespersonColumns.slice(0, 2).concat(salespersonColumns.slice(4, 6)) as never} dataSource={(report?.salespeople ?? []).slice(0, 6)} /></section></div> },
        { key: "orders", label: <span><RiseOutlined /> Đơn hàng & lô <Tag>{report?.orders.total ?? 0}</Tag></span>, children: <section className="smr-panel">{orderTable(report?.orders.items ?? [], true)}</section> },
        { key: "sales", label: <span><TrophyOutlined /> Hiệu quả Sale</span>, children: <section className="smr-panel"><div className="smr-panel-title"><div><strong>Bảng xếp hạng theo lãi</strong><span>Sản lượng chỉ để đối chiếu; thứ hạng mặc định dựa trên lãi thực hiện</span></div></div><Table size="small" rowKey={(row) => row.employeeId ?? "UNASSIGNED"} pagination={false} columns={salespersonColumns} dataSource={report?.salespeople ?? []} /></section> },
      ]} />
      <footer className="smr-note"><FallOutlined /> Doanh thu và lãi chỉ ghi nhận theo lượng đã xuất kho; phần lô chưa rút được theo dõi riêng, không cộng vào lãi thực hiện.</footer>
    </main>
  );
}
