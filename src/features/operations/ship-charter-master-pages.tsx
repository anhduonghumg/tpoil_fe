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
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  ArrowLeftOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import { CustomerSelect } from "../../shared/ui/CustomerSelect";
import { notify } from "../../shared/lib/notification";
import { FileUploadField } from "./components";
import { operationsApi } from "./api";
import type { PagedResult, Vessel } from "./ship-master.types";
import type {
  AgentRegistration,
  CharterInsurance,
  CharterInspection,
  ShipCharterAppendix,
  ShipCharterContract,
  ShipCharterDashboard,
  ShipFreightRate,
} from "./ship-charter.types";
import {
  CONTRACT_STATUS_LABELS,
  FREIGHT_STATUS_LABELS,
  FilterButton,
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

const compactCustomer = (item: any) => ({ value: item.id, label: `${item.code ? `${item.code} - ` : ""}${item.name}` });
const compactVessel = (item: Vessel) => ({ value: item.id, label: `${item.name}${item.imoNo ? ` - IMO ${item.imoNo}` : ""}` });

export const ShipCharterDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [creatingId, setCreatingId] = useState<string>();
  const dashboard = useQuery<ShipCharterDashboard>({
    queryKey: ["operations", "ship-charter-dashboard"],
    queryFn: operationsApi.shipCharterDashboard,
  });
  const pending = useQuery<any>({
    queryKey: ["operations", "pending-term-charters"],
    queryFn: () => operationsApi.pendingTermCharterOrders({ page: 1, pageSize: 8 }),
  });
  const createMutation = useMutation({
    mutationFn: (purchaseOrderId: string) => operationsApi.createCharterOrderFromTerm(purchaseOrderId),
    onSuccess: async (row: any) => {
      notify.success("Đã tạo đơn thuê tàu nháp từ TERM.");
      await queryClient.invalidateQueries({ queryKey: ["operations", "pending-term-charters"] });
      navigate(`/operations/charter-orders/${row.id}`);
    },
    onSettled: () => setCreatingId(undefined),
  });
  const data = dashboard.data;
  const metrics = [
    { label: "Đơn TERM cần tạo", value: data?.termOrdersPending, hint: "Chưa có đơn thuê tàu", tone: "warning", href: "#pending-term" },
    { label: "Đơn thuê tàu nháp", value: data?.draftOrders, hint: "Cần bổ sung thông tin", tone: "normal", href: "/operations/charter-orders?status=DRAFT" },
    { label: "Chưa có phụ lục", value: data?.ordersWithoutAppendix, hint: "Đơn đang hoạt động", tone: "warning", href: "/operations/charter-orders" },
    { label: "Chờ bảo hiểm", value: data?.insurancePending, hint: "Đơn có yêu cầu bảo hiểm", tone: "danger", href: "/operations/charter-insurances" },
    { label: "Chờ giám định", value: data?.inspectionPending, hint: "Chưa đăng ký đơn vị", tone: "warning", href: "/operations/charter-inspections" },
    { label: "Chờ đại lý tàu", value: data?.agentPending, hint: "Chưa đăng ký đại lý", tone: "warning", href: "/operations/shipping-agent-registrations" },
    { label: "Tàu chưa đủ hồ sơ", value: data?.selectedVesselsNotReady, hint: "Đang được chọn trong đơn", tone: "danger", href: "/operations/vessel-documents" },
    { label: "Sắp đến laycan", value: data?.laycanSoon, hint: "Trong vòng 30 ngày", tone: "success", href: "/operations/charter-orders" },
  ];

  return (
    <main className="charter-page">
      <WorkflowPageHeader
        title="Dashboard thuê tàu"
        subtitle="Theo dõi đơn TERM, hồ sơ tàu và các đăng ký dịch vụ theo chuyến."
        action={
          <>
            <Button size="small" icon={<FileTextOutlined />} onClick={() => navigate("/operations/charter-orders")}>Danh sách đơn</Button>
            <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => navigate("/operations/charter-orders/create")}>Tạo đơn trực tiếp</Button>
            <RefreshButton loading={dashboard.isFetching} onClick={() => dashboard.refetch()} />
          </>
        }
      />
      {dashboard.isError ? <Alert className="charter-inline-alert" type="error" showIcon message="Không tải được dashboard thuê tàu" /> : null}
      <section className="charter-dashboard-metrics">
        {metrics.map((metric) => (
          <button
            type="button"
            className={`charter-dashboard-metric ${metric.tone}`}
            key={metric.label}
            style={{ border: 0, textAlign: "left", cursor: "pointer" }}
            onClick={() => metric.href.startsWith("#") ? document.querySelector(metric.href)?.scrollIntoView({ behavior: "smooth" }) : navigate(metric.href)}
          >
            <span>{metric.label}</span><strong>{metric.value ?? 0}</strong><small>{metric.hint}</small>
          </button>
        ))}
      </section>
      <section id="pending-term" className="charter-detail-section">
        <div className="charter-detail-heading">
          <div><Typography.Title level={5}>Đơn TERM chờ thuê tàu</Typography.Title><Typography.Text type="secondary">Ưu tiên tạo đơn nháp để vận hành bổ sung tàu và giá thuê.</Typography.Text></div>
          <Tag color={pending.data?.total ? "gold" : "default"}>{pending.data?.total ?? 0} đơn</Tag>
        </div>
        <Table<any>
          size="small" rowKey="id" loading={pending.isLoading} pagination={false} dataSource={pending.data?.items ?? []}
          columns={[
            { title: "Mã TERM", dataIndex: "orderNo", width: 160 },
            { title: "Nhà cung cấp", render: (_, row) => row.supplier?.name || "-" },
            { title: "Hàng hóa", render: (_, row) => row.lines?.map((line: any) => line.product?.name).filter(Boolean).join(", ") || "-" },
            { title: "Số lượng", dataIndex: "totalQty", width: 130, align: "right", render: numberLabel },
            { title: "Ngày dự kiến", dataIndex: "expectedDate", width: 120, render: dateLabel },
            { title: "", width: 120, render: (_, row) => (
              <Popconfirm title="Tạo đơn thuê tàu nháp từ đơn TERM này?" onConfirm={() => { setCreatingId(row.id); createMutation.mutate(row.id); }}>
                <Button size="small" type="primary" icon={<ThunderboltOutlined />} loading={creatingId === row.id}>Tạo đơn</Button>
              </Popconfirm>
            ) },
          ]}
        />
      </section>
    </main>
  );
};

const ContractModal: React.FC<{
  open: boolean;
  row?: ShipCharterContract;
  onClose: () => void;
  onSaved: () => void;
}> = ({ open, row, onClose, onSaved }) => {
  const [form] = Form.useForm();
  const options = useCharterOptions();
  const mutation = useMutation({
    mutationFn: (values: any) => operationsApi.saveCharterContract(normalizeFormValues(values), row?.id),
    onSuccess: () => { notify.success("Đã lưu hợp đồng thuê tàu."); onSaved(); onClose(); },
  });
  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue(row ? toFormValues(row as any) : { qtyBasis: "V15", status: "DRAFT", freightVatIncluded: false, lossRates: [] });
  }, [open, row, form]);
  return (
    <Modal open={open} width={900} title={row ? "Cập nhật hợp đồng thuê tàu" : "Thêm hợp đồng thuê tàu"} onCancel={onClose} onOk={() => form.submit()} confirmLoading={mutation.isPending} destroyOnHidden>
      <Form form={form} layout="vertical" size="small" onFinish={(values) => mutation.mutate(values)}>
        <div className="charter-form-grid three">
          <Form.Item name="contractNo" label="Số hợp đồng" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="ownerCustomerId" label="Chủ tàu" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" loading={options.owners.isLoading} options={(options.owners.data ?? []).map(compactCustomer)} /></Form.Item>
          <Form.Item name="status" label="Trạng thái"><Select options={Object.entries(CONTRACT_STATUS_LABELS).map(([value, label]) => ({ value, label }))} /></Form.Item>
          <Form.Item name="signedDate" label="Ngày ký"><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="effectiveFrom" label="Hiệu lực từ"><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="effectiveTo" label="Hiệu lực đến"><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="qtyBasis" label="Cơ sở số lượng"><Select options={[{ value: "V15", label: "V15" }, { value: "ACTUAL", label: "Thực tế" }]} /></Form.Item>
          <Form.Item name="defaultLaytimeHours" label="Laytime mặc định (giờ)"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="demurrageRatePerDay" label="Phí lưu tàu/ngày"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="paymentTermDays" label="Số ngày thanh toán"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="paymentTermText" label="Điều khoản thanh toán"><Input /></Form.Item>
          <Form.Item name="freightVatIncluded" label="Giá gồm VAT" valuePropName="checked"><Switch size="small" /></Form.Item>
        </div>
        <Form.Item name="fileUrl" label="File hợp đồng"><FileUploadField folder="operations/charter-contracts" /></Form.Item>
        <Form.List name="lossRates">
          {(fields, { add, remove }) => (
            <div className="charter-detail-section charter-loss-table">
              <div className="charter-detail-heading"><Typography.Title level={5}>Tỷ lệ hao hụt mặc định</Typography.Title><Button size="small" icon={<PlusOutlined />} onClick={() => add()}>Thêm dòng</Button></div>
              <Table size="small" pagination={false} rowKey="key" dataSource={fields} columns={[
                { title: "Nhóm hàng", render: (_, field: any) => <Form.Item name={[field.name, "productGroup"]} rules={[{ required: true }]}><Input /></Form.Item> },
                { title: "Hao hụt %", width: 160, render: (_, field: any) => <Form.Item name={[field.name, "lossRatePercent"]} rules={[{ required: true }]}><InputNumber min={0} style={{ width: "100%" }} /></Form.Item> },
                { title: "Ghi chú", render: (_, field: any) => <Form.Item name={[field.name, "note"]}><Input /></Form.Item> },
                { title: "", width: 56, render: (_, field: any) => <Button size="small" type="text" danger onClick={() => remove(field.name)}>Xóa</Button> },
              ]} />
            </div>
          )}
        </Form.List>
        <Form.Item name="note" label="Ghi chú"><Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} /></Form.Item>
      </Form>
    </Modal>
  );
};

export const ShipCharterContractListPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1); const [pageSize, setPageSize] = useState(20); const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<string>(); const [filterOpen, setFilterOpen] = useState(false); const [editing, setEditing] = useState<ShipCharterContract>(); const [modalOpen, setModalOpen] = useState(false);
  const query = useQuery<PagedResult<ShipCharterContract>>({ queryKey: ["operations", "charter-contracts", { page, pageSize, keyword, status }], queryFn: () => operationsApi.charterContracts({ page, pageSize, keyword, status }), placeholderData: (prev) => prev });
  const refresh = async () => queryClient.invalidateQueries({ queryKey: ["operations", "charter-contracts"] });
  const filter = <div className="charter-filter-panel"><Typography.Text strong>Trạng thái</Typography.Text><Select size="small" allowClear value={status} style={{ width: "100%", marginTop: 6 }} options={Object.entries(CONTRACT_STATUS_LABELS).map(([value, label]) => ({ value, label }))} onChange={(value) => { setStatus(value); setPage(1); setFilterOpen(false); }} /></div>;
  return (
    <main className="charter-page">
      <WorkflowPageHeader title="Hợp đồng thuê tàu" subtitle="Hợp đồng nguyên tắc với chủ tàu và điều kiện mặc định." action={<Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(undefined); setModalOpen(true); }}>Thêm hợp đồng</Button>} />
      <div className="charter-toolbar"><Input.Search size="small" allowClear placeholder="Tìm số hợp đồng hoặc chủ tàu" style={{ width: 340 }} onSearch={(value) => { setKeyword(value.trim()); setPage(1); }} /><Space><FilterButton count={Number(Boolean(status))} open={filterOpen} onOpenChange={setFilterOpen} content={filter} /><RefreshButton loading={query.isFetching} onClick={refresh} /></Space></div>
      <div className="charter-filter-tags">{status ? <Tag closable onClose={() => setStatus(undefined)}>Trạng thái: {CONTRACT_STATUS_LABELS[status as keyof typeof CONTRACT_STATUS_LABELS]}</Tag> : null}</div>
      <div className="charter-table"><Table<ShipCharterContract> size="small" rowKey="id" loading={query.isLoading || query.isFetching} dataSource={query.data?.items ?? []} onRow={(row) => ({ onClick: () => navigate(`/operations/charter-contracts/${row.id}`) })} pagination={{ current: page, pageSize, total: query.data?.total ?? 0, showSizeChanger: true, onChange: (p, ps) => { setPage(p); setPageSize(ps); } }} columns={[
        { title: "Số hợp đồng", dataIndex: "contractNo", width: 170, fixed: "left" },
        { title: "Chủ tàu", render: (_, row) => row.owner?.name || "-", ellipsis: true },
        { title: "Ngày ký", dataIndex: "signedDate", width: 110, render: dateLabel },
        { title: "Hiệu lực", width: 230, render: (_, row) => `${dateLabel(row.effectiveFrom)} - ${dateLabel(row.effectiveTo)}` },
        { title: "Phụ lục", width: 90, align: "right", render: (_, row) => row._count?.appendices ?? 0 },
        { title: "Trạng thái", width: 120, render: (_, row) => <WorkflowStatusTag status={row.status} labels={CONTRACT_STATUS_LABELS} /> },
        { title: "", width: 80, fixed: "right", render: (_, row) => <Space size={2}><Tooltip title="Chi tiết"><Button size="small" type="text" icon={<EyeOutlined />} onClick={(e) => { e.stopPropagation(); navigate(`/operations/charter-contracts/${row.id}`); }} /></Tooltip><Tooltip title="Sửa"><Button size="small" type="text" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); setEditing(row); setModalOpen(true); }} /></Tooltip></Space> },
      ]} scroll={{ x: 1050 }} /></div>
      <ContractModal open={modalOpen} row={editing} onClose={() => setModalOpen(false)} onSaved={refresh} />
    </main>
  );
};

export const ShipCharterContractDetailPage: React.FC = () => {
  const { id } = useParams(); const navigate = useNavigate(); const [editing, setEditing] = useState(false); const queryClient = useQueryClient();
  const query = useQuery<ShipCharterContract>({ queryKey: ["operations", "charter-contract", id], queryFn: () => operationsApi.charterContract(id!), enabled: Boolean(id) });
  const row = query.data;
  if (!row) return <main className="charter-page"><Alert type={query.isError ? "error" : "info"} showIcon message={query.isError ? "Không tải được hợp đồng" : "Đang tải hợp đồng..."} /></main>;
  return <main className="charter-page"><WorkflowPageHeader title={row.contractNo} subtitle={row.owner?.name} action={<><Button size="small" icon={<ArrowLeftOutlined />} onClick={() => navigate("/operations/charter-contracts")}>Danh sách</Button><Button size="small" type="primary" icon={<EditOutlined />} onClick={() => setEditing(true)}>Sửa</Button></>} />
    <div className="charter-detail-summary"><div className="charter-summary-item"><span>Trạng thái</span><strong><WorkflowStatusTag status={row.status} labels={CONTRACT_STATUS_LABELS} /></strong></div><div className="charter-summary-item"><span>Phụ lục</span><strong>{row.appendices?.length ?? 0}</strong></div><div className="charter-summary-item"><span>Đơn thuê tàu</span><strong>{row.orders?.length ?? 0}</strong></div><div className="charter-summary-item"><span>Bảng giá</span><strong>{row.freightRates?.length ?? 0}</strong></div></div>
    <section className="charter-detail-section"><Descriptions size="small" bordered column={{ xs: 1, md: 2, xl: 3 }}><Descriptions.Item label="Chủ tàu">{row.owner?.name}</Descriptions.Item><Descriptions.Item label="Ngày ký">{dateLabel(row.signedDate)}</Descriptions.Item><Descriptions.Item label="Hiệu lực">{dateLabel(row.effectiveFrom)} - {dateLabel(row.effectiveTo)}</Descriptions.Item><Descriptions.Item label="Cơ sở số lượng">{row.qtyBasis}</Descriptions.Item><Descriptions.Item label="Laytime mặc định">{numberLabel(row.defaultLaytimeHours)} giờ</Descriptions.Item><Descriptions.Item label="Phí lưu tàu/ngày">{numberLabel(row.demurrageRatePerDay)}</Descriptions.Item><Descriptions.Item label="Thanh toán">{row.paymentTermText || (row.paymentTermDays != null ? `${row.paymentTermDays} ngày` : "-")}</Descriptions.Item><Descriptions.Item label="File">{row.fileUrl ? <Typography.Link href={row.fileUrl} target="_blank">Xem hợp đồng</Typography.Link> : "-"}</Descriptions.Item><Descriptions.Item label="Ghi chú">{row.note || "-"}</Descriptions.Item></Descriptions></section>
    <section className="charter-detail-section"><div className="charter-detail-heading"><Typography.Title level={5}>Tỷ lệ hao hụt mặc định</Typography.Title></div><Table size="small" rowKey={(item) => item.id || item.productGroup} pagination={false} dataSource={row.lossRates ?? []} columns={[{ title: "Nhóm hàng", dataIndex: "productGroup" }, { title: "Tỷ lệ %", dataIndex: "lossRatePercent", width: 140, align: "right" }, { title: "Ghi chú", dataIndex: "note", render: (value) => value || "-" }]} /></section>
    <section className="charter-detail-section"><div className="charter-detail-heading"><Typography.Title level={5}>Phụ lục hợp đồng</Typography.Title></div><Table size="small" rowKey="id" pagination={false} dataSource={row.appendices ?? []} onRow={(item) => ({ onClick: () => navigate(`/operations/charter-appendices/${item.id}`) })} columns={[{ title: "Số phụ lục", dataIndex: "appendixNo" }, { title: "Ngày", dataIndex: "appendixDate", render: dateLabel }, { title: "Tàu", render: (_, item) => item.vessel?.name || "-" }, { title: "Laycan", render: (_, item) => `${dateLabel(item.laycanFrom)} - ${dateLabel(item.laycanTo)}` }]} /></section>
    <ContractModal open={editing} row={row} onClose={() => setEditing(false)} onSaved={async () => queryClient.invalidateQueries({ queryKey: ["operations", "charter-contract", id] })} />
  </main>;
};

const AppendixModal: React.FC<{ open: boolean; row?: ShipCharterAppendix; onClose: () => void; onSaved: () => void }> = ({ open, row, onClose, onSaved }) => {
  const [form] = Form.useForm(); const [ownerId, setOwnerId] = useState<string>(); const baseOptions = useCharterOptions(ownerId);
  const mutation = useMutation({ mutationFn: (values: any) => operationsApi.saveCharterAppendix(normalizeFormValues(values), row?.id), onSuccess: () => { notify.success("Đã lưu phụ lục hợp đồng."); onSaved(); onClose(); } });
  useEffect(() => { if (!open) return; form.resetFields(); form.setFieldsValue(row ? toFormValues(row as any) : { appendixDate: dayjs(), plannedQtyUnit: "LITER", qtyBasis: "V15", vatIncluded: false }); setOwnerId(row?.contract?.ownerCustomerId); }, [open, row, form]);
  const onContractChange = (contractId?: string) => { const contract = baseOptions.contracts.data?.find((item) => item.id === contractId); setOwnerId(contract?.ownerCustomerId); form.setFieldsValue({ vesselId: undefined, qtyBasis: contract?.qtyBasis || "V15", vatIncluded: contract?.freightVatIncluded || false, paymentTermText: contract?.paymentTermText }); };
  return <Modal open={open} width={920} title={row ? "Cập nhật phụ lục hợp đồng" : "Thêm phụ lục hợp đồng"} onCancel={onClose} onOk={() => form.submit()} confirmLoading={mutation.isPending} destroyOnHidden><Form form={form} layout="vertical" size="small" onFinish={(values) => mutation.mutate(values)}>
    <div className="charter-form-grid three"><Form.Item name="contractId" label="Hợp đồng" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={(baseOptions.contracts.data ?? []).map((item) => ({ value: item.id, label: `${item.contractNo} - ${item.owner?.name || ""}` }))} onChange={onContractChange} /></Form.Item><Form.Item name="appendixNo" label="Số phụ lục" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="appendixDate" label="Ngày phụ lục" rules={[{ required: true }]}><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item>
    <Form.Item name="vesselId" label="Tàu"><Select showSearch allowClear optionFilterProp="label" disabled={!ownerId} loading={baseOptions.vessels.isLoading} options={(baseOptions.vessels.data ?? []).map(compactVessel)} /></Form.Item><Form.Item name="productId" label="Sản phẩm"><Select showSearch allowClear optionFilterProp="label" options={(baseOptions.products.data ?? []).map((item: any) => ({ value: item.id, label: `${item.code ? `${item.code} - ` : ""}${item.name}` }))} /></Form.Item><Form.Item name="receivingWarehouseId" label="Kho nhận"><Select showSearch allowClear optionFilterProp="label" options={(baseOptions.warehouses.data ?? []).map((item: any) => ({ value: item.id, label: `${item.code} - ${item.name}` }))} /></Form.Item>
    <Form.Item name="cargoName" label="Tên hàng"><Input /></Form.Item><Form.Item name="plannedQty" label="Số lượng"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item><Form.Item name="plannedQtyUnit" label="Đơn vị"><Select options={[{ value: "LITER", label: "Lít" }, { value: "KG", label: "Kg" }, { value: "MT", label: "Tấn" }]} /></Form.Item><Form.Item name="qtyTolerancePercent" label="Dung sai %"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item><Form.Item name="loadingPort" label="Cảng xếp"><Input /></Form.Item><Form.Item name="dischargePort" label="Cảng dỡ"><Input /></Form.Item><Form.Item name="laycanFrom" label="Laycan từ"><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item><Form.Item name="laycanTo" label="Laycan đến"><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item><Form.Item name="freightRateVndPerLiter" label="Giá thuê VND/lít"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item><Form.Item name="lossRatePercent" label="Hao hụt %"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item><Form.Item name="qtyBasis" label="Cơ sở số lượng"><Select options={[{ value: "V15", label: "V15" }, { value: "ACTUAL", label: "Thực tế" }]} /></Form.Item><Form.Item name="vatIncluded" label="Giá gồm VAT" valuePropName="checked"><Switch size="small" /></Form.Item><Form.Item name="vatRate" label="VAT %"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item><Form.Item name="deliveryMethod" label="Phương thức giao"><Input /></Form.Item></div>
    <Form.Item name="paymentTermText" label="Điều khoản thanh toán"><Input /></Form.Item><Form.Item name="fileUrl" label="File phụ lục"><FileUploadField folder="operations/charter-appendices" /></Form.Item><Form.Item name="note" label="Ghi chú"><Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} /></Form.Item>
  </Form></Modal>;
};

export const ShipCharterAppendixListPage: React.FC = () => {
  const navigate = useNavigate(); const queryClient = useQueryClient(); const [page, setPage] = useState(1); const [pageSize, setPageSize] = useState(20); const [keyword, setKeyword] = useState(""); const [editing, setEditing] = useState<ShipCharterAppendix>(); const [open, setOpen] = useState(false);
  const query = useQuery<PagedResult<ShipCharterAppendix>>({ queryKey: ["operations", "charter-appendices", { page, pageSize, keyword }], queryFn: () => operationsApi.charterAppendices({ page, pageSize, keyword }), placeholderData: (prev) => prev }); const refresh = async () => queryClient.invalidateQueries({ queryKey: ["operations", "charter-appendices"] });
  return <main className="charter-page"><WorkflowPageHeader title="Phụ lục hợp đồng thuê tàu" subtitle="Điều kiện chính thức theo từng chuyến tàu." action={<Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(undefined); setOpen(true); }}>Thêm phụ lục</Button>} /><div className="charter-toolbar"><Input.Search size="small" allowClear placeholder="Tìm số phụ lục" style={{ width: 340 }} onSearch={(value) => { setKeyword(value.trim()); setPage(1); }} /><RefreshButton loading={query.isFetching} onClick={refresh} /></div><div className="charter-table"><Table<ShipCharterAppendix> size="small" rowKey="id" loading={query.isLoading || query.isFetching} dataSource={query.data?.items ?? []} onRow={(row) => ({ onClick: () => navigate(`/operations/charter-appendices/${row.id}`) })} pagination={{ current: page, pageSize, total: query.data?.total ?? 0, showSizeChanger: true, onChange: (p, ps) => { setPage(p); setPageSize(ps); } }} columns={[
    { title: "Số phụ lục", dataIndex: "appendixNo", width: 160, fixed: "left" }, { title: "Hợp đồng", render: (_, row) => row.contract?.contractNo || "-", width: 160 }, { title: "Chủ tàu", render: (_, row) => row.contract?.owner?.name || "-", ellipsis: true }, { title: "Tàu", render: (_, row) => row.vessel?.name || "-", width: 160 }, { title: "Tuyến", render: (_, row) => `${row.loadingPort || "-"} → ${row.dischargePort || "-"}`, width: 260 }, { title: "Laycan", render: (_, row) => `${dateLabel(row.laycanFrom)} - ${dateLabel(row.laycanTo)}`, width: 220 }, { title: "Giá VND/lít", dataIndex: "freightRateVndPerLiter", width: 140, align: "right", render: numberLabel }, { title: "File", width: 70, render: (_, row) => row.fileUrl ? <Tag color="green">Có</Tag> : <Tag color="red">Thiếu</Tag> }, { title: "", width: 50, fixed: "right", render: (_, row) => <Button size="small" type="text" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); setEditing(row); setOpen(true); }} /> },
  ]} scroll={{ x: 1450 }} /></div><AppendixModal open={open} row={editing} onClose={() => setOpen(false)} onSaved={refresh} /></main>;
};

export const ShipCharterAppendixDetailPage: React.FC = () => {
  const { id } = useParams(); const navigate = useNavigate(); const queryClient = useQueryClient(); const [open, setOpen] = useState(false); const query = useQuery<ShipCharterAppendix>({ queryKey: ["operations", "charter-appendix", id], queryFn: () => operationsApi.charterAppendix(id!), enabled: Boolean(id) }); const row = query.data;
  if (!row) return <main className="charter-page"><Alert type={query.isError ? "error" : "info"} showIcon message={query.isError ? "Không tải được phụ lục" : "Đang tải phụ lục..."} /></main>;
  return <main className="charter-page"><WorkflowPageHeader title={row.appendixNo} subtitle={`Hợp đồng ${row.contract?.contractNo || "-"}`} action={<><Button size="small" icon={<ArrowLeftOutlined />} onClick={() => navigate("/operations/charter-appendices")}>Danh sách</Button><Button size="small" type="primary" icon={<EditOutlined />} onClick={() => setOpen(true)}>Sửa</Button></>} /><div className="charter-detail-summary"><div className="charter-summary-item"><span>Chủ tàu</span><strong>{row.contract?.owner?.name || "-"}</strong></div><div className="charter-summary-item"><span>Tàu</span><strong>{row.vessel?.name || "-"}</strong></div><div className="charter-summary-item"><span>Số lượng</span><strong>{numberLabel(row.plannedQty)} {row.plannedQtyUnit}</strong></div><div className="charter-summary-item"><span>Giá thuê</span><strong>{numberLabel(row.freightRateVndPerLiter)}</strong></div></div><section className="charter-detail-section"><Descriptions size="small" bordered column={{ xs: 1, md: 2, xl: 3 }}><Descriptions.Item label="Ngày phụ lục">{dateLabel(row.appendixDate)}</Descriptions.Item><Descriptions.Item label="Hàng hóa">{row.product?.name || row.cargoName || "-"}</Descriptions.Item><Descriptions.Item label="Kho nhận">{row.receivingWarehouse?.name || "-"}</Descriptions.Item><Descriptions.Item label="Tuyến">{row.loadingPort || "-"} → {row.dischargePort || "-"}</Descriptions.Item><Descriptions.Item label="Laycan">{dateLabel(row.laycanFrom)} - {dateLabel(row.laycanTo)}</Descriptions.Item><Descriptions.Item label="Dung sai">{numberLabel(row.qtyTolerancePercent)}%</Descriptions.Item><Descriptions.Item label="Hao hụt">{numberLabel(row.lossRatePercent)}%</Descriptions.Item><Descriptions.Item label="Cơ sở số lượng">{row.qtyBasis}</Descriptions.Item><Descriptions.Item label="VAT">{row.vatIncluded ? `Đã gồm${row.vatRate ? ` ${row.vatRate}%` : ""}` : "Chưa gồm"}</Descriptions.Item><Descriptions.Item label="Điều khoản thanh toán">{row.paymentTermText || "-"}</Descriptions.Item><Descriptions.Item label="File">{row.fileUrl ? <Typography.Link href={row.fileUrl} target="_blank">Xem file ký</Typography.Link> : <Tag color="red">Thiếu file</Tag>}</Descriptions.Item><Descriptions.Item label="Ghi chú">{row.note || "-"}</Descriptions.Item></Descriptions></section><AppendixModal open={open} row={row} onClose={() => setOpen(false)} onSaved={async () => queryClient.invalidateQueries({ queryKey: ["operations", "charter-appendix", id] })} /></main>;
};

const FreightRateModal: React.FC<{ open: boolean; row?: ShipFreightRate; onClose: () => void; onSaved: () => void }> = ({ open, row, onClose, onSaved }) => {
  const [form] = Form.useForm(); const ownerId = Form.useWatch("ownerCustomerId", form); const options = useCharterOptions(ownerId); const mutation = useMutation({ mutationFn: (values: any) => operationsApi.saveFreightRate(normalizeFormValues(values), row?.id), onSuccess: () => { notify.success("Đã lưu bảng giá thuê tàu."); onSaved(); onClose(); } });
  useEffect(() => { if (!open) return; form.resetFields(); form.setFieldsValue(row ? toFormValues(row as any) : { rateCode: `FR-${dayjs().format("YYYYMMDD-HHmm")}`, sourceType: "MANUAL", qtyBasis: "V15", rateUnit: "VND_PER_LITER", currency: "VND", vatIncluded: false, status: "ACTIVE", effectiveFrom: dayjs() }); }, [open, row, form]);
  return <Modal open={open} width={900} title={row ? "Cập nhật bảng giá" : "Thêm bảng giá thuê tàu"} onCancel={onClose} onOk={() => form.submit()} confirmLoading={mutation.isPending} destroyOnHidden><Form form={form} layout="vertical" size="small" onFinish={(values) => mutation.mutate(values)}><div className="charter-form-grid three"><Form.Item name="rateCode" label="Mã bảng giá" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="sourceType" label="Nguồn giá"><Select options={(["MANUAL", "CONTRACT", "APPENDIX"] as const).map((value) => ({ value, label: SOURCE_LABELS[value] }))} /></Form.Item><Form.Item name="status" label="Trạng thái"><Select options={Object.entries(FREIGHT_STATUS_LABELS).map(([value, label]) => ({ value, label }))} /></Form.Item><Form.Item name="ownerCustomerId" label="Chủ tàu"><CustomerSelect size="small" customerRole="SHIP_OWNER" /></Form.Item><Form.Item name="vesselId" label="Tàu"><Select showSearch allowClear disabled={!ownerId} optionFilterProp="label" options={(options.vessels.data ?? []).map(compactVessel)} /></Form.Item><Form.Item name="contractId" label="Hợp đồng"><Select showSearch allowClear optionFilterProp="label" options={(options.contracts.data ?? []).map((item) => ({ value: item.id, label: item.contractNo }))} /></Form.Item><Form.Item name="routeName" label="Tên tuyến"><Input /></Form.Item><Form.Item name="loadingPort" label="Cảng xếp" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="dischargePort" label="Cảng dỡ" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="productGroup" label="Nhóm hàng"><Input /></Form.Item><Form.Item name="productId" label="Sản phẩm"><Select showSearch allowClear optionFilterProp="label" options={(options.products.data ?? []).map((item: any) => ({ value: item.id, label: `${item.code ? `${item.code} - ` : ""}${item.name}` }))} /></Form.Item><Form.Item name="qtyBasis" label="Cơ sở số lượng"><Select options={[{ value: "V15", label: "V15" }, { value: "ACTUAL", label: "Thực tế" }]} /></Form.Item><Form.Item name="freightRateVndPerLiter" label="Giá VND/lít" rules={[{ required: true }]}><InputNumber min={0} style={{ width: "100%" }} /></Form.Item><Form.Item name="allowedLossRatePercent" label="Hao hụt cho phép %"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item><Form.Item name="vatRate" label="VAT %"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item><Form.Item name="vatIncluded" label="Giá gồm VAT" valuePropName="checked"><Switch size="small" /></Form.Item><Form.Item name="effectiveFrom" label="Hiệu lực từ" rules={[{ required: true }]}><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item><Form.Item name="effectiveTo" label="Hiệu lực đến"><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item></div><Form.Item name="note" label="Ghi chú"><Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} /></Form.Item></Form></Modal>;
};

export const ShipFreightRatePage: React.FC = () => {
  const queryClient = useQueryClient(); const [page, setPage] = useState(1); const [pageSize, setPageSize] = useState(20); const [keyword, setKeyword] = useState(""); const [editing, setEditing] = useState<ShipFreightRate>(); const [open, setOpen] = useState(false); const [status, setStatus] = useState<string>(); const [filterOpen, setFilterOpen] = useState(false);
  const query = useQuery<PagedResult<ShipFreightRate>>({ queryKey: ["operations", "freight-rates", { page, pageSize, keyword, status }], queryFn: () => operationsApi.freightRates({ page, pageSize, keyword, status }), placeholderData: (prev) => prev }); const refresh = async () => queryClient.invalidateQueries({ queryKey: ["operations", "freight-rates"] });
  const filter = <div className="charter-filter-panel"><Typography.Text strong>Trạng thái</Typography.Text><Select size="small" allowClear value={status} style={{ width: "100%", marginTop: 6 }} options={Object.entries(FREIGHT_STATUS_LABELS).map(([value, label]) => ({ value, label }))} onChange={(value) => { setStatus(value); setPage(1); setFilterOpen(false); }} /></div>;
  return <main className="charter-page"><WorkflowPageHeader title="Bảng giá thuê tàu" subtitle="Giá cước mặc định theo tuyến, chủ tàu, tàu và mặt hàng." action={<Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(undefined); setOpen(true); }}>Thêm bảng giá</Button>} /><div className="charter-toolbar"><Input.Search size="small" allowClear placeholder="Tìm mã giá, tuyến hoặc nhóm hàng" style={{ width: 360 }} onSearch={(value) => { setKeyword(value.trim()); setPage(1); }} /><Space><FilterButton count={Number(Boolean(status))} open={filterOpen} onOpenChange={setFilterOpen} content={filter} /><RefreshButton loading={query.isFetching} onClick={refresh} /></Space></div><div className="charter-filter-tags">{status ? <Tag closable onClose={() => setStatus(undefined)}>Trạng thái: {FREIGHT_STATUS_LABELS[status as keyof typeof FREIGHT_STATUS_LABELS]}</Tag> : null}</div><div className="charter-table"><Table<ShipFreightRate> size="small" rowKey="id" loading={query.isLoading || query.isFetching} dataSource={query.data?.items ?? []} pagination={{ current: page, pageSize, total: query.data?.total ?? 0, showSizeChanger: true, onChange: (p, ps) => { setPage(p); setPageSize(ps); } }} columns={[
    { title: "Mã giá", dataIndex: "rateCode", width: 150, fixed: "left" }, { title: "Nguồn", dataIndex: "sourceType", width: 100, render: (value) => SOURCE_LABELS[value as keyof typeof SOURCE_LABELS] }, { title: "Tuyến", width: 280, render: (_, row) => row.routeName || `${row.loadingPort} → ${row.dischargePort}` }, { title: "Chủ tàu / Tàu", width: 230, render: (_, row) => `${row.owner?.name || "Áp dụng chung"}${row.vessel?.name ? ` / ${row.vessel.name}` : ""}` }, { title: "Hàng hóa", width: 170, render: (_, row) => row.product?.name || row.productGroup || "Tất cả" }, { title: "Giá VND/lít", dataIndex: "freightRateVndPerLiter", width: 140, align: "right", render: numberLabel }, { title: "Hao hụt %", dataIndex: "allowedLossRatePercent", width: 110, align: "right", render: numberLabel }, { title: "Hiệu lực", width: 220, render: (_, row) => `${dateLabel(row.effectiveFrom)} - ${dateLabel(row.effectiveTo)}` }, { title: "Trạng thái", width: 120, render: (_, row) => <WorkflowStatusTag status={row.status} labels={FREIGHT_STATUS_LABELS} /> }, { title: "", width: 50, fixed: "right", render: (_, row) => <Button size="small" type="text" icon={<EditOutlined />} onClick={() => { setEditing(row); setOpen(true); }} /> },
  ]} scroll={{ x: 1550 }} /></div><FreightRateModal open={open} row={editing} onClose={() => setOpen(false)} onSaved={refresh} /></main>;
};

type RegistrationKind = "insurance" | "inspection" | "agent";
const registrationConfig = {
  insurance: { title: "Bảo hiểm hàng hóa", subtitle: "Đơn bảo hiểm và phí bảo hiểm theo chuyến.", queryKey: "charter-insurances", query: operationsApi.charterInsurances, company: "insuranceCompany", amount: "premiumAmount", amountLabel: "Phí bảo hiểm", document: "policyNo" },
  inspection: { title: "Đăng ký giám định", subtitle: "Đơn vị, kế hoạch và chứng thư giám định.", queryKey: "charter-inspections", query: operationsApi.charterInspections, company: "inspectionCompany", amount: "feeAmount", amountLabel: "Phí giám định", document: "certificateNo" },
  agent: { title: "Đăng ký đại lý tàu", subtitle: "Đại lý phụ trách và phí đại lý theo chuyến.", queryKey: "shipping-agent-registrations", query: operationsApi.shippingAgentRegistrations, company: "agent", amount: "agencyFee", amountLabel: "Phí đại lý", document: "" },
} as const;

const RegistrationListPage: React.FC<{ kind: RegistrationKind }> = ({ kind }) => {
  const navigate = useNavigate(); const config = registrationConfig[kind]; const [page, setPage] = useState(1); const [pageSize, setPageSize] = useState(20); const [keyword, setKeyword] = useState(""); const [status, setStatus] = useState<string>(); const [filterOpen, setFilterOpen] = useState(false);
  const query = useQuery<any>({ queryKey: ["operations", config.queryKey, { page, pageSize, keyword, status }], queryFn: () => config.query({ page, pageSize, keyword, status }), placeholderData: (prev) => prev });
  const filter = <div className="charter-filter-panel"><Typography.Text strong>Trạng thái</Typography.Text><Select size="small" allowClear value={status} style={{ width: "100%", marginTop: 6 }} options={Object.entries(REGISTRATION_STATUS_LABELS).map(([value, label]) => ({ value, label }))} onChange={(value) => { setStatus(value); setPage(1); setFilterOpen(false); }} /></div>;
  return <main className="charter-page"><WorkflowPageHeader title={config.title} subtitle={config.subtitle} action={<Button size="small" icon={<SafetyCertificateOutlined />} onClick={() => navigate("/operations/charter-orders")}>Chọn từ đơn thuê tàu</Button>} /><div className="charter-toolbar"><Input.Search size="small" allowClear placeholder="Tìm mã đơn hoặc đơn vị" style={{ width: 340 }} onSearch={(value) => { setKeyword(value.trim()); setPage(1); }} /><FilterButton count={Number(Boolean(status))} open={filterOpen} onOpenChange={setFilterOpen} content={filter} /></div><div className="charter-filter-tags">{status ? <Tag closable onClose={() => setStatus(undefined)}>Trạng thái: {REGISTRATION_STATUS_LABELS[status as keyof typeof REGISTRATION_STATUS_LABELS]}</Tag> : null}</div><div className="charter-table"><Table<any> size="small" rowKey="id" loading={query.isLoading || query.isFetching} dataSource={query.data?.items ?? []} onRow={(row) => ({ onClick: () => navigate(`/operations/charter-orders/${row.charterOrderId}`) })} pagination={{ current: page, pageSize, total: query.data?.total ?? 0, showSizeChanger: true, onChange: (p, ps) => { setPage(p); setPageSize(ps); } }} columns={[
    { title: "Đơn thuê tàu", render: (_, row) => row.charterOrder?.charterOrderNo || "-", width: 170 }, { title: "Đơn vị", render: (_, row) => row[config.company]?.name || "-" }, ...(config.document ? [{ title: kind === "insurance" ? "Số đơn bảo hiểm" : "Số chứng thư", dataIndex: config.document, width: 180, render: (value: any) => value || "-" }] : []), { title: config.amountLabel, dataIndex: config.amount, width: 150, align: "right" as const, render: numberLabel }, { title: "Ngày đăng ký", dataIndex: kind === "insurance" ? "policyDate" : "registeredDate", width: 120, render: dateLabel }, { title: "File", width: 80, render: (_, row) => row.fileUrl ? <Typography.Link href={row.fileUrl} target="_blank" onClick={(event) => event.stopPropagation()}>Xem</Typography.Link> : "-" }, { title: "Trạng thái", width: 120, render: (_, row) => <WorkflowStatusTag status={row.status} labels={REGISTRATION_STATUS_LABELS} /> },
  ]} /></div></main>;
};

export const ShipCharterInsuranceListPage = () => <RegistrationListPage kind="insurance" />;
export const ShipCharterInspectionListPage = () => <RegistrationListPage kind="inspection" />;
export const ShippingAgentRegistrationListPage = () => <RegistrationListPage kind="agent" />;
