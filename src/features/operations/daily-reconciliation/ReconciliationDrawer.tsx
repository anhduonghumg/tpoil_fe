import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button, Drawer, Popconfirm, Skeleton, Space, Table, Tabs, Tag, Tooltip, Typography, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { CheckOutlined, DeleteOutlined, DownloadOutlined, ReloadOutlined, SwapOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { extractApiError } from "../../../shared/lib/httpError";
import { dailyReconApi, MODE_LABEL, STATUS, type Lookups } from "./api";
import type { ReplaceTarget } from "./ImportModal";
import ResolveModal, { qty } from "./ResolveModal";
import TotalsTable from "./TotalsTable";

type Filter = "TODO" | "VARIANCE" | "ALL";
type Props = {
  id?: string; reloadKey: number; lookups: Lookups;
  onClose: () => void; onChanged: () => void; onReplace: (target: ReplaceTarget) => void; onDeleted: () => void;
};

const fmtPeriod = (s: any) => s.dateFrom === s.dateTo
  ? dayjs(s.dateFrom).format("DD/MM/YYYY") : `${dayjs(s.dateFrom).format("DD/MM")} – ${dayjs(s.dateTo).format("DD/MM/YYYY")}`;
const stack = (top: ReactNode, sub: ReactNode) => (
  <div className="data-grid-stack"><div>{top}</div><div className="data-grid-sub">{sub}</div></div>
);
const signed = (d: string | null) => d == null ? <span className="data-grid-empty">—</span>
  : <span className={d === "0" ? "data-grid-num" : "data-grid-num sales-grid-danger"}>{Number(d) > 0 ? "+" : ""}{qty(d)}</span>;

/** Chi tiết một lần đối chiếu: chỉ hiện dòng cần xử lý trước, dòng khớp để ở tab "Tất cả". */
export default function ReconciliationDrawer({ id, reloadKey, lookups, onClose, onChanged, onReplace, onDeleted }: Props) {
  const [session, setSession] = useState<any>();
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<Filter>("TODO");
  const [resolving, setResolving] = useState<any>();

  useEffect(() => {
    if (!id) { setSession(undefined); return; }
    setLoading(true); setFilter("TODO");
    dailyReconApi.detail(id).then(setSession)
      .catch((e) => message.error(extractApiError(e).message || "Không tải được phiên đối chiếu."))
      .finally(() => setLoading(false));
  }, [id, reloadKey]);

  const payload = session?.payload;
  const rows: any[] = payload?.results ?? [];
  const canEdit = session?.status === "DRAFT";
  const bothBases = payload?.options?.template === "TP"; // file TP có cả lít thực tế và lít 15
  const basis: "actualQty" | "v15Qty" = payload?.options?.basis === "V15" ? "v15Qty" : "actualQty";
  const n = (fn: (r: any) => boolean) => rows.filter(fn).length;
  const todo = n((r) => !r.resolved);
  const visible = useMemo(() => rows.filter((r) =>
    filter === "ALL" ? true : filter === "VARIANCE" ? r.status === "VARIANCE" : !r.resolved), [rows, filter]);

  const act = async (path: "refresh" | "close" | "decisions", body: Record<string, unknown>, success: string) => {
    setBusy(true);
    try {
      setSession(await dailyReconApi.action(session.id, path, { version: session.version, ...body }));
      setResolving(undefined); message.success(success); onChanged();
    } catch (e) { message.error(extractApiError(e).message || "Không cập nhật được đối chiếu."); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true);
    try { await dailyReconApi.remove(session.id); message.success("Đã xóa đối chiếu."); onDeleted(); }
    catch (e) { message.error(extractApiError(e).message || "Không xóa được đối chiếu."); }
    finally { setBusy(false); }
  };
  const download = async () => {
    try {
      const url = URL.createObjectURL(await dailyReconApi.source(session.id, payload.activeImportId));
      const a = document.createElement("a");
      a.href = url; a.download = fileName || "doi-chieu.xlsx"; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { message.error(extractApiError(e).message || "Không tải được file."); }
  };

  const fileName = session?.imports?.find((f: any) => f.id === payload?.activeImportId)?.fileName;
  const productOf = (r: any) => {
    const p = lookups.products.find((x) => x.id === (r.internal?.productId ?? payload?.options?.productMapping?.[r.external?.productCode]));
    return { code: p?.code ?? r.external?.productCode ?? "—", name: p?.name ?? r.internal?.productName ?? r.external?.productCode };
  };
  const qtyCell = (o: any) => !o ? <span className="data-grid-empty">—</span>
    : bothBases ? stack(<span className="data-grid-num">{qty(o.actualQty)}</span>, <>L15 {qty(o.v15Qty)}</>)
      : <span className="data-grid-num">{qty(o[basis])}</span>;
  const deltaCell = (r: any) => !r.external || !r.internal ? <span className="data-grid-empty">—</span>
    : bothBases ? stack(signed(r.actualDelta), <>L15 {signed(r.v15Delta)}</>)
      : signed(basis === "actualQty" ? r.actualDelta : r.v15Delta);

  const columns: ColumnsType<any> = [
    ...(session && session.dateFrom !== session.dateTo
      ? [{ title: "Ngày", width: 64, render: (_: any, r: any) => dayjs(r.external?.date || r.internal?.date).format("DD/MM") }] : []),
    { title: "Biển xe", width: 96, render: (_, r) => <span className="data-grid-clip data-grid-strong">{r.external?.plate || r.internal?.plate || "—"}</span> },
    { title: "Hàng", width: 80, render: (_, r) => { const p = productOf(r); return <Tooltip title={p.name}><span className="data-grid-clip">{p.code}</span></Tooltip>; } },
    { title: "Phiếu NCC", width: 100, render: (_, r) => <span className="data-grid-clip">{[r.external?.receiptNo, r.external?.orderNo].filter(Boolean).join(" / ") || "—"}</span> },
    { title: "Phiếu mình", width: 120, render: (_, r) => {
      const t = [r.internal?.orderNo, r.internal?.receiptNo].filter(Boolean).join(" / ");
      return t ? <Tooltip title={t}><span className="data-grid-clip">{t}</span></Tooltip> : <span className="data-grid-empty">—</span>;
    } },
    { title: bothBases ? "SL NCC (TT)" : "SL NCC", width: 88, align: "right", render: (_, r) => qtyCell(r.external) },
    { title: bothBases ? "SL mình (TT)" : "SL mình", width: 88, align: "right", render: (_, r) => qtyCell(r.internal) },
    { title: "Lệch", width: 76, align: "right", render: (_, r) => deltaCell(r) },
    { title: "Kết quả", width: 168, render: (_, r) => {
      const s = STATUS[r.status] ?? { label: r.status, tone: "default" };
      const confirmed = r.resolved && !["MATCHED", "CANCELLED"].includes(r.status);
      const tag = <Tag color={confirmed ? "blue" : s.tone}>{s.label}</Tag>;
      return r.note ? stack(tag, <Tooltip title={r.note}><span className="data-grid-clip">{confirmed ? "✓ " : ""}{r.note}</span></Tooltip>) : tag;
    } },
    { title: "", width: 64, fixed: "right", render: (_, r) => canEdit && !r.resolved
      ? <Button size="small" type="link" style={{ padding: 0, fontSize: 12 }} onClick={() => setResolving(r)}>Xử lý</Button> : null },
  ];
  const gridWidth = columns.reduce((sum, c) => sum + (Number(c.width) || 0), 0);

  return (
    <Drawer
      open={!!id} onClose={onClose} width={Math.min(1040, window.innerWidth)} destroyOnClose
      styles={{ body: { padding: 12 } }}
      title={session && <Space size={8}>
        <Tooltip title={session.warehouse?.name}><span>{session.warehouse?.code} · {fmtPeriod(session)}</span></Tooltip>
        {session.status === "CLOSED" ? <Tag color="green">Đã chốt</Tag> : todo ? <Tag color="orange">Còn {todo} dòng</Tag> : <Tag color="blue">Chờ chốt</Tag>}
      </Space>}
      extra={session && <Space size={6}>
        <Tooltip title="Tải file NCC gốc"><Button size="small" icon={<DownloadOutlined />} onClick={download} /></Tooltip>
        {canEdit && <Popconfirm title="Xóa lần đối chiếu này?" description="Xóa cả file NCC đã tải lên. Không ảnh hưởng tồn kho."
          okText="Xóa" okButtonProps={{ danger: true, size: "small" }} cancelText="Không" onConfirm={remove}>
          <Tooltip title="Xóa đối chiếu"><Button size="small" danger icon={<DeleteOutlined />} loading={busy} /></Tooltip>
        </Popconfirm>}
        {canEdit && <Button size="small" icon={<SwapOutlined />} onClick={() => onReplace({
          id: session.id, version: session.version, warehouseId: session.warehouseId, supplierId: session.supplierId,
          dateFrom: session.dateFrom, dateTo: session.dateTo, options: payload.options,
        })}>Thay file</Button>}
        {canEdit && <Tooltip title="Lấy lại phiếu xuất/nhập mới nhất; dòng đã xác nhận mà phiếu không đổi được giữ nguyên">
          <Button size="small" icon={<ReloadOutlined />} loading={busy} onClick={() => act("refresh", {}, "Đã cập nhật số liệu hệ thống.")}>Cập nhật số liệu</Button>
        </Tooltip>}
        {canEdit && <Tooltip title={todo ? `Còn ${todo} dòng cần xử lý` : undefined}>
          <Button size="small" type="primary" icon={<CheckOutlined />} disabled={todo > 0} loading={busy} onClick={() => act("close", {}, "Đã chốt đối chiếu.")}>Chốt</Button>
        </Tooltip>}
      </Space>}
    >
      {loading || !session ? <Skeleton active /> : <>
        <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
          <Tooltip title={session.supplier?.name}>{session.supplier?.code}</Tooltip> · {MODE_LABEL[session.mode as "TP" | "NCC"]} · {fileName}
          {!bothBases && ` · SL tính theo ${basis === "actualQty" ? "lít thực tế" : "lít 15°C"}`}
        </Typography.Text>
        <Typography.Text style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
          {rows.length} dòng · <span style={{ color: "#389e0d" }}>{n((r) => r.status === "MATCHED")} khớp</span>
          {" · "}{n((r) => r.status === "VARIANCE")} lệch SL
          {" · "}{n((r) => r.status === "EXTERNAL_ONLY")} NCC có – mình chưa có
          {" · "}{n((r) => r.status === "INTERNAL_ONLY")} mình có – NCC không có
        </Typography.Text>

        <TotalsTable session={session} products={lookups.products} />

        <div className="sales-orders-tabs">
          <Tabs size="small" activeKey={filter} onChange={(k) => setFilter(k as Filter)} items={[
            { key: "TODO", label: todo ? <span className="sales-tab-attention">Cần xử lý ({todo})</span> : "Cần xử lý (0)" },
            { key: "VARIANCE", label: `Lệch số lượng (${n((r) => r.status === "VARIANCE")})` },
            { key: "ALL", label: `Tất cả (${rows.length})` },
          ]} />
        </div>
        <Table
          className="data-grid" size="small" rowKey="key" columns={columns} dataSource={visible} scroll={{ x: gridWidth }}
          pagination={{ pageSize: 50, showSizeChanger: false, hideOnSinglePage: true }}
          locale={{ emptyText: filter === "TODO" ? (canEdit ? "Đã xử lý hết. Bấm “Chốt” để hoàn tất." : "Không còn dòng cần xử lý") : "Không có dòng nào" }}
        />
        {payload.warnings?.length > 0 && (
          <Typography.Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 6 }}>{payload.warnings.join(" ")}</Typography.Text>
        )}
      </>}

      {payload && <ResolveModal row={resolving} payload={payload} busy={busy} onClose={() => setResolving(undefined)}
        onSubmit={(body) => act("decisions", body, "Đã lưu xác nhận.")} />}
    </Drawer>
  );
}
