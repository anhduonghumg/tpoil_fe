import React, { useState } from "react";
import { Alert, Button, Checkbox, Empty, Pagination, Select, Skeleton, Space, Tabs, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { EyeOutlined, FilePdfOutlined, FileTextOutlined, FilterOutlined, SettingOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { PartySelect } from "../../../shared/ui/PartySelect";
import { EmployeeSelect } from "../../../shared/ui/EmployeeSelect";
import { FilterButton, FilterTags, RefreshButton } from "../../../shared/ui/TableFilter";
import type { ActiveFilterTag } from "../../../shared/ui/TableFilter";
import { CommonTable, DateColumnFilter, NumberColumnFilter, TextColumnFilter } from "../../../shared/ui/CommonTable";
import type { CommonColumnTool } from "../../../shared/ui/CommonTable";
import { MobileActiveFilters, MobileList, MobileListItem, MobileListToolbar, MobileListValues } from "../../../shared/ui/MobileList";
import { mobileListSummary, useIsMobile } from "../../../shared/ui/mobile";
import "../../../shared/ui/page-shell.css";
import "../sales-invoices.css";
import { openBlankTab, useSalesInvoices, useUnissuedSalesInvoices, useViewInvoiceDocument } from "../hooks";
import type { SalesInvoice, SalesInvoiceLine, SalesInvoiceStatus, UnissuedInvoiceSource } from "../types";
import { SalesInvoiceDrawer } from "../ui/SalesInvoiceDrawer";
import { IssueFromSourceModal } from "../ui/IssueFromSourceModal";
import { InvoiceBatchHistory, InvoiceBatchProgressModal } from "../ui/InvoiceBatchProgress";
import { BulkInvoiceIssueModal } from "../ui/BulkInvoiceIssueModal";
import { useCan } from "../../../shared/authz/useCan";
import { formatMoney, formatQty, InvoiceStatusIcon, InvoiceStatusTag } from "../ui/labels";

const sumQty = (values: Array<string | number | null | undefined>) =>
  values.reduce((sum: number, value) => sum + Number(value ?? 0), 0);

/**
 * Một chứng từ nhiều dòng có thể mỗi dòng một giá. Gộp bình quân sẽ ra con số không
 * nằm trên chứng từ nào, nên chỉ hiện số khi mọi dòng cùng giá; nhiều mức thì đếm và
 * liệt kê trong tooltip.
 */
function renderUnitPrices(values: Array<string | number | null | undefined>) {
  const distinct = [...new Set(values.filter((value) => value != null && value !== "").map(String))];
  if (!distinct.length) return "—";
  if (distinct.length === 1) return formatMoney(distinct[0]);
  return (
    <Tooltip title={distinct.map((value) => formatMoney(value)).join(" · ")}>
      <span>{distinct.length} mức giá</span>
    </Tooltip>
  );
}

/**
 * Giá lưu trên SalesInvoiceLine là giá gốc; discountAmount là tổng CK của cả dòng.
 * Các hàm này lấy đúng giá đơn vị đã trừ CK để danh sách không hiển thị giá khác
 * với nội dung sẽ gửi lên hóa đơn.
 */
function invoiceNetUnitPrice(line: SalesInvoiceLine) {
  const qty = Number(line.qty ?? 0);
  if (qty > 0 && line.netAmount != null) return Number(line.netAmount) / qty;
  return Number(line.unitPrice ?? 0) - (qty > 0 ? Number(line.discountAmount ?? 0) / qty : 0);
}

function invoicePaymentUnitPrice(line: SalesInvoiceLine) {
  const qty = Number(line.qty ?? 0);
  if (qty > 0 && line.lineTotal != null) return Number(line.lineTotal) / qty;
  const net = invoiceNetUnitPrice(line);
  const taxRate = line.taxRate == null ? 0 : Number(line.taxRate);
  return net * (1 + taxRate);
}

function renderInvoiceUnitPrices(lines: SalesInvoiceLine[]) {
  const netPrices = [...new Set(lines.map(invoiceNetUnitPrice).map((value) => value.toString()))];
  const paymentPrices = [...new Set(lines.map(invoicePaymentUnitPrice).map((value) => value.toString()))];
  if (!netPrices.length) return "—";
  const paymentLabel = paymentPrices.map((value) => formatMoney(value)).join(" · ");
  if (netPrices.length === 1) {
    return (
      <Tooltip title={`Đã trừ CK, chưa VAT. Đơn giá thanh toán sau VAT: ${paymentLabel}`}>
        <span>{formatMoney(netPrices[0])}</span>
      </Tooltip>
    );
  }
  return (
    <Tooltip title={`Giá sau CK: ${netPrices.map((value) => formatMoney(value)).join(" · ")} · Sau VAT: ${paymentLabel}`}>
      <span>{netPrices.length} mức giá</span>
    </Tooltip>
  );
}

function renderTaxRates(lines: SalesInvoiceLine[]) {
  const rates = [...new Set(lines.map((line) => {
    if (line.taxRateName) return line.taxRateName;
    if (line.taxRate == null) return "KCT";
    return `${Number(line.taxRate) * 100}%`;
  }))];
  if (!rates.length) return "—";
  return rates.length === 1 ? rates[0] : <Tooltip title={rates.join(" · ")}>{rates.length} mức</Tooltip>;
}

function renderEstimatedUnitPrices(row: UnissuedInvoiceSource) {
  const netPrices = row.estimatedNetUnitPrices?.length ? row.estimatedNetUnitPrices : row.estimatedUnitPrices;
  const paymentPrices = row.estimatedPaymentUnitPrices ?? [];
  if (!netPrices.length) return "—";
  const paymentLabel = paymentPrices.map((value) => formatMoney(value)).join(" · ");
  return (
    <Tooltip title={paymentLabel ? `Đã trừ CK, chưa VAT. Đơn giá thanh toán sau VAT: ${paymentLabel}` : "Đã trừ CK, chưa VAT"}>
      {renderUnitPrices(netPrices)}
    </Tooltip>
  );
}

function renderEstimatedTaxRates(row: UnissuedInvoiceSource) {
  const rates = row.estimatedTaxRateNames ?? [];
  if (!rates.length) return "—";
  return rates.length === 1 ? rates[0] : <Tooltip title={rates.join(" · ")}>{rates.length} mức</Tooltip>;
}

function creditWarningText(warning: NonNullable<UnissuedInvoiceSource["creditWarning"]>) {
  const messages: string[] = [];
  if (Number(warning.overdueAmount) > 0) {
    messages.push(`Nợ quá hạn: ${formatMoney(warning.overdueAmount)}`);
  }
  if (Number(warning.exceededBy) > 0) {
    messages.push(`Vượt hạn mức: ${formatMoney(warning.exceededBy)}`);
  }
  return messages.join(" · ") || "Cần kế toán xác nhận công nợ trước khi phát hành";
}

// Every cell uses the same line order and height, keeping product/quantity/price aligned.
function lineCells<T>(lines: T[], render: (line: T) => React.ReactNode) {
  return <div className="invoice-line-cells">{lines.map((line, index) => <div className="invoice-line-cell" key={index}>{render(line)}</div>)}</div>;
}

function invoiceDiscountUnitPrice(line: SalesInvoiceLine) {
  const qty = Number(line.qty);
  return qty !== 0 ? Number(line.discountAmount ?? 0) / qty : Number(line.discountAmount ?? 0) === 0 ? 0 : null;
}

function renderDiscount(value: string | number | null) {
  return value == null ? <Tooltip title="Không thể quy đổi CK/đv khi số lượng bằng 0">—</Tooltip> : formatMoney(value);
}

type InvoiceTab = "ALL" | "UNISSUED" | "DRAFT" | "ISSUED" | "ISSUE_FAILED" | "CANCELLED";
const TABS: Array<{ key: InvoiceTab; label: string }> = [
  { key: "ALL", label: "Tất cả" },
  { key: "UNISSUED", label: "Chưa xuất HĐ" },
  { key: "DRAFT", label: "Xuất nháp" },
  { key: "ISSUED", label: "Đã phát hành" },
  { key: "ISSUE_FAILED", label: "Xuất HĐ lỗi" },
  { key: "CANCELLED", label: "Hóa đơn hủy" },
];

export default function SalesInvoicesPage() {
  const mobile = useIsMobile();
  const { can } = useCan();
  const canIssue = can("sales.invoice.issue");
  const [selected, setSelected] = useState<UnissuedInvoiceSource[]>([]);
  const [batchRunId, setBatchRunId] = useState<string>();
  const [batchRows, setBatchRows] = useState<UnissuedInvoiceSource[]>();
  const [columnsFilter, setColumnsFilter] = useState<{ orderNo?: string; productKeyword?: string; invoiceNo?: string; orderDateFrom?: string; orderDateTo?: string; minTotal?: number; maxTotal?: number }>({});
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const applyColumns = (patch: Partial<typeof columnsFilter>) => { setColumnsFilter((previous) => ({ ...previous, ...patch })); setPage(1); };
  const navigate = useNavigate();
  const [tab, setTab] = useState<InvoiceTab>("ALL");
  const [customerPartyId, setCustomerPartyId] = useState<string>();
  const [accountantEmployeeId, setAccountantEmployeeId] = useState<string>();
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [detailId, setDetailId] = useState<string>();
  /** Chứng từ đang mở hộp phát hành ở tab "Chưa xuất HĐ". */
  const [issuingRow, setIssuingRow] = useState<UnissuedInvoiceSource>();
  /** Hóa đơn đang mở bản in trong hệ thống. */
  const viewDocumentMutation = useViewInvoiceDocument();
  const isUnissued = tab === "UNISSUED";
  const status = tab === "ALL" || isUnissued ? undefined : (tab as SalesInvoiceStatus);
  const { invoiceNo: invoiceNoFilter, ...sourceFilters } = columnsFilter;
  const sharedQuery = { ...sourceFilters, customerPartyId, accountantEmployeeId };
  const invoiceQuery = { ...sharedQuery, ...(isUnissued ? {} : { invoiceNo: invoiceNoFilter }) };
  const listQuery = useSalesInvoices({ ...invoiceQuery, status, page, limit: 20 }, !isUnissued);
  const unissuedQuery = useUnissuedSalesInvoices({ ...sharedQuery, page, limit: 20 }, isUnissued);
  const allCount = useSalesInvoices({ ...invoiceQuery, limit: 1 });
  const draftCount = useSalesInvoices({ ...invoiceQuery, status: "DRAFT", limit: 1 });
  const issuedCount = useSalesInvoices({ ...invoiceQuery, status: "ISSUED", limit: 1 });
  const failedCount = useSalesInvoices({ ...invoiceQuery, status: "ISSUE_FAILED", limit: 1 });
  const cancelledCount = useSalesInvoices({ ...invoiceQuery, status: "CANCELLED", limit: 1 });
  const unissuedCount = useUnissuedSalesInvoices({ ...sharedQuery, limit: 1 });
  const counts: Record<InvoiceTab, number> = {
    ALL: allCount.data?.total ?? 0,
    UNISSUED: unissuedCount.data?.total ?? 0,
    DRAFT: draftCount.data?.total ?? 0,
    ISSUED: issuedCount.data?.total ?? 0,
    ISSUE_FAILED: failedCount.data?.total ?? 0,
    CANCELLED: cancelledCount.data?.total ?? 0,
  };

  const filterTags = [
    columnsFilter.orderNo && { key: "orderNo", label: `Đơn/phiếu: ${columnsFilter.orderNo}`, onClear: () => applyColumns({ orderNo: undefined }) },
    columnsFilter.productKeyword && { key: "product", label: `Hàng: ${columnsFilter.productKeyword}`, onClear: () => applyColumns({ productKeyword: undefined }) },
    !isUnissued && invoiceNoFilter && { key: "invoiceNo", label: `HĐ: ${invoiceNoFilter}`, onClear: () => applyColumns({ invoiceNo: undefined }) },
    (columnsFilter.orderDateFrom || columnsFilter.orderDateTo) && { key: "date", label: `Ngày: ${columnsFilter.orderDateFrom ?? "…"} → ${columnsFilter.orderDateTo ?? "…"}`, onClear: () => applyColumns({ orderDateFrom: undefined, orderDateTo: undefined }) },
    (columnsFilter.minTotal != null || columnsFilter.maxTotal != null) && { key: "total", label: `Thanh toán: ${columnsFilter.minTotal == null ? "…" : formatMoney(columnsFilter.minTotal)} → ${columnsFilter.maxTotal == null ? "…" : formatMoney(columnsFilter.maxTotal)}`, onClear: () => applyColumns({ minTotal: undefined, maxTotal: undefined }) },
    customerPartyId && { key: "customer", label: "Đang lọc theo khách hàng", onClear: () => { setCustomerPartyId(undefined); setPage(1); } },
    accountantEmployeeId && { key: "accountant", label: "Đang lọc theo kế toán phụ trách", onClear: () => { setAccountantEmployeeId(undefined); setPage(1); } },
  ].filter(Boolean) as ActiveFilterTag[];
  const resetFilters = () => { setColumnsFilter({}); setCustomerPartyId(undefined); setAccountantEmployeeId(undefined); setPage(1); };
  const changeTab = (key: string) => { setSelected([]); setTab(key as InvoiceTab); setPage(1); if (key === "UNISSUED") applyColumns({ invoiceNo: undefined }); };
  const tools: Record<string, CommonColumnTool> = {
    orderNo: { label: "Lọc số đơn/phiếu", active: Boolean(columnsFilter.orderNo), render: (close) => <TextColumnFilter label="Số đơn hoặc phiếu rút" value={columnsFilter.orderNo} onApply={(orderNo) => applyColumns({ orderNo })} close={close} /> },
    orderDate: { label: "Lọc ngày đặt hàng", active: Boolean(columnsFilter.orderDateFrom || columnsFilter.orderDateTo), render: (close) => <DateColumnFilter from={columnsFilter.orderDateFrom} to={columnsFilter.orderDateTo} onApply={(orderDateFrom, orderDateTo) => applyColumns({ orderDateFrom, orderDateTo })} close={close} /> },
    products: { label: "Lọc mặt hàng", active: Boolean(columnsFilter.productKeyword), render: (close) => <TextColumnFilter label="Mã mặt hàng" value={columnsFilter.productKeyword} onApply={(productKeyword) => applyColumns({ productKeyword })} close={close} /> },
    invoiceNo: { label: "Lọc số hóa đơn", active: Boolean(invoiceNoFilter), render: (close) => <TextColumnFilter label="Số HĐ hoặc chứng từ nội bộ" value={invoiceNoFilter} onApply={(invoiceNo) => applyColumns({ invoiceNo })} close={close} /> },
    grandTotal: { label: "Lọc tổng thanh toán", active: columnsFilter.minTotal != null || columnsFilter.maxTotal != null, render: (close) => <NumberColumnFilter min={columnsFilter.minTotal} max={columnsFilter.maxTotal} onApply={(minTotal, maxTotal) => applyColumns({ minTotal, maxTotal })} close={close} /> },
    customer: { label: "Lọc khách hàng", active: Boolean(customerPartyId), render: (close) => <PartySelect partyRole="CUSTOMER" size="small" displayMode="code" optionDisplayMode="code" allowClear value={customerPartyId} placeholder="Mọi khách hàng" styles={{ popup: { root: { minWidth: 0, maxWidth: "calc(100vw - 32px)" } } }} onChange={(value) => { setCustomerPartyId(value ?? undefined); setPage(1); close(); }} /> },
    accountant: { label: "Lọc kế toán phụ trách", active: Boolean(accountantEmployeeId), render: (close) => <EmployeeSelect size="small" allowClear value={accountantEmployeeId} onChange={(value) => { setAccountantEmployeeId(value ?? undefined); setPage(1); close(); }} /> },
    status: { label: "Lọc trạng thái hóa đơn", active: Boolean(status), render: (close) => <Select size="small" value={tab} options={TABS.filter((item) => item.key !== "UNISSUED").map((item) => ({ value: item.key, label: item.label }))} onChange={(value) => { changeTab(value); close(); }} /> },
  };
  const filterPanel = (
    <div className="table-filter-panel invoice-filter-panel">
      <div style={{ marginBottom: 10 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>Khách hàng</Typography.Text>
        {tools.customer.render(() => {})}
      </div>
      <div style={{ marginBottom: 10 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>Kế toán phụ trách</Typography.Text>
        {tools.accountant.render(() => {})}
      </div>
      {Object.entries(tools).filter(([key]) => !["customer", "accountant", "status"].includes(key) && !(isUnissued && key === "invoiceNo")).map(([key, tool]) => <details key={key}><summary>{tool.label}{tool.active ? " •" : ""}</summary>{tool.render(() => {})}</details>)}
      <Space><Button size="small" onClick={resetFilters}>Xóa tất cả bộ lọc</Button><Button size="small" type="primary" onClick={() => { setFilterOpen(false); setActiveTool(null); }}>Đóng</Button></Space>
    </div>
  );
  const invoiceColumns: ColumnsType<SalesInvoice> = [
    { title: "Số đơn hàng", key: "orderNo", width: 140, fixed: "left", render: (_, row) => row.salesOrder?.orderNo ?? row.withdrawalRequest?.salesOrder?.orderNo ?? row.withdrawalRequest?.requestNo ?? "—" },
    { title: "Ngày đặt hàng", key: "orderDate", width: 92, render: (_, row) => {
      const date = row.salesOrder?.orderDate ?? row.withdrawalRequest?.salesOrder?.orderDate;
      return date ? dayjs(date).format("DD/MM/YYYY") : "—";
    } },
    { title: "Khách hàng", key: "customer", width: 92, ellipsis: true, render: (_, row) => row.customer?.code ?? "—" },
    { title: "Loại hàng", key: "products", width: 110, render: (_, row) => lineCells(row.lines ?? [], line => <span className="invoice-product-code" title={line.product?.code ?? line.description}>{line.product?.code ?? line.description ?? "—"}</span>) },
    { title: "Số lượng", key: "qty", width: 92, align: "right", render: (_, row) => lineCells(row.lines ?? [], line => formatQty(line.qty)) },
    { title: <Tooltip title="Chiết khấu trên mỗi đơn vị; đã trừ trong đơn giá HĐ">CK/đv</Tooltip>, key: "discount", width: 76, align: "right", render: (_, row) => lineCells(row.lines ?? [], line => renderDiscount(invoiceDiscountUnitPrice(line))) },
    { title: "Thuế", key: "tax", width: 72, align: "right", render: (_, row) => lineCells(row.lines ?? [], line => renderTaxRates([line])) },
    { title: "Tổng thanh toán", dataIndex: "grandTotal", width: 124, align: "right", render: (value) => <strong>{formatMoney(value)}</strong> },
    {
      // Số hóa đơn thật do MISA cấp và số chứng từ nội bộ là HAI thứ khác nhau. Trước đây
      // ô này lấy số nội bộ làm phương án dự phòng, nên hóa đơn phát hành lỗi trông vẫn
      // như đã có số hóa đơn.
      title: "Số HĐ",
      key: "invoiceNo",
      width: 124,
      render: (_, row) => (
        <Button
          type="link"
          className="sales-grid-link"
          style={{ padding: 0, height: "auto" }}
          onClick={() => setDetailId(row.id)}
        >
          <span className="sales-grid-stack">
            <span className={row.misaInvoiceNo ? "sales-grid-strong" : "sales-grid-empty"}>
              {row.misaInvoiceNo ?? "Chưa có số"}
            </span>
            <Tooltip title="Số chứng từ nội bộ của hệ thống">
              <span className="sales-grid-sub">{row.invoiceNoInternal}</span>
            </Tooltip>
          </span>
        </Button>
      ),
    },
    { title: "Kế toán phụ trách", key: "accountant", width: 120, ellipsis: true, render: (_, row) => row.accountantEmployee?.fullName ?? row.accountantEmployee?.code ?? "Chưa gán" },
    // Tab theo trạng thái thì mọi dòng cùng một trạng thái — chỉ tab "Tất cả" mới cần cột này,
    // và chỉ cần icon (tên trạng thái ở tooltip) để nhường chỗ cho số liệu.
    ...(tab === "ALL" ? [{ title: <Tooltip title="Trạng thái hóa đơn">TT</Tooltip>, key: "status", dataIndex: "status", width: 48, align: "center", fixed: "right", render: (value: SalesInvoiceStatus) => <InvoiceStatusIcon status={value} /> } satisfies ColumnsType<SalesInvoice>[number]] : []),
    {
      title: "Thao tác",
      key: "actions",
      width: 76,
      align: "center",
      fixed: "right",
      // Hóa đơn đã phát hành mở thẳng bản PDF do MISA ký, không qua bản thể hiện nội bộ;
      // các trạng thái khác mở ngăn chi tiết để xem nháp / lý do lỗi.
      render: (_, row) =>
        row.status === "ISSUED" ? (
          <Tooltip title="Xem hóa đơn PDF">
            <Button
              size="small"
              type="text"
              icon={<FilePdfOutlined />}
              aria-label={`Xem hóa đơn ${row.misaInvoiceNo ?? row.invoiceNoInternal}`}
              onClick={() =>
                viewDocumentMutation.mutate({ invoiceId: row.id, tab: openBlankTab() })
              }
            />
          </Tooltip>
        ) : (
          <Tooltip title="Xem chi tiết">
            <Button size="small" type="text" icon={<EyeOutlined />} aria-label={`Xem chi tiết ${row.invoiceNoInternal}`} onClick={() => setDetailId(row.id)} />
          </Tooltip>
        ),
    },
  ];
  const unissuedColumns: ColumnsType<UnissuedInvoiceSource> = [
    { title: "Số đơn hàng", key: "orderNo", dataIndex: "sourceNo", width: 140, fixed: "left" },
    { title: "Ngày đặt hàng", key: "orderDate", dataIndex: "sourceDate", width: 92, render: (value) => dayjs(value).format("DD/MM/YYYY") },
    { title: "Khách hàng", key: "customer", width: 92, ellipsis: true, render: (_, row) => row.customer.code ?? "—" },
    { title: "Loại hàng", key: "products", width: 110, render: (_, row) => row.estimatedLines?.length ? lineCells(row.estimatedLines, line => <span className="invoice-product-code" title={line.productCode ?? ""}>{line.productCode ?? "—"}</span>) : row.itemCodes.join(", ") || "—" },
    { title: "Số lượng", key: "qty", width: 86, align: "right", render: (_, row) => row.estimatedLines?.length ? lineCells(row.estimatedLines, line => formatQty(line.qty)) : formatQty(row.estimatedQty) },
    { title: <Tooltip title="Chiết khấu trên mỗi đơn vị; đã trừ trong đơn giá HĐ">CK/đv</Tooltip>, key: "discount", width: 92, align: "right", render: (_, row) => row.estimatedLines?.length ? lineCells(row.estimatedLines, line => renderDiscount(line.discountUnitPrice)) : "—" },
    { title: "Thuế", key: "estimatedTax", width: 58, align: "right", render: (_, row) => row.estimatedLines?.length ? lineCells(row.estimatedLines, line => line.taxRateName) : renderEstimatedTaxRates(row) },
    { title: "Tổng thanh toán", key: "grandTotal", dataIndex: "estimatedGrandTotal", width: 118, align: "right", render: (value) => <strong>{formatMoney(value)}</strong> },
    {
      title: "Thao tác",
      key: "actions",
      // Đủ chỗ cho chữ "THAO TÁC" — hẹp hơn thì tiêu đề tràn khỏi mép bảng, sinh cuộn ngang thừa.
      width: 76,
      align: "center",
      fixed: "right",
      // Chỉ mở hộp xem trước — chưa dựng nháp, chưa gửi gì ra ngoài. Phát hành là gửi
      // hóa đơn đi, không rút lại được, nên bước dừng lại nằm ở chính hộp đó.
      render: (_, row) => (
        <Tooltip title="Xuất hóa đơn">
          <Button size="small" type="primary" icon={<FileTextOutlined />} aria-label={`Xuất hóa đơn ${row.sourceNo}`} disabled={!canIssue} onClick={() => setIssuingRow(row)} />
        </Tooltip>
      ),
    },
  ];
  const currentQuery = isUnissued ? unissuedQuery : listQuery;
  const currentData = isUnissued ? (unissuedQuery.data?.items ?? []) : (listQuery.data?.items ?? []);
  const total = currentQuery.data?.total ?? 0;
  const pagination = total > 20 ? <Pagination size="small" simple current={page} pageSize={20} total={total} showSizeChanger={false} disabled={currentQuery.isFetching} onChange={setPage} /> : null;
  const visibleTools = isUnissued ? Object.fromEntries(Object.entries(tools).filter(([key]) => !["status", "invoiceNo"].includes(key))) : tools;
  const empty = <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={filterTags.length ? "Không có chứng từ phù hợp với bộ lọc." : "Chưa có chứng từ trong mục này."} />;
  // Một hàng duy nhất trên bảng: thao tác hàng loạt bên trái, lịch sử đợt xuất bên phải.
  // Chưa chọn đơn thì chỉ gợi ý cách dùng, không để một nút xám "(0)" chiếm chỗ.
  const unissuedToolbar = <>
    {canIssue ? selected.length ? <><Button size="small" type="primary" onClick={() => setBatchRows([...selected])}>Xuất hàng loạt ({selected.length})</Button><Button size="small" type="text" onClick={() => setSelected([])}>Bỏ chọn</Button></> : <span className="invoice-batch-hint">Tích chọn đơn để xuất hàng loạt</span> : null}
    {filterTags.length ? <><FilterTags items={filterTags} /><Button size="small" type="text" className="invoice-reset-filters" onClick={resetFilters}>Xóa lọc</Button></> : null}
    <InvoiceBatchHistory onOpen={setBatchRunId} />
  </>;
  const tableToolbar = filterTags.length ?<><FilterTags items={filterTags} /><Tooltip title="Xóa tất cả bộ lọc"><Button size="small" type="text" className="invoice-reset-filters" aria-label="Xóa tất cả bộ lọc" onClick={resetFilters}>Xóa lọc</Button></Tooltip></> : undefined;
  const mobileRow = (row: SalesInvoice | UnissuedInvoiceSource) => {
    const source = "sourceNo" in row ? row : null;
    const invoice = "invoiceNoInternal" in row ? row : null;
    const orderNo = source?.sourceNo ?? invoice?.salesOrder?.orderNo ?? invoice?.withdrawalRequest?.salesOrder?.orderNo ?? invoice?.withdrawalRequest?.requestNo ?? "—";
    const orderDate = source?.sourceDate ?? invoice?.salesOrder?.orderDate ?? invoice?.withdrawalRequest?.salesOrder?.orderDate;
    const amount = source?.estimatedGrandTotal ?? invoice?.grandTotal;
    const lines = invoice?.lines ?? [];
    return <MobileListItem key={row.id} title={row.customer?.code ?? "—"}
      status={invoice ? <InvoiceStatusTag status={invoice.status} /> : <Tag>Chưa xuất HĐ</Tag>}
      description={<>{source && canIssue ? <Checkbox aria-label={`Chọn ${orderNo}`} checked={selected.some(item => item.id === source.id)} onChange={event => setSelected(previous => event.target.checked ? [...previous.filter(item => item.id !== source.id), source] : previous.filter(item => item.id !== source.id))} /> : null}<span>{orderNo}</span>{orderDate ? <span>{dayjs(orderDate).format("DD/MM/YYYY")}</span> : null}</>}
      moreLabel={`Chi tiết hóa đơn của ${orderNo}`} detailsTitle={orderNo}
      details={<dl>
        <div><dt>Mặt hàng</dt><dd>{source ? source.itemCodes.join(", ") : [...new Set(lines.map((line) => line.product?.code ?? line.description))].join(", ")}</dd></div>
        <div><dt>Đơn giá sau CK, chưa VAT</dt><dd>{source ? renderEstimatedUnitPrices(source) : renderInvoiceUnitPrices(lines)}</dd></div>
        <div><dt>Thuế</dt><dd>{source ? renderEstimatedTaxRates(source) : renderTaxRates(lines)}</dd></div>
        <div><dt>Kế toán phụ trách</dt><dd>{row.accountantEmployee?.fullName ?? row.accountantEmployee?.code ?? "Chưa gán"}</dd></div>
        {source?.creditWarning ? <div><dt>Công nợ</dt><dd>{creditWarningText(source.creditWarning)}</dd></div> : null}
        {source?.purchaseInvoiceWarning ? <div><dt>Giá vốn</dt><dd>{source.purchaseInvoiceWarning.message}</dd></div> : null}
        {invoice ? <><div><dt>Số HĐ</dt><dd>{invoice.misaInvoiceNo ?? "Chưa có số"}</dd></div><div><dt>Chứng từ nội bộ</dt><dd>{invoice.invoiceNoInternal}</dd></div>
          <Button size="small" onClick={() => setDetailId(invoice.id)}>Mở chi tiết</Button>
          {invoice.status === "ISSUED" ? <Button size="small" onClick={() => viewDocumentMutation.mutate({ invoiceId: invoice.id, tab: openBlankTab() })}>Xem hóa đơn</Button> : null}</> : null}
      </dl>}
    >
      {(source?.estimatedLines?.length || lines.length) ? <div className="invoice-mobile-lines">
        {source ? source.estimatedLines?.map((line, index) => <div className="invoice-mobile-line" key={index}>
          <strong>{line.productCode ?? "—"}</strong><span>{formatQty(line.qty)} × {formatMoney(line.netUnitPrice)}</span>
          <small>CK/đv: {formatMoney(line.discountUnitPrice)} · Thuế: {line.taxRateName}</small>
        </div>) : lines.map((line, index) => <div className="invoice-mobile-line" key={index}>
          <strong>{line.product?.code ?? line.description}</strong><span>{formatQty(line.qty)} × {formatMoney(invoiceNetUnitPrice(line))}</span>
          <small>CK/đv: {renderDiscount(invoiceDiscountUnitPrice(line))} · Thuế: {renderTaxRates([line])}</small>
        </div>)}
      </div> : null}
      <MobileListValues items={[{ label: "Số lượng", value: formatQty(source?.estimatedQty ?? sumQty(lines.map((line) => line.qty))) }, { label: "Thanh toán", value: `${formatMoney(amount ?? 0)} đ` }]} />
      {source ? <div className="invoice-mobile-row-actions">
        {source.creditWarning ? <Tag color="warning">Công nợ cần xác nhận</Tag> : null}
        {source.purchaseInvoiceWarning ? <Tag color="gold">Giá vốn tạm tính</Tag> : null}
        <Button size="small" type="primary" disabled={!canIssue} onClick={() => setIssuingRow(source)}>Xuất hóa đơn</Button>
      </div> : null}
    </MobileListItem>;
  };
  return (
    <div className="page-shell sales-invoices-page">
      {/* Nút tác vụ nằm cùng hàng với tab, dồn phải — bớt một dòng chiều cao. */}
      {mobile ? <Select size="small" aria-label="Nhóm hóa đơn" value={tab} onChange={changeTab} options={TABS.map((item) => ({ value: item.key, label: `${item.label} (${counts[item.key]})` }))} /> : <Tabs
        size="small"
        className="sales-status-tabs"
        activeKey={tab}
        onChange={changeTab}
        tabBarExtraContent={{
          right: (
            <Space>
              <Button
                size="small"
                icon={<SettingOutlined />}
                onClick={() => navigate("/sales/invoices/settings")}
              >
                Cấu hình hóa đơn
              </Button>
              <FilterButton count={filterTags.length} open={filterOpen} onOpenChange={setFilterOpen} content={filterPanel} />
              <RefreshButton loading={currentQuery.isFetching} onClick={() => currentQuery.refetch()} />
            </Space>
          ),
        }}
        items={TABS.map((item) => ({ key: item.key, label: `${item.label} (${counts[item.key]})` }))}
      />}
      {isUnissued && mobile ? <div className="invoice-batch-toolbar"><InvoiceBatchHistory onOpen={setBatchRunId} /></div> : null}
      {mobile ? <MobileActiveFilters items={filterTags} /> : null}
      {currentQuery.isError ? <Alert type={currentQuery.data ? "warning" : "error"} showIcon message={currentQuery.data ? "Chưa làm mới được; đang hiển thị dữ liệu lần trước." : "Không tải được danh sách hóa đơn."} action={<Button size="small" loading={currentQuery.isFetching} onClick={() => { void currentQuery.refetch(); }}>Thử lại</Button>} /> : null}
      {!currentQuery.data && currentQuery.isPending ? <Skeleton active paragraph={{ rows: 5 }} /> : currentQuery.data ? mobile ? (
        currentData.length ? <MobileList>{currentData.map(mobileRow)}</MobileList> : empty
      ) : isUnissued ? <CommonTable<UnissuedInvoiceSource> tableKey="sales-invoices:unissued" rowSelection={canIssue ? { selectedRowKeys: selected.map(row => row.id), preserveSelectedRowKeys: true, onChange: (keys) => { const records = new Map([...selected, ...(unissuedQuery.data?.items ?? [])].map(row => [row.id, row])); setSelected(keys.map(key => records.get(String(key))).filter((row): row is UnissuedInvoiceSource => Boolean(row))); } } : undefined} toolbar={unissuedToolbar} columnTools={visibleTools} rowKey="id" size="small" bordered loading={currentQuery.isFetching} columns={unissuedColumns} dataSource={unissuedQuery.data?.items ?? []} pagination={{ current: page, pageSize: 20, total, showSizeChanger: false, onChange: setPage }} locale={{ emptyText: empty }} />
        : <CommonTable<SalesInvoice> tableKey="sales-invoices:documents" toolbar={tableToolbar} columnTools={visibleTools} rowKey="id" size="small" bordered loading={currentQuery.isFetching} columns={invoiceColumns} dataSource={listQuery.data?.items ?? []} pagination={{ current: page, pageSize: 20, total, showSizeChanger: false, onChange: setPage }} locale={{ emptyText: empty }} /> : null}
      {mobile ? <MobileListToolbar openTool={activeTool} onToolChange={setActiveTool}
        tools={[{ key: "filter", label: "Mở bộ lọc", title: "Lọc hóa đơn", icon: <FilterOutlined />, content: filterPanel, active: Boolean(filterTags.length) }]}
        actions={<><RefreshButton loading={currentQuery.isFetching} onClick={() => { void currentQuery.refetch(); }} /><Button size="small" type="text" aria-label="Cấu hình hóa đơn" icon={<SettingOutlined />} onClick={() => navigate("/sales/invoices/settings")} /></>}
        summary={mobileListSummary(currentQuery, total, Boolean(filterTags.length))} pagination={pagination}
      /> : null}
      {batchRows ? <BulkInvoiceIssueModal rows={batchRows} onCreated={setBatchRunId} onClose={() => { setBatchRows(undefined); setSelected([]); }} /> : null}
      {batchRunId ? <InvoiceBatchProgressModal id={batchRunId} onClose={() => setBatchRunId(undefined)} /> : null}
      <SalesInvoiceDrawer id={detailId} open={Boolean(detailId)} onClose={() => setDetailId(undefined)} />
      <IssueFromSourceModal
        key={issuingRow?.id}
        row={issuingRow}
        open={Boolean(issuingRow)}
        onClose={() => setIssuingRow(undefined)}
      />
    </div>
  );
}
