import React, { useState } from "react";
import { Button, Space, Table, Tabs, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { SettingOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { PartySelect } from "../../../shared/ui/PartySelect";
import { EmployeeSelect } from "../../../shared/ui/EmployeeSelect";
import { FilterButton, FilterTags, RefreshButton } from "../../../shared/ui/TableFilter";
import type { ActiveFilterTag } from "../../../shared/ui/TableFilter";
import { useCreateInvoiceDraft, useSalesInvoices, useUnissuedSalesInvoices } from "../hooks";
import type { SalesInvoice, SalesInvoiceStatus, UnissuedInvoiceSource } from "../types";
import { SalesInvoiceDrawer } from "../ui/SalesInvoiceDrawer";
import { formatMoney, InvoiceStatusTag } from "../ui/labels";

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
  const isUnissued = tab === "UNISSUED";
  const status = tab === "ALL" || isUnissued ? undefined : (tab as SalesInvoiceStatus);
  const listQuery = useSalesInvoices({ status, customerPartyId, accountantEmployeeId, page, limit: 20 }, !isUnissued);
  const unissuedQuery = useUnissuedSalesInvoices({ customerPartyId, accountantEmployeeId, page, limit: 20 }, isUnissued);
  const draftMutation = useCreateInvoiceDraft();
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
    { title: "Số đơn hàng", key: "orderNo", width: 155, fixed: "left", render: (_, row) => row.salesOrder?.orderNo ?? row.withdrawalRequest?.salesOrder?.orderNo ?? row.withdrawalRequest?.requestNo ?? "—" },
    { title: "Ngày đặt hàng", key: "orderDate", width: 120, render: (_, row) => {
      const date = row.salesOrder?.orderDate ?? row.withdrawalRequest?.salesOrder?.orderDate;
      return date ? dayjs(date).format("DD/MM/YYYY") : "—";
    } },
    { title: "Khách hàng", key: "customer", width: 125, ellipsis: true, render: (_, row) => row.customer?.code ?? "—" },
    { title: "Loại hàng", key: "products", width: 230, ellipsis: true, render: (_, row) => {
      const values = [...new Set((row.lines ?? []).map((line) => line.product?.code ?? line.description).filter(Boolean))];
      return values.join(", ") || "—";
    } },
    { title: "Tổng tiền", dataIndex: "grandTotal", width: 135, align: "right", render: (value) => <strong>{formatMoney(value)}</strong> },
    { title: "Số HĐ", key: "invoiceNo", width: 155, render: (_, row) => <Button type="link" style={{ padding: 0 }} onClick={() => setDetailId(row.id)}>{row.misaInvoiceNo ?? row.invoiceNoInternal}</Button> },
    { title: "Kế toán phụ trách", key: "accountant", width: 170, render: (_, row) => row.accountantEmployee?.fullName ?? row.accountantEmployee?.code ?? "Chưa gán" },
    { title: "Trạng thái HĐ", dataIndex: "status", width: 140, fixed: "right", render: (value: SalesInvoiceStatus) => <InvoiceStatusTag status={value} /> },
  ];
  const unissuedColumns: ColumnsType<UnissuedInvoiceSource> = [
    { title: "Số đơn hàng", dataIndex: "sourceNo", width: 155, fixed: "left" },
    { title: "Ngày đặt hàng", dataIndex: "sourceDate", width: 120, render: (value) => dayjs(value).format("DD/MM/YYYY") },
    { title: "Khách hàng", key: "customer", width: 125, ellipsis: true, render: (_, row) => row.customer.code ?? "—" },
    { title: "Loại hàng", dataIndex: "itemCodes", width: 230, ellipsis: true, render: (value: string[]) => value.join(", ") || "—" },
    { title: "Tổng tiền", dataIndex: "estimatedGrandTotal", width: 135, align: "right", render: (value) => <strong>{formatMoney(value)}</strong> },
    { title: "Trạng thái HĐ", width: 140, render: () => <Tag color="default">Chưa xuất HĐ</Tag> },
    { title: "Thao tác", key: "actions", width: 135, fixed: "right", render: (_, row) => <Button size="small" type="primary" loading={draftMutation.isPending} onClick={() => draftMutation.mutate(row.source)}>Tạo nháp HĐ</Button> },
  ];
  const currentQuery = isUnissued ? unissuedQuery : listQuery;
  const currentData = isUnissued ? (unissuedQuery.data?.items ?? []) : (listQuery.data?.items ?? []);
  return (
    <div className="sales-page sales-invoices-page">
      <div className="sales-toolbar">
        <Typography.Title level={4} style={{ margin: 0 }}>Hóa đơn bán hàng</Typography.Title>
        <Space>
          <Button size="small" icon={<SettingOutlined />} onClick={() => navigate("/sales/invoices/settings")}>Cấu hình hóa đơn</Button>
          <FilterButton count={filterTags.length} open={filterOpen} onOpenChange={setFilterOpen} content={filterPanel} />
          <RefreshButton loading={currentQuery.isFetching} onClick={() => currentQuery.refetch()} />
        </Space>
      </div>
      <Tabs className="sales-status-tabs" activeKey={tab} onChange={(key) => { setTab(key as InvoiceTab); setPage(1); }} items={TABS.map((item) => ({ key: item.key, label: `${item.label} (${counts[item.key]})` }))} />
      <FilterTags items={filterTags} />
      <Table<any> className="sales-grid" rowKey="id" size="small" loading={currentQuery.isLoading} columns={(isUnissued ? unissuedColumns : invoiceColumns) as ColumnsType<any>} dataSource={currentData} scroll={{ x: 1240 }} pagination={{ current: page, pageSize: 20, total: currentQuery.data?.total ?? 0, showSizeChanger: false, onChange: setPage }} />
      <SalesInvoiceDrawer id={detailId} open={Boolean(detailId)} onClose={() => setDetailId(undefined)} />
    </div>
  );
}
