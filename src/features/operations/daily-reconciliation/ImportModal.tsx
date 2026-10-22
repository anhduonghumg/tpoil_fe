import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button, Checkbox, DatePicker, Modal, Radio, Select, Spin, Typography, Upload, message } from "antd";
import { FileExcelOutlined, InboxOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { extractApiError } from "../../../shared/lib/httpError";
import { codeOptions, dailyReconApi, TEMPLATE_LABEL, type Basis, type ImportOptions, type InspectGroup, type Inspection, type Lookups } from "./api";

const fmt = (d?: string | null) => (d ? dayjs(d).format("DD/MM/YYYY") : "");
const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

/** Session being re-imported: scope (warehouse, supplier, day, file layout) stays fixed. */
export type ReplaceTarget = {
  id: string; version: number; warehouseId: string; supplierId: string; dateFrom: string; dateTo: string;
  options: { template: string; basis: Basis; sourceWarehouse?: string; productMapping: Record<string, string> };
};

type Props = {
  open: boolean; lookups: Lookups; initialFile?: File; replace?: ReplaceTarget;
  onClose: () => void; onDone: (sessionId: string) => void;
};

const ask = (title: string, content: string) =>
  new Promise<boolean>((resolve) =>
    Modal.confirm({ title, content, okText: "Thay bằng file này", cancelText: "Bỏ qua", onOk: () => resolve(true), onCancel: () => resolve(false) }));

export default function ImportModal({ open, lookups, initialFile, replace, onClose, onDone }: Props) {
  const [file, setFile] = useState<File>();
  const [info, setInfo] = useState<Inspection>();
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [supplierId, setSupplierId] = useState<string>();
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [multiDay, setMultiDay] = useState(false);
  const [basis, setBasis] = useState<Basis>("ACTUAL");
  const [warehouses, setWarehouses] = useState<Record<number, string | undefined>>({});
  const [mapping, setMapping] = useState<Record<string, string | undefined>>({});
  const [editMapping, setEditMapping] = useState(false);

  const reset = () => { setFile(undefined); setInfo(undefined); setWarehouses({}); setMapping({}); setMultiDay(false); setEditMapping(false); };
  useEffect(() => { if (open) { reset(); if (initialFile) void read(initialFile); } }, [open, initialFile]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Reads the file, then prefills everything from the file itself and from what was chosen last time. */
  const read = async (f: File) => {
    setFile(f); setInfo(undefined); setReading(true);
    try {
      const result = await dailyReconApi.inspect(f);
      if (replace && result.template !== replace.options.template) {
        message.error("File này khác loại với file đã dùng cho phiên. Hãy chọn đúng file của NCC.");
        setFile(undefined); return;
      }
      const { memory } = lookups;
      const last = memory.last[result.template];
      const today = dayjs().format("YYYY-MM-DD");
      const day = replace?.dateFrom ?? result.suggestedDate ?? today;
      setSupplierId(replace?.supplierId ?? last?.supplierId ?? (lookups.suppliers.length === 1 ? lookups.suppliers[0].id : undefined));
      setDateFrom(day); setDateTo(replace?.dateTo ?? day); setMultiDay(!!replace && replace.dateFrom !== replace.dateTo);
      setBasis(replace?.options.basis ?? last?.basis ?? "ACTUAL");
      const onlyWarehouse = lookups.warehouses.length === 1 ? lookups.warehouses[0].id : undefined;
      setWarehouses(Object.fromEntries(result.groups.map((g, i) => [i, replace
        ? (g.sourceWarehouse ?? undefined) === replace.options.sourceWarehouse || result.groups.length === 1 ? replace.warehouseId : undefined
        : (g.sourceWarehouse && memory.warehouseBySource[g.sourceWarehouse])
          || (result.groups.length === 1 ? last?.warehouseId : undefined) || onlyWarehouse])));
      const codes = [...new Set(result.groups.flatMap((g) => g.productCodes))];
      setMapping(Object.fromEntries(codes.map((code) => [code, replace?.options.productMapping[code]
        ?? memory.productMapping[code] ?? lookups.products.find((p) => norm(p.code) === norm(code))?.id])));
      setInfo(result);
    } catch (e) {
      message.error(extractApiError(e).message || "Không đọc được file.");
      setFile(undefined);
    } finally { setReading(false); }
  };

  const hasRows = (g: InspectGroup) => !info || info.template === "TP" || g.dates.some((d) => d >= dateFrom && d <= dateTo);
  const groups = useMemo(() => (info?.groups ?? []).map((g, index) => ({ ...g, index, active: hasRows(g) })), [info, dateFrom, dateTo]); // eslint-disable-line react-hooks/exhaustive-deps
  const activeGroups = groups.filter((g) => g.active && (!replace || warehouses[g.index]));
  const codes = [...new Set(activeGroups.flatMap((g) => g.productCodes))];
  const missing = [
    !supplierId && "nhà cung cấp",
    !dateFrom && "ngày đối chiếu",
    activeGroups.some((g) => !warehouses[g.index]) && "kho của mình",
    codes.some((c) => !mapping[c]) && "ghép mặt hàng",
  ].filter(Boolean) as string[];

  const submit = async () => {
    if (!info || !file) return;
    if (!activeGroups.length) return message.warning("File không có dòng nào trong ngày đã chọn.");
    if (missing.length) return message.warning(`Còn thiếu: ${missing.join(", ")}.`);
    // Depots mapped to the same warehouse go into one session (one session per warehouse and day).
    const byWarehouse = new Map<string, InspectGroup[]>();
    for (const g of activeGroups) byWarehouse.set(warehouses[g.index]!, [...(byWarehouse.get(warehouses[g.index]!) ?? []), g]);
    setSaving(true);
    const done: string[] = []; const skipped: string[] = [];
    try {
      for (const [warehouseId, list] of byWarehouse) {
        const productCodes = [...new Set(list.flatMap((g) => g.productCodes))];
        const options: ImportOptions = {
          warehouseId, supplierId: supplierId!, template: info.template, sheets: list.flatMap((g) => g.sheets),
          sourceWarehouse: list.find((g) => g.sourceWarehouse)?.sourceWarehouse ?? undefined,
          dateFrom, dateTo, basis, productMapping: Object.fromEntries(productCodes.map((c) => [c, mapping[c]!])),
        };
        const warehouseName = lookups.warehouses.find((w) => w.id === warehouseId)?.code ?? "";
        if (replace) { done.push((await dailyReconApi.replace(replace.id, file, { ...options, version: replace.version })).id); continue; }
        const existing = (await dailyReconApi.sessions({ warehouseId, supplierId, dateFrom, dateTo })).find((s) => s.mode === info.mode);
        if (existing?.status === "CLOSED") { skipped.push(`${warehouseName} (đã chốt)`); continue; }
        if (existing) {
          const ok = await ask(`${warehouseName} ngày ${fmt(dateFrom)} đã được đối chiếu`,
            "Thay bằng file này? Các dòng đã xác nhận trong lần trước sẽ phải xác nhận lại.");
          if (!ok) { skipped.push(warehouseName); continue; }
          done.push((await dailyReconApi.replace(existing.id, file, { ...options, version: existing.version })).id);
        } else {
          done.push((await dailyReconApi.create(file, options)).id);
        }
      }
      if (skipped.length) message.info(`Bỏ qua: ${skipped.join(", ")}.`);
      if (done.length) { message.success(done.length > 1 ? `Đã đối chiếu ${done.length} kho.` : "Đã đối chiếu xong."); onDone(done[0]); }
    } catch (e) {
      message.error(extractApiError(e).message || "Không đối chiếu được.");
    } finally { setSaving(false); }
  };

  const warehouseOptions = codeOptions(lookups.warehouses);
  const productCode = (id?: string) => lookups.products.find((p) => p.id === id)?.code ?? "?";
  const allDates = groups.flatMap((g) => g.dates).sort();
  const allMapped = codes.every((c) => mapping[c]);
  const showMapping = editMapping || !allMapped;
  const small = { fontSize: 12 } as const;
  const field = (text: string, node: ReactNode, hint?: ReactNode) => (
    <div>
      <Typography.Text type="secondary" style={{ ...small, display: "block", marginBottom: 2 }}>{text}</Typography.Text>
      {node}
      {hint && <Typography.Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 2 }}>{hint}</Typography.Text>}
    </div>
  );

  return (
    <Modal
      open={open} width={600} onCancel={onClose} destroyOnClose
      title={<span style={{ fontSize: 14 }}>{replace ? "Thay file NCC" : "Đối chiếu file NCC"}</span>}
      footer={info ? [
        <Button key="other" size="small" onClick={reset} disabled={saving}>Chọn file khác</Button>,
        <Button key="ok" size="small" type="primary" loading={saving} disabled={!activeGroups.length || missing.length > 0} onClick={submit}>Đối chiếu</Button>,
      ] : [<Button key="close" size="small" onClick={onClose}>Đóng</Button>]}
    >
      {!info && (
        <Spin spinning={reading} tip="Đang đọc file…">
          <Upload.Dragger accept=".xlsx" showUploadList={false} style={{ padding: 8 }} beforeUpload={(f) => { void read(f); return false; }}>
            <p className="ant-upload-drag-icon" style={{ marginBottom: 4 }}><InboxOutlined /></p>
            <p className="ant-upload-text" style={{ fontSize: 13 }}>Kéo thả hoặc bấm để chọn file Excel NCC gửi</p>
            <p className="ant-upload-hint" style={small}>Hệ thống tự nhận loại file, ngày, kho và mặt hàng.</p>
          </Upload.Dragger>
        </Spin>
      )}

      {info && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Typography.Text style={small}>
            <FileExcelOutlined style={{ color: "#389e0d" }} /> <b>{file?.name}</b>
            <Typography.Text type="secondary" style={small}>
              {" · "}{TEMPLATE_LABEL[info.template]}
              {info.template === "HGK" && allDates.length > 0 && ` · số liệu ${fmt(allDates[0])} – ${fmt(allDates[allDates.length - 1])}`}
            </Typography.Text>
          </Typography.Text>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {field("Nhà cung cấp", (
              <Select size="small" showSearch optionFilterProp="search" style={{ width: "100%" }} placeholder="Chọn NCC"
                disabled={!!replace} value={supplierId} onChange={setSupplierId}
                options={codeOptions(lookups.suppliers)} />
            ))}
            {field("Ngày đối chiếu", multiDay ? (
              <DatePicker.RangePicker size="small" format="DD/MM/YYYY" style={{ width: "100%" }} disabled={!!replace} allowClear={false}
                value={[dayjs(dateFrom), dayjs(dateTo)]}
                onChange={(v) => { if (v?.[0] && v?.[1]) { setDateFrom(v[0].format("YYYY-MM-DD")); setDateTo(v[1].format("YYYY-MM-DD")); } }} />
            ) : (
              <DatePicker size="small" format="DD/MM/YYYY" style={{ width: "100%" }} disabled={!!replace} allowClear={false}
                value={dateFrom ? dayjs(dateFrom) : undefined}
                onChange={(v: Dayjs | null) => { if (v) { setDateFrom(v.format("YYYY-MM-DD")); setDateTo(v.format("YYYY-MM-DD")); } }} />
            ), <>
              {info.template === "TP" ? (info.fileDate ? "Lấy từ tên file" : "Tên file không có ngày, hãy chọn") : "Ngày mới nhất trong file"}
              {info.template === "HGK" && !replace && (
                <Checkbox style={{ fontSize: 11, marginLeft: 8 }} checked={multiDay}
                  onChange={(e) => { setMultiDay(e.target.checked); if (!e.target.checked) setDateTo(dateFrom); }}>nhiều ngày</Checkbox>
              )}
            </>)}
          </div>

          {info.template === "HGK" && field("Số lượng trong file tính theo", (
            <Radio.Group size="small" value={basis} onChange={(e) => setBasis(e.target.value)} optionType="button"
              options={[{ value: "ACTUAL", label: "Lít thực tế" }, { value: "V15", label: "Lít 15°C" }]} />
          ))}

          {field("Kho của mình", (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {groups.map((g) => (
                <div key={g.index} style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 8, alignItems: "center", ...small }}>
                  <span>
                    {g.sourceWarehouse ? <>Kho <b>{g.sourceWarehouse}</b></> : "Kho xuất"}
                    <Typography.Text type="secondary" style={small}> · {g.productCodes.join(", ")}</Typography.Text>
                  </span>
                  {g.active ? (
                    <Select size="small" showSearch optionFilterProp="search" placeholder="Chọn kho" disabled={!!replace}
                      value={warehouses[g.index]} options={warehouseOptions} status={warehouses[g.index] ? undefined : "error"}
                      onChange={(v) => setWarehouses((w) => ({ ...w, [g.index]: v }))} />
                  ) : <Typography.Text type="secondary" style={small}>Không có phát sinh ngày này – bỏ qua</Typography.Text>}
                </div>
              ))}
            </div>
          ))}

          {codes.length > 0 && field("Mặt hàng", showMapping ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {codes.map((code) => (
                <div key={code} style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 8, alignItems: "center", ...small }}>
                  <span>Mã trong file <b>{code}</b></span>
                  <Select size="small" showSearch optionFilterProp="search" placeholder="Chọn mặt hàng"
                    status={mapping[code] ? undefined : "error"} value={mapping[code]}
                    onChange={(v) => setMapping((m) => ({ ...m, [code]: v }))}
                    options={codeOptions(lookups.products)} />
                </div>
              ))}
            </div>
          ) : (
            <Typography.Text style={small}>
              {codes.map((c) => `${c} → ${productCode(mapping[c])}`).join("; ")}
              <Button type="link" size="small" style={{ fontSize: 12, height: "auto", padding: "0 6px" }} onClick={() => setEditMapping(true)}>Sửa</Button>
            </Typography.Text>
          ), showMapping ? "Hệ thống nhớ cho lần sau." : undefined)}

          {groups.some((g) => g.active && g.errorCount > 0) && (
            <Typography.Text type="warning" style={small}>File có dòng thiếu/sai dữ liệu; các dòng này sẽ được đánh dấu để kiểm tra.</Typography.Text>
          )}
          {missing.length > 0 && <Typography.Text type="danger" style={small}>Còn thiếu: {missing.join(", ")}.</Typography.Text>}
        </div>
      )}
    </Modal>
  );
}
