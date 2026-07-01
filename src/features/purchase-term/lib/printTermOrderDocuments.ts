import dayjs from "dayjs";
import type { TermOrderDocument } from "../types";

function esc(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(value?: number | null, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "";
  return new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(value));
}

function dateText(value?: string | null) {
  return value ? dayjs(value).format("DD/MM/YYYY") : "";
}

function longDate(value?: string | null) {
  const d = value ? dayjs(value) : dayjs();
  return `Thanh Hóa, ngày ${d.format("DD")} tháng ${d.format("MM")} năm ${d.format("YYYY")}`;
}

function renderDocument(doc: TermOrderDocument) {
  const rows = (doc.lines || [])
    .map(
      (line, index) => `
        <tr>
          <td class="center">${index + 1}</td>
          <td>${esc(line.productName)}</td>
          <td class="right">${money(line.qtyLiter)}</td>
          <td class="right">${money(line.unitPriceVndPerLiter)}</td>
          <td class="right">${money(line.amountVnd)}</td>
        </tr>
      `,
    )
    .join("");
  
  return `
    <section class="page">
      <div class="top">
        <div>
          <div class="bold">CÔNG TY TNHH VT&TMXD Thiên Phúc</div>
          <div>Số: ${esc(doc.documentNo)}</div>
        </div>
        <div class="national">
          <div class="bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
          <div class="bold">Độc lập - Tự do - Hạnh phúc</div>
        </div>
      </div>

      <div class="date">${esc(longDate(doc.documentDate))}</div>
      <h1>ĐƠN ĐẶT HÀNG</h1>

      <p class="center">Kính gửi: <b>${esc(doc.supplierName)}</b></p>

      <p>Căn cứ vào Hợp đồng mua bán xăng dầu số: <b>${esc(doc.contractNo || "")}</b> ký giữa hai bên.</p>
      ${doc.appendixNo ? `<p>Căn cứ Phụ lục hợp đồng số <b>${esc(doc.appendixNo)}</b>;</p>` : ""}
      <p>Đơn vị đặt hàng: <b>${esc(doc.buyerName)}</b></p>
      <p>Địa chỉ: ${esc(doc.buyerAddress || "")}</p>
      <p>Điện thoại: ${esc(doc.buyerPhone || "")}${doc.buyerFax ? ` / Fax: ${esc(doc.buyerFax)}` : ""}</p>
      <p>1. Công ty TNHH VT&TMXD Thiên Phúc có nhu cầu đặt hàng với mặt hàng, số lượng như sau:</p>

      <table>
        <thead>
          <tr>
            <th style="width: 42px">TT</th>
            <th>Mặt hàng</th>
            <th style="width: 170px">Số lượng (Lít TT ±5%)</th>
            <th style="width: 170px">Giá thanh toán tạm tính làm tròn (đồng/lít)</th>
            <th style="width: 180px">Thành tiền (VNĐ)</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr class="bold">
            <td></td>
            <td class="center">Tổng cộng</td>
            <td class="right">${money(doc.totalQtyLiter)}</td>
            <td></td>
            <td class="right">${money(doc.totalAmountVnd)}</td>
          </tr>
        </tbody>
      </table>

      <div class="line2">
        <p>2. Thời gian nhận hàng: ${esc(doc.deliveryTimeText || "")}</p>
        <p>Địa điểm nhận hàng: ${esc(doc.deliveryLocation || "")}</p>
      </div>
      <p>3. Phương thức thanh toán: ${esc(doc.paymentMethodText || "Chuyển khoản")}.</p>
      <p>4. ${esc(doc.priceBasisNote || "Giá thanh toán trên dựa trên giá nhập tại nhà máy")}.</p>
      <p>5. ${esc(doc.officialPriceNote || "Đơn giá thanh toán sẽ điều chỉnh khi có giá chính thức của nhà máy")}.</p>
      <p>6. ${esc(doc.includedTaxNote || "Đơn giá trên đã bao gồm thuế GTGT, thuế BVMT và quỹ bình ổn")}.</p>

      <div class="signatures">
        <div>
          <div class="bold">XÁC NHẬN CỦA ${esc(doc.supplierName)}</div>
        </div>
        <div>
          <div class="bold">CÔNG TY THIÊN PHÚC</div>
        </div>
      </div>
    </section>
  `;
}

export function openTermOrderDocumentsPrint(items: TermOrderDocument[]) {
  const win = window.open("", "_blank");
  if (!win) return false;

  win.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>In đơn đặt hàng TERM</title>
        <style>
          @page { size: A4; margin: 14mm; }
          * { box-sizing: border-box; }
          body { font-family: "Times New Roman", serif; color: #000; margin: 0; font-size: 15px; }
          .page { page-break-after: always; padding: 0; }
          .page:last-child { page-break-after: auto; }
          .top { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; text-align: center; }
          .national { text-align: center; }
          .bold { font-weight: 700; }
          .date { text-align: right; font-style: italic; margin: 24px 70px 26px 0; }
          h1 { text-align: center; margin: 0 0 24px; font-size: 28px; }
          p { margin: 5px 0; line-height: 1.25; }
          .center { text-align: center; }
          .right { text-align: right; }
          table { width: 100%; border-collapse: collapse; margin: 12px 0; }
          th, td { border: 1px solid #000; padding: 6px 8px; vertical-align: middle; }
          th { text-align: center; font-weight: 700; }
          .line2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-top: 28px; text-align: center; min-height: 120px; }
        </style>
      </head>
      <body>${items.map(renderDocument).join("")}</body>
    </html>
  `);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
  return true;
}
