import React, { useState } from "react";
import { Alert, Button, Input, Skeleton, Space, Tag, Typography } from "antd";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SalesInvoicesApi } from "../api";
import { CommonTable } from "../../../shared/ui/CommonTable";
import { MobileList, MobileListItem, MobileListToolbar, MobileListValues } from "../../../shared/ui/MobileList";
import { useIsMobile } from "../../../shared/ui/mobile";
import { extractApiError } from "../../../shared/lib/httpError";
import { formatMoney, formatQty, InvoiceStatusTag } from "../ui/labels";
import type { InvoiceChangeLine } from "../types";
import dayjs from "dayjs";
import "../../../shared/ui/page-shell.css";

export default function InvoiceChangeReviewPage() {
  const { id } = useParams();
  const mobile = useIsMobile();
  const client = useQueryClient();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const query = useQuery({ queryKey: ["salesInvoices", "accounting-change", id], queryFn: () => SalesInvoicesApi.accountingChange(id!), enabled: !!id, retry: false });
  const data = query.data, change = data?.change;
  const decision = useMutation({ mutationFn: (result: "CONFIRMED" | "REJECTED") => SalesInvoicesApi.reviewAccountingChange(id!, { changeId: change!.id, previousDecisionId: change!.decisionId, decision: result, reason: reason.trim() || undefined }),
    onSuccess: result => { client.setQueryData(["salesInvoices", "accounting-change", id], result); setReason(""); setError(""); void client.invalidateQueries({ queryKey: ["salesInvoices", "detail", id] }); },
    onError: err => { setError(extractApiError(err).message); void query.refetch(); },
  });
  if (query.isPending) return <Skeleton active />;
  if (query.isError) return <Alert type="error" showIcon message={extractApiError(query.error).message} action={<Button size="small" onClick={() => void query.refetch()}>Thử lại</Button>} />;
  if (!change || !data) return <Alert type="info" message="Hóa đơn không có thay đổi cần xác nhận." />;
  const status = { PENDING: "Chờ xác nhận lại", CONFIRMED: "Đã xác nhận lại", REJECTED: "Từ chối xác nhận" };
  const afterByKey = new Map(change.after.map(line => [line.key, line]));
  const rows = change.before.map(before => ({ ...before, after: afterByKey.get(before.key) }));
  const actions = <Space wrap>
    <Button size="small" loading={query.isFetching} disabled={decision.isPending} onClick={() => void query.refetch()}>Làm mới</Button>
    {data.invoiceStatus !== "CANCELLED" && change.status !== "REJECTED" ? <>
      {data.canConfirm && change.status === "PENDING" ? <Button size="small" type="primary" loading={decision.isPending} onClick={() => decision.mutate("CONFIRMED")}>Xác nhận lại</Button> : null}
      {data.canReject ? <Button size="small" danger disabled={decision.isPending || !reason.trim()} onClick={() => decision.mutate("REJECTED")}>Từ chối xác nhận</Button> : null}
    </> : null}
  </Space>;
  const changeValue = (before: InvoiceChangeLine, field: "qty" | "discountUnitPrice") => {
    const after = afterByKey.get(before.key);
    const format = field === "qty" ? formatQty : formatMoney;
    return `${format(before[field])} → ${after ? format(after[field]) : "Bỏ dòng"}${field === "qty" && before.uom ? ` ${before.uom}` : ""}`;
  };
  return <div className="page-shell">
    <Space wrap><Typography.Text strong>{data.sourceNo} · {data.invoiceNo}</Typography.Text><InvoiceStatusTag status={data.invoiceStatus} /><Tag color={change.status === "REJECTED" ? "error" : change.status === "CONFIRMED" ? "success" : "warning"}>{status[change.status]}</Tag></Space>
    <Alert showIcon type="info" message="Xác nhận lại thông tin, không chặn phát hành hóa đơn" description="Từ chối xác nhận ghi nhận chênh lệch cần xử lý; không tự sửa hoặc hủy hóa đơn đã phát hành, đơn bán hay chứng từ kho." />
    <Typography.Text>Lý do kế toán thay đổi: {change.reason}</Typography.Text>
    {error ? <Alert type="error" message={error} /> : null}
    {mobile ? <MobileList>{rows.map(line => <MobileListItem key={line.key} title={line.description} status={!line.after ? <Tag color="error">Bỏ dòng</Tag> : undefined} description="Trước → sau"><MobileListValues items={[{ label: "Số lượng", value: changeValue(line, "qty") }, { label: "CK/đv", value: changeValue(line, "discountUnitPrice") }]} /></MobileListItem>)}</MobileList> : <CommonTable tableKey="sales-invoices:change-review" rowKey="key" size="small" bordered dataSource={rows} pagination={false} columns={[
      { key: "description", title: "Mặt hàng", dataIndex: "description", width: 260 },
      { key: "qty", title: "Số lượng trước → sau", width: 180, render: (_, line) => changeValue(line, "qty") },
      { key: "discount", title: "CK/đv trước → sau", width: 180, render: (_, line) => changeValue(line, "discountUnitPrice") },
      { key: "state", title: "Dòng hàng", width: 120, render: (_, line) => line.after ? "Giữ lại" : <Tag color="error">Bỏ khỏi HĐ</Tag> },
    ]} />}
    {data.canReject && change.status !== "REJECTED" && data.invoiceStatus !== "CANCELLED" ? <label>Lý do từ chối (bắt buộc khi từ chối)<Input.TextArea size="small" rows={2} maxLength={1000} value={reason} disabled={decision.isPending} onChange={event => setReason(event.target.value)} /></label> : null}
    {change.decisionReason ? <Alert type={change.status === "REJECTED" ? "warning" : "success"} message={change.decisionReason} /> : null}
    <details><summary>Lịch sử xử lý ({change.history.length})</summary>{change.history.map(event => <p key={event.id}>{dayjs(event.occurredAt).format("DD/MM/YYYY HH:mm")} · {event.eventType === "ACCOUNTING_EDITED" ? "Kế toán thay đổi" : event.eventType === "ACCOUNTING_CONFIRMED" ? "Xác nhận lại" : "Từ chối xác nhận"}{event.reason ? ` · ${event.reason}` : ""}</p>)}</details>
    {mobile ? <MobileListToolbar tools={[]} openTool={null} onToolChange={() => {}} actions={actions} summary={status[change.status]} /> : actions}
  </div>;
}
