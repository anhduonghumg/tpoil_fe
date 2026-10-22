import React, { useEffect, useState } from "react";
import { Alert, Badge, Button, Drawer, Empty, Modal, Progress, Skeleton, Space, Tag } from "antd";
import { HistoryOutlined, ReloadOutlined, SyncOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { SalesInvoicesApi } from "../api";
import type { InvoiceBatchItemState, InvoiceBatchRun } from "../types";
import { CommonTable } from "../../../shared/ui/CommonTable";
import { MobileList, MobileListItem } from "../../../shared/ui/MobileList";
import { useIsMobile } from "../../../shared/ui/mobile";
import { useCan } from "../../../shared/authz/useCan";
import { extractApiError } from "../../../shared/lib/httpError";

const active = (run?: InvoiceBatchRun) => !!run && ["PENDING", "PROCESSING"].includes(run.status);
function label(run: InvoiceBatchRun) {
  if (active(run)) return run.stopRequested ? "Đang dừng sau hóa đơn hiện tại" : run.status === "PENDING" ? "Chờ worker" : "Đang phát hành";
  return run.stopRequested ? "Đã dừng" : run.counts.failed ? "Hoàn tất, có lỗi" : "Hoàn tất";
}
const itemLabels = { PENDING: "Chờ xử lý", RUNNING: "Đang phát hành", DONE: "Thành công", FAILED: "Lỗi", CANCELLED: "Chưa xuất · đã dừng" };

export function InvoiceBatchProgressModal({ id, onClose }: { id: string; onClose: () => void }) {
  const mobile = useIsMobile(), client = useQueryClient(), { can } = useCan();
  const query = useQuery({ queryKey: ["salesInvoices", "batch", id], queryFn: () => SalesInvoicesApi.batch(id), refetchInterval: q => !q.state.data || active(q.state.data) ? 2500 : false });
  const run = query.data;
  const action = useMutation({ mutationFn: (kind: "stop" | "retry") => kind === "stop" ? SalesInvoicesApi.stopBatch(id) : SalesInvoicesApi.retryBatch(id),
    onSuccess: data => { client.setQueryData(["salesInvoices", "batch", id], data); void client.invalidateQueries({ queryKey: ["salesInvoices", "batches"] }); void client.invalidateQueries({ queryKey: ["salesInvoices", "list"] }); },
  });
  const confirmStop = () => Modal.confirm({ title: "Dừng phần chưa phát hành?", content: "Hóa đơn đang gửi sẽ được xử lý xong. Các hóa đơn thành công được giữ nguyên.", okText: "Dừng phần còn lại", cancelText: "Tiếp tục chạy", okButtonProps: { size: "small" }, cancelButtonProps: { size: "small" }, onOk: () => action.mutateAsync("stop") });
  const status = (item: InvoiceBatchItemState) => <Tag color={item.status === "DONE" ? "success" : item.status === "FAILED" ? "error" : "default"}>{itemLabels[item.status]}</Tag>;
  return <Modal open width={900} title={run ? `${label(run)} · ${run.counts.done}/${run.counts.total}` : "Tiến độ đợt xuất"} className="issue-invoice-modal" onCancel={onClose} footer={<Space wrap>
    <Button size="small" loading={query.isFetching} onClick={() => void query.refetch()}>Làm mới</Button>
    {run && can("sales.invoice.issue") ? active(run) ? <Button size="small" danger disabled={run.stopRequested || action.isPending} onClick={confirmStop}>Dừng phần chưa xuất</Button> : run.counts.failed + run.counts.cancelled + run.counts.running + run.counts.pending > 0 ? <Button size="small" type="primary" loading={action.isPending} onClick={() => action.mutate("retry")}>Tiếp tục / thử lại phần chưa thành công</Button> : null : null}
    <Button size="small" onClick={onClose}>{active(run) ? "Đóng · vẫn chạy nền" : "Đóng"}</Button>
  </Space>}>
    <Alert type="info" showIcon message="Tiến độ được lưu trên máy chủ. Có thể đóng trang và mở lại từ Lịch sử xuất hàng loạt." />
    {query.isError || action.isError ? <Alert type="error" message={extractApiError(query.error ?? action.error).message} /> : null}
    {run ? <>
      <small>Mã đợt: {run.id} · {dayjs(run.queuedAt).format("DD/MM/YYYY HH:mm")}</small>
      <Progress percent={Math.round((run.counts.done + run.counts.failed + run.counts.cancelled) / Math.max(1, run.counts.total) * 100)} size="small" status={run.counts.failed ? "exception" : undefined} />
      <Space wrap><Tag color="success">Thành công {run.counts.done}</Tag><Tag color="error">Lỗi {run.counts.failed}</Tag><Tag>Chờ {run.counts.pending}</Tag><Tag>Đang xử lý {run.counts.running}</Tag><Tag>Đã dừng {run.counts.cancelled}</Tag></Space>
      {run.error ? <Alert type="warning" message={run.error} /> : null}
      {mobile ? <MobileList>{(run.items ?? []).map(item => <MobileListItem key={item.index} title={item.sourceNo} status={status(item)} description={<><span>{item.customerCode}</span><span>{item.invoiceNo}</span></>}><span style={{ whiteSpace: "normal", overflowWrap: "anywhere" }}>{item.error}</span></MobileListItem>)}</MobileList> : <CommonTable<InvoiceBatchItemState> tableKey="sales-invoices:batch-progress" rowKey="index" size="small" pagination={{ pageSize: 20, showSizeChanger: false }} dataSource={run.items ?? []} columns={[
        { key: "source", title: "Đơn/phiếu", dataIndex: "sourceNo", width: 150 }, { key: "customer", title: "Khách hàng", dataIndex: "customerCode", width: 110 },
        { key: "status", title: "Trạng thái", width: 130, render: (_, item) => status(item) }, { key: "invoice", title: "Số hóa đơn", dataIndex: "invoiceNo", width: 130 },
        { key: "error", title: "Chi tiết lỗi", dataIndex: "error", width: 260, render: text => <span title={text} style={{ whiteSpace: "normal", overflowWrap: "anywhere" }}>{text}</span> },
      ]} />}
    </> : null}
  </Modal>;
}

function tone(run: InvoiceBatchRun) {
  if (active(run)) return run.stopRequested ? "warning" : "processing";
  return run.stopRequested ? "default" : run.counts.failed || run.status === "FAILED" ? "error" : "success";
}
function duration(run: InvoiceBatchRun) {
  if (!run.startedAt || !run.finishedAt) return undefined;
  const seconds = Math.max(0, dayjs(run.finishedAt).diff(run.startedAt, "second"));
  return seconds < 60 ? `${seconds} giây` : `${Math.floor(seconds / 60)} phút ${seconds % 60 ? `${seconds % 60} giây` : ""}`.trim();
}

/** Thanh xanh = thành công, phần đỏ phía sau = lỗi; phần xám còn lại là chưa xử lý / đã dừng. */
function RunProgress({ run }: { run: InvoiceBatchRun }) {
  const total = Math.max(1, run.counts.total);
  return <Progress size="small" showInfo={false} strokeColor="#ff4d4f" percent={(run.counts.done + run.counts.failed) / total * 100} success={{ percent: run.counts.done / total * 100 }} />;
}

function BatchRunCard({ run, onOpen }: { run: InvoiceBatchRun; onOpen: () => void }) {
  const left = run.counts.pending + run.counts.running;
  return <button type="button" className={`invoice-batch-run${active(run) ? " is-active" : ""}`} onClick={onOpen}>
    <span className="invoice-batch-run-head">
      <strong>{dayjs(run.queuedAt).format("DD/MM/YYYY HH:mm")}</strong>
      <Tag color={tone(run)}>{label(run)}</Tag>
    </span>
    <RunProgress run={run} />
    <span className="invoice-batch-run-counts">
      <span><b>{run.counts.done}</b>/{run.counts.total} hóa đơn</span>
      {run.counts.failed ? <span className="is-error">{run.counts.failed} lỗi</span> : null}
      {left ? <span>{left} đang chờ</span> : null}
      {run.counts.cancelled ? <span>{run.counts.cancelled} đã dừng</span> : null}
      {duration(run) ? <span className="is-muted">{duration(run)}</span> : null}
    </span>
    {run.error ? <span className="invoice-batch-run-error" title={run.error}>{run.error}</span> : null}
  </button>;
}

export function InvoiceBatchHistory({ onOpen }: { onOpen: (id: string) => void }) {
  const client = useQueryClient(), mobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const query = useQuery({ queryKey: ["salesInvoices", "batches"], queryFn: SalesInvoicesApi.batches, refetchInterval: q => q.state.data?.some(active) || open ? 3000 : 10_000 });
  const terminal = query.data?.filter(run => !active(run)).map(run => `${run.id}:${run.generation}:${run.status}`).join("|") ?? "";
  useEffect(() => {
    if (!terminal) return;
    void client.invalidateQueries({ queryKey: ["salesInvoices", "list"] });
    void client.invalidateQueries({ queryKey: ["salesInvoices", "unissued"] });
  }, [terminal, client]);
  const runs = query.data ?? [], running = runs.filter(active), finished = runs.filter(run => !active(run));
  const current = running[0];
  const openRun = (id: string) => { setOpen(false); onOpen(id); };
  return <div className="invoice-batch-history">
    {/* Đợt đang chạy hiện ngay trên thanh công cụ — không phải mở lịch sử mới biết tiến độ. */}
    {current ? <button type="button" className="invoice-batch-live" onClick={() => onOpen(current.id)} title="Mở tiến độ đợt đang chạy">
      <SyncOutlined spin={!current.stopRequested} />
      <span>{current.stopRequested ? "Đang dừng" : "Đang xuất"} {current.counts.done + current.counts.failed}/{current.counts.total}</span>
      {current.counts.failed ? <span className="is-error">{current.counts.failed} lỗi</span> : null}
    </button> : null}
    <Badge count={running.length} size="small" offset={[-4, 2]}>
      <Button size="small" icon={<HistoryOutlined />} onClick={() => setOpen(true)}>Lịch sử xuất hàng loạt</Button>
    </Badge>
    <Drawer open={open} onClose={() => setOpen(false)} width={mobile ? "100%" : 440} className="invoice-batch-drawer"
      title="Lịch sử xuất hàng loạt" extra={<Button size="small" type="text" aria-label="Làm mới" icon={<ReloadOutlined />} loading={query.isFetching} onClick={() => void query.refetch()} />}>
      {query.isError ? <Alert type="warning" showIcon message="Chưa tải được lịch sử đợt xuất" action={<Button size="small" onClick={() => void query.refetch()}>Tải lại</Button>} /> : null}
      {!query.data && query.isPending ? <Skeleton active paragraph={{ rows: 4 }} /> : !runs.length && !query.isError ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<><strong>Chưa có đợt xuất nào</strong><br /><span className="invoice-batch-muted">Chọn nhiều đơn rồi bấm "Xuất hàng loạt" — tiến độ từng đợt sẽ hiện ở đây.</span></>} /> : <>
        {running.length ? <section className="invoice-batch-group"><h5>Đang chạy ({running.length})</h5>{running.map(run => <BatchRunCard key={run.id} run={run} onOpen={() => openRun(run.id)} />)}</section> : null}
        {finished.length ? <section className="invoice-batch-group"><h5>Đã xong ({finished.length})</h5>{finished.map(run => <BatchRunCard key={run.id} run={run} onOpen={() => openRun(run.id)} />)}</section> : null}
        {runs.length ? <p className="invoice-batch-muted">Hiển thị 20 đợt gần nhất do bạn tạo. Bấm vào một đợt để xem chi tiết từng hóa đơn, dừng hoặc thử lại phần lỗi.</p> : null}
      </>}
    </Drawer>
  </div>;
}
