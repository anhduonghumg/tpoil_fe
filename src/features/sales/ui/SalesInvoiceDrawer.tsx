import React, { useState } from "react";
import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Input,
  Modal,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { useCan } from "../../../shared/authz/useCan";
import { PERMS } from "../../../shared/authz/perms";
import { useCancelInvoice, useIssueInvoice, useSalesInvoiceDetail } from "../hooks";
import type { SalesInvoiceIssuance, SalesInvoiceLine } from "../types";
import { formatMoney, formatQty, INVOICE_DOC_TYPE_LABELS, InvoiceStatusTag } from "./labels";

export function SalesInvoiceDrawer({
  id,
  open,
  onClose,
}: {
  id?: string;
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { can } = useCan();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const detailQuery = useSalesInvoiceDetail(open ? id : undefined);
  const invoice = detailQuery.data;
  const issueMutation = useIssueInvoice(id);
  const cancelMutation = useCancelInvoice(id);

  const lineColumns: ColumnsType<SalesInvoiceLine> = [
    { title: "#", dataIndex: "lineNo", width: 44 },
    { title: "Nội dung", dataIndex: "description" },
    {
      title: "SL",
      dataIndex: "qty",
      width: 100,
      align: "right",
      render: (value, line) => `${formatQty(value)} ${line.uom}`,
    },
    {
      title: "Đơn giá",
      dataIndex: "unitPrice",
      width: 110,
      align: "right",
      render: (value) => formatMoney(value),
    },
    {
      title: "Chiết khấu",
      dataIndex: "discountAmount",
      width: 100,
      align: "right",
      render: (value) => formatMoney(value),
    },
    {
      // taxRate lưu dạng phân số 0..1, hiển thị ra phần trăm.
      title: "Thuế",
      dataIndex: "taxRate",
      width: 80,
      align: "right",
      render: (value) => (value == null ? "—" : `${Number(value) * 100}%`),
    },
    {
      title: "Tiền thuế",
      dataIndex: "taxAmount",
      width: 110,
      align: "right",
      render: (value) => formatMoney(value),
    },
    {
      title: "Thành tiền",
      dataIndex: "lineTotal",
      width: 120,
      align: "right",
      render: (value) => <strong>{formatMoney(value)}</strong>,
    },
  ];

  const issuanceColumns: ColumnsType<SalesInvoiceIssuance> = [
    { title: "Lần", dataIndex: "attempt", width: 55 },
    { title: "Hành động", dataIndex: "action", width: 130 },
    {
      title: "Kết quả",
      dataIndex: "status",
      width: 110,
      render: (value: string) => (
        <Tag color={value === "SUCCESS" ? "green" : value === "STARTED" ? "gold" : "red"}>
          {value}
        </Tag>
      ),
    },
    { title: "HTTP", dataIndex: "httpStatus", width: 70 },
    {
      title: "Lỗi",
      key: "error",
      render: (_, row) =>
        row.errorCode || row.errorMessage ? (
          <Typography.Text type="danger" style={{ fontSize: 12 }}>
            {row.errorCode ? `[${row.errorCode}] ` : ""}
            {row.errorMessage ?? ""}
          </Typography.Text>
        ) : (
          "—"
        ),
    },
    {
      title: "Bắt đầu",
      dataIndex: "startedAt",
      width: 150,
      render: (value: string) => dayjs(value).format("DD/MM/YYYY HH:mm:ss"),
    },
  ];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={900}
      title={invoice ? `Hóa đơn ${invoice.invoiceNoInternal}` : "Hóa đơn"}
      extra={
        invoice &&
        can(PERMS.SALES_INVOICE_ISSUE) && (
          <Space>
            {(invoice.status === "DRAFT" || invoice.status === "PENDING_ISSUE") && (
              <Button
                type="primary"
                loading={issueMutation.isPending}
                onClick={() => issueMutation.mutate({ invoiceId: invoice.id })}
              >
                Phát hành
              </Button>
            )}
            {invoice.status === "ISSUE_FAILED" && (
              <Button
                type="primary"
                loading={issueMutation.isPending}
                onClick={() => issueMutation.mutate({ invoiceId: invoice.id, isRetry: true })}
              >
                Thử lại
              </Button>
            )}
            {invoice.status === "ISSUED" && (
              <Button danger onClick={() => setCancelOpen(true)}>
                Hủy hóa đơn
              </Button>
            )}
          </Space>
        )
      }
    >
      {detailQuery.isLoading || !invoice ? (
        <Skeleton active />
      ) : (
        <>
          {invoice.status === "ISSUE_FAILED" && (
            <Alert
              type="error"
              showIcon
              style={{ marginBottom: 12 }}
              message="Phát hành lỗi"
              description="Thử lại sẽ hỏi MISA xem hóa đơn đã ra chưa trước khi gửi, nên không phát hành trùng."
            />
          )}

          <Descriptions size="small" column={2} style={{ marginBottom: 12 }}>
            <Descriptions.Item label="Trạng thái">
              <Space>
                <InvoiceStatusTag status={invoice.status} />
                <Tag>{INVOICE_DOC_TYPE_LABELS[invoice.documentType] ?? invoice.documentType}</Tag>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Số MISA">
              {invoice.misaInvoiceNo ?? "—"}
              {invoice.misaSerial ? ` (${invoice.misaSerial})` : ""}
            </Descriptions.Item>
            <Descriptions.Item label="Người mua">{invoice.buyerName}</Descriptions.Item>
            <Descriptions.Item label="MST">{invoice.buyerTaxCode ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="Chứng từ nguồn">
              {invoice.salesOrder ? (
                <Button
                  type="link"
                  style={{ padding: 0 }}
                  onClick={() => navigate(`/sales/orders/${invoice.salesOrder!.id}`)}
                >
                  {invoice.salesOrder.orderNo}
                </Button>
              ) : (
                (invoice.withdrawalRequest?.requestNo ?? "—")
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày hóa đơn">
              {dayjs(invoice.invoiceDate).format("DD/MM/YYYY")}
            </Descriptions.Item>
            <Descriptions.Item label="Hạn thanh toán">
              {invoice.dueDate ? dayjs(invoice.dueDate).format("DD/MM/YYYY") : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Phát hành lúc">
              {invoice.issuedAt ? dayjs(invoice.issuedAt).format("DD/MM/YYYY HH:mm") : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Tổng tiền">
              <strong>
                {formatMoney(invoice.grandTotal)} {invoice.currency}
              </strong>
            </Descriptions.Item>
            <Descriptions.Item label="Còn phải thu">
              {invoice.receivableItem
                ? formatMoney(invoice.receivableItem.outstandingAmount)
                : "—"}
            </Descriptions.Item>
          </Descriptions>

          <Table<SalesInvoiceLine>
            rowKey="id"
            size="small"
            pagination={false}
            columns={lineColumns}
            dataSource={invoice.lines ?? []}
            scroll={{ x: 900 }}
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={6} align="right">
                  <strong>Tổng cộng</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  <strong>{formatMoney(invoice.taxTotal)}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <strong>{formatMoney(invoice.grandTotal)}</strong>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />

          {(invoice.corrections ?? []).length > 0 && (
            <div style={{ marginTop: 12 }}>
              <Typography.Text strong>Chứng từ điều chỉnh / thay thế</Typography.Text>
              <ul style={{ margin: "8px 0 0", paddingInlineStart: 18 }}>
                {(invoice.corrections ?? []).map((correction) => (
                  <li key={correction.id}>
                    {correction.invoiceNoInternal} —{" "}
                    {INVOICE_DOC_TYPE_LABELS[correction.documentType] ?? correction.documentType} (
                    {correction.status})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(invoice.issuances ?? []).length > 0 && (
            <div style={{ marginTop: 16 }}>
              <Typography.Text strong>Nhật ký gọi MISA</Typography.Text>
              <Table<SalesInvoiceIssuance>
                rowKey="id"
                size="small"
                pagination={false}
                style={{ marginTop: 8 }}
                columns={issuanceColumns}
                dataSource={invoice.issuances ?? []}
                scroll={{ x: 800 }}
              />
            </div>
          )}
        </>
      )}

      <Modal
        open={cancelOpen}
        title={`Hủy hóa đơn ${invoice?.misaInvoiceNo ?? invoice?.invoiceNoInternal ?? ""}`}
        okText="Hủy hóa đơn"
        cancelText="Đóng"
        okButtonProps={{ danger: true, disabled: !cancelReason.trim() }}
        confirmLoading={cancelMutation.isPending}
        onCancel={() => setCancelOpen(false)}
        onOk={async () => {
          if (!invoice) return;
          await cancelMutation.mutateAsync({
            invoiceId: invoice.id,
            reason: cancelReason.trim(),
          });
          setCancelOpen(false);
          setCancelReason("");
        }}
      >
        <Input.TextArea
          rows={3}
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          placeholder="Lý do hủy (bắt buộc)"
        />
      </Modal>
    </Drawer>
  );
}
