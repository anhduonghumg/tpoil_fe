import React from "react";
import { Alert, Modal, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { WarningOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { SalesInvoiceLine } from "../types";

/**
 * Hộp này dùng cho cả hóa đơn đã dựng lẫn bản xem trước dựng từ chứng từ nguồn (tab
 * "Chưa xuất HĐ" — chưa ghi gì xuống DB). Nên nhận đúng phần dữ liệu nó vẽ ra, không
 * đòi nguyên một SalesInvoice: bản xem trước chưa có id, số nội bộ hay trạng thái.
 */
export type IssueInvoiceView = {
  misaSerial?: string | null;
  misaTemplateNo?: string | null;
  invoiceDate: string;
  buyerName: string;
  buyerTaxCode?: string | null;
  buyerAddress?: string | null;
  buyerEmail?: string | null;
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  grandTotal: string;
  lines?: Array<Omit<SalesInvoiceLine, "id" | "product"> & { id?: string }>;
  /** Cảnh báo công nợ lúc tải danh sách; backend vẫn kiểm tra lại khi phát hành. */
  creditWarning?: {
    overdueAmount: string;
    exceededBy: string;
    creditLimit: string | null;
  };
  purchaseInvoiceWarning?: { message: string; costStatus?: string };
};

type IssueInvoiceViewLine = NonNullable<IssueInvoiceView["lines"]>[number];
import { useMisaSettings } from "../hooks";
import { amountInWords, formatMoney, formatQty } from "./labels";
import "./issue-invoice-modal.css";

/**
 * Hộp xác nhận trước khi phát hành — dựng theo mẫu hộp "Phát hành hóa đơn" của MISA và
 * phần mềm hóa đơn bên thứ ba: nhìn một lần là thấy đủ ký hiệu, ngày, người mua, bảng
 * hàng và tổng tiền cả bằng số lẫn bằng chữ.
 *
 * Phát hành là gửi chứng từ ra ngoài, không rút lại được — nên bước dừng lại này quan
 * trọng hơn là tiết kiệm một cú bấm.
 */
export function IssueInvoiceModal({
  open,
  invoice,
  loading,
  isRetry,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  invoice?: IssueInvoiceView;
  loading?: boolean;
  isRetry?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  // Hóa đơn nháp chưa có ký hiệu — nó chỉ được ghi lại sau khi MISA cấp. Lấy ký hiệu
  // của cấu hình đang chạy để nói trước hóa đơn sẽ ra dải nào.
  const settingsQuery = useMisaSettings();
  const running = settingsQuery.data?.running;

  if (!invoice) return null;

  const lines = invoice.lines ?? [];
  const missingTaxCode = !invoice.buyerTaxCode;
  const missingEmail = !invoice.buyerEmail;
  const creditWarning = invoice.creditWarning;
  const purchaseInvoiceWarning = invoice.purchaseInvoiceWarning;

  const columns: ColumnsType<IssueInvoiceViewLine> = [
    { title: "STT", dataIndex: "lineNo", width: 48, align: "center" },
    {
      title: "Tên hàng hóa, dịch vụ",
      dataIndex: "description",
      render: (value: string) => (
        <Tooltip title={value}>
          <span className="issue-line-name">{value}</span>
        </Tooltip>
      ),
    },
    {
      title: "Số lượng",
      dataIndex: "qty",
      width: 110,
      align: "right",
      render: (value, line) => `${formatQty(value)} ${line.uom}`,
    },
    {
      title: "Đơn giá HĐ (sau CK)",
      dataIndex: "unitPrice",
      width: 116,
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
      title: "Thuế",
      key: "taxRate",
      width: 72,
      align: "right",
      render: (_, line) => line.taxRateName ?? (line.taxRate == null ? "KCT" : `${Number(line.taxRate) * 100}%`),
    },
    {
      title: "Thành tiền",
      dataIndex: "lineTotal",
      width: 128,
      align: "right",
      render: (value) => <strong>{formatMoney(value)}</strong>,
    },
  ];

  return (
    <Modal
      open={open}
      width={780}
      // Luôn nằm giữa màn hình, và chỉ phần thân cuộn: hóa đơn nhiều dòng thì cuộn
      // trong hộp chứ không đẩy cả trang chạy theo, tiêu đề với nút Phát hành đứng yên.
      centered
      title={isRetry ? "Phát hành lại hóa đơn" : "Phát hành hóa đơn"}
      okText={isRetry ? "Thử lại" : "Phát hành"}
      cancelText="Hủy bỏ"
      confirmLoading={loading}
      onCancel={onCancel}
      onOk={onConfirm}
      className="issue-invoice-modal"
    >
      <div className="issue-head">
        <dl className="issue-head-facts">
          <div>
            <dt>Ký hiệu</dt>
            <dd>
              {invoice.misaSerial ? (
                <>
                  {invoice.misaSerial}
                  {invoice.misaTemplateNo ? ` · Mẫu ${invoice.misaTemplateNo}` : ""}
                </>
              ) : running?.serial ? (
                <>
                  {running.serial}
                  {running.templateNo ? ` · Mẫu ${running.templateNo}` : ""}
                  <span className="issue-muted issue-serial-note">số hóa đơn cấp khi phát hành</span>
                </>
              ) : (
                <span className="issue-muted">Cơ quan thuế cấp khi phát hành</span>
              )}
            </dd>
          </div>
          <div>
            <dt>Ngày hóa đơn</dt>
            <dd>{dayjs(invoice.invoiceDate).format("DD/MM/YYYY")}</dd>
          </div>
          <div>
            <dt>Khách hàng</dt>
            <dd className="issue-buyer">{invoice.buyerName}</dd>
          </div>
        </dl>

        <div className="issue-head-total">
          <span>Tổng tiền thanh toán</span>
          <strong>{formatMoney(invoice.grandTotal)}</strong>
        </div>
      </div>

      <dl className="issue-buyer-facts">
        <div>
          <dt>Mã số thuế</dt>
          <dd>
            {invoice.buyerTaxCode ?? <span className="issue-muted">Chưa có</span>}
            {missingTaxCode ? (
              <Tag color="warning" className="issue-warn-tag">
                <WarningOutlined /> Thiếu
              </Tag>
            ) : null}
          </dd>
        </div>
        <div>
          <dt>Địa chỉ</dt>
          <dd>{invoice.buyerAddress ?? <span className="issue-muted">Chưa có</span>}</dd>
        </div>
        <div>
          <dt>Email nhận hóa đơn</dt>
          <dd>
            {invoice.buyerEmail ?? <span className="issue-muted">Chưa có</span>}
            {missingEmail ? (
              <Tag color="warning" className="issue-warn-tag">
                <WarningOutlined /> Thiếu
              </Tag>
            ) : null}
          </dd>
        </div>
      </dl>

      {missingTaxCode || missingEmail ? (
        <Alert
          showIcon
          type="warning"
          className="issue-alert"
          message={`Thiếu ${
            missingTaxCode && missingEmail
              ? "mã số thuế và email"
              : missingTaxCode
                ? "mã số thuế"
                : "email"
          } người mua — sửa hồ sơ khách hàng rồi dựng lại hóa đơn.`}
        />
      ) : null}

      {creditWarning ? (
        <Alert
          showIcon
          type="warning"
          className="issue-alert"
          message="Công nợ khách hàng đang có cảnh báo"
          description={[
            Number(creditWarning.overdueAmount) > 0
              ? `Nợ quá hạn: ${formatMoney(creditWarning.overdueAmount)}`
              : null,
            Number(creditWarning.exceededBy) > 0
              ? `Vượt hạn mức: ${formatMoney(creditWarning.exceededBy)}${creditWarning.creditLimit ? ` (hạn mức ${formatMoney(creditWarning.creditLimit)})` : ""}`
              : null,
            "Kế toán cần xác nhận lại trước khi phát hành.",
          ].filter(Boolean).join(" · ")}
        />
      ) : null}

      {purchaseInvoiceWarning ? (
        <Alert
          showIcon
          type="warning"
          className="issue-alert"
          message="Chưa có hóa đơn đầu vào"
          description={`${purchaseInvoiceWarning.message} Bấm phát hành nghĩa là kế toán xác nhận tiếp tục với giá vốn tạm tính.`}
        />
      ) : null}

      {isRetry ? (
        <Alert
          showIcon
          type="info"
          className="issue-alert"
          message="Lần phát hành trước bị lỗi"
          description="Hệ thống sẽ hỏi MISA xem hóa đơn đã ra chưa trước khi gửi lại, nên không phát hành trùng."
        />
      ) : null}

      <Table<IssueInvoiceViewLine>
        className="issue-line-table"
        rowKey={(line) => line.id ?? `line-${line.lineNo}`}
        size="small"
        bordered
        pagination={false}
        columns={columns}
        dataSource={lines}
        scroll={lines.length > 6 ? { y: 232 } : undefined}
      />

      <dl className="issue-totals">
        <div>
          <dt>Cộng tiền hàng</dt>
          <dd>{formatMoney(invoice.subtotal)}</dd>
        </div>
        <div>
          <dt>Số tiền chiết khấu</dt>
          <dd>{formatMoney(invoice.discountTotal)}</dd>
        </div>
        <div>
          <dt>Tiền thuế GTGT</dt>
          <dd>{formatMoney(invoice.taxTotal)}</dd>
        </div>
        <div className="is-grand">
          <dt>Tổng tiền thanh toán</dt>
          <dd>{formatMoney(invoice.grandTotal)}</dd>
        </div>
      </dl>

      <div className="issue-words">
        <span>Số tiền viết bằng chữ:</span> <em>{amountInWords(invoice.grandTotal)}</em>
      </div>

      <Typography.Text type="secondary" className="issue-footnote">
        Phát hành xong hóa đơn không sửa được, chỉ có thể hủy hoặc lập chứng từ điều chỉnh.
        Khoản phải thu của khách sẽ mở ngay sau khi phát hành thành công.
      </Typography.Text>
    </Modal>
  );
}
