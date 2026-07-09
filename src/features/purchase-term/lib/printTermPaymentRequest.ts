import dayjs from "dayjs";
import logoUrl from "../../../assets/logo_200.png";
import type { TermPaymentRequest, TermPurchaseOrderDetail } from "../types";

function esc(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "0";
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Math.round(Number(value)));
}

function longDate(value?: string | null) {
  const d = value ? dayjs(value) : dayjs();
  return `Thanh Hóa, ngày ${d.format("DD")} tháng ${d.format("MM")} năm ${d.format("YYYY")}`;
}

const ones = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];

function readTriple(value: number, full: boolean) {
  const hundred = Math.floor(value / 100);
  const ten = Math.floor((value % 100) / 10);
  const unit = value % 10;
  const parts: string[] = [];

  if (hundred > 0 || full) {
    parts.push(ones[hundred], "trăm");
  }

  if (ten > 1) {
    parts.push(ones[ten], "mươi");
    if (unit === 1) parts.push("mốt");
    else if (unit === 5) parts.push("lăm");
    else if (unit > 0) parts.push(ones[unit]);
  } else if (ten === 1) {
    parts.push("mười");
    if (unit === 5) parts.push("lăm");
    else if (unit > 0) parts.push(ones[unit]);
  } else if (unit > 0) {
    if (hundred > 0 || full) parts.push("linh");
    parts.push(unit === 5 && (hundred > 0 || full) ? "lăm" : ones[unit]);
  }

  return parts.join(" ");
}

function amountInWords(value?: number | null) {
  const rounded = Math.round(Number(value ?? 0));
  if (!rounded) return "Không đồng";

  const scales = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ"];
  const groups: number[] = [];
  let rest = rounded;
  while (rest > 0) {
    groups.push(rest % 1000);
    rest = Math.floor(rest / 1000);
  }

  const words: string[] = [];
  for (let index = groups.length - 1; index >= 0; index -= 1) {
    const group = groups[index];
    if (!group) continue;
    words.push(readTriple(group, index < groups.length - 1));
    if (scales[index]) words.push(scales[index]);
  }

  const text = `${words.join(" ")} đồng`.replace(/\s+/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function activePaymentRequest(data: TermPurchaseOrderDetail): TermPaymentRequest | null {
  const requests = (data.termPaymentRequests || []).filter((request) => request.status !== "CANCELLED");
  return requests[0] || null;
}

function latestBankInstruction(data: TermPurchaseOrderDetail, requestId: string) {
  return (data.termBankInstructions || []).find(
    (instruction) => instruction.paymentRequestId === requestId && instruction.status !== "CANCELLED",
  );
}

function paymentContent(data: TermPurchaseOrderDetail, request: TermPaymentRequest, supplierName: string) {
  const defaultContent = `Công ty Thiên Phúc thanh toán tiền hàng cho công ty ${supplierName} theo đơn hàng ${data.orderNo}`;
  const content = request.content?.trim();
  if (!content) return defaultContent;
  if (content.toLowerCase().startsWith("đề nghị thanh toán đơn đặt hàng")) return defaultContent;
  return content;
}

export function openTermPaymentRequestPrint(data: TermPurchaseOrderDetail) {
  const request = activePaymentRequest(data);
  if (!request) return false;

  const bankInstruction = latestBankInstruction(data, request.id);
  const amount = Number(request.amountVnd || 0);
  const supplierName = request.supplierName || data.supplierName || "";
  const content = paymentContent(data, request, supplierName);
  const requesterName = "Lê Thị Hoài";
  const bankSignerName = "Nguyễn Ngọc Mai";

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Phiếu đề nghị thanh toán ${esc(request.requestNo)}</title>
        <style>
          @page { size: A4; margin: 17mm 18mm; }
          * { box-sizing: border-box; }
          body { margin: 0; color: #000; font-family: "Times New Roman", serif; font-size: 16px; }
          .page { width: 100%; min-height: 260mm; position: relative; }
          .logo { position: absolute; left: 0; top: 0; width: 70px; }
          .header { text-align: center; padding-top: 18px; margin-bottom: 26px; }
          h1 { margin: 0 0 8px; font-family: Arial, sans-serif; font-size: 20px; font-weight: 800; }
          .date { font-style: italic; font-size: 11px; }
          .to { width: 430px; margin: 0 auto 28px; line-height: 1.35; }
          .to b { font-style: italic; }
          p { margin: 7px 0; line-height: 1.35; }
          table { width: 100%; border-collapse: collapse; margin: 14px 0 6px; }
          th, td { border: 1px solid #000; padding: 8px 9px; vertical-align: middle; }
          th { font-size: 11px; text-align: center; font-weight: 700; }
          td { font-size: 12px; }
          .center { text-align: center; }
          .right { text-align: right; }
          .bold { font-weight: 700; }
          .italic { font-style: italic; }
          .amount-cell { white-space: nowrap; font-weight: 700; }
          .account-line { display: inline-block; min-width: 430px; border-bottom: 1px dotted #000; height: 14px; vertical-align: bottom; }
          .commit { font-weight: 700; font-style: italic; margin-top: 10px; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 18px; text-align: center; margin-top: 38px; min-height: 170px; }
          .signature-title { font-weight: 800; font-size: 13px; }
          .signature-role { font-weight: 700; margin-top: 4px; }
          .signature-note { font-style: italic; font-size: 11px; }
          .signature-name { margin-top: 110px; font-weight: 700; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <section class="page">
          <img class="logo" src="${esc(logoUrl)}" />

          <div class="header">
            <h1>PHIẾU ĐỀ NGHỊ THANH TOÁN CHUYỂN KHOẢN</h1>
            <div class="date">${esc(longDate(request.requestDate))}</div>
          </div>

          <div class="to">
            <b>Kính gửi:</b> - Bộ phận kế toán ngân hàng<br />
            <span style="padding-left: 58px">- Các phòng ban liên quan</span>
          </div>

          <p>Người đề nghị: ${esc(requesterName)}</p>
          <p>Bộ phận: Mua hàng</p>
          <p>Kính gửi đề nghị phê duyệt khoản thanh toán sau:</p>

          <table>
            <thead>
              <tr>
                <th style="width: 43%">Nội dung đề nghị</th>
                <th style="width: 17%">Mã nhà cung cấp</th>
                <th style="width: 21%">Mã đơn hàng</th>
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="center">${esc(content)}</td>
                <td class="center bold">${esc(data.supplierCode || "")}</td>
                <td class="center bold">${esc(data.orderNo)}</td>
                <td>${esc(request.note || data.paymentNote || "")}</td>
              </tr>
              <tr>
                <td colspan="3" class="center bold">Tổng cộng:</td>
                <td class="right amount-cell">đ ${esc(money(amount))}</td>
              </tr>
            </tbody>
          </table>

          <p><span class="bold">Tổng số tiền ghi bằng chữ:</span> ${esc(amountInWords(amount))}</p>

          <br />
          <p>Tên tài khoản thụ hưởng: <span class="bold">${esc(bankInstruction?.beneficiaryName || supplierName)}</span></p>
          <p>Số tài khoản thụ hưởng: ${
            bankInstruction?.beneficiaryBankAccount
              ? `<span class="bold">${esc(bankInstruction.beneficiaryBankAccount)}</span>`
              : '<span class="account-line"></span>'
          }</p>
          ${
            bankInstruction?.beneficiaryBankName
              ? `<p>Ngân hàng thụ hưởng: <span class="bold">${esc(bankInstruction.beneficiaryBankName)}</span></p>`
              : ""
          }

          <p class="commit">Tôi xin cam đoan chịu hoàn toàn trách nhiệm trước công ty và pháp luật về nội dung kê khai nêu trên.</p>

          <div class="signatures">
            <div>
              <div class="signature-title">BỘ PHẬN NGÂN HÀNG</div>
              <div class="signature-role">Kế Toán Ngân Hàng</div>
              <div class="signature-note">(ký, ghi rõ họ tên)</div>
             
            </div>
            <div>
              <div class="signature-title">BAN LÃNH ĐẠO</div>
              <div class="signature-role">Phó Giám Đốc</div>
              <div class="signature-note">(ký, ghi rõ họ tên)</div>
               <div class="signature-name">${esc(bankSignerName)}</div>
            </div>
            <div>
              <div class="signature-title">BỘ PHẬN MUA HÀNG</div>
              <div class="signature-role">Người Đề Nghị</div>
              <div class="signature-note">(ký, ghi rõ họ tên)</div>
              <div class="signature-name">${esc(requesterName)}</div>
            </div>
          </div>
        </section>
      </body>
    </html>
  `;

  const win = window.open("", "_blank");
  if (!win) return false;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
  return true;
}
