import React, { useState } from "react";
import { Button, Segmented, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { PartySelect } from "../../../shared/ui/PartySelect";
import { useSalesInvoices } from "../hooks";
import type { SalesInvoice, SalesInvoiceStatus } from "../types";
import { SalesInvoiceDrawer } from "../ui/SalesInvoiceDrawer";
import { formatMoney, INVOICE_DOC_TYPE_LABELS, InvoiceStatusTag } from "../ui/labels";

const STATUS_FILTERS = [
  { value: "ALL", label: "Tất cả" },
  { value: "DRAFT", label: "Nháp" },
  { value: "PENDING_ISSUE", label: "Đang phát hành" },
  { value: "ISSUE_FAILED", label: "Lỗi" },
  { value: "ISSUED", label: "Đã phát hành" },
  { value: "CANCELLED", label: "Đã hủy" },
];

export default function SalesInvoicesPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("ALL");
  const [customerPartyId, setCustomerPartyId] = useState<string>();
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<string>();

  const query = useSalesInvoices({
    status: status === "ALL" ? undefined : (status as SalesInvoiceStatus),
    customerPartyId,
    page,
    limit: 20,
  });
  const failedQuery = useSalesInvoices({ status: "ISSUE_FAILED", limit: 1 });
  const failedCount = failedQuery.data?.total ?? 0;

  const columns: ColumnsType<SalesInvoice> = [
    {
      title: "Số nội bộ",
      dataIndex: "invoiceNoInternal",
      width: 150,
      render: (value: string, invoice) => (
        <Button type="link" style={{ padding: 0 }} onClick={() => setDetailId(invoice.id)}>
          {value}
        </Button>
      ),
    },
    {
      title: "Số MISA",
      dataIndex: "misaInvoiceNo",
      width: 130,
      render: (value: string | null) => value ?? "—",
    },
    {
      title: "Ngày",
      dataIndex: "invoiceDate",
      width: 100,
      render: (value: string) => dayjs(value).format("DD/MM/YYYY"),
    },
    { title: "Người mua", key: "buyer", render: (_, invoice) => invoice.buyerName },
    {
      title: "Chứng từ nguồn",
      key: "source",
      width: 160,
      render: (_, invoice) =>
        invoice.salesOrder ? (
          <Button
            type="link"
            style={{ padding: 0 }}
            onClick={() => navigate(`/sales/orders/${invoice.salesOrder!.id}`)}
          >
            {invoice.salesOrder.orderNo}
          </Button>
        ) : (
          (invoice.withdrawalRequest?.requestNo ?? "—")
        ),
    },
    {
      title: "Loại",
      dataIndex: "documentType",
      width: 100,
      render: (value) => <Tag>{INVOICE_DOC_TYPE_LABELS[value] ?? value}</Tag>,
    },
    {
      title: "Tổng tiền",
      dataIndex: "grandTotal",
      width: 130,
      align: "right",
      render: (value) => <strong>{formatMoney(value)}</strong>,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 140,
      render: (value: SalesInvoiceStatus) => <InvoiceStatusTag status={value} />,
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
        <Space>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Hóa đơn bán hàng
          </Typography.Title>
          {failedCount > 0 && (
            <Tag color="red">{failedCount} hóa đơn phát hành lỗi cần xử lý</Tag>
          )}
        </Space>
        <Button icon={<ReloadOutlined />} loading={query.isFetching} onClick={() => query.refetch()}>
          Tải lại
        </Button>
      </div>

      <Space wrap style={{ marginBottom: 12 }}>
        <Segmented
          value={status}
          options={STATUS_FILTERS}
          onChange={(value) => {
            setStatus(value as string);
            setPage(1);
          }}
        />
        <PartySelect
          partyRole="CUSTOMER"
          allowClear
          style={{ width: 240 }}
          placeholder="Lọc theo khách hàng"
          value={customerPartyId}
          onChange={(value) => {
            setCustomerPartyId(value ?? undefined);
            setPage(1);
          }}
        />
      </Space>

      <Table<SalesInvoice>
        rowKey="id"
        size="small"
        loading={query.isLoading}
        columns={columns}
        dataSource={query.data?.items ?? []}
        scroll={{ x: 1150 }}
        pagination={{
          current: page,
          pageSize: 20,
          total: query.data?.total ?? 0,
          showSizeChanger: false,
          onChange: setPage,
        }}
      />

      <SalesInvoiceDrawer
        id={detailId}
        open={Boolean(detailId)}
        onClose={() => setDetailId(undefined)}
      />
    </div>
  );
}
