import React, { useEffect, useRef, useState } from "react";
import { Alert, Button, Checkbox, Modal, Space, Tag } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { invoiceRequestId } from "../invoice-request-id";
import { SalesInvoicesApi } from "../api";
import type { UnissuedInvoiceSource } from "../types";
import { InvoiceIssueWorkspace } from "./InvoiceIssueWorkspace";
import type { PreparedInvoice } from "./InvoiceIssueWorkspace";
import { extractApiError } from "../../../shared/lib/httpError";
import { formatMoney } from "./labels";

type Item = { row: UnissuedInvoiceSource; prepared?: PreparedInvoice; status: "CHECKING" | "READY" | "ERROR"; message?: string };
export function BulkInvoiceIssueModal({ rows, onClose, onCreated }: { rows: UnissuedInvoiceSource[]; onClose: () => void; onCreated: (id: string) => void }) {
  const client = useQueryClient();
  const [items, setItems] = useState<Item[]>(() => rows.map(row => ({ row, status: "CHECKING" })));
  const [editing, setEditing] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const requestId = useRef(invoiceRequestId());
  const update = (id: string, patch: Partial<Item>) => setItems(previous => previous.map(item => item.row.id === id ? { ...item, ...patch } : item));
  useEffect(() => {
    let active = true, next = 0;
    // Limit read-only preflight requests; issuance itself is exclusively backend work.
    const inspect = async () => {
      while (active && next < rows.length) {
        const row = rows[next++];
        try {
          const preview = await SalesInvoicesApi.preview(row.source);
          if (active) update(row.id, { prepared: { preview, source: { ...row.source, expectedFingerprint: preview.sourceFingerprint, requestId: invoiceRequestId() } }, status: "READY" });
        } catch (err) { if (active) update(row.id, { status: "ERROR", message: extractApiError(err).message }); }
      }
    };
    void Promise.all(Array.from({ length: Math.min(4, rows.length) }, inspect));
    return () => { active = false; };
  }, [rows]);
  const ready = items.filter(item => item.status === "READY" && item.prepared);
  const purchaseWarning = ready.some(item => item.prepared?.preview.warnings?.some(w => w.code === "PURCHASE_INVOICE_PENDING"));
  async function submit() {
    if (lock.current || !confirmed || !ready.length) return;
    lock.current = true; setSubmitting(true); setError("");
    try {
      const batch = await SalesInvoicesApi.createBatch({ requestId: requestId.current, items: ready.map(item => ({ source: item.prepared!.source,
        overrideMissingPurchaseInvoice: item.prepared!.preview.warnings?.some(w => w.code === "PURCHASE_INVOICE_PENDING") || undefined })) });
      void client.invalidateQueries({ queryKey: ["salesInvoices", "batches"] });
      onCreated(batch.id); onClose();
    } catch (err) { setError(extractApiError(err).message); }
    finally { lock.current = false; setSubmitting(false); }
  }
  const edit = items.find(item => item.row.id === editing);
  return <>
    <Modal open width={780} title={`Chuẩn bị đợt xuất · ${items.length} chứng từ`} className="issue-invoice-modal" closable={!submitting} maskClosable={!submitting} onCancel={() => { if (!submitting) onClose(); }} footer={<Space><Button size="small" disabled={submitting} onClick={onClose}>Đóng</Button><Button size="small" type="primary" loading={submitting} disabled={!confirmed || !ready.length || items.some(item => item.status === "CHECKING")} onClick={() => void submit()}>Giao worker phát hành {ready.length} hóa đơn</Button></Space>}>
      <Alert type="info" showIcon message="Đợt xuất chạy nền trên máy chủ. Đóng hoặc tải lại trang vẫn tiếp tục; mở Đợt xuất gần đây để theo dõi." />
      {error ? <Alert type="error" showIcon message={error} description="Nếu mất kết nối, kiểm tra Đợt xuất gần đây. Gửi lại cùng yêu cầu sẽ mở đúng đợt đã tạo." /> : null}
      <div className="invoice-batch-list">{items.map(item => <div className="invoice-batch-line" key={item.row.id}>
        <strong>{item.row.sourceNo} · {item.row.customer.code}</strong>
        <Space wrap><Tag color={item.status === "READY" ? "success" : item.status === "ERROR" ? "error" : "default"}>{item.status === "READY" ? "Sẵn sàng" : item.status === "ERROR" ? "Cần kiểm tra" : "Đang kiểm tra"}</Tag>{item.prepared ? <span>{formatMoney(item.prepared.preview.totals.grandTotal)} đ</span> : null}</Space>
        {item.message ? <Alert type="error" message={item.message} /> : null}
        <Button size="small" disabled={submitting || item.status === "CHECKING"} onClick={() => setEditing(item.row.id)}>Xem trước / sửa</Button>
      </div>)}</div>
      {purchaseWarning ? <Alert type="warning" showIcon message="Đợt xuất có đơn chưa có hóa đơn đầu vào; xác nhận dưới đây đồng thời xác nhận tiếp tục với giá vốn tạm tính." /> : null}
      {items.some(item => item.status === "ERROR") ? <Alert type="warning" message="Các chứng từ chưa sẵn sàng sẽ không được đưa vào đợt xuất." /> : null}
      <Checkbox disabled={submitting} checked={confirmed} onChange={event => setConfirmed(event.target.checked)}>Tôi đã kiểm tra nội dung và xác nhận phát hành {ready.length} hóa đơn.</Checkbox>
    </Modal>
    {edit ? <InvoiceIssueWorkspace key={edit.row.id} row={edit.row} initial={edit.prepared} onClose={() => setEditing(undefined)} onPrepared={prepared => { update(edit.row.id, { prepared, status: "READY", message: undefined }); setConfirmed(false); }} /> : null}
  </>;
}
