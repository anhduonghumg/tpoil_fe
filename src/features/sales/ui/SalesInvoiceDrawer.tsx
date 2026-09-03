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
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { FilePdfOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { useCan } from "../../../shared/authz/useCan";
import { PERMS } from "../../../shared/authz/perms";
import {
  useCancelInvoice,
  useIssueInvoice,
  useSalesInvoiceDetail,
  useViewInvoiceDocument,
  openBlankTab,
} from "../hooks";
import type { InvoiceCreditAssessment, SalesInvoiceIssuance, SalesInvoiceLine } from "../types";
import { formatMoney, formatQty, INVOICE_DOC_TYPE_LABELS, InvoiceStatusTag } from "./labels";
import { IssueInvoiceModal } from "./IssueInvoiceModal";
import { CreditWarningModal, creditAssessmentFromError } from "./CreditWarningModal";

/** Backend bắt buộc có lý do hủy; nháp bỏ đi thì lý do lúc nào cũng là câu này. */
const DISCARD_DRAFT_REASON = "Hủy nháp, trả chứng từ về Chưa xuất HĐ";

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
  const [creditOpen, setCreditOpen] = useState(false);
  const [creditAssessment, setCreditAssessment] = useState<InvoiceCreditAssessment | null>(null);
  const [creditRetry, setCreditRetry] = useState(false);
  /** Hộp xác nhận trước khi gửi chứng từ ra ngoài; giữ cờ "thử lại" để đổi nhãn. */
  const [confirmIssue, setConfirmIssue] = useState<false | { isRetry: boolean }>(false);

  const detailQuery = useSalesInvoiceDetail(open ? id : undefined);
  const invoice = detailQuery.data;
  const issueMutation = useIssueInvoice(id);
  const cancelMutation = useCancelInvoice(id);
  const viewDocumentMutation = useViewInvoiceDocument();
  const isDraft = invoice?.status === "DRAFT";

  const requestIssue = async (isRetry: boolean) => {
    if (!invoice) return;
    try {
      await issueMutation.mutateAsync({ invoiceId: invoice.id, isRetry });
      setConfirmIssue(false);
    } catch (error) {
      const assessment = creditAssessmentFromError(error);
      if (!assessment) return;
      // Nhường chỗ cho hộp cảnh báo công nợ, không chồng hai hộp lên nhau.
      setConfirmIssue(false);
      setCreditAssessment(assessment);
      setCreditRetry(isRetry);
      setCreditOpen(true);
    }
  };

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
      title: "Đơn giá HĐ (sau CK)",
      dataIndex: "unitPrice",
      width: 110,
      align: "right",
      render: (_, line) => {
        const qty = Number(line.qty ?? 0);
        const netUnitPrice = qty > 0 ? Number(line.netAmount) / qty : Number(line.unitPrice ?? 0);
        const paymentUnitPrice = qty > 0 ? Number(line.lineTotal) / qty : netUnitPrice;
        return (
          <Tooltip title={`Giá gốc: ${formatMoney(line.unitPrice)} · Đơn giá thanh toán sau VAT: ${formatMoney(paymentUnitPrice)}`}>
            {formatMoney(netUnitPrice)}
          </Tooltip>
        );
      },
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
      render: (value, line) =>
        line.taxRateName ?? (value == null ? "KCT" : `${Number(value) * 100}%`),
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
                onClick={() => setConfirmIssue({ isRetry: false })}
              >
                Phát hành
              </Button>
            )}
            {invoice.status === "ISSUE_FAILED" && (
              <Button
                type="primary"
                loading={issueMutation.isPending}
                onClick={() => setConfirmIssue({ isRetry: true })}
              >
                Thử lại
              </Button>
            )}
            {invoice.status === "DRAFT" && (
              <Button
                danger
                onClick={() => {
                  setCancelReason(DISCARD_DRAFT_REASON);
                  setCancelOpen(true);
                }}
              >
                Trả về chưa xuất HĐ
              </Button>
            )}
            {invoice.status === "ISSUED" && (
              <>
                <Button
                  type="primary"
                  icon={<FilePdfOutlined />}
                  loading={viewDocumentMutation.isPending}
                  onClick={() =>
                    viewDocumentMutation.mutate({ invoiceId: invoice.id, tab: openBlankTab() })
                  }
                >
                  Xem hóa đơn
                </Button>
                <Button danger onClick={() => setCancelOpen(true)}>
                  Hủy hóa đơn
                </Button>
              </>
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
              <Space size={4} wrap>
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
              {invoice.receivableItems?.length
                ? `${formatMoney(
                    invoice.receivableItems.reduce(
                      (sum, item) => sum + Number(item.outstandingAmount),
                      0,
                    ),
                  )}${invoice.receivableItems.length > 1 ? ` (${invoice.receivableItems.length} đợt)` : ""}`
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

      <IssueInvoiceModal
        open={Boolean(confirmIssue)}
        invoice={invoice}
        loading={issueMutation.isPending}
        isRetry={confirmIssue ? confirmIssue.isRetry : false}
        onCancel={() => setConfirmIssue(false)}
        onConfirm={() => void requestIssue(confirmIssue ? confirmIssue.isRetry : false)}
      />

      <CreditWarningModal
        open={creditOpen}
        assessment={creditAssessment}
        loading={issueMutation.isPending}
        onCancel={() => setCreditOpen(false)}
        onConfirm={async () => {
          if (!invoice || !creditAssessment) return;
          try {
            await issueMutation.mutateAsync({
              invoiceId: invoice.id,
              isRetry: creditRetry,
              overrideCredit: true,
              creditSnapshotHash: creditAssessment.snapshotHash,
            });
            setCreditOpen(false);
            setCreditAssessment(null);
          } catch (error) {
            const current = creditAssessmentFromError(error);
            if (current) setCreditAssessment(current);
          }
        }}
      />

      <Modal
        open={cancelOpen}
        title={
          isDraft
            ? `Trả ${invoice?.invoiceNoInternal ?? "chứng từ"} về Chưa xuất HĐ`
            : `Hủy hóa đơn ${invoice?.misaInvoiceNo ?? invoice?.invoiceNoInternal ?? ""}`
        }
        okText={isDraft ? "Trả về chưa xuất HĐ" : "Hủy hóa đơn"}
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
          // Nháp bỏ đi thì không còn gì để xem — đóng luôn, người dùng quay lại danh sách.
          if (isDraft) onClose();
        }}
      >
        {isDraft && (
          <Alert
            showIcon
            type="info"
            style={{ marginBottom: 12 }}
            message="Bản nháp này chưa gửi sang MISA"
            description="Hủy nháp không đụng gì tới bên ngoài. Chứng từ nguồn quay lại tab “Chưa xuất HĐ” và dựng lại hóa đơn được bình thường."
          />
        )}
        <Input.TextArea
          rows={3}
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          placeholder={isDraft ? "Lý do hủy nháp (bắt buộc)" : "Lý do hủy (bắt buộc)"}
        />
      </Modal>
    </Drawer>
  );
}
