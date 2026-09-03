import React from "react";
import { Alert, Button, Modal, Tooltip } from "antd";
import { FilePdfOutlined, PrinterOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useSalesInvoiceDetail, useViewInvoiceDocument, openBlankTab } from "../hooks";
import { amountInWords, formatMoney, formatQty } from "./labels";
import "./invoice-print.css";

/**
 * Bản thể hiện hóa đơn dựng từ dữ liệu của chính hệ thống — xem và in được ngay, không
 * phụ thuộc MISA.
 *
 * KHÔNG thay thế hóa đơn điện tử hợp pháp: bản có giá trị pháp lý là bản MISA ký và cơ
 * quan thuế cấp mã. Vì thế đầu trang luôn có dòng nói rõ, và khi MISA đã có bản in thì
 * nút mở bản đó hiện ngay cạnh nút in.
 */
export function InvoicePrintModal({ id, onClose }: { id?: string; onClose: () => void }) {
  const detailQuery = useSalesInvoiceDetail(id);
  const misaPdf = useViewInvoiceDocument();
  const invoice = detailQuery.data;
  if (!invoice) return null;

  const onOpenMisaPdf = () => misaPdf.mutate({ invoiceId: invoice.id, tab: openBlankTab() });
  const misaPdfLoading = misaPdf.isPending;

  const seller = invoice.legalEntity?.party;
  const lines = invoice.lines ?? [];
  const issued = invoice.status === "ISSUED";
  const taxRates = [
    ...new Set(
      lines.map((line) =>
        line.taxRateName ?? (line.taxRate == null ? "KCT" : `${Number(line.taxRate) * 100}%`),
      ),
    ),
  ];

  return (
    <Modal
      open={Boolean(id)}
      onCancel={onClose}
      width={860}
      centered
      title="Hóa đơn giá trị gia tăng"
      className="invoice-print-modal"
      footer={[
        <Button key="close" onClick={onClose}>
          Đóng
        </Button>,
        issued ? (
          <Tooltip
            key="misa"
            title="Bản do MISA ký và cơ quan thuế cấp mã — bản có giá trị pháp lý"
          >
            <Button icon={<FilePdfOutlined />} loading={misaPdfLoading} onClick={onOpenMisaPdf}>
              Bản MISA
            </Button>
          </Tooltip>
        ) : null,
        <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={() => window.print()}>
          In
        </Button>,
      ]}
    >
      {/* Dòng này in ra giấy luôn — người cầm tờ giấy phải biết đây không phải bản pháp lý. */}
      <Alert
        type="info"
        showIcon
        className="ip-notice"
        message="Bản thể hiện của hóa đơn điện tử — dùng để đối chiếu, không thay thế hóa đơn có mã của cơ quan thuế."
      />

      <div className="ip-sheet">
        <header className="ip-head">
          <div className="ip-head-title">
            <h2>HÓA ĐƠN GIÁ TRỊ GIA TĂNG</h2>
            <div className="ip-head-date">
              Ngày {dayjs(invoice.invoiceDate).format("DD")} tháng{" "}
              {dayjs(invoice.invoiceDate).format("MM")} năm{" "}
              {dayjs(invoice.invoiceDate).format("YYYY")}
            </div>
          </div>
          <dl className="ip-head-meta">
            <div>
              <dt>Ký hiệu</dt>
              <dd>{invoice.misaSerial ?? "—"}</dd>
            </div>
            <div>
              <dt>Số</dt>
              <dd className="ip-strong">{invoice.misaInvoiceNo ?? "Chưa cấp"}</dd>
            </div>
            <div>
              <dt>Mẫu số</dt>
              <dd>{invoice.misaTemplateNo ?? "—"}</dd>
            </div>
          </dl>
        </header>

        <section className="ip-party">
          <h4>Đơn vị bán hàng</h4>
          <dl>
            <div>
              <dt>Tên đơn vị</dt>
              <dd className="ip-strong">{seller?.name ?? "—"}</dd>
            </div>
            <div>
              <dt>Mã số thuế</dt>
              <dd>{seller?.taxCode ?? "—"}</dd>
            </div>
            <div>
              <dt>Địa chỉ</dt>
              <dd>{seller?.billingAddress ?? "—"}</dd>
            </div>
            {seller?.bankAccountNo ? (
              <div>
                <dt>Số tài khoản</dt>
                <dd>{seller.bankAccountNo}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className="ip-party">
          <h4>Người mua hàng</h4>
          <dl>
            <div>
              <dt>Tên đơn vị</dt>
              <dd className="ip-strong">{invoice.buyerName}</dd>
            </div>
            <div>
              <dt>Mã số thuế</dt>
              <dd>{invoice.buyerTaxCode ?? "—"}</dd>
            </div>
            <div>
              <dt>Địa chỉ</dt>
              <dd>{invoice.buyerAddress ?? "—"}</dd>
            </div>
            <div>
              <dt>Hình thức thanh toán</dt>
              <dd>TM/CK</dd>
            </div>
          </dl>
        </section>

        <table className="ip-table">
          <thead>
            <tr>
              <th style={{ width: 42 }}>STT</th>
              <th>Tên hàng hóa, dịch vụ</th>
              <th style={{ width: 62 }}>ĐVT</th>
              <th style={{ width: 96 }}>Số lượng</th>
              <th style={{ width: 110 }}>Đơn giá</th>
              <th style={{ width: 130 }}>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id}>
                <td className="ip-center">{line.lineNo}</td>
                <td>{line.description}</td>
                <td className="ip-center">{line.uom}</td>
                <td className="ip-num">{formatQty(line.qty)}</td>
                {/* Đơn giá thể hiện đúng như hóa đơn gửi MISA: đã trừ chiết khấu. */}
                <td className="ip-num">
                  {formatMoney(Number(line.netAmount) / (Number(line.qty) || 1))}
                </td>
                <td className="ip-num ip-strong">{formatMoney(line.netAmount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5}>Cộng tiền hàng</td>
              <td className="ip-num">{formatMoney(Number(invoice.subtotal) - Number(invoice.discountTotal))}</td>
            </tr>
            <tr>
              <td colSpan={5}>Thuế suất GTGT: {taxRates.join(", ") || "KCT"} — Tiền thuế GTGT</td>
              <td className="ip-num">{formatMoney(invoice.taxTotal)}</td>
            </tr>
            <tr className="ip-grand">
              <td colSpan={5}>Tổng cộng tiền thanh toán</td>
              <td className="ip-num">{formatMoney(invoice.grandTotal)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="ip-words">
          Số tiền viết bằng chữ: <em>{amountInWords(invoice.grandTotal)}</em>
        </div>

        <footer className="ip-foot">
          <div>
            <strong>NGƯỜI MUA HÀNG</strong>
            <span>(Chữ ký số nếu có)</span>
          </div>
          <div>
            <strong>NGƯỜI BÁN HÀNG</strong>
            <span>
              {issued && invoice.issuedAt
                ? `Đã ký điện tử lúc ${dayjs(invoice.issuedAt).format("HH:mm DD/MM/YYYY")}`
                : "Chưa phát hành"}
            </span>
          </div>
        </footer>
      </div>
    </Modal>
  );
}
