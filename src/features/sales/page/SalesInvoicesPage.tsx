import React, { useState } from "react";
import { Button, Space, Table, Tabs, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { FileTextOutlined, SettingOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { PartySelect } from "../../../shared/ui/PartySelect";
import { EmployeeSelect } from "../../../shared/ui/EmployeeSelect";
import { FilterButton, FilterTags, RefreshButton } from "../../../shared/ui/TableFilter";
import type { ActiveFilterTag } from "../../../shared/ui/TableFilter";
import { openBlankTab, useSalesInvoices, useUnissuedSalesInvoices, useViewInvoiceDocument } from "../hooks";
import type { SalesInvoice, SalesInvoiceLine, SalesInvoiceStatus, UnissuedInvoiceSource } from "../types";
import { SalesInvoiceDrawer } from "../ui/SalesInvoiceDrawer";
import { IssueFromSourceModal } from "../ui/IssueFromSourceModal";
import { formatMoney, formatQty, InvoiceStatusTag } from "../ui/labels";

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
  const listQuery = useSalesInvoices({ status, customerPartyId, accountantEmployeeId, page, limit: 20 }, !isUnissued);
  const unissuedQuery = useUnissuedSalesInvoices({ customerPartyId, accountantEmployeeId, page, limit: 20 }, isUnissued);
  const allCount = useSalesInvoices({ customerPartyId, accountantEmployeeId, limit: 1 });
  const draftCount = useSalesInvoices({ status: "DRAFT", customerPartyId, accountantEmployeeId, limit: 1 });
  const issuedCount = useSalesInvoices({ status: "ISSUED", customerPartyId, accountantEmployeeId, limit: 1 });
  const failedCount = useSalesInvoices({ status: "ISSUE_FAILED", customerPartyId, accountantEmployeeId, limit: 1 });
  const cancelledCount = useSalesInvoices({ status: "CANCELLED", customerPartyId, accountantEmployeeId, limit: 1 });
  const unissuedCount = useUnissuedSalesInvoices({ customerPartyId, accountantEmployeeId, limit: 1 });
  const counts: Record<InvoiceTab, number> = {
    ALL: allCount.data?.total ?? 0,
    UNISSUED: unissuedCount.data?.total ?? 0,
    DRAFT: draftCount.data?.total ?? 0,
    ISSUED: issuedCount.data?.total ?? 0,
    ISSUE_FAILED: failedCount.data?.total ?? 0,
    CANCELLED: cancelledCount.data?.total ?? 0,
  };

  const filterTags = [
    customerPartyId && { key: "customer", label: "Đang lọc theo khách hàng", onClear: () => { setCustomerPartyId(undefined); setPage(1); } },
    accountantEmployeeId && { key: "accountant", label: "Đang lọc theo kế toán phụ trách", onClear: () => { setAccountantEmployeeId(undefined); setPage(1); } },
  ].filter(Boolean) as ActiveFilterTag[];
  const filterPanel = (
    <div className="table-filter-panel">
      <div style={{ marginBottom: 10 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>Khách hàng</Typography.Text>
        <PartySelect partyRole="CUSTOMER" allowClear style={{ width: "100%" }} placeholder="Mọi khách hàng" value={customerPartyId} onChange={(value) => { setCustomerPartyId(value ?? undefined); setPage(1); }} />
      </div>
      <div style={{ marginBottom: 10 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>Kế toán phụ trách</Typography.Text>
        <EmployeeSelect allowClear style={{ width: "100%" }} placeholder="Mọi kế toán" value={accountantEmployeeId} onChange={(value) => { setAccountantEmployeeId(value ?? undefined); setPage(1); }} />
      </div>
      <div style={{ textAlign: "right" }}><Button size="small" onClick={() => { setCustomerPartyId(undefined); setAccountantEmployeeId(undefined); setPage(1); }}>Đặt lại</Button></div>
    </div>
  );
  const invoiceColumns: ColumnsType<SalesInvoice> = [
    { title: "Số đơn hàng", key: "orderNo", width: 140, fixed: "left", render: (_, row) => row.salesOrder?.orderNo ?? row.withdrawalRequest?.salesOrder?.orderNo ?? row.withdrawalRequest?.requestNo ?? "—" },
    { title: "Ngày đặt hàng", key: "orderDate", width: 92, render: (_, row) => {
      const date = row.salesOrder?.orderDate ?? row.withdrawalRequest?.salesOrder?.orderDate;
      return date ? dayjs(date).format("DD/MM/YYYY") : "—";
    } },
    { title: "Khách hàng", key: "customer", width: 92, ellipsis: true, render: (_, row) => row.customer?.code ?? "—" },
    { title: "Loại hàng", key: "products", width: 110, ellipsis: true, render: (_, row) => {
      const values = [...new Set((row.lines ?? []).map((line) => line.product?.code ?? line.description).filter(Boolean))];
      return values.join(", ") || "—";
    } },
    { title: "Số lượng", key: "qty", width: 92, align: "right", render: (_, row) => formatQty(sumQty((row.lines ?? []).map((line) => line.qty))) },
    { title: "Đơn giá HĐ (sau CK)", key: "unitPrice", width: 124, align: "right", render: (_, row) => renderInvoiceUnitPrices(row.lines ?? []) },
    { title: "Thuế", key: "tax", width: 72, align: "right", render: (_, row) => renderTaxRates(row.lines ?? []) },
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
    { title: "Trạng thái HĐ", dataIndex: "status", width: 104, fixed: "right", render: (value: SalesInvoiceStatus) => <InvoiceStatusTag status={value} /> },
    {
      // Hóa đơn đã phát hành mở thẳng bản PDF do MISA ký, không qua bản thể hiện nội bộ.
      title: "",
      key: "actions",
      width: 52,
      align: "center",
      fixed: "right",
      render: (_, row) =>
        row.status === "ISSUED" ? (
          <Tooltip title="Xem hóa đơn">
            <Button
              size="small"
              type="text"
              icon={<FileTextOutlined />}
              aria-label={`Xem hóa đơn ${row.misaInvoiceNo ?? row.invoiceNoInternal}`}
              onClick={() =>
                viewDocumentMutation.mutate({ invoiceId: row.id, tab: openBlankTab() })
              }
            />
          </Tooltip>
        ) : (
          <span style={{ color: "rgba(0,0,0,0.25)" }}>—</span>
        ),
    },
  ];
  const unissuedColumns: ColumnsType<UnissuedInvoiceSource> = [
    { title: "Số đơn hàng", dataIndex: "sourceNo", width: 140, fixed: "left" },
    { title: "Ngày đặt hàng", dataIndex: "sourceDate", width: 92, render: (value) => dayjs(value).format("DD/MM/YYYY") },
    { title: "Khách hàng", key: "customer", width: 92, ellipsis: true, render: (_, row) => row.customer.code ?? "—" },
    { title: "Loại hàng", dataIndex: "itemCodes", width: 110, ellipsis: true, render: (value: string[]) => value.join(", ") || "—" },
    { title: "Số lượng", dataIndex: "estimatedQty", width: 92, align: "right", render: (value) => formatQty(value) },
    { title: "Đơn giá HĐ (sau CK)", key: "estimatedUnitPrice", width: 124, align: "right", render: (_, row) => renderEstimatedUnitPrices(row) },
    { title: "Thuế", key: "estimatedTax", width: 72, align: "right", render: (_, row) => renderEstimatedTaxRates(row) },
    { title: "Tổng thanh toán", dataIndex: "estimatedGrandTotal", width: 124, align: "right", render: (value) => <strong>{formatMoney(value)}</strong> },
    {
      title: "Công nợ",
      key: "creditWarning",
      width: 112,
      align: "center",
      render: (_, row) => row.creditWarning ? (
        <Tooltip title={creditWarningText(row.creditWarning)}>
          <Tag color="warning">Cần xác nhận</Tag>
        </Tooltip>
      ) : null,
    },
    { title: "Trạng thái HĐ", width: 104, render: () => <Tag color="default">Chưa xuất HĐ</Tag> },
    {
      title: "Thao tác",
      key: "actions",
      width: 120,
      fixed: "right",
      // Chỉ mở hộp xem trước — chưa dựng nháp, chưa gửi gì ra ngoài. Phát hành là gửi
      // hóa đơn đi, không rút lại được, nên bước dừng lại nằm ở chính hộp đó.
      render: (_, row) => (
        <Button size="small" type="primary" onClick={() => setIssuingRow(row)}>
          Xuất hóa đơn
        </Button>
      ),
    },
  ];
  const currentQuery = isUnissued ? unissuedQuery : listQuery;
  const currentData = isUnissued ? (unissuedQuery.data?.items ?? []) : (listQuery.data?.items ?? []);
  return (
    <div className="sales-page sales-invoices-page">
      <div className="sales-toolbar">
        <Typography.Title level={4} style={{ margin: 0 }}>Hóa đơn bán hàng</Typography.Title>
      </div>
      {/* Nút tác vụ nằm cùng hàng với tab, dồn phải — bớt một dòng chiều cao. */}
      <Tabs
        className="sales-status-tabs"
        activeKey={tab}
        onChange={(key) => { setTab(key as InvoiceTab); setPage(1); }}
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
      />
      <FilterTags items={filterTags} />
      <Table<any> className="sales-grid" rowKey="id" size="small" bordered loading={currentQuery.isLoading} columns={(isUnissued ? unissuedColumns : invoiceColumns) as ColumnsType<any>} dataSource={currentData} scroll={{ x: 1080 }} pagination={{ current: page, pageSize: 20, total: currentQuery.data?.total ?? 0, showSizeChanger: false, onChange: setPage }} />
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
