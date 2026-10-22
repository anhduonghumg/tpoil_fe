import { useEffect, useMemo, useState } from "react";
import { Button, Dropdown, Input, Modal, Table, Tabs, Tag, Tooltip, Typography, Upload, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { DeleteOutlined, EyeOutlined, MoreOutlined, SearchOutlined, UploadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { extractApiError } from "../../shared/lib/httpError";
import { RefreshButton } from "../../shared/ui/TableFilter";
import { dailyReconApi, MODE_LABEL, type Lookups, type SessionSummary } from "./daily-reconciliation/api";
import ImportModal, { type ReplaceTarget } from "./daily-reconciliation/ImportModal";
import ReconciliationDrawer from "./daily-reconciliation/ReconciliationDrawer";
import "../../shared/ui/data-grid.css";
// Khung tiêu đề + thanh tab mượn của khối bán hàng cho giống các màn Rút lô / Lệnh xuất.
import "../sales/sales.css";

const period = (s: { dateFrom: string; dateTo: string }) =>
  s.dateFrom === s.dateTo ? dayjs(s.dateFrom).format("DD/MM/YY") : `${dayjs(s.dateFrom).format("DD/MM")}–${dayjs(s.dateTo).format("DD/MM/YY")}`;

type TabKey = "TODO" | "READY" | "CLOSED" | "ALL";
const TABS: Array<{ key: TabKey; label: string; match: (s: SessionSummary) => boolean; attention?: boolean }> = [
  { key: "TODO", label: "Cần xử lý", match: (s) => s.status === "DRAFT" && s.pendingRows > 0, attention: true },
  { key: "READY", label: "Chờ chốt", match: (s) => s.status === "DRAFT" && s.pendingRows === 0 },
  { key: "CLOSED", label: "Đã chốt", match: (s) => s.status === "CLOSED" },
  { key: "ALL", label: "Tất cả", match: () => true },
];
const EMPTY_LOOKUPS: Lookups = { warehouses: [], suppliers: [], products: [], memory: { last: {}, productMapping: {}, warehouseBySource: {} } };

/** Đối chiếu hằng ngày: kho nhận file NCC gửi, so với phiếu xuất/nhập của mình. Không ghi tồn kho. */
export default function DailyStockReconciliationPage() {
  const [lookups, setLookups] = useState<Lookups>(EMPTY_LOOKUPS);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<TabKey>("ALL");
  const [keyword, setKeyword] = useState("");
  const [detailId, setDetailId] = useState<string>();
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File>();
  const [replace, setReplace] = useState<ReplaceTarget>();
  const [reloadKey, setReloadKey] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const [l, s] = await Promise.all([dailyReconApi.lookups(), dailyReconApi.sessions()]);
      setLookups(l); setSessions(s);
    } catch (e) { message.error(extractApiError(e).message || "Không tải được dữ liệu."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const searched = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    return k ? sessions.filter((s) => [s.warehouse?.name, s.warehouse?.code, s.supplier?.name, s.supplier?.code]
      .some((v) => v?.toLowerCase().includes(k))) : sessions;
  }, [sessions, keyword]);
  const current = TABS.find((t) => t.key === tab)!;
  const rows = searched.filter(current.match);
  const tabItems = TABS.map((t) => {
    const n = searched.filter(t.match).length;
    return { key: t.key, label: t.attention && n > 0 ? <span className="sales-tab-attention">{t.label} ({n})</span> : `${t.label} (${n})` };
  });

  const remove = (s: SessionSummary) => Modal.confirm({
    title: `Xóa đối chiếu ${s.warehouse?.code} ngày ${period(s)}?`, content: "Xóa cả file NCC đã tải lên. Không ảnh hưởng tồn kho.",
    okText: "Xóa", okButtonProps: { danger: true }, cancelText: "Không",
    onOk: async () => {
      try { await dailyReconApi.remove(s.id); message.success("Đã xóa đối chiếu."); if (detailId === s.id) setDetailId(undefined); await load(); }
      catch (e) { message.error(extractApiError(e).message || "Không xóa được đối chiếu."); }
    },
  });
  const startImport = (file?: File) => { setReplace(undefined); setImportFile(file); setImportOpen(true); };

  const columns: ColumnsType<SessionSummary> = [
    { title: "Ngày", width: 96, render: (_, s) => (
      <Button type="link" className="sales-grid-link" style={{ padding: 0, height: "auto", fontSize: 12, fontWeight: 600 }} onClick={() => setDetailId(s.id)}>{period(s)}</Button>
    ) },
    { title: "Kho", width: 110, render: (_, s) => <Tooltip title={s.warehouse?.name}><span className="data-grid-clip data-grid-strong">{s.warehouse?.code ?? s.warehouse?.name}</span></Tooltip> },
    { title: "NCC", width: 110, render: (_, s) => <Tooltip title={s.supplier?.name}><span className="data-grid-clip">{s.supplier?.code ?? s.supplier?.name}</span></Tooltip> },
    { title: "Loại hàng", width: 104, render: (_, s) => MODE_LABEL[s.mode] },
    { title: "Số dòng", width: 72, align: "right", render: (_, s) => <span className="data-grid-num">{s.totalRows}</span> },
    { title: "Khớp", width: 64, align: "right", render: (_, s) => <span className="data-grid-num">{s.matchedRows}</span> },
    { title: "Còn xử lý", width: 80, align: "right", render: (_, s) => s.pendingRows
      ? <span className="data-grid-num sales-grid-danger">{s.pendingRows}</span> : <span className="data-grid-empty">—</span> },
    { title: "Trạng thái", width: 96, render: (_, s) => s.status === "CLOSED" ? <Tag color="green">Đã chốt</Tag>
      : s.pendingRows ? <Tag color="orange">Cần xử lý</Tag> : <Tag color="blue">Chờ chốt</Tag> },
    { title: "Cập nhật", width: 96, render: (_, s) => <span className="data-grid-sub">{dayjs(s.updatedAt).format("HH:mm DD/MM")}</span> },
    { title: "", key: "actions", width: 44, fixed: "right", render: (_, s) => (
      <Dropdown trigger={["click"]} placement="bottomRight" menu={{
        items: [
          { key: "detail", icon: <EyeOutlined />, label: "Xem chi tiết" },
          // Phiên đã chốt là biên bản của ngày đó nên không cho xóa.
          ...(s.status === "DRAFT" ? [{ key: "delete", icon: <DeleteOutlined />, label: "Xóa đối chiếu", danger: true }] : []),
        ],
        onClick: ({ key, domEvent }) => { domEvent.stopPropagation(); if (key === "detail") setDetailId(s.id); if (key === "delete") remove(s); },
      }}>
        <Button size="small" type="text" icon={<MoreOutlined />} />
      </Dropdown>
    ) },
  ];
  const gridWidth = columns.reduce((sum, c) => sum + (Number(c.width) || 0), 0);

  return (
    <div className="sales-orders-page" style={{ padding: 10 }}>
      <div className="sales-orders-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 12, flexWrap: "wrap" }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Kho <span className="sales-orders-page-separator">/</span> Đối chiếu với NCC
        </Typography.Title>
        <Upload accept=".xlsx" showUploadList={false} beforeUpload={(f) => { startImport(f); return false; }}>
          <Tooltip title="Chọn file Excel NCC gửi; hệ thống tự nhận loại file, ngày, kho và mặt hàng">
            <Button size="small" type="primary" icon={<UploadOutlined />}>Đối chiếu file NCC</Button>
          </Tooltip>
        </Upload>
      </div>

      <div className="sales-orders-tabs">
        <Tabs activeKey={tab} items={tabItems} onChange={(k) => setTab(k as TabKey)} tabBarExtraContent={{ right: (
          <div className="sales-orders-tabs-extra">
            <Input allowClear size="small" prefix={<SearchOutlined />} placeholder="Tìm kho, NCC" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
            <RefreshButton loading={loading} onClick={load} />
          </div>
        ) }} />
      </div>

      <Table<SessionSummary>
        className="data-grid" rowKey="id" size="small" loading={loading} columns={columns} dataSource={rows}
        scroll={{ x: gridWidth }}
        rowClassName={(s) => (s.status === "DRAFT" && s.pendingRows > 0 ? "sales-row-attention" : "")}
        onRow={(s) => ({ onDoubleClick: () => setDetailId(s.id) })}
        locale={{ emptyText: sessions.length ? "Không có lần đối chiếu nào khớp bộ lọc" : "Chưa đối chiếu lần nào. Bấm “Đối chiếu file NCC” để bắt đầu." }}
        pagination={{ pageSize: 20, showSizeChanger: false, hideOnSinglePage: true, showTotal: (n) => `${n} lần đối chiếu` }}
      />

      <ReconciliationDrawer
        id={detailId} reloadKey={reloadKey} lookups={lookups} onClose={() => setDetailId(undefined)} onChanged={load}
        onDeleted={() => { setDetailId(undefined); void load(); }}
        onReplace={(target) => { setImportFile(undefined); setReplace(target); setImportOpen(true); }} />
      <ImportModal open={importOpen} lookups={lookups} initialFile={importFile} replace={replace}
        onClose={() => setImportOpen(false)}
        onDone={async (id) => { setImportOpen(false); await load(); setDetailId(id); setReloadKey((k) => k + 1); }} />
    </div>
  );
}
