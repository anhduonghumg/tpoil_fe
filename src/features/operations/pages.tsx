import React, { useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Typography,
  DatePicker,
  Alert,
  Drawer,
} from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { CustomerSelect } from "../../shared/ui/CustomerSelect";
import type { CustomerSelectRole } from "../../shared/ui/CustomerSelect";
import { notify } from "../../shared/lib/notification";
import { http } from "../../shared/lib/http";
import { operationsApi } from "./api";
import { ProductsApi } from "../products/api";
import { SupplierLocationsApi } from "../supplierLocations/api";
import {
  decodeWarehouseSource,
  WarehouseSourceSelect,
} from "../supplierLocations/ui/WarehouseSourceSelect";
import {
  useOperationDetail,
  useOperationList,
  useOperationMutation,
} from "./hooks";
import {
  FileUploadField,
  StatusBadge,
} from "./components";

export {
  ShipOwnerListPage,
  VesselDetailPage,
  VesselDocumentListPage,
  VesselListPage,
} from "./ship-master-pages";

const n = (value: unknown) => Number(value || 0).toLocaleString("vi-VN");
const date = (value?: string) => (value ? dayjs(value).format("DD/MM/YYYY") : "-");

const labelMaps: Record<string, Record<string, string>> = {
  sourceType: {
    DIRECT: "Tạo trực tiếp",
    FROM_TERM: "Từ đơn TERM",
    PURCHASE_ORDER: "Đơn mua hàng",
    SALES_ORDER: "Đơn bán hàng",
    GOODS_RECEIPT: "Phiếu nhập hàng",
    WAREHOUSE_TRANSFER: "Chuyển kho",
  },
  status: {
    DRAFT: "Nháp",
    WAITING_CONFIRMATION: "Chờ xác nhận",
    CONFIRMED: "Đã xác nhận",
    IN_PROGRESS: "Đang thực hiện",
    COMPLETED: "Hoàn tất",
    CANCELLED: "Đã hủy",
    REGISTERED: "Đã đăng ký",
    ACTIVE: "Đang hiệu lực",
    EXPIRED: "Hết hiệu lực",
    TERMINATED: "Đã chấm dứt",
    IN_TRANSIT: "Đang vận chuyển",
    ASSIGNED: "Đã phân công",
    LOADING: "Đang bốc hàng",
    DELIVERED: "Đã giao",
    CLOSED: "Đã đóng",
  },
  inspectionType: {
    QUANTITY: "Số lượng",
    QUALITY: "Chất lượng",
    BOTH: "Số lượng và chất lượng",
  },
  documentType: {
    REGISTRATION: "Đăng ký xe",
    INSPECTION: "Đăng kiểm",
    INSURANCE: "Bảo hiểm",
    DRIVER_LICENSE: "Giấy phép lái xe",
    ID_CARD: "CCCD",
    TRAINING_CERTIFICATE: "Chứng chỉ đào tạo",
    OTHER: "Khác",
  },
};

const labelOf = (group: keyof typeof labelMaps, value?: string) =>
  value ? labelMaps[group]?.[value] ?? value : "-";

const optionsOf = (group: keyof typeof labelMaps, values: string[]) =>
  values.map((value) => ({ value, label: labelOf(group, value) }));

const PageTitle: React.FC<{
  title: string;
  action?: React.ReactNode;
}> = ({ title, action }) => (
  <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 16 }}>
    <Typography.Title level={3} style={{ margin: 0 }}>
      {title}
    </Typography.Title>
    {action}
  </Space>
);

type Field = {
  name: string;
  label: string;
  kind?: "text" | "number" | "date" | "customer" | "file" | "select";
  required?: boolean;
  options?: Array<string | { value: string; label: string }>;
  customerRole?: CustomerSelectRole;
};

const DynamicField: React.FC<{ field: Field }> = ({ field }) => {
  const input =
    field.kind === "number" ? (
      <InputNumber style={{ width: "100%" }} />
    ) : field.kind === "date" ? (
      <DatePicker style={{ width: "100%" }} />
    ) : field.kind === "customer" ? (
      <CustomerSelect customerRole={field.customerRole} style={{ width: "100%" }} />
    ) : field.kind === "file" ? (
      <FileUploadField />
    ) : field.kind === "select" ? (
      <Select options={(field.options || []).map((x) => (typeof x === "string" ? { value: x, label: x } : x))} />
    ) : (
      <Input />
    );
  return (
    <Col xs={24} md={12}>
      <Form.Item name={field.name} label={field.label} rules={[{ required: field.required }]}>
        {input}
      </Form.Item>
    </Col>
  );
};

const normalizeForm = (values: Record<string, any>, fields: Field[]) =>
  Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key,
      fields.find((x) => x.name === key)?.kind === "date" && value
        ? value.format("YYYY-MM-DD")
        : value,
    ])
  );

const CrudPage: React.FC<{
  title: string;
  resource: Parameters<typeof useOperationList>[0];
  columns: any[];
  fields: Field[];
  save: (data: any, id?: string) => Promise<any>;
  onRow?: (row: any) => void;
  extraAction?: React.ReactNode;
}> = ({ title, resource, columns, fields, save, onRow, extraAction }) => {
  const [keyword, setKeyword] = useState("");
  const [editing, setEditing] = useState<any>();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const query = useOperationList(resource, { page: 1, pageSize: 100, keyword });
  const mutation = useOperationMutation<{ data: any; id?: string }>(({ data, id }) => save(data, id));
  const items = query.data?.items ?? query.data ?? [];
  const openForm = (row?: any) => {
    setEditing(row);
    form.resetFields();
    form.setFieldsValue(
      row
        ? Object.fromEntries(
            fields.map((field) => [
              field.name,
              field.kind === "date" && row[field.name] ? dayjs(row[field.name]) : row[field.name],
            ])
          )
        : {}
    );
    setOpen(true);
  };
  const submit = async () => {
    const values = await form.validateFields();
    await mutation.mutateAsync({ data: normalizeForm(values, fields), id: editing?.id });
    notify.success("Đã lưu dữ liệu.");
    setOpen(false);
  };
  return (
    <>
      <PageTitle
        title={title}
        action={<Space>{extraAction}<Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()}>Tạo mới</Button></Space>}
      />
      <Card>
        <Input.Search
          placeholder="Tìm kiếm"
          allowClear
          onSearch={setKeyword}
          style={{ width: 320, marginBottom: 16 }}
        />
        <Table
          rowKey="id"
          loading={query.isFetching}
          dataSource={items}
          columns={[
            ...columns,
            {
              title: "Thao tác",
              width: 120,
              render: (_: unknown, row: any) => (
                <Button type="link" onClick={(event) => { event.stopPropagation(); openForm(row); }}>
                  Sửa
                </Button>
              ),
            },
          ]}
          onRow={(row) => ({ onClick: () => onRow?.(row) })}
          pagination={{ pageSize: 20 }}
        />
      </Card>
      <Modal
        open={open}
        title={editing ? `Cập nhật ${title}` : `Tạo ${title}`}
        onCancel={() => setOpen(false)}
        onOk={submit}
        confirmLoading={mutation.isPending}
        width={820}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>{fields.map((field) => <DynamicField key={field.name} field={field} />)}</Row>
        </Form>
      </Modal>
    </>
  );
};

export const ShipCharterContractListPage = () => (
  <CrudPage
    title="Hợp đồng thuê tàu"
    resource="charterContracts"
    save={operationsApi.saveCharterContract}
    columns={[
      { title: "Số hợp đồng", dataIndex: "contractNo" },
      { title: "Chủ tàu", render: (_: any, x: any) => x.owner?.name },
      { title: "Ngày ký", render: (_: any, x: any) => date(x.signedDate) },
      { title: "Hiệu lực", render: (_: any, x: any) => `${date(x.effectiveFrom)} - ${date(x.effectiveTo)}` },
    ]}
    fields={[
      { name: "contractNo", label: "Số hợp đồng", required: true },
      { name: "ownerCustomerId", label: "Chủ tàu", kind: "customer", required: true },
      { name: "signedDate", label: "Ngày ký", kind: "date", required: true },
      { name: "effectiveFrom", label: "Hiệu lực từ", kind: "date", required: true },
      { name: "effectiveTo", label: "Hiệu lực đến", kind: "date" },
      { name: "fileUrl", label: "File hợp đồng", kind: "file" },
      { name: "note", label: "Ghi chú" },
    ]}
  />
);
export const ShipCharterContractFormPage = ShipCharterContractListPage;

export const ShipCharterAppendixListPage = () => (
  <CrudPage
    title="Phụ lục hợp đồng thuê tàu"
    resource="charterAppendices"
    save={operationsApi.saveCharterAppendix}
    columns={[
      { title: "Số phụ lục", dataIndex: "appendixNo" },
      { title: "Hợp đồng", render: (_: any, x: any) => x.contract?.contractNo },
      { title: "Tàu", render: (_: any, x: any) => x.vessel?.name },
      { title: "Laycan", render: (_: any, x: any) => `${date(x.laycanFrom)} - ${date(x.laycanTo)}` },
      { title: "Giá thuê", render: (_: any, x: any) => n(x.freightRateVndPerLiter) },
    ]}
    fields={[
      { name: "contractId", label: "ID hợp đồng", required: true },
      { name: "appendixNo", label: "Số phụ lục", required: true },
      { name: "appendixDate", label: "Ngày phụ lục", kind: "date", required: true },
      { name: "vesselId", label: "ID tàu" },
      { name: "cargoName", label: "Hàng hóa" },
      { name: "plannedQty", label: "Số lượng dự kiến", kind: "number" },
      { name: "qtyTolerancePercent", label: "Dung sai %", kind: "number" },
      { name: "loadingPort", label: "Cảng xếp" },
      { name: "dischargePort", label: "Cảng dỡ" },
      { name: "laycanFrom", label: "Laycan từ", kind: "date" },
      { name: "laycanTo", label: "Laycan đến", kind: "date" },
      { name: "freightRateVndPerLiter", label: "Giá thuê VND/lít", kind: "number" },
      { name: "lossRatePercent", label: "Hao hụt %", kind: "number" },
      { name: "fileUrl", label: "File phụ lục", kind: "file" },
    ]}
  />
);

export const ShipFreightRatePage = () => (
  <CrudPage
    title="Bảng giá thuê tàu"
    resource="freightRates"
    save={operationsApi.saveFreightRate}
    columns={[
      { title: "Cảng xếp", dataIndex: "loadingPort" },
      { title: "Cảng dỡ", dataIndex: "dischargePort" },
      { title: "Nhóm hàng", dataIndex: "productGroup" },
      { title: "Giá VND/lít", render: (_: any, x: any) => n(x.freightRateVndPerLiter) },
      { title: "Hiệu lực", render: (_: any, x: any) => `${date(x.effectiveFrom)} - ${date(x.effectiveTo)}` },
    ]}
    fields={[
      { name: "ownerCustomerId", label: "Chủ tàu", kind: "customer" },
      { name: "vesselId", label: "ID tàu" },
      { name: "loadingPort", label: "Cảng xếp", required: true },
      { name: "dischargePort", label: "Cảng dỡ", required: true },
      { name: "productGroup", label: "Nhóm hàng" },
      { name: "freightRateVndPerLiter", label: "Giá VND/lít", kind: "number", required: true },
      { name: "effectiveFrom", label: "Hiệu lực từ", kind: "date", required: true },
      { name: "effectiveTo", label: "Hiệu lực đến", kind: "date" },
      { name: "note", label: "Ghi chú" },
    ]}
  />
);

export const ShipCharterOrderListPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <CrudPage
      title="Đơn thuê tàu"
      resource="charterOrders"
      save={operationsApi.saveCharterOrder}
      onRow={(row) => navigate(`/operations/charter-orders/${row.id}`)}
      columns={[
        { title: "Mã đơn", dataIndex: "charterOrderNo" },
        { title: "PO TERM", render: (_: any, x: any) => x.purchaseOrder?.orderNo || "-" },
        { title: "Tàu", render: (_: any, x: any) => x.vessel?.name || "-" },
        { title: "Hàng hóa", dataIndex: "cargoName" },
        { title: "Laycan", render: (_: any, x: any) => `${date(x.laycanFrom)} - ${date(x.laycanTo)}` },
        { title: "Trạng thái", render: (_: any, x: any) => <StatusBadge status={x.status} /> },
      ]}
      fields={[
        { name: "charterOrderNo", label: "Mã đơn", required: true },
        { name: "sourceType", label: "Nguồn", kind: "select", options: optionsOf("sourceType", ["DIRECT", "FROM_TERM"]), required: true },
        { name: "purchaseOrderId", label: "ID PO TERM" },
        { name: "termShipmentId", label: "ID chuyến tàu TERM" },
        { name: "appendixId", label: "ID phụ lục" },
        { name: "ownerCustomerId", label: "Chủ tàu", kind: "customer", required: true },
        { name: "vesselId", label: "ID tàu" },
        { name: "laycanFrom", label: "Laycan từ", kind: "date" },
        { name: "laycanTo", label: "Laycan đến", kind: "date" },
        { name: "cargoName", label: "Hàng hóa", required: true },
        { name: "plannedQty", label: "Số lượng dự kiến", kind: "number", required: true },
        { name: "loadingPort", label: "Cảng xếp", required: true },
        { name: "dischargePort", label: "Cảng dỡ", required: true },
        { name: "freightRateVndPerLiter", label: "Giá thuê VND/lít", kind: "number" },
        { name: "lossRatePercent", label: "Hao hụt %", kind: "number" },
        { name: "appendixFileUrl", label: "File phụ lục", kind: "file" },
        { name: "note", label: "Ghi chú" },
      ]}
    />
  );
};
export const ShipCharterOrderFormPage = ShipCharterOrderListPage;

const RegistrationForm: React.FC<{
  type: "insurance" | "inspection" | "agent";
  orderId: string;
}> = ({ type, orderId }) => {
  const [form] = Form.useForm();
  const mutation = useOperationMutation<any>((data) =>
    type === "insurance"
      ? operationsApi.saveInsurance(orderId, data)
      : type === "inspection"
      ? operationsApi.saveInspection(orderId, data)
      : operationsApi.saveAgent(orderId, data)
  );
  const companyField =
    type === "insurance" ? "insuranceCompanyId" : type === "inspection" ? "inspectionCompanyId" : "agentCustomerId";
  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={async (values) => {
        const payload = Object.fromEntries(
          Object.entries(values).map(([k, v]: any) => [k, dayjs.isDayjs(v) ? v.format("YYYY-MM-DD") : v])
        );
        await mutation.mutateAsync(payload);
        notify.success("Đã lưu đăng ký.");
        form.resetFields();
      }}
    >
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item name={companyField} label="Đơn vị thực hiện" rules={[{ required: true }]}>
            <CustomerSelect style={{ width: "100%" }} />
          </Form.Item>
        </Col>
        {type === "insurance" && (
          <>
            <Col xs={24} md={12}><Form.Item name="policyNo" label="Số đơn bảo hiểm"><Input /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item name="premiumAmount" label="Phí bảo hiểm" rules={[{ required: true }]}><InputNumber style={{ width: "100%" }} /></Form.Item></Col>
          </>
        )}
        {type === "inspection" && (
          <>
            <Col xs={24} md={12}><Form.Item name="inspectionType" label="Loại giám định" initialValue="BOTH"><Select options={optionsOf("inspectionType", ["QUANTITY", "QUALITY", "BOTH"])} /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item name="feeAmount" label="Phí giám định"><InputNumber style={{ width: "100%" }} /></Form.Item></Col>
          </>
        )}
        {type === "agent" && (
          <Col xs={24} md={12}><Form.Item name="agencyFee" label="Phí đại lý" rules={[{ required: true }]}><InputNumber style={{ width: "100%" }} /></Form.Item></Col>
        )}
        <Col xs={24} md={12}><Form.Item name="registeredDate" label="Ngày đăng ký"><DatePicker style={{ width: "100%" }} /></Form.Item></Col>
        <Col xs={24} md={12}><Form.Item name="status" label="Trạng thái" initialValue="REGISTERED"><Select options={optionsOf("status", ["DRAFT", "REGISTERED", "CONFIRMED", "CANCELLED"])} /></Form.Item></Col>
        <Col span={24}><Form.Item name="fileUrl" label="File"><FileUploadField /></Form.Item></Col>
      </Row>
      <Button type="primary" htmlType="submit" loading={mutation.isPending}>Lưu đăng ký</Button>
    </Form>
  );
};

export const ShipCharterOrderDetailPage: React.FC = () => {
  const { id } = useParams();
  const query = useOperationDetail("charterOrder", id);
  const statusMutation = useOperationMutation<string>((status) => operationsApi.changeCharterStatus(id!, status));
  const costMutation = useOperationMutation(() => operationsApi.postTermCosts(id!));
  const row = query.data;
  if (!row) return <Card loading={query.isLoading} />;
  return (
    <>
      <PageTitle
        title={`Đơn thuê tàu ${row.charterOrderNo}`}
        action={
          <Space>
            {["WAITING_CONFIRMATION", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((status) => (
              <Button key={status} onClick={() => statusMutation.mutate(status)}>{labelOf("status", status)}</Button>
            ))}
            <Button type="primary" onClick={() => costMutation.mutate()}>Đưa chi phí vào TERM</Button>
          </Space>
        }
      />
      <Card>
        <Descriptions bordered column={{ xs: 1, md: 2, xl: 3 }}>
          <Descriptions.Item label="Trạng thái"><StatusBadge status={row.status} /></Descriptions.Item>
          <Descriptions.Item label="PO TERM">{row.purchaseOrder?.orderNo || "-"}</Descriptions.Item>
          <Descriptions.Item label="Tàu">{row.vessel?.name || "-"}</Descriptions.Item>
          <Descriptions.Item label="Chủ tàu">{row.owner?.name}</Descriptions.Item>
          <Descriptions.Item label="Laycan">{date(row.laycanFrom)} - {date(row.laycanTo)}</Descriptions.Item>
          <Descriptions.Item label="Hàng hóa">{row.cargoName}</Descriptions.Item>
          <Descriptions.Item label="Số lượng">{n(row.plannedQty)}</Descriptions.Item>
          <Descriptions.Item label="Hành trình">{row.loadingPort} → {row.dischargePort}</Descriptions.Item>
          <Descriptions.Item label="Giá thuê">{n(row.freightRateVndPerLiter)} VND/lít</Descriptions.Item>
        </Descriptions>
      </Card>
      <Divider />
      <Card>
        <Tabs
          items={[
            { key: "insurance", label: `Bảo hiểm (${row.insurances?.length || 0})`, children: <RegistrationForm type="insurance" orderId={id!} /> },
            { key: "inspection", label: `Giám định (${row.inspections?.length || 0})`, children: <RegistrationForm type="inspection" orderId={id!} /> },
            { key: "agent", label: `Đại lý tàu (${row.agentRegistrations?.length || 0})`, children: <RegistrationForm type="agent" orderId={id!} /> },
          ]}
        />
      </Card>
    </>
  );
};

export const StorageRentalContractPage = () => (
  <CrudPage
    title="Hợp đồng thuê kho"
    resource="storageContracts"
    save={(data, id) => operationsApi.saveStorageContract({
      ...data,
      supplierLocationIds: data.supplierLocationIds ? String(data.supplierLocationIds).split(",").map((x) => x.trim()) : [],
      lossRates: data.lossRatesJson ? JSON.parse(data.lossRatesJson) : [],
      feeTiers: data.feeTiersJson ? JSON.parse(data.feeTiersJson) : [],
      lossRatesJson: undefined,
      feeTiersJson: undefined,
    }, id)}
    columns={[
      { title: "Số hợp đồng", dataIndex: "contractNo" },
      { title: "Bên cho thuê", render: (_: any, x: any) => x.lessor?.name },
      { title: "Hiệu lực", render: (_: any, x: any) => `${date(x.effectiveFrom)} - ${date(x.effectiveTo)}` },
      { title: "Trạng thái", render: (_: any, x: any) => <StatusBadge status={x.status} /> },
    ]}
    fields={[
      { name: "contractNo", label: "Số hợp đồng", required: true },
      { name: "lessorCustomerId", label: "Bên cho thuê", kind: "customer", required: true },
      { name: "effectiveFrom", label: "Hiệu lực từ", kind: "date" },
      { name: "effectiveTo", label: "Hiệu lực đến", kind: "date" },
      { name: "status", label: "Trạng thái", kind: "select", options: optionsOf("status", ["DRAFT", "ACTIVE", "EXPIRED", "TERMINATED"]) },
      { name: "supplierLocationIds", label: "ID kho (phân cách bằng dấu phẩy)", required: true },
      { name: "lossRatesJson", label: "Tỷ lệ hao hụt (JSON: productGroup, storageLossRatePercent, issueLossRatePercent)" },
      { name: "feeTiersJson", label: "Bậc giá thuê (JSON: conditionText, unitPriceVndPerLiter)" },
      { name: "fileUrl", label: "File hợp đồng", kind: "file" },
      { name: "note", label: "Ghi chú" },
    ]}
  />
);
export const StorageRentalContractFormPage = StorageRentalContractPage;

type MatrixMetric =
  | "total"
  | "exportable"
  | "temporary"
  | "nonExportable"
  | "accountingQty"
  | "accountingValue";

function numberOf(value: unknown) {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
}

function sourceLabel(source?: string) {
  if (source === "COMMERCIAL_LOT") return "Lô đã hóa đơn";
  if (source === "COMMERCIAL_LOT_ORDER") return "Đơn lô chờ hóa đơn";
  return "Tồn thực tế";
}

function supplierIdOf(row: any) {
  return row.supplier?.id ?? row.ownerCustomer?.id ?? "INTERNAL";
}

function supplierCodeOf(row: any) {
  return row.supplier?.code ?? row.ownerCustomer?.code ?? "NỘI BỘ";
}

function metricValue(row: any, metric: MatrixMetric) {
  if (metric === "total") {
    return (
      numberOf(row.exportableQty) +
      numberOf(row.temporaryExportQty) +
      numberOf(row.nonExportableQty)
    );
  }
  if (metric === "exportable") return numberOf(row.exportableQty);
  if (metric === "temporary") return numberOf(row.temporaryExportQty);
  if (metric === "nonExportable") return numberOf(row.nonExportableQty);
  if (metric === "accountingQty") return numberOf(row.accountingQty);
  return numberOf(row.accountingValue);
}

function inventoryMatrix(rows: any[], metric: MatrixMetric) {
  const suppliers = new Map<
    string,
    { id: string; name: string; products: Map<string, { code?: string; name: string }> }
  >();
  const warehouses = new Map<string, any>();

  rows.forEach((row) => {
    const warehouseId = row.supplierLocation?.id ?? row.supplierLocationId;
    const productId = row.product?.id ?? row.productId;
    if (!warehouseId || !productId) return;

    const supplierId = supplierIdOf(row);
    const supplierName = supplierCodeOf(row);
    const productName = row.product?.name ?? "Chưa xác định";
    const cellKey = `m:${supplierId}:${productId}`;
    const supplier = suppliers.get(supplierId) ?? {
      id: supplierId,
      name: supplierName,
      products: new Map<string, string>(),
    };
    supplier.products.set(productId, {
      code: row.product?.code ?? undefined,
      name: productName,
    });
    suppliers.set(supplierId, supplier);

    const warehouse = warehouses.get(warehouseId) ?? {
      id: warehouseId,
      warehouseName: row.supplierLocation?.name ?? "Chưa xác định",
    };
    warehouse[cellKey] = numberOf(warehouse[cellKey]) + metricValue(row, metric);
    warehouses.set(warehouseId, warehouse);
  });

  const supplierColumns = [...suppliers.values()]
    .sort((a, b) => a.name.localeCompare(b.name, "vi"))
    .map((supplier) => ({
      title: supplier.name,
      children: [...supplier.products.entries()]
        .sort(([, a], [, b]) => (a.code ?? a.name).localeCompare(b.code ?? b.name, "vi"))
        .map(([productId, product]) => ({
          title: <span title={product.name}>{product.code ?? product.name}</span>,
          dataIndex: `m:${supplier.id}:${productId}`,
          width: 100,
          align: "right" as const,
          render: (value: unknown) => (numberOf(value) ? n(value) : ""),
        })),
    }));

  return {
    columns: [
      {
        title: "Kho / Nhà cung cấp",
        dataIndex: "warehouseName",
        fixed: "left" as const,
        width: 210,
      },
      ...supplierColumns,
    ],
    rows: [...warehouses.values()].sort((a, b) =>
      a.warehouseName.localeCompare(b.warehouseName, "vi"),
    ),
  };
}

function useMatrixFilters(rows: any[]) {
  const [warehouseIds, setWarehouseIds] = useState<string[]>([]);
  const [supplierIds, setSupplierIds] = useState<string[]>([]);
  const [productKeyword, setProductKeyword] = useState("");

  const options = useMemo(() => {
    const warehouses = new Map<string, string>();
    const suppliers = new Map<string, string>();
    rows.forEach((row) => {
      const warehouseId = row.supplierLocation?.id ?? row.supplierLocationId;
      if (warehouseId) warehouses.set(warehouseId, row.supplierLocation?.name ?? "Chưa xác định kho");
      suppliers.set(supplierIdOf(row), supplierCodeOf(row));
    });
    const toOptions = (items: Map<string, string>) =>
      [...items.entries()]
        .sort(([, a], [, b]) => a.localeCompare(b, "vi"))
        .map(([value, label]) => ({ value, label }));
    return { warehouses: toOptions(warehouses), suppliers: toOptions(suppliers) };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const keyword = productKeyword.trim().toLocaleLowerCase("vi");
    return rows.filter((row) => {
      const warehouseId = row.supplierLocation?.id ?? row.supplierLocationId;
      const supplierId = supplierIdOf(row);
      const productText = `${row.product?.code ?? ""} ${row.product?.name ?? ""}`.toLocaleLowerCase("vi");
      return (
        (!warehouseIds.length || warehouseIds.includes(warehouseId)) &&
        (!supplierIds.length || supplierIds.includes(supplierId)) &&
        (!keyword || productText.includes(keyword))
      );
    });
  }, [rows, warehouseIds, supplierIds, productKeyword]);

  return {
    filteredRows,
    options,
    warehouseIds,
    setWarehouseIds,
    supplierIds,
    setSupplierIds,
    productKeyword,
    setProductKeyword,
  };
}

const MatrixFilterBar: React.FC<{
  report: string;
  reportOptions: Array<{ value: string; label: string }>;
  onReportChange: (value: string) => void;
  filters: ReturnType<typeof useMatrixFilters>;
}> = ({ report, reportOptions, onReportChange, filters }) => (
  <Space wrap size={[8, 8]} style={{ marginBottom: 12, width: "100%" }}>
    <Select
      size="small"
      value={report}
      onChange={onReportChange}
      style={{ width: 245 }}
      options={reportOptions}
    />
    <Select
      size="small"
      mode="multiple"
      allowClear
      showSearch
      maxTagCount="responsive"
      value={filters.warehouseIds}
      onChange={filters.setWarehouseIds}
      style={{ minWidth: 210, width: 260 }}
      placeholder="Lọc kho"
      options={filters.options.warehouses}
    />
    <Select
      size="small"
      mode="multiple"
      allowClear
      showSearch
      maxTagCount="responsive"
      value={filters.supplierIds}
      onChange={filters.setSupplierIds}
      style={{ minWidth: 230, width: 300 }}
      placeholder="Lọc nhà cung cấp"
      options={filters.options.suppliers}
    />
    <Input
      size="small"
      allowClear
      prefix={<SearchOutlined />}
      value={filters.productKeyword}
      onChange={(event) => filters.setProductKeyword(event.target.value)}
      placeholder="Tìm mã hoặc tên mặt hàng"
      style={{ width: 230 }}
    />
    <Typography.Text type="secondary">
      {filters.filteredRows.length} dòng dữ liệu
    </Typography.Text>
  </Space>
);

type TankStatus = "exportable" | "temporary" | "nonExportable";

const tankStatusMeta: Record<TankStatus, { label: string; color: string }> = {
  exportable: { label: "Được xuất", color: "#1677ff" },
  temporary: { label: "Tạm xuất / chờ xử lý", color: "#faad14" },
  nonExportable: { label: "Không được xuất", color: "#ff4d4f" },
};

function tankStatusValue(tank: any, status: TankStatus) {
  return numberOf(tank[`${status}Qty`]);
}

function inventoryTanks(rows: any[]) {
  const tanks = new Map<string, any>();

  rows.forEach((row) => {
    const warehouseId = row.supplierLocation?.id ?? row.supplierLocationId;
    const productId = row.product?.id ?? row.productId;
    if (!warehouseId || !productId) return;

    const supplierId = supplierIdOf(row);
    const key = `${warehouseId}:${productId}:${supplierId}`;
    const tank = tanks.get(key) ?? {
      key,
      warehouseCode: row.supplierLocation?.code ?? row.supplierLocation?.name ?? "Chưa xác định",
      warehouseName: row.supplierLocation?.name ?? "Chưa xác định",
      productCode: row.product?.code ?? row.product?.name ?? "Chưa xác định",
      productName: row.product?.name ?? "Chưa xác định",
      supplierCode: supplierCodeOf(row),
      exportableQty: 0,
      temporaryQty: 0,
      nonExportableQty: 0,
      expectedQty: 0,
      rows: [],
    };

    tank.rows.push(row);
    // Approved lot orders without an invoice are expected receipts, not physical stock in the tank.
    if (row.source === "COMMERCIAL_LOT_ORDER") {
      tank.expectedQty += metricValue(row, "total");
    } else {
      tank.exportableQty += numberOf(row.exportableQty);
      tank.temporaryQty += numberOf(row.temporaryExportQty);
      tank.nonExportableQty += numberOf(row.nonExportableQty);
    }
    tanks.set(key, tank);
  });

  return [...tanks.values()].sort((a, b) =>
    `${a.warehouseName} ${a.productCode} ${a.supplierCode}`.localeCompare(
      `${b.warehouseName} ${b.productCode} ${b.supplierCode}`,
      "vi",
    ),
  );
}

const TankStatusDrawer: React.FC<{
  active: { tank: any; status: TankStatus } | null;
  onClose: () => void;
}> = ({ active, onClose }) => {
  const status = active?.status;
  const tank = active?.tank;
  const rows = tank && status
    ? tank.rows.filter((row: any) => row.source !== "COMMERCIAL_LOT_ORDER" && metricValue(row, status) > 0)
    : [];

  return (
    <Drawer
      title={status ? tankStatusMeta[status].label : "Chi tiết tồn"}
      open={Boolean(active)}
      onClose={onClose}
      width={580}
    >
      {tank && status ? (
        <>
          <Descriptions
            size="small"
            column={1}
            style={{ marginBottom: 16 }}
            items={[
              { key: "warehouse", label: "Kho", children: `${tank.warehouseCode} - ${tank.warehouseName}` },
              { key: "product", label: "Mặt hàng", children: `${tank.productCode} - ${tank.productName}` },
              { key: "supplier", label: "NCC", children: tank.supplierCode },
              { key: "quantity", label: "Số lượng", children: n(tankStatusValue(tank, status)) },
            ]}
          />
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={rows}
            columns={[
              { title: "Nguồn", render: (_: any, row: any) => sourceLabel(row.source) },
              {
                title: "Chứng từ tham chiếu",
                render: (_: any, row: any) => row.orderNo ?? row.lot?.lotNo ?? "Số dư tổng hợp kho",
              },
              {
                title: "Số lượng",
                align: "right",
                render: (_: any, row: any) => n(metricValue(row, status)),
              },
            ]}
          />
        </>
      ) : null}
    </Drawer>
  );
};

const TankInventoryView: React.FC<{ rows: any[]; loading?: boolean }> = ({ rows, loading }) => {
  const [active, setActive] = useState<{ tank: any; status: TankStatus } | null>(null);
  const tanks = useMemo(() => inventoryTanks(rows), [rows]);

  if (loading && tanks.length === 0) return <Card size="small" loading />;
  if (tanks.length === 0) return null;

  return (
    <>
      <Row gutter={[12, 12]}>
        {tanks.map((tank) => {
          const total = tank.exportableQty + tank.temporaryQty + tank.nonExportableQty;
          const segmentHeight = (status: TankStatus) => {
            const value = tankStatusValue(tank, status);
            if (!total || !value) return 0;
            return Math.max((value / total) * 100, 12);
          };

          return (
            <Col key={tank.key} xs={24} sm={12} lg={8} xl={6}>
              <Card size="small" style={{ height: "100%" }} bodyStyle={{ padding: 12 }}>
                <Space direction="vertical" size={2} style={{ width: "100%", marginBottom: 10 }}>
                  <Typography.Text strong title={tank.productName}>{tank.productCode}</Typography.Text>
                  <Typography.Text type="secondary" ellipsis={{ tooltip: tank.warehouseName }}>
                    Kho: {tank.warehouseCode}
                  </Typography.Text>
                  <Typography.Text type="secondary">NCC: {tank.supplierCode}</Typography.Text>
                </Space>
                <div
                  aria-label={`Bồn hàng ${tank.productCode}`}
                  style={{
                    height: 168,
                    display: "flex",
                    flexDirection: "column-reverse",
                    overflow: "hidden",
                    border: "1px solid #bfc7d4",
                    borderRadius: "28px 28px 10px 10px",
                    background: "#f5f7fa",
                  }}
                >
                  {(["exportable", "temporary", "nonExportable"] as TankStatus[]).map((status) => {
                    const quantity = tankStatusValue(tank, status);
                    const height = segmentHeight(status);
                    if (!height) return null;
                    return (
                      <div
                        key={status}
                        role="button"
                        tabIndex={0}
                        title={`Mở chi tiết ${tankStatusMeta[status].label}`}
                        onClick={() => setActive({ tank, status })}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") setActive({ tank, status });
                        }}
                        style={{
                          height: `${height}%`,
                          minHeight: 20,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "0 8px",
                          background: tankStatusMeta[status].color,
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {tankStatusMeta[status].label}: {n(quantity)}
                      </div>
                    );
                  })}
                  {!total ? (
                    <Typography.Text type="secondary" style={{ textAlign: "center", margin: "auto" }}>
                      Chưa có tồn thực tế
                    </Typography.Text>
                  ) : null}
                </div>
                <div
                  style={{
                    marginTop: 10,
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "4px 8px",
                  }}
                >
                  <Typography.Text type="secondary">Trong bồn: {n(total)}</Typography.Text>
                  <Typography.Text type="secondary">Tạm xuất: {n(tank.temporaryQty)}</Typography.Text>
                  <Typography.Text type="secondary" style={{ gridColumn: "1 / -1" }}>
                    Dự kiến về: {n(tank.expectedQty)}
                  </Typography.Text>
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>
      <TankStatusDrawer active={active} onClose={() => setActive(null)} />
    </>
  );
};

const BusinessInventoryMatrix: React.FC<{ rows: any[]; report: string; loading?: boolean }> = ({ rows, report, loading }) => {
  if (report === "tank") return <TankInventoryView rows={rows} loading={loading} />;
  if (report === "detail") {
    return (
      <Table
        rowKey="id"
        loading={loading}
        dataSource={rows}
        scroll={{ x: 1100, y: 520 }}
        sticky
        columns={[
          { title: "Nguồn", width: 170, render: (_: any, x: any) => sourceLabel(x.source) },
          { title: "Kho", render: (_: any, x: any) => x.supplierLocation?.name },
          { title: "Mã NCC", render: (_: any, x: any) => supplierCodeOf(x) },
          { title: "Sản phẩm", render: (_: any, x: any) => x.product?.name },
          { title: "Được xuất", align: "right", render: (_: any, x: any) => n(x.exportableQty) },
          { title: "Tạm xuất", align: "right", render: (_: any, x: any) => n(x.temporaryExportQty) },
          { title: "Không được xuất", align: "right", render: (_: any, x: any) => n(x.nonExportableQty) },
        ]}
      />
    );
  }

  const metric: MatrixMetric =
    report === "exportable"
      ? "exportable"
      : report === "temporary"
      ? "temporary"
      : report === "nonExportable"
      ? "nonExportable"
      : "total";
  const matrix = inventoryMatrix(rows, metric);
  return (
    <Table
      rowKey="id"
      loading={loading}
      size="small"
      bordered
      pagination={false}
      dataSource={matrix.rows}
      columns={matrix.columns}
      sticky
      scroll={{ x: "max-content", y: 520 }}
    />
  );
};

const AccountingInventoryMatrix: React.FC<{ rows: any[]; report: string; loading?: boolean }> = ({ rows, report, loading }) => {
  if (report === "detail") {
    return (
      <Table
        rowKey="id"
        loading={loading}
        dataSource={rows}
        scroll={{ x: 900, y: 520 }}
        sticky
        columns={[
          { title: "Nguồn", width: 170, render: (_: any, x: any) => sourceLabel(x.source) },
          { title: "Kho", render: (_: any, x: any) => x.supplierLocation?.name },
          { title: "Mã NCC", render: (_: any, x: any) => supplierCodeOf(x) },
          { title: "Sản phẩm", render: (_: any, x: any) => x.product?.name },
          { title: "Tồn kế toán", align: "right", render: (_: any, x: any) => n(x.accountingQty) },
          { title: "Giá trị hóa đơn", align: "right", render: (_: any, x: any) => `${n(x.accountingValue)} đ` },
        ]}
      />
    );
  }

  const matrix = inventoryMatrix(rows, report === "value" ? "accountingValue" : "accountingQty");
  return (
    <Table
      rowKey="id"
      loading={loading}
      size="small"
      bordered
      pagination={false}
      dataSource={matrix.rows}
      columns={matrix.columns}
      sticky
      scroll={{ x: "max-content", y: 520 }}
    />
  );
};

export const InventoryAvailabilityPage: React.FC = () => {
  const [report, setReport] = useState("total");
  const query = useOperationList("availability", { page: 1, pageSize: 200 });
  const commercialLots = useOperationList("commercialLotInventory", { page: 1, pageSize: 200 });
  const rows = [
    ...(query.data?.items || []).map((item: any) => ({
      ...item,
      source: "PHYSICAL",
      exportableQty: item.sellableQty,
      temporaryExportQty: item.pendingReleaseQty,
      nonExportableQty: numberOf(item.blockedQty) + numberOf(item.reservedQty),
    })),
    ...(commercialLots.data?.items || []),
  ];
  const filters = useMatrixFilters(rows);
  const loading = query.isLoading || commercialLots.isLoading;
  return (
    <>
      <PageTitle title="Tồn kho kinh doanh" />
      <MatrixFilterBar
        report={report}
        onReportChange={setReport}
        filters={filters}
        reportOptions={[
          { value: "tank", label: "Bồn hàng & khả dụng" },
          { value: "total", label: "Ma trận tổng tồn" },
          { value: "exportable", label: "Ma trận hàng được xuất" },
          { value: "temporary", label: "Ma trận hàng tạm xuất" },
          { value: "nonExportable", label: "Ma trận hàng không được xuất" },
          { value: "detail", label: "Chi tiết theo dòng" },
        ]}
      />
      {!loading && filters.filteredRows.length === 0 ? (
        <Alert
          type="info"
          showIcon
          message="Chưa có tồn thực tế hoặc đơn lô được duyệt. Đơn lô chờ hóa đơn sẽ hiển thị là hàng không được xuất."
          style={{ marginBottom: 12 }}
        />
      ) : null}
      <BusinessInventoryMatrix rows={filters.filteredRows} report={report} loading={loading} />
    </>
  );
};

export const InventoryAccountingPage: React.FC = () => {
  const [report, setReport] = useState("quantity");
  const query = useOperationList("matrix", { page: 1, pageSize: 200 });
  const commercialLots = useOperationList("commercialLotInventory", { page: 1, pageSize: 200 });
  const rows = [
    ...(query.data?.accounting || []).map((item: any) => ({
      ...item,
      source: "PHYSICAL",
      accountingQty: item.postedQty,
      accountingValue: 0,
    })),
    ...(commercialLots.data?.items || []).filter((item: any) => item.includeInAccounting !== false),
  ];
  const filters = useMatrixFilters(rows);
  const loading = query.isLoading || commercialLots.isLoading;
  return (
    <>
      <PageTitle title="Tồn kho kế toán" />
      <MatrixFilterBar
        report={report}
        onReportChange={setReport}
        filters={filters}
        reportOptions={[
          { value: "quantity", label: "Ma trận số lượng" },
          { value: "value", label: "Ma trận giá trị" },
          { value: "detail", label: "Chi tiết theo dòng" },
        ]}
      />
      {!loading && filters.filteredRows.length === 0 ? (
        <Alert type="info" showIcon message="Chưa có tồn kế toán hoặc hóa đơn lô đã ghi nhận." style={{ marginBottom: 12 }} />
      ) : null}
      <AccountingInventoryMatrix rows={filters.filteredRows} report={report} loading={loading} />
    </>
  );
};

export const InventoryMatrixReportPage = () => (
  <>
    <PageTitle title="Báo cáo ma trận tồn kho" />
    <Tabs
      items={[
        { key: "business", label: "Tồn kinh doanh", children: <InventoryAvailabilityPage /> },
        { key: "accounting", label: "Tồn kế toán", children: <InventoryAccountingPage /> },
      ]}
    />
  </>
);

export const ExpectedInventoryPage: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const query = useOperationList("expectedInventory", { page: 1, pageSize: 100 });
  const mutation = useOperationMutation<any>(operationsApi.saveExpectedInventory);
  const masters = useQuery({
    queryKey: ["expected-inventory", "masters"],
    queryFn: async () => {
      const [areas, warehouses, products] = await Promise.all([
        SupplierLocationsApi.areas(true),
        SupplierLocationsApi.list({ isActive: true, page: 1, pageSize: 200 }),
        ProductsApi.select(""),
      ]);
      return { areas, warehouses: warehouses.items, products };
    },
  });
  const masterData = masters.data ?? { areas: [], warehouses: [], products: [] };
  return (
    <>
      <PageTitle title="Hàng dự kiến" action={<Button type="primary" onClick={() => setOpen(true)}>Tạo dự kiến</Button>} />
      <Alert type="info" showIcon message="Hàng dự kiến theo khu vực chỉ phục vụ kế hoạch, chưa phải tồn có thể xuất." style={{ marginBottom: 16 }} />
      <Table
        rowKey="id"
        loading={query.isLoading}
        dataSource={query.data?.items || []}
        columns={[
          { title: "Khu vực", render: (_: any, x: any) => x.warehouseArea?.name ?? "-" },
          { title: "Kho", render: (_: any, x: any) => x.supplierLocation?.name ?? <span style={{ color: "#8c8c8c" }}>Chưa xác định</span> },
          { title: "Sản phẩm", render: (_: any, x: any) => x.product?.name },
          { title: "Nguồn", dataIndex: "sourceType" },
          { title: "Dự kiến", render: (_: any, x: any) => n(x.expectedQty) },
          { title: "Đã nhận", render: (_: any, x: any) => n(x.receivedQty) },
          { title: "Ngày về", render: (_: any, x: any) => date(x.expectedDate) },
          { title: "Trạng thái", render: (_: any, x: any) => <StatusBadge status={x.status} /> },
        ]}
      />
      <Modal open={open} title="Tạo hàng dự kiến" onCancel={() => setOpen(false)} onOk={() => form.submit()} confirmLoading={mutation.isPending}>
        <Form form={form} layout="vertical" initialValues={{ sourceType: "MANUAL", ownerType: "INTERNAL" }} onFinish={async (values) => {
          const location = decodeWarehouseSource(values.sourceLocation, masterData.warehouses)!;
          const { sourceLocation, ...rest } = values;
          await mutation.mutateAsync({
            ...rest,
            warehouseAreaId: location.areaId,
            supplierLocationId: location.warehouseId,
            expectedDate: values.expectedDate?.format("YYYY-MM-DD"),
          });
          notify.success("Đã tạo hàng dự kiến.");
          setOpen(false);
          form.resetFields();
        }}>
          <Form.Item name="sourceType" label="Nguồn" rules={[{ required: true }]}><Select options={["PURCHASE_ORDER", "SHIP_CHARTER_ORDER", "WAREHOUSE_TRANSFER", "MANUAL"].map((x) => ({ value: x }))} /></Form.Item>
          <Form.Item name="sourceId" label="ID chứng từ nguồn" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="sourceLocation" label="Khu vực / kho nhận dự kiến" rules={[{ required: true, message: "Chọn khu vực hoặc kho" }]}>
            <WarehouseSourceSelect areas={masterData.areas} warehouses={masterData.warehouses} />
          </Form.Item>
          <Form.Item name="productId" label="Sản phẩm" rules={[{ required: true, message: "Chọn sản phẩm" }]}>
            <Select showSearch optionFilterProp="label" options={masterData.products.map((item: any) => ({ value: item.id, label: `${item.code} - ${item.name}` }))} />
          </Form.Item>
          <Form.Item name="ownerType" label="Chủ hàng" rules={[{ required: true }]}><Select options={["INTERNAL", "CUSTOMER", "SUPPLIER"].map((x) => ({ value: x }))} /></Form.Item>
          <Form.Item noStyle shouldUpdate={(a, b) => a.ownerType !== b.ownerType}>{({ getFieldValue }) => getFieldValue("ownerType") !== "INTERNAL" ? <Form.Item name="ownerCustomerId" label="Chủ hàng"><CustomerSelect style={{ width: "100%" }} /></Form.Item> : null}</Form.Item>
          <Form.Item name="expectedQty" label="Số lượng dự kiến" rules={[{ required: true }]}><InputNumber min={0.001} style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="expectedDate" label="Ngày dự kiến"><DatePicker style={{ width: "100%" }} /></Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export const WarehouseReservationPage: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const query = useOperationList("reservations", { page: 1, pageSize: 100 });
  const mutation = useOperationMutation<{ id: string; status: string }>(({ id, status }) => operationsApi.changeReservation(id, status));
  const createMutation = useOperationMutation<any>(operationsApi.saveReservation);
  return (
    <>
      <PageTitle title="Giữ hàng / Đặt giữ hàng" action={<Button type="primary" onClick={() => setOpen(true)}>Tạo giữ hàng</Button>} />
      <Table
        rowKey="id"
        loading={query.isLoading}
        dataSource={query.data?.items || []}
        columns={[
          { title: "Số giữ hàng", dataIndex: "reservationNo" },
          { title: "Kho", render: (_: any, x: any) => x.supplierLocation?.name },
          { title: "Sản phẩm", render: (_: any, x: any) => x.product?.name },
          { title: "Khách hàng", render: (_: any, x: any) => x.customer?.name },
          { title: "Số lượng", render: (_: any, x: any) => n(x.reservedQty) },
          { title: "Trạng thái", render: (_: any, x: any) => <StatusBadge status={x.status} /> },
          { title: "Thao tác", render: (_: any, x: any) => x.status === "ACTIVE" && (
            <Space>
              <Button onClick={() => mutation.mutate({ id: x.id, status: "RELEASED" })}>Giải phóng</Button>
              <Button onClick={() => mutation.mutate({ id: x.id, status: "CONSUMED" })}>Đã xuất</Button>
            </Space>
          )},
        ]}
      />
      <Modal open={open} title="Tạo giữ hàng" onCancel={() => setOpen(false)} onOk={() => form.submit()} confirmLoading={createMutation.isPending}>
        <Form form={form} layout="vertical" initialValues={{ sourceType: "MANUAL" }} onFinish={async (values) => {
          await createMutation.mutateAsync({ ...values, expiredAt: values.expiredAt?.toISOString() });
          notify.success("Đã giữ hàng.");
          setOpen(false);
          form.resetFields();
        }}>
          <Form.Item name="reservationNo" label="Số giữ hàng" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="supplierLocationId" label="ID kho" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="productId" label="ID sản phẩm" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="customerId" label="Khách hàng"><CustomerSelect style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="reservedQty" label="Số lượng" rules={[{ required: true }]}><InputNumber min={0.001} style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="expiredAt" label="Hết hạn"><DatePicker showTime style={{ width: "100%" }} /></Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export const WarehouseTransferListPage: React.FC = () => {
  const navigate = useNavigate();
  const query = useOperationList("transfers", { page: 1, pageSize: 100 });
  return (
    <>
      <PageTitle title="Chuyển kho" action={<Button type="primary" onClick={() => navigate("/operations/warehouse-transfers/create")}>Tạo chuyển kho</Button>} />
      <Table
        rowKey="id"
        loading={query.isLoading}
        dataSource={query.data?.items || []}
        onRow={(row: any) => ({ onClick: () => navigate(`/operations/warehouse-transfers/${row.id}`) })}
        columns={[
          { title: "Số phiếu", dataIndex: "transferNo" },
          { title: "Kho xuất", render: (_: any, x: any) => x.fromSupplierLocation?.name },
          { title: "Kho nhập", render: (_: any, x: any) => x.toSupplierLocation?.name },
          { title: "Ngày chuyển", render: (_: any, x: any) => date(x.transferDate) },
          { title: "Phương thức", dataIndex: "transportMode" },
          { title: "Trạng thái", render: (_: any, x: any) => <StatusBadge status={x.status} /> },
        ]}
      />
    </>
  );
};

export const WarehouseTransferFormPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const detail = useOperationDetail("transfer", id);
  const mutation = useOperationMutation<any>((data) => operationsApi.saveTransfer(data, id));
  const [form] = Form.useForm();
  React.useEffect(() => {
    if (detail.data) form.setFieldsValue({ ...detail.data, transferDate: dayjs(detail.data.transferDate) });
  }, [detail.data, form]);
  return (
    <>
      <PageTitle title={id ? "Cập nhật chuyển kho" : "Tạo chuyển kho"} />
      <Card>
        <Alert message="Mỗi dòng gồm productId và qty. Khi xác nhận, hệ thống khóa cơ cấu Pending/Posted tại kho xuất." type="info" showIcon />
        <Divider />
        <Form
          form={form}
          layout="vertical"
          initialValues={{ ownerType: "INTERNAL", transportMode: "ROAD", lines: [{}] }}
          onFinish={async (values) => {
            await mutation.mutateAsync({ ...values, transferDate: values.transferDate.format("YYYY-MM-DD") });
            notify.success("Đã lưu phiếu chuyển kho.");
            navigate("/operations/warehouse-transfers");
          }}
        >
          <Row gutter={16}>
            <Col xs={24} md={8}><Form.Item name="transferNo" label="Số phiếu" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="fromSupplierLocationId" label="ID kho xuất" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="toSupplierLocationId" label="ID kho nhập" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="transferDate" label="Ngày chuyển" rules={[{ required: true }]}><DatePicker style={{ width: "100%" }} /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="transportMode" label="Phương thức"><Select options={["ROAD", "SEA", "PIPELINE"].map((x) => ({ value: x }))} /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="ownerType" label="Chủ hàng"><Select options={["INTERNAL", "CUSTOMER", "SUPPLIER"].map((x) => ({ value: x }))} /></Form.Item></Col>
          </Row>
          <Form.List name="lines">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name }) => (
                  <Space key={key} align="baseline" style={{ display: "flex" }}>
                    <Form.Item name={[name, "productId"]} rules={[{ required: true }]}><Input placeholder="Product ID" /></Form.Item>
                    <Form.Item name={[name, "qty"]} rules={[{ required: true }]}><InputNumber placeholder="Số lượng" /></Form.Item>
                    <Form.Item name={[name, "qtyV15"]}><InputNumber placeholder="V15" /></Form.Item>
                    <Button danger onClick={() => remove(name)}>Xóa</Button>
                  </Space>
                ))}
                <Button onClick={() => add()}>Thêm dòng</Button>
              </>
            )}
          </Form.List>
          <Divider />
          <Button type="primary" htmlType="submit" loading={mutation.isPending}>Lưu phiếu</Button>
        </Form>
      </Card>
    </>
  );
};

export const WarehouseTransferDetailPage: React.FC = () => {
  const { id } = useParams();
  const query = useOperationDetail("transfer", id);
  const mutation = useOperationMutation<string>((status) => operationsApi.changeTransferStatus(id!, status));
  const row = query.data;
  if (!row) return <Card loading={query.isLoading} />;
  return (
    <>
      <PageTitle title={`Chuyển kho ${row.transferNo}`} action={
        <Space>
          {["IN_TRANSIT", "COMPLETED", "CANCELLED"].map((status) => (
            <Button key={status} onClick={() => mutation.mutate(status)}>{labelOf("status", status)}</Button>
          ))}
        </Space>
      } />
      <Descriptions bordered>
        <Descriptions.Item label="Kho xuất">{row.fromSupplierLocation?.name}</Descriptions.Item>
        <Descriptions.Item label="Kho nhập">{row.toSupplierLocation?.name}</Descriptions.Item>
        <Descriptions.Item label="Trạng thái"><StatusBadge status={row.status} /></Descriptions.Item>
      </Descriptions>
      <Table rowKey="id" dataSource={row.lines || []} pagination={false} columns={[
        { title: "Sản phẩm", render: (_: any, x: any) => x.product?.name },
        { title: "Số lượng", render: (_: any, x: any) => n(x.qty) },
        { title: "Pending", render: (_: any, x: any) => n(x.pendingDocQty) },
        { title: "Posted", render: (_: any, x: any) => n(x.postedQty) },
      ]} />
    </>
  );
};

export const VehicleListPage = () => (
  <CrudPage
    title="Danh mục xe"
    resource="vehicles"
    save={operationsApi.saveVehicle}
    columns={[
      { title: "Biển số", dataIndex: "licensePlate" },
      { title: "Đơn vị", render: (_: any, x: any) => x.supplier?.name },
      { title: "Loại xe", dataIndex: "type" },
      { title: "Sức chứa", render: (_: any, x: any) => n(x.capacity) },
      { title: "Trạng thái", render: (_: any, x: any) => x.isActive ? "Hoạt động" : "Ngừng" },
    ]}
    fields={[
      { name: "supplierCustomerId", label: "Đơn vị vận tải", kind: "customer", required: true },
      { name: "licensePlate", label: "Biển số", required: true },
      { name: "type", label: "Loại xe" },
      { name: "capacity", label: "Sức chứa", kind: "number" },
      { name: "note", label: "Ghi chú" },
    ]}
  />
);
const DocumentManagerPage: React.FC<{ type: "vehicle" | "driver" }> = ({ type }) => {
  const [selectedId, setSelectedId] = useState<string>();
  const [form] = Form.useForm();
  const list = useOperationList(type === "vehicle" ? "vehicles" : "drivers", { page: 1, pageSize: 200 });
  const detail = useOperationDetail(type === "vehicle" ? "vehicle" : "driver", selectedId);
  const mutation = useOperationMutation<any>((data) =>
    type === "vehicle"
      ? operationsApi.saveVehicleDocument(selectedId!, data)
      : operationsApi.saveDriverDocument(selectedId!, data)
  );
  const options = (list.data?.items || []).map((x: any) => ({
    value: x.id,
    label: type === "vehicle" ? x.licensePlate : x.fullName,
  }));
  const types = type === "vehicle"
    ? ["REGISTRATION", "INSPECTION", "INSURANCE", "OTHER"]
    : ["DRIVER_LICENSE", "ID_CARD", "TRAINING_CERTIFICATE", "OTHER"];
  return (
    <>
      <PageTitle title={type === "vehicle" ? "Hồ sơ xe" : "Hồ sơ lái xe"} />
      <Card>
        <Select
          showSearch
          optionFilterProp="label"
          placeholder={type === "vehicle" ? "Chọn xe" : "Chọn lái xe"}
          options={options}
          value={selectedId}
          onChange={setSelectedId}
          style={{ width: 360, marginBottom: 16 }}
        />
        {selectedId ? (
          <>
            <Table rowKey="id" dataSource={detail.data?.documents || []} loading={detail.isLoading} pagination={false} columns={[
              { title: "Loại hồ sơ", render: (_: any, x: any) => labelOf("documentType", x.documentType) },
              { title: "Số hồ sơ", dataIndex: "documentNo" },
              { title: "Ngày cấp", render: (_: any, x: any) => date(x.issuedDate) },
              { title: "Hết hạn", render: (_: any, x: any) => date(x.expiredDate) },
              { title: "File", render: (_: any, x: any) => x.fileUrl ? <a href={x.fileUrl} target="_blank">Xem file</a> : "-" },
            ]} />
            <Divider />
            <Form form={form} layout="vertical" onFinish={async (values) => {
              await mutation.mutateAsync({
                ...values,
                issuedDate: values.issuedDate?.format("YYYY-MM-DD"),
                expiredDate: values.expiredDate?.format("YYYY-MM-DD"),
              });
              notify.success("Đã lưu hồ sơ.");
              form.resetFields();
            }}>
              <Row gutter={16}>
                <Col xs={24} md={6}><Form.Item name="documentType" label="Loại" rules={[{ required: true }]}><Select options={optionsOf("documentType", types)} /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item name="documentNo" label="Số hồ sơ"><Input /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item name="issuedDate" label="Ngày cấp"><DatePicker style={{ width: "100%" }} /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item name="expiredDate" label="Hết hạn"><DatePicker style={{ width: "100%" }} /></Form.Item></Col>
                <Col span={24}><Form.Item name="fileUrl" label="File"><FileUploadField /></Form.Item></Col>
              </Row>
              <Button type="primary" htmlType="submit" loading={mutation.isPending}>Thêm hồ sơ</Button>
            </Form>
          </>
        ) : <Alert type="info" message="Chọn đối tượng để xem và cập nhật hồ sơ." />}
      </Card>
    </>
  );
};

export const VehicleDocumentPage = () => <DocumentManagerPage type="vehicle" />;

export const DriverListPage = () => (
  <CrudPage
    title="Lái xe"
    resource="drivers"
    save={operationsApi.saveDriver}
    columns={[
      { title: "Họ tên", dataIndex: "fullName" },
      { title: "Đơn vị", render: (_: any, x: any) => x.supplier?.name },
      { title: "Điện thoại", dataIndex: "phone" },
      { title: "CCCD", dataIndex: "idCard" },
      { title: "Trạng thái", render: (_: any, x: any) => x.isActive ? "Hoạt động" : "Ngừng" },
    ]}
    fields={[
      { name: "supplierCustomerId", label: "Đơn vị vận tải", kind: "customer", required: true },
      { name: "fullName", label: "Họ tên", required: true },
      { name: "phone", label: "Điện thoại" },
      { name: "idCard", label: "CCCD" },
      { name: "note", label: "Ghi chú" },
    ]}
  />
);
export const DriverDocumentPage = () => <DocumentManagerPage type="driver" />;

export const VehicleDispatchOrderListPage: React.FC = () => {
  const navigate = useNavigate();
  const query = useOperationList("dispatches", { page: 1, pageSize: 100 });
  return (
    <>
      <PageTitle title="Đơn điều xe / Chuyến xe" action={<Button type="primary" onClick={() => navigate("/operations/vehicle-dispatches/create")}>Tạo chuyến</Button>} />
      <Table
        rowKey="id"
        loading={query.isLoading}
        dataSource={query.data?.items || []}
        onRow={(row: any) => ({ onClick: () => navigate(`/operations/vehicle-dispatches/${row.id}`) })}
        columns={[
          { title: "Số điều xe", dataIndex: "dispatchNo" },
          { title: "Xe", render: (_: any, x: any) => x.vehicle?.licensePlate },
          { title: "Lái xe", render: (_: any, x: any) => x.driver?.fullName },
          { title: "Tuyến", render: (_: any, x: any) => `${x.fromLocationText} → ${x.toLocationText}` },
          { title: "Bắt đầu", render: (_: any, x: any) => dayjs(x.plannedStartAt).format("DD/MM/YYYY HH:mm") },
          { title: "Trạng thái", render: (_: any, x: any) => <StatusBadge status={x.status} /> },
        ]}
      />
    </>
  );
};

export const VehicleDispatchOrderFormPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const detail = useOperationDetail("dispatch", id);
  const mutation = useOperationMutation<any>((data) => operationsApi.saveDispatch(data, id));
  const [form] = Form.useForm();
  React.useEffect(() => {
    if (detail.data) form.setFieldsValue({ ...detail.data, plannedStartAt: dayjs(detail.data.plannedStartAt) });
  }, [detail.data, form]);
  return (
    <>
      <PageTitle title={id ? "Cập nhật chuyến xe" : "Tạo chuyến xe"} />
      <Card>
        <Form form={form} layout="vertical" initialValues={{ sourceType: "DIRECT", status: "DRAFT" }} onFinish={async (values) => {
          await mutation.mutateAsync({ ...values, plannedStartAt: values.plannedStartAt.toISOString() });
          notify.success("Đã lưu chuyến xe.");
          navigate("/operations/vehicle-dispatches");
        }}>
          <Row gutter={16}>
            <Col xs={24} md={8}><Form.Item name="dispatchNo" label="Số điều xe" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="vehicleId" label="ID xe" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="driverId" label="ID lái xe" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="fromLocationText" label="Điểm đi" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="toLocationText" label="Điểm đến" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="plannedStartAt" label="Thời gian dự kiến" rules={[{ required: true }]}><DatePicker showTime style={{ width: "100%" }} /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="plannedQty" label="Số lượng dự kiến"><InputNumber style={{ width: "100%" }} /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="transportFeeVnd" label="Phí vận chuyển"><InputNumber style={{ width: "100%" }} /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="sourceType" label="Nguồn"><Select options={optionsOf("sourceType", ["DIRECT", "PURCHASE_ORDER", "SALES_ORDER", "GOODS_RECEIPT", "WAREHOUSE_TRANSFER"])} /></Form.Item></Col>
            <Col span={24}><Form.Item name="fileUrl" label="File"><FileUploadField /></Form.Item></Col>
          </Row>
          <Button type="primary" htmlType="submit" loading={mutation.isPending}>Lưu chuyến</Button>
        </Form>
      </Card>
    </>
  );
};

export const VehicleDispatchOrderDetailPage: React.FC = () => {
  const { id } = useParams();
  const query = useOperationDetail("dispatch", id);
  const mutation = useOperationMutation<string>((status) => operationsApi.changeDispatchStatus(id!, status));
  const row = query.data;
  if (!row) return <Card loading={query.isLoading} />;
  return (
    <>
      <PageTitle title={`Chuyến xe ${row.dispatchNo}`} action={<Space>
        {["ASSIGNED", "LOADING", "IN_TRANSIT", "DELIVERED", "CLOSED", "CANCELLED"].map((status) => (
          <Button key={status} onClick={() => mutation.mutate(status)}>{labelOf("status", status)}</Button>
        ))}
      </Space>} />
      <Descriptions bordered column={2}>
        <Descriptions.Item label="Xe">{row.vehicle?.licensePlate}</Descriptions.Item>
        <Descriptions.Item label="Lái xe">{row.driver?.fullName}</Descriptions.Item>
        <Descriptions.Item label="Tuyến">{row.fromLocationText} → {row.toLocationText}</Descriptions.Item>
        <Descriptions.Item label="Trạng thái"><StatusBadge status={row.status} /></Descriptions.Item>
        <Descriptions.Item label="Dự kiến">{dayjs(row.plannedStartAt).format("DD/MM/YYYY HH:mm")}</Descriptions.Item>
        <Descriptions.Item label="Số lượng">{n(row.plannedQty)}</Descriptions.Item>
      </Descriptions>
    </>
  );
};
