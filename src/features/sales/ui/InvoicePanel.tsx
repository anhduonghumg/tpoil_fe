import React, { useState } from "react";
import { Alert, Button, Card, Modal, Skeleton, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { FileTextOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useCan } from "../../../shared/authz/useCan";
import { PERMS } from "../../../shared/authz/perms";
import { useCreateInvoiceDraft, useInvoicePreview, useSalesInvoices } from "../hooks";
import type { InvoiceSource, SalesInvoice } from "../types";
import { SalesInvoiceDrawer } from "./SalesInvoiceDrawer";
import { formatMoney, formatQty, INVOICE_DOC_TYPE_LABELS, InvoiceStatusTag } from "./labels";

/**
 * Hóa đơn của một chứng từ thương mại. Chỉ đề nghị lập khi chưa có hóa đơn còn hiệu
 * lực — backend cũng chặn bằng partial unique index, đây chỉ là lớp nhắc trước.
 */
export function InvoicePanel({ salesOrderId, withdrawalRequestId }: InvoiceSource) {
  const { can } = useCan();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [detailId, setDetailId] = useState<string>();

  const source: InvoiceSource = withdrawalRequestId ? { withdrawalRequestId } : { salesOrderId };
  const listQuery = useSalesInvoices(
    { ...source, limit: 20 },
    Boolean(salesOrderId || withdrawalRequestId),
  );
  const previewQuery = useInvoicePreview(source, previewOpen);
  const createDraftMutation = useCreateInvoiceDraft();

  const invoices = listQuery.data?.items ?? [];
  const hasLive = invoices.some(
    (invoice) => invoice.documentType === "ORIGINAL" && invoice.status !== "CANCELLED",
  );

  const columns: ColumnsType<SalesInvoice> = [
    {
      title: "Số hóa đơn",
      key: "no",
      render: (_, invoice) => (
        <Button type="link" style={{ padding: 0 }} onClick={() => setDetailId(invoice.id)}>
          {invoice.misaInvoiceNo ?? invoice.invoiceNoInternal}
        </Button>
      ),
    },
    {
      title: "Loại",
      dataIndex: "documentType",
      width: 100,
      render: (value) => <Tag>{INVOICE_DOC_TYPE_LABELS[value] ?? value}</Tag>,
    },
    {
      title: "Ngày",
      dataIndex: "invoiceDate",
      width: 100,
      render: (value: string) => dayjs(value).format("DD/MM/YYYY"),
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
      render: (value) => <InvoiceStatusTag status={value} />,
    },
  ];

  if (listQuery.isLoading) {
    return (
      <Card size="small" title="Hóa đơn" style={{ marginTop: 12 }}>
        <Skeleton active paragraph={{ rows: 1 }} />
      </Card>
    );
  }

  return (
    <Card
      size="small"
      style={{ marginTop: 12 }}
      title="Hóa đơn"
      extra={
        can(PERMS.SALES_INVOICE_VIEW) || can(PERMS.SALES_INVOICE_ISSUE) ? (
          <Button size="small" icon={<FileTextOutlined />} onClick={() => setPreviewOpen(true)}>
            {hasLive ? "Xem trước" : "Lập hóa đơn"}
          </Button>
        ) : null
      }
    >
      {invoices.length === 0 ? (
        <Typography.Text type="secondary">Chưa có hóa đơn.</Typography.Text>
      ) : (
        <Table<SalesInvoice>
          rowKey="id"
          size="small"
          pagination={false}
          columns={columns}
          dataSource={invoices}
          scroll={{ x: 700 }}
        />
      )}

      <Modal
        open={previewOpen}
        title="Nội dung hóa đơn dự kiến"
        width={900}
        cancelText="Đóng"
        okText="Tạo hóa đơn nháp"
        okButtonProps={{
          disabled: hasLive || !can(PERMS.SALES_INVOICE_ISSUE) || previewQuery.isError,
        }}
        confirmLoading={createDraftMutation.isPending}
        onCancel={() => setPreviewOpen(false)}
        onOk={async () => {
          await createDraftMutation.mutateAsync(source);
          setPreviewOpen(false);
          listQuery.refetch();
        }}
      >
        {previewQuery.isLoading ? (
          <Skeleton active />
        ) : previewQuery.isError ? (
          <Alert
            type="warning"
            showIcon
            message="Chưa lập được hóa đơn"
            description="Chứng từ chưa có phần thực xuất nào để xuất hóa đơn, hoặc đối soát chưa xong."
          />
        ) : previewQuery.data ? (
          <>
            {hasLive && (
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 12 }}
                message="Chứng từ này đã có hóa đơn còn hiệu lực — muốn sửa thì dùng hóa đơn điều chỉnh/thay thế."
              />
            )}
            <Space direction="vertical" size={2} style={{ marginBottom: 12 }}>
              <Typography.Text strong>{previewQuery.data.buyer.name}</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                MST: {previewQuery.data.buyer.taxCode ?? "—"} ·{" "}
                {previewQuery.data.buyer.address ?? "chưa có địa chỉ"}
              </Typography.Text>
            </Space>

            <Table
              rowKey="lineNo"
              size="small"
              pagination={false}
              dataSource={previewQuery.data.lines}
              scroll={{ x: 800 }}
              columns={[
                { title: "#", dataIndex: "lineNo", width: 44 },
                { title: "Nội dung", dataIndex: "description" },
                {
                  title: "SL",
                  dataIndex: "qty",
                  width: 100,
                  align: "right",
                  render: (value: string, row: { uom: string }) =>
                    `${formatQty(value)} ${row.uom}`,
                },
                {
                  title: "Đơn giá",
                  dataIndex: "unitPrice",
                  width: 110,
                  align: "right",
                  render: (value: string) => formatMoney(value),
                },
                {
                  title: "Tiền thuế",
                  dataIndex: "taxAmount",
                  width: 110,
                  align: "right",
                  render: (value: string) => formatMoney(value),
                },
                {
                  title: "Thành tiền",
                  dataIndex: "lineTotal",
                  width: 120,
                  align: "right",
                  render: (value: string) => <strong>{formatMoney(value)}</strong>,
                },
              ]}
            />

            <div style={{ textAlign: "right", marginTop: 12 }}>
              <Space direction="vertical" size={2}>
                <Typography.Text type="secondary">
                  Tiền hàng: {formatMoney(previewQuery.data.totals.subtotal)}
                </Typography.Text>
                <Typography.Text type="secondary">
                  Chiết khấu: {formatMoney(previewQuery.data.totals.discountTotal)}
                </Typography.Text>
                <Typography.Text type="secondary">
                  Thuế: {formatMoney(previewQuery.data.totals.taxTotal)}
                </Typography.Text>
                <Typography.Text strong style={{ fontSize: 16 }}>
                  Tổng: {formatMoney(previewQuery.data.totals.grandTotal)}{" "}
                  {previewQuery.data.currency}
                </Typography.Text>
              </Space>
            </div>
          </>
        ) : null}
      </Modal>

      <SalesInvoiceDrawer
        id={detailId}
        open={Boolean(detailId)}
        onClose={() => setDetailId(undefined)}
      />
    </Card>
  );
}
