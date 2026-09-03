import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Card, Col, DatePicker, Descriptions, Drawer, Form, Input, InputNumber, Modal, Popconfirm, Row, Select, Space, Statistic, Table, Tabs, Tag, Typography, message } from "antd";
import { CheckCircleOutlined, DeleteOutlined, DownloadOutlined, EditOutlined, FileExcelOutlined, PlusOutlined, RollbackOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import { http } from "../../shared/lib/http";

type Status = "DRAFT" | "VALIDATED" | "POSTED" | "REVERSED";
type Section = "INVENTORY" | "RECEIVABLE" | "PAYABLE";
type TabKey = Section | "VALIDATION";
type InventoryKind = "ON_HAND" | "RESERVED" | "BLOCKED" | "EXPECTED";
type Summary = { valid: boolean; inventoryLineCount: number; receivableLineCount: number; payableLineCount: number; onHandQty: string; receivableAmount: string; payableAmount: string; issues: Array<{ sheet: string; lineNo: number; field?: string; message: string }> };
type Batch = { id: string; batchNo: string; legalEntityId: string; cutoverDate: string; sourceSystem?: string; sourceFileName?: string; status: Status; validationSummary?: Summary; legalEntity?: { code: string; party: { code: string; name: string } }; _count?: { inventoryLines: number; debtLines: number } };
type Detail = Batch & { inventoryLines: any[]; debtLines: any[] };
type Options = { legalEntities: any[]; warehouses: any[]; warehouseAreas: any[]; products: any[]; parties: any[]; employees: any[] };

const statusMap: Record<Status, { label: string; color: string }> = {
  DRAFT: { label: "Nháp", color: "default" }, VALIDATED: { label: "Đã kiểm tra", color: "processing" },
  POSTED: { label: "Đã ghi sổ", color: "success" }, REVERSED: { label: "Đã đảo", color: "error" },
};
const kindMap: Record<InventoryKind, { label: string; color: string }> = {
  ON_HAND: { label: "Tồn thực tế", color: "green" }, RESERVED: { label: "Đang giữ cho khách", color: "gold" },
  BLOCKED: { label: "Không được bán", color: "red" }, EXPECTED: { label: "Hàng dự kiến", color: "blue" },
};
const sectionMeta: Record<Section, { label: string; template: string }> = {
  INVENTORY: { label: "Tồn kho", template: "mau-ton-kho-dau-ky.xlsx" },
  RECEIVABLE: { label: "Phải thu", template: "mau-phai-thu-dau-ky.xlsx" },
  PAYABLE: { label: "Phải trả", template: "mau-phai-tra-dau-ky.xlsx" },
};
const number = (value?: string | number) => Number(value || 0).toLocaleString("vi-VN", { maximumFractionDigits: 3 });
const unwrap = <T,>(response: any): T => (response?.data?.data ?? response?.data ?? response) as T;
const emptyOptions: Options = { legalEntities: [], warehouses: [], warehouseAreas: [], products: [], parties: [], employees: [] };
const datePayload = (value?: Dayjs | string | null) => value ? dayjs(value).format("YYYY-MM-DD") : undefined;

function normalizeOptions(value?: Partial<Options> | null): Options {
  return { legalEntities: value?.legalEntities ?? [], warehouses: value?.warehouses ?? [], warehouseAreas: value?.warehouseAreas ?? [], products: value?.products ?? [], parties: value?.parties ?? [], employees: value?.employees ?? [] };
}
function downloadBlob(data: Blob, fileName: string) {
  const url = URL.createObjectURL(data); const anchor = document.createElement("a");
  anchor.href = url; anchor.download = fileName; anchor.click(); URL.revokeObjectURL(url);
}

export default function OpeningBalancesPage() {
  const [rows, setRows] = useState<Batch[]>([]);
  const [options, setOptions] = useState<Options>(emptyOptions);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [lineOpen, setLineOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<any | null>(null);
  const [activeSection, setActiveSection] = useState<Section>("INVENTORY");
  const [activeTab, setActiveTab] = useState<TabKey>("INVENTORY");
  const [form] = Form.useForm(); const [lineForm] = Form.useForm();
  const importRef = useRef<HTMLInputElement>(null);
  const inventoryKind = Form.useWatch("kind", lineForm) as InventoryKind | undefined;
  const selectedWarehouseId = Form.useWatch("warehouseId", lineForm);
  const selectedAreaId = Form.useWatch("warehouseAreaId", lineForm);
  const editable = detail?.status === "DRAFT" || detail?.status === "VALIDATED";

  const maps = useMemo(() => ({
    warehouses: new Map(options.warehouses.map((v) => [v.id, v])), areas: new Map(options.warehouseAreas.map((v) => [v.id, v])),
    products: new Map(options.products.map((v) => [v.id, v])), parties: new Map(options.parties.map((v) => [v.id, v])),
    employees: new Map(options.employees.map((v) => [v.id, v])),
  }), [options]);
  const partyOptions = useMemo(() => options.parties.map((v) => ({ value: v.id, label: `${v.code} — ${v.name}` })), [options.parties]);
  const productOptions = useMemo(() => options.products.map((v) => ({ value: v.id, label: `${v.code} — ${v.name}` })), [options.products]);
  const warehouseOptions = useMemo(() => options.warehouses.map((v) => ({ value: v.id, label: `${v.code} — ${v.name}` })), [options.warehouses]);
  const areaOptions = useMemo(() => options.warehouseAreas.map((v) => ({ value: v.id, label: `${v.code} — ${v.name}` })), [options.warehouseAreas]);
  const fail = (error: any) => message.error(error?.response?.data?.message || error?.response?.data?.error?.message || "Không thực hiện được thao tác");

  const load = async () => {
    setLoading(true);
    try {
      const [list, opts] = await Promise.all([http.get("/opening-balances", { params: { pageSize: 100 } }), http.get("/opening-balances/options")]);
      setRows(unwrap<{ rows?: Batch[] }>(list)?.rows ?? []); setOptions(normalizeOptions(unwrap<Options>(opts)));
    } catch (error) { fail(error); } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const openDetail = async (id: string) => { setBusy(true); try { setDetail(unwrap<Detail>(await http.get(`/opening-balances/${id}`))); } catch (error) { fail(error); } finally { setBusy(false); } };
  const refresh = async () => { if (detail) await openDetail(detail.id); await load(); };

  const createBatch = async () => {
    const values = await form.validateFields();
    try {
      const data = unwrap<Batch>(await http.post("/opening-balances", { ...values, cutoverDate: values.cutoverDate.format("YYYY-MM-DD") }));
      setCreateOpen(false); form.resetFields(); await load(); await openDetail(data.id); message.success("Đã tạo đợt nhập số dư đầu kỳ");
    } catch (error) { fail(error); }
  };
  const runAction = async (name: "validate" | "post" | "reverse") => {
    if (!detail) return; setBusy(true);
    try {
      const data = unwrap<any>(await http.post(`/opening-balances/${detail.id}/${name}`));
      if (name === "validate" && !data.valid) message.warning(`Còn ${data.issues.length} lỗi cần xử lý`);
      else message.success(name === "post" ? "Đã ghi sổ số dư đầu kỳ" : name === "reverse" ? "Đã đảo số dư đầu kỳ" : "Dữ liệu hợp lệ");
      await refresh();
    } catch (error) { fail(error); } finally { setBusy(false); }
  };
  const downloadSectionTemplate = async (section: Section) => {
    try { const response = await http.get(`/opening-balances/template/${section}`, { responseType: "blob" }); downloadBlob(response.data, sectionMeta[section].template); }
    catch (error) { fail(error); }
  };
  const importSection = async (file: File) => {
    if (!detail) return; const body = new FormData(); body.append("file", file); setBusy(true);
    try { await http.post(`/opening-balances/${detail.id}/import/${activeSection}`, body); message.success(`Đã nhập nhanh ${sectionMeta[activeSection].label} từ Excel`); await refresh(); }
    catch (error) { fail(error); } finally { setBusy(false); if (importRef.current) importRef.current.value = ""; }
  };

  const openCreateLine = (section: Section) => {
    if (!detail) return; setActiveSection(section); setActiveTab(section); setEditingLine(null); lineForm.resetFields();
    const entity = options.legalEntities.find((v) => v.id === detail.legalEntityId);
    lineForm.setFieldsValue(section === "INVENTORY" ? { kind: "ON_HAND", ownerPartyId: entity?.partyId, currency: "VND" } : { side: section, balanceType: "DEBT", currency: "VND", settledAmount: 0 });
    setLineOpen(true);
  };
  const openEditLine = (section: Section, row: any) => {
    setActiveSection(section); setActiveTab(section); setEditingLine(row); lineForm.resetFields();
    lineForm.setFieldsValue({ ...row,
      receivedAt: row.receivedAt ? dayjs(row.receivedAt) : undefined, expectedAt: row.expectedAt ? dayjs(row.expectedAt) : undefined, expiresAt: row.expiresAt ? dayjs(row.expiresAt) : undefined,
      documentDate: row.documentDate ? dayjs(row.documentDate) : undefined, dueDate: row.dueDate ? dayjs(row.dueDate) : undefined,
      actualQty: row.actualQty == null ? undefined : Number(row.actualQty), v15Qty: row.v15Qty == null ? undefined : Number(row.v15Qty), unitCost: row.unitCost == null ? undefined : Number(row.unitCost),
      originalAmount: row.originalAmount == null ? undefined : Number(row.originalAmount), settledAmount: row.settledAmount == null ? 0 : Number(row.settledAmount), outstandingAmount: row.outstandingAmount == null ? undefined : Number(row.outstandingAmount),
    }); setLineOpen(true);
  };
  const saveLine = async () => {
    if (!detail) return; const values = await lineForm.validateFields();
    if (activeSection === "INVENTORY" && values.kind === "EXPECTED" && Boolean(values.warehouseId) === Boolean(values.warehouseAreaId)) {
      lineForm.setFields([{ name: "warehouseId", errors: ["Chọn đúng một kho đích danh hoặc khu vực kho"] }, { name: "warehouseAreaId", errors: ["Chọn đúng một kho đích danh hoặc khu vực kho"] }]); return;
    }
    setBusy(true);
    try {
      if (activeSection === "INVENTORY") {
        const payload = { ...values, receivedAt: datePayload(values.receivedAt), expectedAt: datePayload(values.expectedAt), expiresAt: datePayload(values.expiresAt) };
        if (editingLine) await http.patch(`/opening-balances/${detail.id}/inventory-lines/${editingLine.id}`, payload);
        else await http.post(`/opening-balances/${detail.id}/inventory-lines`, payload);
      } else {
        const payload = { ...values, side: activeSection, documentDate: datePayload(values.documentDate), dueDate: datePayload(values.dueDate) };
        if (editingLine) await http.patch(`/opening-balances/${detail.id}/debt-lines/${editingLine.id}`, payload);
        else await http.post(`/opening-balances/${detail.id}/debt-lines/${activeSection}`, payload);
      }
      message.success(editingLine ? "Đã cập nhật dòng dữ liệu" : "Đã thêm dòng dữ liệu"); setLineOpen(false); lineForm.resetFields(); await refresh();
    } catch (error) { fail(error); } finally { setBusy(false); }
  };
  const deleteLine = async (section: Section, row: any) => {
    if (!detail) return; setBusy(true);
    try { await http.delete(`/opening-balances/${detail.id}/${section === "INVENTORY" ? "inventory-lines" : "debt-lines"}/${row.id}`); message.success("Đã xóa dòng dữ liệu"); await refresh(); }
    catch (error) { fail(error); } finally { setBusy(false); }
  };

  const actionColumn = (section: Section) => ({ title: "Thao tác", width: 86, fixed: "right" as const, render: (_: any, row: any) => editable ? <Space size={0}>
    <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEditLine(section, row)} />
    <Popconfirm title="Xóa dòng dữ liệu này?" onConfirm={() => deleteLine(section, row)}><Button type="text" danger size="small" icon={<DeleteOutlined />} /></Popconfirm>
  </Space> : null });
  const inventoryColumns: any[] = [
    { title: "Loại tồn", dataIndex: "kind", width: 145, render: (v: InventoryKind) => <Tag color={kindMap[v]?.color}>{kindMap[v]?.label || v}</Tag> },
    { title: "Kho / Khu vực", width: 155, render: (_: any, r: any) => maps.warehouses.get(r.warehouseId)?.name || maps.areas.get(r.warehouseAreaId)?.name || "—" },
    { title: "Mặt hàng", dataIndex: "productId", width: 105, render: (v: string) => maps.products.get(v)?.code || v },
    { title: "Chủ sở hữu", dataIndex: "ownerPartyId", width: 115, render: (v: string) => maps.parties.get(v)?.code || v },
    { title: "Mã NCC", dataIndex: "supplierPartyId", width: 105, render: (v: string) => maps.parties.get(v)?.code || "—" },
    { title: "Mã rút", dataIndex: "releaseCode", width: 75, render: (v: string) => v || "—" },
    { title: "Mã lô cũ", dataIndex: "legacyLotNo", width: 120, ellipsis: true },
    { title: "Khách hàng", dataIndex: "customerPartyId", width: 110, render: (v: string) => maps.parties.get(v)?.code || "—" },
    { title: "Số lượng", dataIndex: "actualQty", align: "right", width: 105, render: number }, { title: "Giá vốn", dataIndex: "unitCost", align: "right", width: 105, render: number }, actionColumn("INVENTORY"),
  ];
  const debtColumns = (section: Section): any[] => [
    { title: "Đối tác", dataIndex: "counterpartyPartyId", width: 125, render: (v: string) => maps.parties.get(v)?.code || v },
    { title: "Loại", dataIndex: "balanceType", width: 100, render: (v: string) => v === "ADVANCE" ? "Trả trước" : "Công nợ" }, { title: "Chứng từ cũ", dataIndex: "legacyDocumentNo", width: 145 },
    { title: "Ngày CT", dataIndex: "documentDate", width: 105, render: (v: string) => v ? dayjs(v).format("DD/MM/YYYY") : "—" }, { title: "Hạn TT", dataIndex: "dueDate", width: 105, render: (v: string) => v ? dayjs(v).format("DD/MM/YYYY") : "—" },
    { title: "Giá trị gốc", dataIndex: "originalAmount", align: "right", width: 125, render: number }, { title: "Đã TT", dataIndex: "settledAmount", align: "right", width: 120, render: number },
    { title: "Còn lại", dataIndex: "outstandingAmount", align: "right", width: 125, render: (v: string) => <b>{number(v)}</b> }, { title: "Kế toán", dataIndex: "accountantEmployeeId", width: 130, render: (v: string) => maps.employees.get(v)?.fullName || "—" }, actionColumn(section),
  ];

  const summary = detail?.validationSummary; const receivables = detail?.debtLines.filter((v) => v.side === "RECEIVABLE") ?? []; const payables = detail?.debtLines.filter((v) => v.side === "PAYABLE") ?? [];
  const sectionToolbar = (section: Section) => <Row justify="space-between" align="middle" style={{ marginBottom: 10 }}><Col><Space>
    {editable && <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreateLine(section)}>Thêm dòng</Button>}
    {editable && <Button icon={<FileExcelOutlined />} onClick={() => { setActiveSection(section); importRef.current?.click(); }}>Nhập nhanh Excel</Button>}
    <Button icon={<DownloadOutlined />} onClick={() => downloadSectionTemplate(section)}>Tải mẫu</Button>
  </Space></Col><Col><Typography.Text type="secondary">Excel chỉ là phương án nhập nhanh dữ liệu của tab này.</Typography.Text></Col></Row>;

  return <div style={{ padding: 16 }}>
    <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}><Col><Typography.Title level={3} style={{ margin: 0 }}>Số dư đầu kỳ</Typography.Title><Typography.Text type="secondary">Nhập tồn kho và công nợ khi chuyển từ hệ thống cũ</Typography.Text></Col><Col><Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>Tạo đợt nhập</Button></Col></Row>
    <Alert type="info" showIcon style={{ marginBottom: 12 }} message="Tạo đợt → nhập trực tiếp từng phần → kiểm tra đối chiếu → ghi sổ. Excel chỉ dùng khi cần nhập nhanh nhiều dòng." />
    <Card styles={{ body: { padding: 0 } }}><Table rowKey="id" size="small" loading={loading} dataSource={rows} pagination={{ pageSize: 20 }} onRow={(r) => ({ onClick: () => openDetail(r.id), style: { cursor: "pointer" } })} columns={[
      { title: "Mã đợt", dataIndex: "batchNo", width: 130, render: (v) => <Typography.Link strong>{v}</Typography.Link> }, { title: "Ngày chốt", dataIndex: "cutoverDate", width: 110, render: (v) => dayjs(v).format("DD/MM/YYYY") },
      { title: "Pháp nhân", width: 160, render: (_, r) => r.legalEntity?.party?.code || r.legalEntity?.code || r.legalEntityId }, { title: "Nguồn dữ liệu", dataIndex: "sourceSystem", ellipsis: true }, { title: "File gần nhất", dataIndex: "sourceFileName", ellipsis: true },
      { title: "Tồn", width: 70, align: "right", render: (_, r) => r._count?.inventoryLines || 0 }, { title: "Công nợ", width: 80, align: "right", render: (_, r) => r._count?.debtLines || 0 }, { title: "Trạng thái", dataIndex: "status", width: 115, render: (v: Status) => <Tag color={statusMap[v].color}>{statusMap[v].label}</Tag> },
    ]} /></Card>

    <Modal title="Tạo đợt nhập số dư đầu kỳ" open={createOpen} onCancel={() => setCreateOpen(false)} onOk={createBatch} okText="Tạo đợt" destroyOnClose><Form form={form} layout="vertical" initialValues={{ cutoverDate: dayjs().subtract(1, "day"), sourceSystem: "Hệ thống cũ" }}>
      <Form.Item name="legalEntityId" label="Pháp nhân" rules={[{ required: true, message: "Chọn pháp nhân" }]}><Select showSearch optionFilterProp="label" options={options.legalEntities.map((v) => ({ value: v.id, label: `${v.code} — ${v.party?.name || ""}` }))} /></Form.Item>
      <Form.Item name="cutoverDate" label="Ngày chốt số dư" rules={[{ required: true, message: "Chọn ngày chốt số dư" }]}><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item>
      <Form.Item name="sourceSystem" label="Nguồn dữ liệu"><Input placeholder="Phần mềm cũ / Excel kế toán" /></Form.Item><Form.Item name="note" label="Ghi chú"><Input.TextArea rows={3} /></Form.Item>
    </Form></Modal>

    <Drawer width="94vw" loading={busy} title={detail && <Space><b>{detail.batchNo}</b><Tag color={statusMap[detail.status].color}>{statusMap[detail.status].label}</Tag></Space>} open={!!detail} onClose={() => setDetail(null)} extra={detail && <Space>
      {editable && <Button icon={<CheckCircleOutlined />} onClick={() => runAction("validate")}>Kiểm tra</Button>}
      {detail.status === "VALIDATED" && <Popconfirm title="Ghi số dư chính thức?" description="Tồn kho và công nợ sẽ được tạo tại ngày chốt." onConfirm={() => runAction("post")}><Button type="primary" icon={<SafetyCertificateOutlined />}>Ghi sổ</Button></Popconfirm>}
      {detail.status === "POSTED" && <Popconfirm title="Đảo toàn bộ đợt số dư?" description="Chỉ được đảo khi chưa có nghiệp vụ sử dụng sau đó." onConfirm={() => runAction("reverse")}><Button danger icon={<RollbackOutlined />}>Đảo số dư</Button></Popconfirm>}
    </Space>}>
      {detail && <><input ref={importRef} type="file" accept=".xlsx" hidden onChange={(e) => e.target.files?.[0] && importSection(e.target.files[0])} />
        <Descriptions size="small" bordered column={4} style={{ marginBottom: 12 }} items={[{ key: "date", label: "Ngày chốt", children: dayjs(detail.cutoverDate).format("DD/MM/YYYY") }, { key: "source", label: "Nguồn", children: detail.sourceSystem || "—" }, { key: "file", label: "File nhập gần nhất", children: detail.sourceFileName || "—" }, { key: "count", label: "Số dòng", children: `${detail.inventoryLines.length} tồn / ${detail.debtLines.length} công nợ` }]} />
        {summary && <Row gutter={10} style={{ marginBottom: 12 }}><Col span={6}><Card size="small"><Statistic title="Tồn thực tế" value={Number(summary.onHandQty || 0)} suffix="L" /></Card></Col><Col span={6}><Card size="small"><Statistic title="Phải thu" value={Number(summary.receivableAmount || 0)} suffix="đ" /></Card></Col><Col span={6}><Card size="small"><Statistic title="Phải trả" value={Number(summary.payableAmount || 0)} suffix="đ" /></Card></Col><Col span={6}><Card size="small"><Statistic title="Lỗi đối chiếu" value={summary.issues?.length || 0} valueStyle={{ color: summary.valid ? "#3f8600" : "#cf1322" }} /></Card></Col></Row>}
        <Tabs activeKey={activeTab} onChange={(key) => { setActiveTab(key as TabKey); if (key !== "VALIDATION") setActiveSection(key as Section); }} items={[
          { key: "INVENTORY", label: `Tồn kho (${detail.inventoryLines.length})`, children: <>{sectionToolbar("INVENTORY")}<Table size="small" rowKey="id" scroll={{ x: 1230 }} dataSource={detail.inventoryLines} columns={inventoryColumns} /></> },
          { key: "RECEIVABLE", label: `Phải thu (${receivables.length})`, children: <>{sectionToolbar("RECEIVABLE")}<Table size="small" rowKey="id" scroll={{ x: 1160 }} dataSource={receivables} columns={debtColumns("RECEIVABLE")} /></> },
          { key: "PAYABLE", label: `Phải trả (${payables.length})`, children: <>{sectionToolbar("PAYABLE")}<Table size="small" rowKey="id" scroll={{ x: 1160 }} dataSource={payables} columns={debtColumns("PAYABLE")} /></> },
          { key: "VALIDATION", label: <>Đối chiếu {summary?.issues?.length ? <Tag color="red">{summary.issues.length}</Tag> : null}</>, children: summary?.issues?.length ? <Table size="small" rowKey={(_, i) => String(i)} pagination={false} dataSource={summary.issues} columns={[{ title: "Phần dữ liệu", dataIndex: "sheet", width: 120 }, { title: "Dòng", dataIndex: "lineNo", width: 70 }, { title: "Trường", dataIndex: "field", width: 150 }, { title: "Nội dung", dataIndex: "message" }]} /> : <Alert showIcon type={summary?.valid ? "success" : "info"} message={summary?.valid ? "Dữ liệu đã đối chiếu hợp lệ" : "Bấm Kiểm tra trước khi ghi sổ"} /> },
        ]} />
      </>}
    </Drawer>

    <Modal width={activeSection === "INVENTORY" ? 1000 : 820} title={`${editingLine ? "Sửa" : "Thêm"} ${sectionMeta[activeSection].label.toLowerCase()} đầu kỳ`} open={lineOpen} onCancel={() => setLineOpen(false)} onOk={saveLine} okText={editingLine ? "Lưu thay đổi" : "Thêm dòng"} confirmLoading={busy} destroyOnClose>
      <Form form={lineForm} layout="vertical" onValuesChange={(changed, values) => { if (activeSection !== "INVENTORY" && ("originalAmount" in changed || "settledAmount" in changed)) lineForm.setFieldValue("outstandingAmount", Math.max(Number(values.originalAmount || 0) - Number(values.settledAmount || 0), 0) || undefined); }}>
        {activeSection === "INVENTORY" ? <>
          <Row gutter={12}><Col span={6}><Form.Item name="kind" label="Loại tồn" rules={[{ required: true, message: "Chọn loại tồn" }]}><Select options={Object.entries(kindMap).map(([value, meta]) => ({ value, label: meta.label }))} /></Form.Item></Col>
            <Col span={9}><Form.Item name="warehouseId" label={inventoryKind === "EXPECTED" ? "Kho đích danh (nếu đã biết)" : "Kho"} rules={inventoryKind !== "EXPECTED" ? [{ required: true, message: "Chọn kho" }] : []}><Select showSearch allowClear disabled={inventoryKind === "EXPECTED" && !!selectedAreaId} optionFilterProp="label" options={warehouseOptions} onChange={(value) => value && lineForm.setFieldValue("warehouseAreaId", undefined)} /></Form.Item></Col>
            <Col span={9}><Form.Item name="warehouseAreaId" label="Khu vực kho (khi chưa biết kho)"><Select showSearch allowClear disabled={inventoryKind !== "EXPECTED" || !!selectedWarehouseId} optionFilterProp="label" options={areaOptions} onChange={(value) => value && lineForm.setFieldValue("warehouseId", undefined)} /></Form.Item></Col></Row>
          <Row gutter={12}><Col span={8}><Form.Item name="productId" label="Mặt hàng" rules={[{ required: true, message: "Chọn mặt hàng" }]}><Select showSearch optionFilterProp="label" options={productOptions} /></Form.Item></Col><Col span={8}><Form.Item name="ownerPartyId" label="Chủ sở hữu" rules={[{ required: true, message: "Chọn chủ sở hữu" }]}><Select showSearch optionFilterProp="label" options={partyOptions} /></Form.Item></Col><Col span={8}><Form.Item name="supplierPartyId" label="Mã nhà cung cấp" rules={(inventoryKind === "ON_HAND" || inventoryKind === "EXPECTED") ? [{ required: true, message: "Chọn nhà cung cấp" }] : []}><Select showSearch allowClear optionFilterProp="label" options={partyOptions} /></Form.Item></Col></Row>
          <Row gutter={12}><Col span={6}><Form.Item name="releaseCode" label="Mã rút" rules={inventoryKind === "ON_HAND" ? [{ required: true, message: "Chọn mã rút" }] : []}><Select allowClear options={[{ value: "TP", label: "TP" }, { value: "NCC", label: "NCC" }]} /></Form.Item></Col><Col span={6}><Form.Item name="legacyLotNo" label="Mã lô cũ" rules={inventoryKind !== "EXPECTED" ? [{ required: true, message: "Nhập mã lô cũ" }] : []}><Input /></Form.Item></Col><Col span={6}><Form.Item name="receivedAt" label="Ngày nhập"><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item></Col><Col span={6}><Form.Item name="expectedAt" label="Ngày dự kiến" rules={inventoryKind === "EXPECTED" ? [{ required: true, message: "Chọn ngày dự kiến" }] : []}><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item></Col></Row>
          <Row gutter={12}><Col span={6}><Form.Item name="actualQty" label="Số lượng" rules={[{ required: true, message: "Nhập số lượng" }]}><InputNumber min={0.001} style={{ width: "100%" }} /></Form.Item></Col><Col span={6}><Form.Item name="v15Qty" label="Số lượng V15"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></Col><Col span={6}><Form.Item name="unitCost" label="Giá vốn" rules={inventoryKind === "ON_HAND" ? [{ required: true, message: "Nhập giá vốn, có thể bằng 0" }] : []}><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></Col><Col span={6}><Form.Item name="currency" label="Tiền tệ"><Input maxLength={3} /></Form.Item></Col></Row>
          <Row gutter={12}><Col span={8}><Form.Item name="customerPartyId" label="Khách hàng giữ hàng" rules={inventoryKind === "RESERVED" ? [{ required: true, message: "Chọn khách hàng" }] : []}><Select showSearch allowClear optionFilterProp="label" options={partyOptions} /></Form.Item></Col><Col span={8}><Form.Item name="expiresAt" label="Giữ đến / hết hạn"><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item></Col><Col span={8}><Form.Item name="reason" label="Lý do khóa" rules={inventoryKind === "BLOCKED" ? [{ required: true, message: "Nhập lý do không được bán" }] : []}><Input /></Form.Item></Col></Row>
          <Row gutter={12}><Col span={12}><Form.Item name="legacyReference" label="Tham chiếu hệ thống cũ"><Input /></Form.Item></Col><Col span={12}><Form.Item name="note" label="Ghi chú"><Input /></Form.Item></Col></Row>
        </> : <>
          <Form.Item name="side" hidden><Input /></Form.Item>
          <Row gutter={12}><Col span={12}><Form.Item name="counterpartyPartyId" label={activeSection === "RECEIVABLE" ? "Khách hàng" : "Nhà cung cấp"} rules={[{ required: true, message: "Chọn đối tác" }]}><Select showSearch optionFilterProp="label" options={partyOptions} /></Form.Item></Col><Col span={6}><Form.Item name="balanceType" label="Loại số dư" rules={[{ required: true }]}><Select options={[{ value: "DEBT", label: "Công nợ" }, { value: "ADVANCE", label: "Trả trước" }]} /></Form.Item></Col><Col span={6}><Form.Item name="currency" label="Tiền tệ"><Input maxLength={3} /></Form.Item></Col></Row>
          <Row gutter={12}><Col span={8}><Form.Item name="legacyDocumentNo" label="Số chứng từ cũ"><Input /></Form.Item></Col><Col span={8}><Form.Item name="documentDate" label="Ngày chứng từ"><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item></Col><Col span={8}><Form.Item name="dueDate" label="Hạn thanh toán"><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item></Col></Row>
          <Row gutter={12}><Col span={8}><Form.Item name="originalAmount" label="Giá trị gốc" rules={[{ required: true, message: "Nhập giá trị gốc" }]}><InputNumber min={0.01} style={{ width: "100%" }} /></Form.Item></Col><Col span={8}><Form.Item name="settledAmount" label="Đã thanh toán"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></Col><Col span={8}><Form.Item name="outstandingAmount" label="Còn lại" rules={[{ required: true, message: "Nhập số còn lại" }]}><InputNumber min={0.01} style={{ width: "100%" }} /></Form.Item></Col></Row>
          <Row gutter={12}><Col span={8}><Form.Item name="accountantEmployeeId" label="Kế toán phụ trách"><Select showSearch allowClear optionFilterProp="label" options={options.employees.map((v) => ({ value: v.id, label: `${v.code} — ${v.fullName}` }))} /></Form.Item></Col><Col span={8}><Form.Item name="legacyReference" label="Tham chiếu hệ thống cũ"><Input /></Form.Item></Col><Col span={8}><Form.Item name="note" label="Ghi chú"><Input /></Form.Item></Col></Row>
        </>}
      </Form>
    </Modal>
  </div>;
}
