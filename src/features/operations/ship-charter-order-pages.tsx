import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  DatePicker,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  CheckOutlined,
  DollarOutlined,
  EditOutlined,
  EyeOutlined,
  FileAddOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import dayjs from "dayjs";
import { CustomerSelect } from "../../shared/ui/CustomerSelect";
import { useAppSession } from "../../shared/authz/AppSessionProvider";
import { PERMS } from "../../shared/authz/perms";
import { notify } from "../../shared/lib/notification";
import { FileUploadField } from "./components";
import { operationsApi } from "./api";
import type { PagedResult, VesselDocumentCheck } from "./ship-master.types";
import type {
  AgentRegistration,
  CharterInsurance,
  CharterInspection,
  CharterOrderStatus,
  RegistrationStatus,
  ShipCharterOrder,
} from "./ship-charter.types";
import {
  FilterButton,
  ORDER_STATUS_LABELS,
  RefreshButton,
  REGISTRATION_STATUS_LABELS,
  SOURCE_LABELS,
  WorkflowPageHeader,
  WorkflowStatusTag,
  dateLabel,
  normalizeFormValues,
  numberLabel,
  toFormValues,
  useCharterOptions,
} from "./ship-charter-common";
import "./ship-charter-workflow.css";

const checkAlert = (check?: VesselDocumentCheck | null) => {
  if (!check) return null;
  if (!check.isReady) return <Alert type="error" showIcon message="Tàu chưa đủ điều kiện xác nhận" description={`Thiếu ${check.missingCount}, hết hạn ${check.expiredCount}.`} />;
  if (check.expiringSoonCount) return <Alert type="warning" showIcon message={`${check.expiringSoonCount} hồ sơ tàu sắp hết hạn trong 30 ngày`} />;
  return <Alert type="success" showIcon message="Hồ sơ tàu đầy đủ và còn hiệu lực" />;
};

export const ShipCharterOrderListPage: React.FC = () => {
  const navigate = useNavigate(); const [searchParams] = useSearchParams(); const queryClient = useQueryClient();
  const [page, setPage] = useState(1); const [pageSize, setPageSize] = useState(20); const [keyword, setKeyword] = useState(""); const [status, setStatus] = useState<string | undefined>(searchParams.get("status") || undefined); const [sourceType, setSourceType] = useState<string>(); const [filterOpen, setFilterOpen] = useState(false); const [filterForm] = Form.useForm();
  const query = useQuery<PagedResult<ShipCharterOrder>>({ queryKey: ["operations", "charter-orders", { page, pageSize, keyword, status, sourceType }], queryFn: () => operationsApi.charterOrders({ page, pageSize, keyword, status, sourceType }), placeholderData: (prev) => prev });
  const refresh = async () => queryClient.invalidateQueries({ queryKey: ["operations", "charter-orders"] });
  const filter = <Form form={filterForm} className="charter-filter-panel" layout="vertical" size="small" initialValues={{ status, sourceType }} onFinish={(values) => { setStatus(values.status); setSourceType(values.sourceType); setPage(1); setFilterOpen(false); }}><Form.Item name="status" label="Trạng thái"><Select allowClear options={Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({ value, label }))} /></Form.Item><Form.Item name="sourceType" label="Nguồn"><Select allowClear options={[{ value: "DIRECT", label: SOURCE_LABELS.DIRECT }, { value: "FROM_TERM", label: SOURCE_LABELS.FROM_TERM }]} /></Form.Item><Space style={{ width: "100%", justifyContent: "flex-end" }}><Button size="small" onClick={() => { filterForm.resetFields(); setStatus(undefined); setSourceType(undefined); setPage(1); }}>Đặt lại</Button><Button size="small" type="primary" htmlType="submit">Áp dụng</Button></Space></Form>;
  return <main className="charter-page"><WorkflowPageHeader title="Đơn thuê tàu" subtitle="Điều phối từ yêu cầu TERM đến phụ lục và các dịch vụ theo chuyến." action={<Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => navigate("/operations/charter-orders/create")}>Tạo đơn trực tiếp</Button>} /><div className="charter-toolbar"><Input.Search size="small" allowClear placeholder="Tìm mã đơn, hàng hóa hoặc PO TERM" style={{ width: 370 }} onSearch={(value) => { setKeyword(value.trim()); setPage(1); }} /><Space><FilterButton count={Number(Boolean(status)) + Number(Boolean(sourceType))} open={filterOpen} onOpenChange={(value) => { setFilterOpen(value); if (value) filterForm.setFieldsValue({ status, sourceType }); }} content={filter} /><RefreshButton loading={query.isFetching} onClick={refresh} /></Space></div><div className="charter-filter-tags">{status ? <Tag closable onClose={() => setStatus(undefined)}>Trạng thái: {ORDER_STATUS_LABELS[status as CharterOrderStatus]}</Tag> : null}{sourceType ? <Tag closable onClose={() => setSourceType(undefined)}>Nguồn: {SOURCE_LABELS[sourceType as "DIRECT" | "FROM_TERM"]}</Tag> : null}</div><div className="charter-table"><Table<ShipCharterOrder> size="small" rowKey="id" loading={query.isLoading || query.isFetching} dataSource={query.data?.items ?? []} onRow={(row) => ({ onClick: () => navigate(`/operations/charter-orders/${row.id}`) })} pagination={{ current: page, pageSize, total: query.data?.total ?? 0, showSizeChanger: true, showTotal: (total) => `${total} đơn`, onChange: (p, ps) => { setPage(p); setPageSize(ps); } }} columns={[
    { title: "Mã đơn", dataIndex: "charterOrderNo", width: 170, fixed: "left" }, { title: "Nguồn", dataIndex: "sourceType", width: 110, render: (value) => SOURCE_LABELS[value as "DIRECT" | "FROM_TERM"] }, { title: "PO TERM", render: (_, row) => row.purchaseOrder?.orderNo || "-", width: 150 }, { title: "Chủ tàu", render: (_, row) => row.owner?.name || "-", ellipsis: true }, { title: "Tàu", render: (_, row) => row.vessel?.name || "-", width: 160 }, { title: "Hàng hóa", dataIndex: "cargoName", width: 180, ellipsis: true }, { title: "Số lượng", dataIndex: "plannedQty", width: 130, align: "right", render: numberLabel }, { title: "Laycan", width: 220, render: (_, row) => `${dateLabel(row.laycanFrom)} - ${dateLabel(row.laycanTo)}` }, { title: "Trạng thái", width: 140, render: (_, row) => <WorkflowStatusTag status={row.status} labels={ORDER_STATUS_LABELS} /> }, { title: "", width: 48, fixed: "right", render: (_, row) => <Tooltip title="Chi tiết"><Button size="small" type="text" icon={<EyeOutlined />} onClick={(event) => { event.stopPropagation(); navigate(`/operations/charter-orders/${row.id}`); }} /></Tooltip> },
  ]} scroll={{ x: 1450 }} /></div></main>;
};

export const ShipCharterOrderFormPage: React.FC = () => {
  const navigate = useNavigate(); const { id } = useParams(); const [form] = Form.useForm(); const ownerCustomerId = Form.useWatch("ownerCustomerId", form); const vesselId = Form.useWatch("vesselId", form); const options = useCharterOptions(ownerCustomerId);
  const detail = useQuery<ShipCharterOrder>({ queryKey: ["operations", "charter-order", id], queryFn: () => operationsApi.charterOrder(id!), enabled: Boolean(id) });
  const vesselCheck = useQuery<VesselDocumentCheck>({ queryKey: ["operations", "vessel-document-check", vesselId], queryFn: () => operationsApi.vesselDocumentCheck(vesselId!), enabled: Boolean(vesselId) });
  const saveMutation = useMutation({ mutationFn: (values: any) => operationsApi.saveCharterOrder(normalizeFormValues(values), id), onSuccess: (row: any) => { notify.success(id ? "Đã cập nhật đơn thuê tàu." : "Đã tạo đơn thuê tàu."); navigate(`/operations/charter-orders/${row.id}`); } });
  const lookupMutation = useMutation({ mutationFn: (values: any) => operationsApi.lookupFreightRate(values), onSuccess: (result: any) => { if (!result.matched) { notify.warning("Không tìm thấy bảng giá phù hợp."); return; } form.setFieldsValue(result.defaults); notify.success(`Đã áp dụng bảng giá ${result.rate.rateCode}.`); } });
  useEffect(() => { if (id && detail.data) form.setFieldsValue(toFormValues(detail.data as any)); else if (!id) form.setFieldsValue({ charterOrderNo: `CT-${dayjs().format("YYYYMMDD-HHmm")}`, sourceType: "DIRECT", plannedQtyUnit: "LITER", qtyBasis: "V15", vatIncluded: false, insuranceRequired: false }); }, [id, detail.data, form]);
  const lookup = async () => { const values = await form.validateFields(["loadingPort", "dischargePort"]); lookupMutation.mutate({ ownerCustomerId, vesselId, loadingPort: values.loadingPort, dischargePort: values.dischargePort, productId: form.getFieldValue("productId"), laycanDate: form.getFieldValue("laycanFrom")?.format("YYYY-MM-DD") }); };
  if (id && detail.isLoading) return <main className="charter-page"><Alert type="info" showIcon message="Đang tải đơn thuê tàu..." /></main>;
  return <main className="charter-page"><WorkflowPageHeader title={id ? `Cập nhật ${detail.data?.charterOrderNo || "đơn thuê tàu"}` : "Tạo đơn thuê tàu"} subtitle={id ? "Bổ sung thông tin vận hành, tàu, hợp đồng và giá thuê." : "Tạo trực tiếp từ nhu cầu vận hành; đơn TERM được tạo từ dashboard thuê tàu."} action={<Button size="small" icon={<ArrowLeftOutlined />} onClick={() => navigate(id ? `/operations/charter-orders/${id}` : "/operations/charter-orders")}>{id ? "Chi tiết đơn" : "Danh sách"}</Button>} /><Form form={form} layout="vertical" size="small" onFinish={(values) => saveMutation.mutate(values)}>
    <Form.Item name="purchaseOrderId" hidden><Input /></Form.Item><Form.Item name="termShipmentId" hidden><Input /></Form.Item><Form.Item name="appendixId" hidden><Input /></Form.Item>
    <section className="charter-form-section"><div className="charter-form-section-title">Thông tin chung</div><div className="charter-form-grid three"><Form.Item name="charterOrderNo" label="Mã đơn" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="sourceType" label="Nguồn"><Select disabled options={[{ value: "DIRECT", label: SOURCE_LABELS.DIRECT }]} /></Form.Item><Form.Item name="insuranceRequired" label="Mua bảo hiểm hàng hóa" valuePropName="checked"><Switch size="small" /></Form.Item><Form.Item name="productId" label="Sản phẩm"><Select showSearch allowClear optionFilterProp="label" options={(options.products.data ?? []).map((item: any) => ({ value: item.id, label: `${item.code ? `${item.code} - ` : ""}${item.name}` }))} onChange={(value) => { const product = options.products.data?.find((item: any) => item.id === value); form.setFieldsValue({ cargoName: product?.name, plannedQtyUnit: product?.uom }); }} /></Form.Item><Form.Item name="cargoName" label="Tên hàng" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="receivingWarehouseId" label="Kho nhận"><Select showSearch allowClear optionFilterProp="label" options={(options.warehouses.data ?? []).map((item: any) => ({ value: item.id, label: `${item.code} - ${item.name}` }))} /></Form.Item><Form.Item name="plannedQty" label="Số lượng dự kiến" rules={[{ required: true }]}><InputNumber min={0.001} style={{ width: "100%" }} /></Form.Item><Form.Item name="plannedQtyUnit" label="Đơn vị"><Select options={[{ value: "LITER", label: "Lít" }, { value: "KG", label: "Kg" }, { value: "MT", label: "Tấn" }]} /></Form.Item><Form.Item name="qtyTolerancePercent" label="Dung sai %"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></div></section>
    <section className="charter-form-section"><div className="charter-form-section-title">Chủ tàu, tàu và hợp đồng</div><div className="charter-form-grid three"><Form.Item name="ownerCustomerId" label="Chủ tàu" rules={[{ required: true }]}><CustomerSelect size="small" customerRole="SHIP_OWNER" onChange={(value) => { form.setFieldsValue({ ownerCustomerId: value, vesselId: undefined, contractId: undefined }); }} /></Form.Item><Form.Item name="vesselId" label="Tàu" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" disabled={!ownerCustomerId} loading={options.vessels.isLoading} options={(options.vessels.data ?? []).map((item: any) => ({ value: item.id, label: `${item.name}${item.imoNo ? ` - IMO ${item.imoNo}` : ""}` }))} /></Form.Item><Form.Item name="contractId" label="Hợp đồng thuê tàu" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" disabled={!ownerCustomerId} options={(options.contracts.data ?? []).map((item) => ({ value: item.id, label: item.contractNo }))} onChange={(value) => { const contract = options.contracts.data?.find((item) => item.id === value); form.setFieldsValue({ qtyBasis: contract?.qtyBasis || "V15", vatIncluded: contract?.freightVatIncluded || false, lossRatePercent: contract?.lossRates?.[0]?.lossRatePercent }); }} /></Form.Item></div>{vesselId ? <div className="charter-inline-alert">{vesselCheck.isLoading ? <Alert type="info" showIcon message="Đang kiểm tra hồ sơ tàu..." /> : checkAlert(vesselCheck.data)}</div> : null}</section>
    <section className="charter-form-section"><div className="charter-detail-heading"><div className="charter-form-section-title">Tuyến, laycan và giá thuê</div><Button size="small" icon={<DollarOutlined />} loading={lookupMutation.isPending} onClick={lookup}>Tra bảng giá</Button></div><div className="charter-form-grid three"><Form.Item name="loadingPort" label="Cảng xếp" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="dischargePort" label="Cảng dỡ" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="laycanFrom" label="Laycan từ" rules={[{ required: true }]}><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item><Form.Item name="laycanTo" label="Laycan đến" rules={[{ required: true }]}><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item><Form.Item name="freightRateVndPerLiter" label="Giá thuê VND/lít" rules={[{ required: true }]}><InputNumber min={0} style={{ width: "100%" }} /></Form.Item><Form.Item name="lossRatePercent" label="Hao hụt %" rules={[{ required: true }]}><InputNumber min={0} style={{ width: "100%" }} /></Form.Item><Form.Item name="qtyBasis" label="Cơ sở số lượng"><Select options={[{ value: "V15", label: "V15" }, { value: "ACTUAL", label: "Thực tế" }]} /></Form.Item><Form.Item name="vatIncluded" label="Giá gồm VAT" valuePropName="checked"><Switch size="small" /></Form.Item><Form.Item name="vatRate" label="VAT %"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></div></section>
    <section className="charter-form-section"><Form.Item name="note" label="Ghi chú"><Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} /></Form.Item></section><Space style={{ width: "100%", justifyContent: "flex-end" }}><Button size="small" onClick={() => navigate(id ? `/operations/charter-orders/${id}` : "/operations/charter-orders")}>Hủy</Button><Button size="small" type="primary" htmlType="submit" loading={saveMutation.isPending}>{id ? "Lưu thay đổi" : "Lưu đơn nháp"}</Button></Space>
  </Form></main>;
};

type RegistrationKind = "insurance" | "inspection" | "agent";
const registrationMeta = {
  insurance: { title: "Bảo hiểm hàng hóa", role: "INSURER" as const, list: "insurances", companyField: "insuranceCompanyId", companyKey: "insuranceCompany", save: operationsApi.saveInsurance },
  inspection: { title: "Đăng ký giám định", role: "SURVEYOR" as const, list: "inspections", companyField: "inspectionCompanyId", companyKey: "inspectionCompany", save: operationsApi.saveInspection },
  agent: { title: "Đăng ký đại lý tàu", role: "SHIPPING_AGENT" as const, list: "agentRegistrations", companyField: "agentCustomerId", companyKey: "agent", save: operationsApi.saveAgent },
};

const RegistrationPanel: React.FC<{ kind: RegistrationKind; order: ShipCharterOrder; onSaved: () => void }> = ({ kind, order, onSaved }) => {
  const meta = registrationMeta[kind]; const [form] = Form.useForm(); const [open, setOpen] = useState(false); const [editing, setEditing] = useState<any>(); const items = (order[meta.list as keyof ShipCharterOrder] as any[] | undefined) ?? [];
  const mutation = useMutation({ mutationFn: (values: any) => meta.save(order.id, normalizeFormValues(values), editing?.id), onSuccess: () => { notify.success(`Đã lưu ${meta.title.toLowerCase()}.`); onSaved(); setOpen(false); } });
  const openForm = (row?: any) => { setEditing(row); form.resetFields(); form.setFieldsValue(row ? toFormValues(row) : { status: "REGISTERED", inspectionType: "BOTH", premiumAmount: 0, feeAmount: 0, agencyFee: 0, registeredDate: dayjs() }); setOpen(true); };
  const columns: any[] = [{ title: "Đơn vị", render: (_: any, row: any) => row[meta.companyKey]?.name || "-" }];
  if (kind === "insurance") columns.push({ title: "Số đơn", dataIndex: "policyNo", render: (value: any) => value || "-" }, { title: "Phí bảo hiểm", dataIndex: "premiumAmount", align: "right", render: numberLabel });
  if (kind === "inspection") columns.push({ title: "Loại", dataIndex: "inspectionType", render: (value: string) => ({ QUANTITY: "Số lượng", QUALITY: "Chất lượng", BOTH: "Số lượng & chất lượng" }[value] || value) }, { title: "Phí", dataIndex: "feeAmount", align: "right", render: numberLabel });
  if (kind === "agent") columns.push({ title: "Phí đại lý", dataIndex: "agencyFee", align: "right", render: numberLabel });
  // Số mua hàng đã tạm tính trên bảng giá TERM; phí đăng ký ở đây sẽ được bảng giá/Bảng sếp TERM tự lấy.
  const estimateAmount = kind === "insurance" ? order.termEstimate?.insuranceVnd : kind === "inspection" ? order.termEstimate?.inspectionVnd : undefined;
  const estimateHint = estimateAmount ? `Mua hàng tạm tính trên bảng giá TERM: ${numberLabel(estimateAmount)} đ` : undefined;
  columns.push({ title: "Trạng thái", dataIndex: "status", render: (value: string) => <WorkflowStatusTag status={value} labels={REGISTRATION_STATUS_LABELS} /> }, { title: "File", render: (_: any, row: any) => row.fileUrl ? <Typography.Link href={row.fileUrl} target="_blank">Xem</Typography.Link> : "-" }, { title: "", width: 48, render: (_: any, row: any) => <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openForm(row)} /> });
  return <section className="charter-detail-section"><div className="charter-detail-heading"><div><Typography.Title level={5}>{meta.title}</Typography.Title><Typography.Text type="secondary">{items.length} đăng ký{estimateHint ? ` · ${estimateHint}` : ""}</Typography.Text></div><Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => openForm()}>Thêm đăng ký</Button></div><Table size="small" rowKey="id" pagination={false} dataSource={items} columns={columns} />
    <Modal open={open} width={720} title={`${editing ? "Cập nhật" : "Thêm"} ${meta.title.toLowerCase()}`} onCancel={() => setOpen(false)} onOk={() => form.submit()} confirmLoading={mutation.isPending} destroyOnHidden><Form form={form} layout="vertical" size="small" onFinish={(values) => mutation.mutate(values)}><div className="charter-form-grid"><Form.Item name={meta.companyField} label="Đơn vị thực hiện" rules={[{ required: true }]}><CustomerSelect size="small" customerRole={meta.role} /></Form.Item>
      {kind === "insurance" ? <><Form.Item name="policyNo" label="Số đơn bảo hiểm"><Input /></Form.Item><Form.Item name="policyDate" label="Ngày đơn"><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item><Form.Item name="insuredValue" label="Giá trị bảo hiểm"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item><Form.Item name="premiumAmount" label="Phí bảo hiểm" rules={[{ required: true }]} extra={estimateHint}><InputNumber min={0} style={{ width: "100%" }} /></Form.Item><Form.Item name="effectiveFrom" label="Hiệu lực từ"><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item><Form.Item name="effectiveTo" label="Hiệu lực đến"><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item></> : null}
      {kind === "inspection" ? <><Form.Item name="inspectionType" label="Loại giám định"><Select options={[{ value: "QUANTITY", label: "Số lượng" }, { value: "QUALITY", label: "Chất lượng" }, { value: "BOTH", label: "Số lượng & chất lượng" }]} /></Form.Item><Form.Item name="registeredDate" label="Ngày đăng ký"><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item><Form.Item name="plannedInspectionDate" label="Ngày giám định dự kiến"><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item><Form.Item name="certificateNo" label="Số chứng thư"><Input /></Form.Item><Form.Item name="feeAmount" label="Phí giám định" extra={estimateHint}><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></> : null}
      {kind === "agent" ? <><Form.Item name="registeredDate" label="Ngày đăng ký"><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item><Form.Item name="agencyFee" label="Phí đại lý" rules={[{ required: true }]}><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></> : null}
      <Form.Item name="status" label="Trạng thái"><Select options={Object.entries(REGISTRATION_STATUS_LABELS).map(([value, label]) => ({ value, label }))} /></Form.Item></div><Form.Item name="fileUrl" label="File hồ sơ"><FileUploadField folder={`operations/charter-orders/${order.id}/${kind}`} /></Form.Item><Form.Item name="note" label="Ghi chú"><Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} /></Form.Item></Form></Modal>
  </section>;
};

export const ShipCharterOrderDetailPage: React.FC = () => {
  const { id } = useParams(); const navigate = useNavigate(); const queryClient = useQueryClient(); const { permissions } = useAppSession(); const [appendixOpen, setAppendixOpen] = useState(false); const [appendixForm] = Form.useForm();
  const query = useQuery<ShipCharterOrder>({ queryKey: ["operations", "charter-order", id], queryFn: () => operationsApi.charterOrder(id!), enabled: Boolean(id) }); const row = query.data; const refresh = async () => { await queryClient.invalidateQueries({ queryKey: ["operations", "charter-order", id] }); await queryClient.invalidateQueries({ queryKey: ["operations", "charter-orders"] }); };
  const statusMutation = useMutation({ mutationFn: (status: CharterOrderStatus) => operationsApi.changeCharterStatus(id!, status), onSuccess: () => { notify.success("Đã cập nhật trạng thái."); refresh(); } });
  const confirmMutation = useMutation({ mutationFn: (override: boolean) => operationsApi.confirmCharterOrder(id!, override), onSuccess: () => { notify.success("Đã xác nhận đơn thuê tàu."); refresh(); } });
  const cancelMutation = useMutation({ mutationFn: () => operationsApi.cancelCharterOrder(id!), onSuccess: () => { notify.success("Đã hủy đơn thuê tàu."); refresh(); } });
  const appendixMutation = useMutation({ mutationFn: (values: any) => operationsApi.createCharterAppendix(id!, normalizeFormValues(values)), onSuccess: () => { notify.success("Đã sinh phụ lục hợp đồng."); setAppendixOpen(false); refresh(); } });
  const costMutation = useMutation({ mutationFn: () => operationsApi.postTermCosts(id!), onSuccess: (result: any) => notify.success(`Đã ghi nhận ${result.postedCount ?? 0} dòng chi phí TERM.`) });
  if (!row) return <main className="charter-page"><Alert type={query.isError ? "error" : "info"} showIcon message={query.isError ? "Không tải được đơn thuê tàu" : "Đang tải đơn thuê tàu..."} /></main>;
  const check = row.vesselDocumentCheck; const canOverride = permissions.has(PERMS.OPERATIONS_VESSEL_DOCUMENTS_OVERRIDE as any);
  const nextActions: React.ReactNode[] = [];
  if (row.status === "DRAFT") nextActions.push(<Button key="wait" size="small" onClick={() => statusMutation.mutate("WAITING_CONFIRMATION")}>Gửi xác nhận</Button>);
  if (["DRAFT", "WAITING_CONFIRMATION"].includes(row.status)) nextActions.push(<Button key="confirm" size="small" type="primary" icon={<CheckOutlined />} onClick={() => confirmMutation.mutate(false)} loading={confirmMutation.isPending}>Xác nhận</Button>);
  if (["DRAFT", "WAITING_CONFIRMATION"].includes(row.status) && check && !check.isReady && canOverride) nextActions.push(<Popconfirm key="override" title="Tàu chưa đủ hồ sơ. Xác nhận với quyền override?" onConfirm={() => confirmMutation.mutate(true)}><Button size="small" danger>Override hồ sơ</Button></Popconfirm>);
  if (row.status === "CONFIRMED" && !row.appendixId) nextActions.push(<Button key="appendix" size="small" type="primary" icon={<FileAddOutlined />} onClick={() => { appendixForm.setFieldsValue({ appendixNo: `PL-${row.charterOrderNo}`, appendixDate: dayjs() }); setAppendixOpen(true); }}>Sinh phụ lục</Button>);
  if (["CONFIRMED", "APPENDIX_CREATED"].includes(row.status)) nextActions.push(<Button key="progress" size="small" onClick={() => statusMutation.mutate("IN_PROGRESS")}>Bắt đầu thực hiện</Button>);
  if (row.status === "IN_PROGRESS") nextActions.push(<Button key="complete" size="small" type="primary" onClick={() => statusMutation.mutate("COMPLETED")}>Hoàn tất</Button>);
  if (!["COMPLETED", "CANCELLED"].includes(row.status)) nextActions.push(<Popconfirm key="cancel" title="Hủy đơn thuê tàu này?" onConfirm={() => cancelMutation.mutate()}><Button size="small" danger icon={<StopOutlined />}>Hủy</Button></Popconfirm>);
  return <main className="charter-page"><WorkflowPageHeader title={row.charterOrderNo} subtitle={`${SOURCE_LABELS[row.sourceType]}${row.purchaseOrder?.orderNo ? ` · PO ${row.purchaseOrder.orderNo}` : ""}`} action={<><Button size="small" icon={<ArrowLeftOutlined />} onClick={() => navigate("/operations/charter-orders")}>Danh sách</Button>{!["COMPLETED", "CANCELLED"].includes(row.status) ? <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/operations/charter-orders/${row.id}/edit`)}>Sửa đơn</Button> : null}{nextActions}</>} /><div className="charter-detail-summary"><div className="charter-summary-item"><span>Trạng thái</span><strong><WorkflowStatusTag status={row.status} labels={ORDER_STATUS_LABELS} /></strong></div><div className="charter-summary-item"><span>Tàu</span><strong>{row.vessel?.name || "Chưa chọn"}</strong></div><div className="charter-summary-item"><span>Laycan</span><strong>{dateLabel(row.laycanFrom)} - {dateLabel(row.laycanTo)}</strong></div><div className="charter-summary-item"><span>Tình trạng hồ sơ</span><strong>{check?.readinessStatus === "READY" ? "Đầy đủ" : check?.readinessStatus === "WARNING" ? "Sắp hết hạn" : "Chưa đạt"}</strong></div></div>
    <Tabs size="small" items={[
      { key: "info", label: "Thông tin đơn", children: <section className="charter-detail-section"><Descriptions size="small" bordered column={{ xs: 1, md: 2, xl: 3 }}><Descriptions.Item label="Hàng hóa">{row.product?.name || row.cargoName || "-"}</Descriptions.Item><Descriptions.Item label="Số lượng">{numberLabel(row.plannedQty)} {row.plannedQtyUnit}</Descriptions.Item><Descriptions.Item label="Dung sai">{numberLabel(row.qtyTolerancePercent)}%</Descriptions.Item><Descriptions.Item label="Tuyến">{row.loadingPort || "-"} → {row.dischargePort || "-"}</Descriptions.Item><Descriptions.Item label="Kho nhận">{row.receivingWarehouse?.name || "-"}</Descriptions.Item><Descriptions.Item label="Bảo hiểm hàng hóa">{row.insuranceRequired ? <Tag color="blue">Có yêu cầu</Tag> : "Không"}</Descriptions.Item><Descriptions.Item label="Ghi chú" span={3}>{row.note || "-"}</Descriptions.Item></Descriptions></section> },
      { key: "vessel", label: "Chủ tàu / Tàu", children: <><section className="charter-detail-section"><Descriptions size="small" bordered column={{ xs: 1, md: 2 }}><Descriptions.Item label="Chủ tàu">{row.owner?.name || "-"}</Descriptions.Item><Descriptions.Item label="Tàu">{row.vessel?.name || "-"}</Descriptions.Item><Descriptions.Item label="IMO">{row.vessel?.imoNo || "-"}</Descriptions.Item><Descriptions.Item label="Quốc tịch">{row.vessel?.nationality || "-"}</Descriptions.Item></Descriptions></section><div className="charter-detail-section">{checkAlert(check)}</div></> },
      { key: "contract", label: "Hợp đồng & Phụ lục", children: <section className="charter-detail-section"><Descriptions size="small" bordered column={{ xs: 1, md: 2 }}><Descriptions.Item label="Hợp đồng">{row.contract ? <Typography.Link onClick={() => navigate(`/operations/charter-contracts/${row.contractId}`)}>{row.contract.contractNo}</Typography.Link> : "-"}</Descriptions.Item><Descriptions.Item label="Phụ lục">{row.appendix ? <Typography.Link onClick={() => navigate(`/operations/charter-appendices/${row.appendixId}`)}>{row.appendix.appendixNo}</Typography.Link> : <Tag color="gold">Chưa sinh</Tag>}</Descriptions.Item><Descriptions.Item label="File phụ lục">{row.appendix?.fileUrl || row.appendixFileUrl ? <Typography.Link href={row.appendix?.fileUrl || row.appendixFileUrl || undefined} target="_blank">Xem file</Typography.Link> : "-"}</Descriptions.Item></Descriptions></section> },
      { key: "insurance", label: `Bảo hiểm (${row.insurances?.length ?? 0})`, children: row.insuranceRequired ? <RegistrationPanel kind="insurance" order={row} onSaved={refresh} /> : <Alert type="info" showIcon message="Đơn này không yêu cầu mua bảo hiểm hàng hóa." /> },
      { key: "inspection", label: `Giám định (${row.inspections?.length ?? 0})`, children: <RegistrationPanel kind="inspection" order={row} onSaved={refresh} /> },
      { key: "agent", label: `Đại lý tàu (${row.agentRegistrations?.length ?? 0})`, children: <RegistrationPanel kind="agent" order={row} onSaved={refresh} /> },
      { key: "cost", label: "Chi phí / Bảng giá", children: <section className="charter-detail-section"><div className="charter-detail-heading"><Typography.Title level={5}>Chi phí dự kiến</Typography.Title><Button size="small" type="primary" icon={<DollarOutlined />} disabled={!row.purchaseOrderId} loading={costMutation.isPending} onClick={() => costMutation.mutate()}>Đưa chi phí vào TERM</Button></div><Descriptions size="small" bordered column={{ xs: 1, md: 2, xl: 3 }}><Descriptions.Item label="Giá thuê VND/lít">{numberLabel(row.freightRateVndPerLiter)}</Descriptions.Item><Descriptions.Item label="Hao hụt %">{numberLabel(row.lossRatePercent)}</Descriptions.Item><Descriptions.Item label="Cơ sở số lượng">{row.qtyBasis}</Descriptions.Item><Descriptions.Item label="VAT">{row.vatIncluded ? `Đã gồm${row.vatRate ? ` ${row.vatRate}%` : ""}` : "Chưa gồm"}</Descriptions.Item><Descriptions.Item label="Cước dự kiến">{numberLabel(Number(row.freightRateVndPerLiter || 0) * Number(row.plannedQty || 0))}</Descriptions.Item></Descriptions></section> },
      { key: "files", label: "File đính kèm", children: <section className="charter-detail-section"><Table size="small" pagination={false} rowKey="name" dataSource={[{ name: "Phụ lục hợp đồng", url: row.appendix?.fileUrl || row.appendixFileUrl }, ...(row.insurances ?? []).map((item) => ({ name: `Bảo hiểm ${item.policyNo || ""}`, url: item.fileUrl })), ...(row.inspections ?? []).map((item) => ({ name: `Giám định ${item.certificateNo || ""}`, url: item.fileUrl })), ...(row.agentRegistrations ?? []).map((item) => ({ name: `Đại lý ${item.agent?.name || ""}`, url: item.fileUrl }))]} columns={[{ title: "Loại file", dataIndex: "name" }, { title: "File", dataIndex: "url", render: (url) => url ? <Typography.Link href={url} target="_blank">Xem</Typography.Link> : <Tag color="red">Thiếu</Tag> }]} /></section> },
    ]} />
    <Modal open={appendixOpen} title="Sinh phụ lục hợp đồng thuê tàu" onCancel={() => setAppendixOpen(false)} onOk={() => appendixForm.submit()} confirmLoading={appendixMutation.isPending} destroyOnHidden><Form form={appendixForm} layout="vertical" size="small" onFinish={(values) => appendixMutation.mutate(values)}><Form.Item name="appendixNo" label="Số phụ lục" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="appendixDate" label="Ngày phụ lục" rules={[{ required: true }]}><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item><Form.Item name="fileUrl" label="File phụ lục đã ký"><FileUploadField folder={`operations/charter-orders/${row.id}/appendix`} /></Form.Item></Form></Modal>
  </main>;
};
