import React, { useRef, useState } from "react";
import { Alert, Button, Input, InputNumber, Modal, Skeleton, Space, Typography } from "antd";
import dayjs from "dayjs";
import { SalesInvoicesApi } from "../api";
import { useCreateInvoiceDraft, useInvoicePreview, useIssueInvoice } from "../hooks";
import type { InvoiceLineEdit, InvoiceSource, SalesInvoicePreview, UnissuedInvoiceSource } from "../types";
import { CommonTable } from "../../../shared/ui/CommonTable";
import { useIsMobile } from "../../../shared/ui/mobile";
import { extractApiError } from "../../../shared/lib/httpError";
import { invoiceRequestId } from "../invoice-request-id";
import { IssueInvoiceModal } from "./IssueInvoiceModal";
import { formatMoney, formatQty } from "./labels";
import "./issue-invoice-modal.css";

export type PreparedInvoice = { source: InvoiceSource; preview: SalesInvoicePreview };
const lineKey = (line: { salesOrderLineId: string; salesDeliveryLineId?: string | null; sourceLineNo?: number; lineNo?: number }) => `${line.salesOrderLineId}:${line.salesDeliveryLineId ?? ""}:${line.sourceLineNo ?? line.lineNo ?? ""}`;
const compactDecimal = (value: string) => value.replace(/(\.\d*?[1-9])0+$|\.0+$/, "$1");
const discountPerUnit = (line: SalesInvoicePreview["lines"][number]) => Number(line.qty) ? compactDecimal((Number(line.discountAmount) / Number(line.qty)).toFixed(8)) : "0";

export function InvoiceIssueWorkspace({ row, onClose, initial, onPrepared }: {
  row: UnissuedInvoiceSource; onClose: () => void; initial?: PreparedInvoice; onPrepared?: (prepared: PreparedInvoice) => void;
}) {
  const mobile = useIsMobile();
  const previewQuery = useInvoicePreview(row.source);
  const base = previewQuery.data;
  const [edits, setEdits] = useState<Record<string, InvoiceLineEdit>>(() => Object.fromEntries((initial?.source.lineEdits ?? []).map(line => [lineKey(line), line])));
  const [reason, setReason] = useState(initial?.source.changeReason ?? "");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [review, setReview] = useState<PreparedInvoice>();
  const [draftId, setDraftId] = useState<string>();
  const requestId = useRef(initial?.source.requestId ?? invoiceRequestId());
  const inFlight = useRef(false);
  const create = useCreateInvoiceDraft({ silent: true });
  const issue = useIssueInvoice();
  const busy = checking || create.isPending || issue.isPending;
  const lines = base?.lines ?? [];
  function current(line: SalesInvoicePreview["lines"][number]): InvoiceLineEdit {
    return edits[lineKey(line)] ?? { sourceLineNo: line.lineNo, salesOrderLineId: line.salesOrderLineId, salesDeliveryLineId: line.salesDeliveryLineId, qty: compactDecimal(line.qty), discountUnitPrice: discountPerUnit(line) };
  }
  function update(line: SalesInvoicePreview["lines"][number], patch: Partial<InvoiceLineEdit>) {
    const cleanPatch = { ...patch, ...(patch.qty != null ? { qty: compactDecimal(patch.qty) } : {}), ...(patch.discountUnitPrice != null ? { discountUnitPrice: compactDecimal(patch.discountUnitPrice) } : {}) };
    setEdits(previous => ({ ...previous, [lineKey(line)]: { ...current(line), ...cleanPatch } }));
    setError("");
  }
  async function check() {
    if (!base || inFlight.current) return;
    const values = Object.values(edits);
    if (!lines.some(line => !current(line).omitted)) { setError("Hóa đơn phải còn ít nhất một dòng hàng."); return; }
    if (values.length && !reason.trim()) { setError("Nhập lý do sửa lượng, chiết khấu hoặc bỏ dòng."); return; }
    if (values.some(line => !line.omitted && (!(Number(line.qty) > 0) || line.discountUnitPrice === ""))) { setError("Kiểm tra số lượng và chiết khấu của các dòng hàng."); return; }
    inFlight.current = true; setChecking(true); setError("");
    try {
      const source: InvoiceSource = { ...row.source, expectedFingerprint: base.sourceFingerprint, requestId: requestId.current,
        ...(values.length ? { lineEdits: values, changeReason: reason.trim() } : {}) };
      const preview = await SalesInvoicesApi.preview(source);
      setReview({ source, preview });
    } catch (err) { setError(extractApiError(err).message); }
    finally { inFlight.current = false; setChecking(false); }
  }
  async function publish() {
    if (!review || inFlight.current) return;
    if (onPrepared) { onPrepared(review); onClose(); return; }
    inFlight.current = true; setError("");
    let id = draftId;
    try {
      id = id ?? (await create.mutateAsync(review.source)).id;
      setDraftId(id);
      await issue.mutateAsync({ invoiceId: id, overrideMissingPurchaseInvoice: review.preview.warnings?.some(w => w.code === "PURCHASE_INVOICE_PENDING") || undefined });
      onClose();
    } catch (err) { setError(`${extractApiError(err).message}${id ? " Hóa đơn đã được lưu. Có thể thử lại đúng bản này; nếu cần sửa nội dung, đóng hộp và kiểm tra tại Xuất nháp/Xuất HĐ lỗi." : ""}`); }
    finally { inFlight.current = false; }
  }
  const qtyField = (line: SalesInvoicePreview["lines"][number]) => <InputNumber<string> stringMode size="small" aria-label={`Số lượng ${line.description}`} value={current(line).qty} formatter={compactDecimal} min="0.000001" precision={6} disabled={current(line).omitted || busy} onChange={value => update(line, { qty: value ?? "" })} style={{ width: "100%" }} />;
  const discountField = (line: SalesInvoicePreview["lines"][number]) => <InputNumber<string> stringMode size="small" aria-label={`Chiết khấu mỗi đơn vị ${line.description}`} value={current(line).discountUnitPrice} formatter={compactDecimal} max={line.unitPrice} precision={8} disabled={current(line).omitted || busy} onChange={value => update(line, { discountUnitPrice: value ?? "" })} style={{ width: "100%" }} />;
  const removeButton = (line: SalesInvoicePreview["lines"][number]) => <Button size="small" type="text" danger={!current(line).omitted} disabled={busy} onClick={() => update(line, { omitted: !current(line).omitted })}>{current(line).omitted ? "Khôi phục" : "Bỏ dòng"}</Button>;
  const view = review?.preview;
  return <>
    <Modal open={!review} width={820} centered className="issue-invoice-modal" title={`Chuẩn bị hóa đơn · ${row.sourceNo}`} closable={!busy} maskClosable={!busy} onCancel={() => { if (!busy) onClose(); }} footer={<Space><Button size="small" disabled={busy} onClick={onClose}>Đóng</Button><Button size="small" type="primary" loading={checking} disabled={!base || previewQuery.isError} onClick={() => void check()}>Kiểm tra và tiếp tục</Button></Space>}>
      <Typography.Text strong>{row.customer.code}</Typography.Text>
      <Alert type="info" showIcon className="issue-alert" message="Kế toán được phát hành ngay bản đã sửa. Sale, kho và quản lý nhận thông báo khi lưu; xác nhận lại không chặn phát hành." />
      {error ? <Alert type="error" showIcon message={error} className="issue-alert" /> : null}
      {previewQuery.isError ? <Alert type="error" message={extractApiError(previewQuery.error).message} action={<Button size="small" onClick={() => void previewQuery.refetch()}>Tải lại</Button>} /> : !base ? <Skeleton active /> : <>
        {mobile ? <div className="invoice-edit-mobile">{lines.map(line => <div className={`invoice-edit-mobile-line ${current(line).omitted ? "is-omitted" : ""}`} key={lineKey(line)}>
          <strong>{line.description}</strong><small>Gốc: {formatQty(line.qty)} {line.uom} · CK/đv {formatMoney(discountPerUnit(line))}</small>
          <div className="invoice-edit-fields"><label>Số lượng ({line.uom}){qtyField(line)}</label><label>CK/đv{discountField(line)}</label></div>
          {removeButton(line)}
        </div>)}</div> : <CommonTable<SalesInvoicePreview["lines"][number]> tableKey="sales-invoices:edit-lines" size="small" bordered pagination={false} rowKey={lineKey} dataSource={lines} columns={[
          { key: "description", title: "Mặt hàng", width: 220, render: (_, line) => <span style={{ opacity: current(line).omitted ? 0.45 : 1 }}>{line.description}<br /><Typography.Text type="secondary" style={{ fontSize: 11 }}>Gốc: {formatQty(line.qty)} {line.uom} · CK/đv {formatMoney(discountPerUnit(line))}</Typography.Text></span> },
          { key: "qty", title: "Số lượng", width: 135, render: (_, line) => qtyField(line) },
          { key: "discount", title: "CK/đv", width: 125, render: (_, line) => discountField(line) },
          { key: "unitPrice", title: "Giá gốc", width: 110, align: "right", render: (_, line) => formatMoney(line.unitPrice) },
          { key: "actions", title: "", width: 95, render: (_, line) => removeButton(line) },
        ]} />}
        <label className="invoice-edit-reason">Lý do thay đổi {Object.keys(edits).length ? "*" : ""}<Input.TextArea size="small" rows={2} maxLength={1000} value={reason} disabled={busy} onChange={event => setReason(event.target.value)} placeholder="Lý do sửa hoặc bỏ dòng để sale/kho đối chiếu" /></label>
      </>}
    </Modal>
    {view && review ? <>
      <IssueInvoiceModal open loadMisaPreview={() => draftId ? SalesInvoicesApi.draftMisaPreview(draftId) : SalesInvoicesApi.misaPreview(review.source)} error={error} loading={busy} confirmText={onPrepared ? "Áp dụng cho đợt xuất" : draftId ? "Thử phát hành lại" : "Phát hành"} cancelText={draftId ? "Đóng" : "Quay lại sửa"} onCancel={() => { if (draftId) onClose(); else setReview(undefined); }} onConfirm={() => void publish()} invoice={{
        invoiceDate: dayjs().format("YYYY-MM-DD"), buyerName: view.buyer.name, buyerTaxCode: view.buyer.taxCode, buyerAddress: view.buyer.address, buyerEmail: view.buyer.email,
        ...view.totals, lines: view.lines, creditWarning: row.creditWarning,
        purchaseInvoiceWarning: view.warnings?.find(w => w.code === "PURCHASE_INVOICE_PENDING") ?? row.purchaseInvoiceWarning,
      }} />
    </> : null}
  </>;
}
