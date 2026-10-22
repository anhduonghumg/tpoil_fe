import React, { useEffect, useMemo, useState } from "react";
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
  Switch,
  Table,
  Tag,
  Tooltip,
  Tabs,
  Typography,
  DatePicker,
  Alert,
  Drawer,
} from "antd";
import {
  DownloadOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";

import dayjs from "dayjs";
import { CustomerSelect } from "../../shared/ui/CustomerSelect";
import type { CustomerSelectRole } from "../../shared/ui/CustomerSelect";
import { notify } from "../../shared/lib/notification";
import { extractApiError } from "../../shared/lib/httpError";
import { http } from "../../shared/lib/http";
import { exportExcelWorkbook } from "../../shared/utils/exportExcelExcelJS";
import {
  FilterButton,
  FilterTags,
  FilterToolbar,
} from "../../shared/ui/TableFilter";
import { operationsApi } from "./api";



import {
  useOperationDetail,
  useOperationList,
  useOperationMutation,
} from "./hooks";
import { FileUploadField, StatusBadge } from "./components";
import "./inventory-matrix.css";

export {
  ShipOwnerListPage,
  VesselDetailPage,
  VesselDocumentListPage,
  VesselListPage,
} from "./ship-master-pages";

const n = (value: unknown) => Number(value || 0).toLocaleString("vi-VN");
const date = (value?: string) =>
  value ? dayjs(value).format("DD/MM/YYYY") : "-";

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
  <Space
    style={{ width: "100%", justifyContent: "space-between", marginBottom: 16 }}
  >
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
      <CustomerSelect
        customerRole={field.customerRole}
        style={{ width: "100%" }}
      />
    ) : field.kind === "file" ? (
      <FileUploadField />
    ) : field.kind === "select" ? (
      <Select
        options={(field.options || []).map((x) =>
          typeof x === "string" ? { value: x, label: x } : x
        )}
      />
    ) : (
      <Input />
    );
  return (
    <Col xs={24} md={12}>
      <Form.Item
        name={field.name}
        label={field.label}
        rules={[{ required: field.required }]}
      >
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
  const mutation = useOperationMutation<{ data: any; id?: string }>(
    ({ data, id }) => save(data, id)
  );
  const items = query.data?.items ?? query.data ?? [];
  const openForm = (row?: any) => {
    setEditing(row);
    form.resetFields();
    form.setFieldsValue(
      row
        ? Object.fromEntries(
            fields.map((field) => [
              field.name,
              field.kind === "date" && row[field.name]
                ? dayjs(row[field.name])
                : row[field.name],
            ])
          )
        : {}
    );
    setOpen(true);
  };
  const submit = async () => {
    const values = await form.validateFields();
    await mutation.mutateAsync({
      data: normalizeForm(values, fields),
      id: editing?.id,
    });
    notify.success("Đã lưu dữ liệu.");
    setOpen(false);
  };
  return (
    <>
      <PageTitle
        title={title}
        action={
          <Space>
            {extraAction}
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openForm()}
            >
              Tạo mới
            </Button>
          </Space>
        }
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
                <Button
                  type="link"
                  onClick={(event) => {
                    event.stopPropagation();
                    openForm(row);
                  }}
                >
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
          <Row gutter={16}>
            {fields.map((field) => (
              <DynamicField key={field.name} field={field} />
            ))}
          </Row>
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
      {
        title: "Hiệu lực",
        render: (_: any, x: any) =>
          `${date(x.effectiveFrom)} - ${date(x.effectiveTo)}`,
      },
    ]}
    fields={[
      { name: "contractNo", label: "Số hợp đồng", required: true },
      {
        name: "ownerCustomerId",
        label: "Chủ tàu",
        kind: "customer",
        required: true,
      },
      { name: "signedDate", label: "Ngày ký", kind: "date", required: true },
      {
        name: "effectiveFrom",
        label: "Hiệu lực từ",
        kind: "date",
        required: true,
      },
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
      {
        title: "Laycan",
        render: (_: any, x: any) =>
          `${date(x.laycanFrom)} - ${date(x.laycanTo)}`,
      },
      {
        title: "Giá thuê",
        render: (_: any, x: any) => n(x.freightRateVndPerLiter),
      },
    ]}
    fields={[
      { name: "contractId", label: "ID hợp đồng", required: true },
      { name: "appendixNo", label: "Số phụ lục", required: true },
      {
        name: "appendixDate",
        label: "Ngày phụ lục",
        kind: "date",
        required: true,
      },
      { name: "vesselId", label: "ID tàu" },
      { name: "cargoName", label: "Hàng hóa" },
      { name: "plannedQty", label: "Số lượng dự kiến", kind: "number" },
      { name: "qtyTolerancePercent", label: "Dung sai %", kind: "number" },
      { name: "loadingPort", label: "Cảng xếp" },
      { name: "dischargePort", label: "Cảng dỡ" },
      { name: "laycanFrom", label: "Laycan từ", kind: "date" },
      { name: "laycanTo", label: "Laycan đến", kind: "date" },
      {
        name: "freightRateVndPerLiter",
        label: "Giá thuê VND/lít",
        kind: "number",
      },
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
      {
        title: "Giá VND/lít",
        render: (_: any, x: any) => n(x.freightRateVndPerLiter),
      },
      {
        title: "Hiệu lực",
        render: (_: any, x: any) =>
          `${date(x.effectiveFrom)} - ${date(x.effectiveTo)}`,
      },
    ]}
    fields={[
      { name: "ownerCustomerId", label: "Chủ tàu", kind: "customer" },
      { name: "vesselId", label: "ID tàu" },
      { name: "loadingPort", label: "Cảng xếp", required: true },
      { name: "dischargePort", label: "Cảng dỡ", required: true },
      { name: "productGroup", label: "Nhóm hàng" },
      {
        name: "freightRateVndPerLiter",
        label: "Giá VND/lít",
        kind: "number",
        required: true,
      },
      {
        name: "effectiveFrom",
        label: "Hiệu lực từ",
        kind: "date",
        required: true,
      },
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
        {
          title: "PO TERM",
          render: (_: any, x: any) => x.purchaseOrder?.orderNo || "-",
        },
        { title: "Tàu", render: (_: any, x: any) => x.vessel?.name || "-" },
        { title: "Hàng hóa", dataIndex: "cargoName" },
        {
          title: "Laycan",
          render: (_: any, x: any) =>
            `${date(x.laycanFrom)} - ${date(x.laycanTo)}`,
        },
        {
          title: "Trạng thái",
          render: (_: any, x: any) => <StatusBadge status={x.status} />,
        },
      ]}
      fields={[
        { name: "charterOrderNo", label: "Mã đơn", required: true },
        {
          name: "sourceType",
          label: "Nguồn",
          kind: "select",
          options: optionsOf("sourceType", ["DIRECT", "FROM_TERM"]),
          required: true,
        },
        { name: "purchaseOrderId", label: "ID PO TERM" },
        { name: "termShipmentId", label: "ID chuyến tàu TERM" },
        { name: "appendixId", label: "ID phụ lục" },
        {
          name: "ownerCustomerId",
          label: "Chủ tàu",
          kind: "customer",
          required: true,
        },
        { name: "vesselId", label: "ID tàu" },
        { name: "laycanFrom", label: "Laycan từ", kind: "date" },
        { name: "laycanTo", label: "Laycan đến", kind: "date" },
        { name: "cargoName", label: "Hàng hóa", required: true },
        {
          name: "plannedQty",
          label: "Số lượng dự kiến",
          kind: "number",
          required: true,
        },
        { name: "loadingPort", label: "Cảng xếp", required: true },
        { name: "dischargePort", label: "Cảng dỡ", required: true },
        {
          name: "freightRateVndPerLiter",
          label: "Giá thuê VND/lít",
          kind: "number",
        },
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
    type === "insurance"
      ? "insuranceCompanyId"
      : type === "inspection"
      ? "inspectionCompanyId"
      : "agentCustomerId";
  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={async (values) => {
        const payload = Object.fromEntries(
          Object.entries(values).map(([k, v]: any) => [
            k,
            dayjs.isDayjs(v) ? v.format("YYYY-MM-DD") : v,
          ])
        );
        await mutation.mutateAsync(payload);
        notify.success("Đã lưu đăng ký.");
        form.resetFields();
      }}
    >
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item
            name={companyField}
            label="Đơn vị thực hiện"
            rules={[{ required: true }]}
          >
            <CustomerSelect style={{ width: "100%" }} />
          </Form.Item>
        </Col>
        {type === "insurance" && (
          <>
            <Col xs={24} md={12}>
              <Form.Item name="policyNo" label="Số đơn bảo hiểm">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="premiumAmount"
                label="Phí bảo hiểm"
                rules={[{ required: true }]}
              >
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </>
        )}
        {type === "inspection" && (
          <>
            <Col xs={24} md={12}>
              <Form.Item
                name="inspectionType"
                label="Loại giám định"
                initialValue="BOTH"
              >
                <Select
                  options={optionsOf("inspectionType", [
                    "QUANTITY",
                    "QUALITY",
                    "BOTH",
                  ])}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="feeAmount" label="Phí giám định">
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </>
        )}
        {type === "agent" && (
          <Col xs={24} md={12}>
            <Form.Item
              name="agencyFee"
              label="Phí đại lý"
              rules={[{ required: true }]}
            >
              <InputNumber style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        )}
        <Col xs={24} md={12}>
          <Form.Item name="registeredDate" label="Ngày đăng ký">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="status" label="Trạng thái" initialValue="REGISTERED">
            <Select
              options={optionsOf("status", [
                "DRAFT",
                "REGISTERED",
                "CONFIRMED",
                "CANCELLED",
              ])}
            />
          </Form.Item>
        </Col>
        <Col span={24}>
          <Form.Item name="fileUrl" label="File">
            <FileUploadField />
          </Form.Item>
        </Col>
      </Row>
      <Button type="primary" htmlType="submit" loading={mutation.isPending}>
        Lưu đăng ký
      </Button>
    </Form>
  );
};

export const ShipCharterOrderDetailPage: React.FC = () => {
  const { id } = useParams();
  const query = useOperationDetail("charterOrder", id);
  const statusMutation = useOperationMutation<string>((status) =>
    operationsApi.changeCharterStatus(id!, status)
  );
  const costMutation = useOperationMutation(() =>
    operationsApi.postTermCosts(id!)
  );
  const row = query.data;
  if (!row) return <Card loading={query.isLoading} />;
  return (
    <>
      <PageTitle
        title={`Đơn thuê tàu ${row.charterOrderNo}`}
        action={
          <Space>
            {[
              "WAITING_CONFIRMATION",
              "CONFIRMED",
              "IN_PROGRESS",
              "COMPLETED",
              "CANCELLED",
            ].map((status) => (
              <Button
                key={status}
                onClick={() => statusMutation.mutate(status)}
              >
                {labelOf("status", status)}
              </Button>
            ))}
            <Button type="primary" onClick={() => costMutation.mutate()}>
              Đưa chi phí vào TERM
            </Button>
          </Space>
        }
      />
      <Card>
        <Descriptions bordered column={{ xs: 1, md: 2, xl: 3 }}>
          <Descriptions.Item label="Trạng thái">
            <StatusBadge status={row.status} />
          </Descriptions.Item>
          <Descriptions.Item label="PO TERM">
            {row.purchaseOrder?.orderNo || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Tàu">
            {row.vessel?.name || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Chủ tàu">
            {row.owner?.name}
          </Descriptions.Item>
          <Descriptions.Item label="Laycan">
            {date(row.laycanFrom)} - {date(row.laycanTo)}
          </Descriptions.Item>
          <Descriptions.Item label="Hàng hóa">
            {row.cargoName}
          </Descriptions.Item>
          <Descriptions.Item label="Số lượng">
            {n(row.plannedQty)}
          </Descriptions.Item>
          <Descriptions.Item label="Hành trình">
            {row.loadingPort} → {row.dischargePort}
          </Descriptions.Item>
          <Descriptions.Item label="Giá thuê">
            {n(row.freightRateVndPerLiter)} VND/lít
          </Descriptions.Item>
        </Descriptions>
      </Card>
      <Divider />
      <Card>
        <Tabs
          items={[
            {
              key: "insurance",
              label: `Bảo hiểm (${row.insurances?.length || 0})`,
              children: <RegistrationForm type="insurance" orderId={id!} />,
            },
            {
              key: "inspection",
              label: `Giám định (${row.inspections?.length || 0})`,
              children: <RegistrationForm type="inspection" orderId={id!} />,
            },
            {
              key: "agent",
              label: `Đại lý tàu (${row.agentRegistrations?.length || 0})`,
              children: <RegistrationForm type="agent" orderId={id!} />,
            },
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
    save={(data, id) =>
      operationsApi.saveStorageContract(
        {
          ...data,
          supplierLocationIds: data.supplierLocationIds
            ? String(data.supplierLocationIds)
                .split(",")
                .map((x) => x.trim())
            : [],
          lossRates: data.lossRatesJson ? JSON.parse(data.lossRatesJson) : [],
          feeTiers: data.feeTiersJson ? JSON.parse(data.feeTiersJson) : [],
          lossRatesJson: undefined,
          feeTiersJson: undefined,
        },
        id
      )
    }
    columns={[
      { title: "Số hợp đồng", dataIndex: "contractNo" },
      { title: "Bên cho thuê", render: (_: any, x: any) => x.lessor?.name },
      {
        title: "Hiệu lực",
        render: (_: any, x: any) =>
          `${date(x.effectiveFrom)} - ${date(x.effectiveTo)}`,
      },
      {
        title: "Trạng thái",
        render: (_: any, x: any) => <StatusBadge status={x.status} />,
      },
    ]}
    fields={[
      { name: "contractNo", label: "Số hợp đồng", required: true },
      {
        name: "lessorCustomerId",
        label: "Bên cho thuê",
        kind: "customer",
        required: true,
      },
      { name: "effectiveFrom", label: "Hiệu lực từ", kind: "date" },
      { name: "effectiveTo", label: "Hiệu lực đến", kind: "date" },
      {
        name: "status",
        label: "Trạng thái",
        kind: "select",
        options: optionsOf("status", [
          "DRAFT",
          "ACTIVE",
          "EXPIRED",
          "TERMINATED",
        ]),
      },
      {
        name: "supplierLocationIds",
        label: "ID kho (phân cách bằng dấu phẩy)",
        required: true,
      },
      {
        name: "lossRatesJson",
        label:
          "Tỷ lệ hao hụt (JSON: productGroup, storageLossRatePercent, issueLossRatePercent)",
      },
      {
        name: "feeTiersJson",
        label: "Bậc giá thuê (JSON: conditionText, unitPriceVndPerLiter)",
      },
      { name: "fileUrl", label: "File hợp đồng", kind: "file" },
      { name: "note", label: "Ghi chú" },
    ]}
  />
);
export const StorageRentalContractFormPage = StorageRentalContractPage;

type MatrixMetric =
  | "total"
  | "actual"
  | "sellable"
  | "held"
  | "expected"
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
  if (source === "EXPECTED") return "Hàng dự kiến";
  return "Tồn thực tế";
}

function supplierIdOf(row: any) {
  return row.supplier?.id ?? row.ownerCustomer?.id ?? "INTERNAL";
}

function supplierCodeOf(row: any) {
  return row.supplier?.code ?? row.ownerCustomer?.code ?? "NỘI BỘ";
}

function releaseCodeOf(row: any) {
  return row.releaseCode ?? "UNCLASSIFIED";
}

function releaseCodeLabel(row: any) {
  const code = releaseCodeOf(row);
  return code === "UNCLASSIFIED" ? "Chưa xác định" : code;
}

function inventoryAreaIdOf(row: any) {
  return (
    row.supplierLocationArea?.id ??
    (row.supplierLocationType === "AREA"
      ? row.supplierLocation?.id ?? row.supplierLocationId
      : "UNASSIGNED")
  );
}

function inventoryAreaNameOf(row: any) {
  return (
    row.supplierLocationArea?.name ??
    row.supplierLocation?.name ??
    "Chưa phân khu vực"
  );
}

function releaseQtyOf(row: any, code: "TP" | "NCC" | "UNCLASSIFIED") {
  if (row.releaseTotals) return numberOf(row.releaseTotals[code]);
  return releaseCodeOf(row) === code ? metricValue(row, "total") : 0;
}

function metricValue(row: any, metric: MatrixMetric) {
  if (metric === "actual") return numberOf(row.actualQty);
  if (metric === "sellable") return numberOf(row.sellableQty);
  if (metric === "held") return numberOf(row.heldQty);
  if (metric === "expected") return numberOf(row.expectedQty);
  if (metric === "total") {
    return numberOf(row.actualQty) + numberOf(row.expectedQty);
  }
  if (metric === "exportable") return numberOf(row.exportableQty);
  if (metric === "temporary") return numberOf(row.temporaryExportQty);
  if (metric === "nonExportable") return numberOf(row.nonExportableQty);
  if (metric === "accountingQty") return numberOf(row.accountingQty);
  return numberOf(row.accountingValue);
}

/**
 * Trục của ma trận tồn kho — đặt tên theo chiều nằm trên trục cột.
 *
 * - "byParty"     cột là NCC > mặt hàng, dòng là khu vực > kho. Bố cục gốc.
 * - "byWarehouse" cột là khu vực > kho > mặt hàng, dòng chỉ còn NCC. Mỗi NCC đúng
 *                 một dòng nên danh sách 150 NCC vẫn quét mắt được; đổi lại bảng
 *                 rộng theo (số kho × số mặt hàng).
 *
 * Mã rút TP/NCC luôn là cấp cột trong cùng ở cả hai. Hai bố cục dùng chung một bộ
 * dựng, chỉ khai báo khác nhau chiều nào xuống dòng, chiều nào lên cột.
 */
type MatrixAxis = "byParty" | "byWarehouse";

/** Một cột lá của bản xuất Excel: nhãn từng cấp tiêu đề, cấp cuối là mã rút. */
type InventoryMatrixExportColumn = {
  path: string[];
  dataIndex: string;
};

/** Một dòng dữ liệu thô đã rút gọn về đúng các chiều mà ma trận cần. */
type MatrixFact = {
  areaId: string;
  areaName: string;
  warehouseId: string;
  warehouseName: string;
  partyId: string;
  partyName: string;
  productId: string;
  productLabel: string;
  productName: string;
  releaseCode: string;
  value: number;
};

function toMatrixFacts(rows: any[], metric: MatrixMetric): MatrixFact[] {
  return rows.flatMap((row) => {
    const warehouseId = row.supplierLocation?.id ?? row.supplierLocationId;
    const productId = row.product?.id ?? row.productId;
    if (!warehouseId || !productId) return [];

    const isAreaOnly = row.supplierLocationType === "AREA";
    const productName = row.product?.name ?? "Chưa xác định";
    return [
      {
        areaId: inventoryAreaIdOf(row),
        areaName: inventoryAreaNameOf(row),
        warehouseId,
        warehouseName: isAreaOnly
          ? "Chưa xác định kho"
          : row.supplierLocation?.name ?? "Chưa xác định kho",
        partyId: supplierIdOf(row),
        partyName: supplierCodeOf(row),
        productId,
        productLabel: row.product?.code ?? productName,
        productName,
        releaseCode: releaseCodeOf(row),
        value: metricValue(row, metric),
      },
    ];
  });
}

type MatrixNode = { id: string; label: string; title?: string };
type MatrixLevel = (fact: MatrixFact) => MatrixNode;

type MatrixAxisSpec = {
  rowHeaderTitle: string;
  /** 1 hoặc 2 cấp. Có 2 cấp thì cấp đầu là dòng nhóm, cộng dồn từ các dòng con. */
  rowLevels: MatrixLevel[];
  /** 1..n cấp tiêu đề cột. Mã rút là cấp trong cùng, bộ dựng tự thêm. */
  colLevels: MatrixLevel[];
};

const areaLevel: MatrixLevel = (fact) => ({
  id: `area:${fact.areaId}`,
  label: fact.areaName,
});
const warehouseLevel: MatrixLevel = (fact) => ({
  id: fact.warehouseId,
  label: fact.warehouseName,
});
const productLevel: MatrixLevel = (fact) => ({
  id: fact.productId,
  label: fact.productLabel,
  title: fact.productName,
});

function matrixAxisSpec(axis: MatrixAxis, partyLabel: string): MatrixAxisSpec {
  if (axis === "byWarehouse") {
    return {
      rowHeaderTitle: partyLabel,
      // Chỉ NCC nằm dọc: mỗi NCC đúng một dòng, không có dòng con để bung.
      rowLevels: [(fact) => ({ id: `party:${fact.partyId}`, label: fact.partyName })],
      colLevels: [areaLevel, warehouseLevel, productLevel],
    };
  }

  return {
    rowHeaderTitle: "Khu vực / Kho",
    rowLevels: [areaLevel, warehouseLevel],
    colLevels: [
      (fact) => ({ id: fact.partyId, label: fact.partyName }),
      productLevel,
    ],
  };
}

const RELEASE_CODE_ORDER = ["TP", "NCC", "UNCLASSIFIED"];
const releaseCodeOrder = (a: string, b: string) =>
  RELEASE_CODE_ORDER.indexOf(a) - RELEASE_CODE_ORDER.indexOf(b);
const releaseCodeTitle = (code: string) => (code === "UNCLASSIFIED" ? "CXD" : code);
const byLabel = (a: { label: string }, b: { label: string }) =>
  a.label.localeCompare(b.label, "vi");

/** Nút trên cây tiêu đề cột; cấp cuối giữ danh sách mã rút thay cho con. */
type ColTreeNode = MatrixNode & {
  children: Map<string, ColTreeNode>;
  releaseCodes: Set<string>;
};

const newColNode = (node: MatrixNode): ColTreeNode => ({
  ...node,
  children: new Map(),
  // Luôn bày cả hai mã rút, kể cả mã chưa có tồn: ô trống có nghĩa là "không còn
  // hàng", đừng để người dùng nhầm thành "thiếu dữ liệu".
  releaseCodes: new Set<string>(["TP", "NCC"]),
});

function inventoryMatrix(
  rows: any[],
  metric: MatrixMetric,
  options?: { axis?: MatrixAxis; partyLabel?: string },
) {
  const spec = matrixAxisSpec(
    options?.axis ?? "byParty",
    options?.partyLabel ?? "Nhà cung cấp",
  );
  const facts = toMatrixFacts(rows, metric);

  type RowNode = MatrixNode & {
    children: Map<string, RowNode>;
    cells: Record<string, number>;
  };

  const colRoots = new Map<string, ColTreeNode>();
  const rowRoots = new Map<string, RowNode>();

  for (const fact of facts) {
    // Cây cột: đi dần xuống theo từng cấp đã khai báo.
    let colLevelNodes = colRoots;
    let colNode: ColTreeNode | undefined;
    const colPath: string[] = [];
    for (const level of spec.colLevels) {
      const node = level(fact);
      colPath.push(node.id);
      colNode = colLevelNodes.get(node.id) ?? newColNode(node);
      colLevelNodes.set(node.id, colNode);
      colLevelNodes = colNode.children;
    }
    colNode?.releaseCodes.add(fact.releaseCode);
    const cellKey = `m:${colPath.join(":")}:${fact.releaseCode}`;

    // Cây dòng: tương tự, và ô số nằm ở cấp cuối.
    let rowLevelNodes = rowRoots;
    let rowNode: RowNode | undefined;
    let rowPath = "";
    for (const level of spec.rowLevels) {
      const node = level(fact);
      // Cùng một mặt hàng/kho nằm dưới nhiều nhóm nên khóa dòng phải kèm cả đường đi.
      rowPath = rowPath ? `${rowPath}|${node.id}` : node.id;
      rowNode = rowLevelNodes.get(node.id) ?? {
        ...node,
        id: rowPath,
        children: new Map(),
        cells: {},
      };
      rowLevelNodes.set(node.id, rowNode);
      rowLevelNodes = rowNode.children;
    }
    if (rowNode) {
      rowNode.cells[cellKey] = numberOf(rowNode.cells[cellKey]) + fact.value;
    }
  }

  const sortedNodes = <T extends MatrixNode>(nodes: Map<string, T>) =>
    [...nodes.values()].sort(byLabel);

  /** Duyệt cây cột thành cột antd; cấp cuối nở ra thành các cột mã rút. */
  const buildColumns = (
    nodes: Map<string, ColTreeNode>,
    depth: number,
    parentPath: string[],
  ): any[] =>
    sortedNodes(nodes).map((node) => {
      const path = [...parentPath, node.id];
      const isLeafLevel = depth === spec.colLevels.length - 1;
      const title = <span title={node.title ?? node.label}>{node.label}</span>;
      return {
        title,
        children: isLeafLevel
          ? [...node.releaseCodes].sort(releaseCodeOrder).map((releaseCode) => ({
              title: releaseCodeTitle(releaseCode),
              dataIndex: `m:${path.join(":")}:${releaseCode}`,
              width: 88,
              align: "right" as const,
              onHeaderCell: () => ({ style: { textAlign: "center" } }),
              render: (value: unknown, record: any) =>
                record.isAreaGroup ? (
                  <strong>{n(numberOf(value))}</strong>
                ) : (
                  n(numberOf(value))
                ),
            }))
          : buildColumns(node.children, depth + 1, path),
      };
    });

  /** Cùng thứ tự duyệt như buildColumns, nhưng phẳng ra cho bản xuất Excel. */
  const buildExportColumns = (
    nodes: Map<string, ColTreeNode>,
    depth: number,
    parentPath: string[],
    parentLabels: string[],
  ): InventoryMatrixExportColumn[] =>
    sortedNodes(nodes).flatMap((node) => {
      const path = [...parentPath, node.id];
      const labels = [...parentLabels, node.label];
      return depth === spec.colLevels.length - 1
        ? [...node.releaseCodes].sort(releaseCodeOrder).map((releaseCode) => ({
            path: [...labels, releaseCodeTitle(releaseCode)],
            dataIndex: `m:${path.join(":")}:${releaseCode}`,
          }))
        : buildExportColumns(node.children, depth + 1, path, labels);
    });

  /* Dòng nhóm cộng dồn từ dòng con. Giữ nguyên tên cờ isAreaGroup dù ở bố cục đảo
     nó là dòng NCC — đổi tên sẽ phải sửa cả CSS lẫn hàm xuất Excel. */
  const toTableRow = (node: RowNode): any => {
    const children = sortedNodes(node.children).map(toTableRow);
    const totals: Record<string, number> = { ...node.cells };
    for (const child of children) {
      for (const [key, value] of Object.entries(child)) {
        if (!key.startsWith("m:")) continue;
        totals[key] = numberOf(totals[key]) + numberOf(value);
      }
    }
    return {
      id: node.id,
      warehouseName: node.label,
      warehouseTitle: node.title,
      isAreaGroup: children.length > 0,
      ...(children.length ? { children } : {}),
      ...totals,
    };
  };

  return {
    rowHeaderTitle: spec.rowHeaderTitle,
    columns: [
      {
        title: spec.rowHeaderTitle,
        dataIndex: "warehouseName",
        fixed: "left" as const,
        width: 210,
        render: (value: string, record: any) =>
          record.isAreaGroup ? (
            <strong>{value}</strong>
          ) : (
            <span title={record.warehouseTitle}>{value}</span>
          ),
      },
      ...buildColumns(colRoots, 0, []),
    ],
    rows: sortedNodes(rowRoots).map(toTableRow),
    exportColumns: buildExportColumns(colRoots, 0, [], []),
  };
}

function businessMatrixMetric(report: string): MatrixMetric {
  if (report === "quantity") return "accountingQty";
  if (report === "value") return "accountingValue";
  if (report === "sellable") return "sellable";
  if (report === "held") return "held";
  if (report === "expected") return "expected";
  return "actual";
}

const inventoryReportLabels: Record<string, string> = {
  quantity: "Ma trận tồn kế toán theo số lượng",
  value: "Ma trận tồn kế toán theo giá trị",
  actual: "Ma trận tồn thực tế",
  sellable: "Ma trận tồn có thể bán",
  held: "Ma trận tồn đang giữ/khóa",
  expected: "Ma trận hàng dự kiến",
  detail: "Chi tiết tồn kho",
};

/*
 * Tên file và tiêu đề trước đây ghi cứng "ton-kho-kinh-doanh" nên tab Tồn kế toán
 * xuất ra cũng mang tên tồn kinh doanh. Cho phép từng tab tự đặt.
 */
async function exportInventoryToExcel(
  rows: any[],
  report: string,
  options?: { fileName?: string; title?: string; axis?: MatrixAxis; partyLabel?: string },
) {
  if (!rows.length) return false;

  await exportExcelWorkbook(options?.fileName ?? "ton-kho-kinh-doanh", async (workbook) => {
    workbook.creator = "TPOIL ERP";
    const sheet = workbook.addWorksheet("Tồn kho", {
      views: [
        // Số hàng tiêu đề của ma trận đổi theo bố cục cột nên chốt lúc dựng xong.
        { state: "frozen", xSplit: 1 },
      ],
    });
    sheet.showGridLines = false;

    const title = `BÁO CÁO ${
      options?.title ?? inventoryReportLabels[report] ?? "TỒN KHO"
    }`.toUpperCase();
    const border = {
      top: { style: "thin" as const, color: { argb: "FFB9CBE5" } },
      left: { style: "thin" as const, color: { argb: "FFB9CBE5" } },
      bottom: { style: "thin" as const, color: { argb: "FFB9CBE5" } },
      right: { style: "thin" as const, color: { argb: "FFB9CBE5" } },
    };
    const headerStyle = {
      fill: {
        type: "pattern" as const,
        pattern: "solid" as const,
        fgColor: { argb: "FFEDF4FF" },
      },
      font: { bold: true, color: { argb: "FF0958D9" } },
      alignment: {
        vertical: "middle" as const,
        horizontal: "center" as const,
        wrapText: true,
      },
      border,
    };

    if (report === "detail") {
      // Bảng chi tiết chỉ có một hàng tiêu đề, nằm ở hàng 4.
      sheet.views = [{ state: "frozen", xSplit: 1, ySplit: 4 }];
      const headers = [
        "Khu vực",
        "Kho",
        "Nhà cung cấp",
        "Mặt hàng",
        "Mã rút",
        "Tồn thực tế",
        "Có thể bán",
        "Đang giữ/khóa",
        "Hàng dự kiến",
      ];
      sheet.mergeCells(1, 1, 1, headers.length);
      sheet.getCell(1, 1).value = title;
      sheet.getCell(1, 1).font = {
        bold: true,
        size: 15,
        color: { argb: "FF173A70" },
      };
      sheet.getCell(1, 1).alignment = {
        horizontal: "center",
        vertical: "middle",
      };
      sheet.getRow(1).height = 26;
      sheet.mergeCells(2, 1, 2, headers.length);
      sheet.getCell(2, 1).value = `Xuất lúc ${dayjs().format(
        "DD/MM/YYYY HH:mm"
      )} · Theo bộ lọc đang chọn`;
      sheet.getCell(2, 1).font = { italic: true, color: { argb: "FF5B6B82" } };
      sheet.getCell(2, 1).alignment = { horizontal: "center" };
      sheet.getRow(4).values = headers;
      sheet.getRow(4).height = 28;
      sheet.getRow(4).eachCell((cell) => Object.assign(cell, headerStyle));

      rows.forEach((item) => {
        const row = sheet.addRow([
          inventoryAreaNameOf(item),
          item.supplierLocation?.name ?? "Chưa xác định kho",
          supplierCodeOf(item),
          item.product?.code ?? item.product?.name ?? "Chưa xác định",
          releaseCodeLabel(item),
          numberOf(item.actualQty),
          numberOf(item.sellableQty),
          numberOf(item.heldQty),
          numberOf(item.expectedQty),
        ]);
        row.eachCell((cell, index) => {
          cell.border = border;
          cell.alignment = {
            vertical: "middle",
            horizontal: index >= 6 ? "right" : "left",
          };
        });
        for (let column = 6; column <= 9; column += 1)
          row.getCell(column).numFmt = "#,##0";
      });
      [20, 22, 20, 24, 12, 16, 16, 16, 16].forEach((width, index) => {
        sheet.getColumn(index + 1).width = width;
      });
    } else {
      const matrix = inventoryMatrix(rows, businessMatrixMetric(report), {
        axis: options?.axis,
        partyLabel: options?.partyLabel,
      });
      const columns = matrix.exportColumns;
      const lastColumn = columns.length + 1;
      sheet.mergeCells(1, 1, 1, lastColumn);
      sheet.getCell(1, 1).value = title;
      sheet.getCell(1, 1).font = {
        bold: true,
        size: 15,
        color: { argb: "FF173A70" },
      };
      sheet.getCell(1, 1).alignment = {
        horizontal: "center",
        vertical: "middle",
      };
      sheet.getRow(1).height = 26;
      sheet.mergeCells(2, 1, 2, lastColumn);
      sheet.getCell(2, 1).value = `Xuất lúc ${dayjs().format(
        "DD/MM/YYYY HH:mm"
      )} · Theo bộ lọc đang chọn`;
      sheet.getCell(2, 1).font = { italic: true, color: { argb: "FF5B6B82" } };
      sheet.getCell(2, 1).alignment = { horizontal: "center" };

      /* Tiêu đề cột dựng theo đúng số cấp mà bố cục đang chọn sinh ra (2 cấp + mã
         rút ở bố cục gốc, 3 cấp + mã rút khi cột là khu vực > kho > mặt hàng): gộp
         các ô liền nhau có chung đường dẫn tới cấp đó. */
      const headerDepth = columns[0]?.path.length ?? 1;
      const headerTop = 4;
      const headerBottom = headerTop + headerDepth - 1;
      sheet.views = [{ state: "frozen", xSplit: 1, ySplit: headerBottom }];

      sheet.mergeCells(headerTop, 1, headerBottom, 1);
      sheet.getCell(headerTop, 1).value = matrix.rowHeaderTitle;
      Object.assign(sheet.getCell(headerTop, 1), headerStyle);
      sheet.getColumn(1).width = 30;

      const samePrefix = (
        a: InventoryMatrixExportColumn,
        b: InventoryMatrixExportColumn,
        depth: number,
      ) => a.path.slice(0, depth + 1).every((value, level) => value === b.path[level]);

      for (let depth = 0; depth < headerDepth; depth += 1) {
        let index = 0;
        while (index < columns.length) {
          let last = index;
          while (last + 1 < columns.length && samePrefix(columns[last + 1], columns[index], depth)) {
            last += 1;
          }
          const from = index + 2;
          const to = last + 2;
          if (from !== to) sheet.mergeCells(headerTop + depth, from, headerTop + depth, to);
          sheet.getCell(headerTop + depth, from).value = columns[index].path[depth];
          Object.assign(sheet.getCell(headerTop + depth, from), headerStyle);
          index = last + 1;
        }
      }

      columns.forEach((_, index) => {
        sheet.getColumn(index + 2).width = 14;
      });
      for (let row = headerTop; row <= headerBottom; row += 1) {
        sheet.getRow(row).height = 22;
      }

      const addMatrixRow = (record: any, isAreaGroup: boolean) => {
        const row = sheet.addRow([
          record.warehouseName,
          ...columns.map((column) => numberOf(record[column.dataIndex])),
        ]);
        row.eachCell((cell, index) => {
          cell.border = border;
          cell.alignment = {
            vertical: "middle",
            horizontal: index === 1 ? "left" : "right",
          };
          if (index > 1) cell.numFmt = "#,##0";
        });
        if (isAreaGroup) {
          row.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: "FF173A70" } };
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF5F8FC" },
            };
          });
        } else {
          row.getCell(1).alignment = {
            vertical: "middle",
            horizontal: "left",
            indent: 1,
          };
          row.outlineLevel = 1;
        }
      };
      matrix.rows.forEach((area: any) => {
        addMatrixRow(area, true);
        (area.children ?? []).forEach((warehouse: any) =>
          addMatrixRow(warehouse, false)
        );
      });
    }
  });
  return true;
}

function useMatrixFilters(rows: any[]) {
  const [areaIds, setAreaIds] = useState<string[]>([]);
  const [supplierIds, setSupplierIds] = useState<string[]>([]);
  const [productKeyword, setProductKeyword] = useState("");

  const options = useMemo(() => {
    const areas = new Map<string, string>();
    const suppliers = new Map<string, string>();
    rows.forEach((row) => {
      const areaId = inventoryAreaIdOf(row);
      if (areaId) areas.set(areaId, inventoryAreaNameOf(row));
      suppliers.set(supplierIdOf(row), supplierCodeOf(row));
    });
    const toOptions = (items: Map<string, string>) =>
      [...items.entries()]
        .sort(([, a], [, b]) => a.localeCompare(b, "vi"))
        .map(([value, label]) => ({ value, label }));
    return { areas: toOptions(areas), suppliers: toOptions(suppliers) };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const keyword = productKeyword.trim().toLocaleLowerCase("vi");
    return rows.filter((row) => {
      const areaId = inventoryAreaIdOf(row);
      const supplierId = supplierIdOf(row);
      const productText = `${row.product?.code ?? ""} ${
        row.product?.name ?? ""
      }`.toLocaleLowerCase("vi");
      return (
        (!areaIds.length || areaIds.includes(areaId)) &&
        (!supplierIds.length || supplierIds.includes(supplierId)) &&
        (!keyword || productText.includes(keyword))
      );
    });
  }, [rows, areaIds, supplierIds, productKeyword]);

  return {
    filteredRows,
    options,
    areaIds,
    setAreaIds,
    supplierIds,
    setSupplierIds,
    productKeyword,
    setProductKeyword,
  };
}

/**
 * Chỗ để tab đang mở gắn thanh công cụ của nó lên cùng hàng với dải tab.
 *
 * Dải tab do InventoryMatrixReportPage dựng, còn thanh công cụ thuộc về từng màn con
 * (mỗi màn có bộ lọc, chế độ xem và nút xuất riêng). Thay vì kéo toàn bộ trạng thái
 * đó lên component cha, màn con bắn thanh công cụ của nó vào ô trống trên dải tab.
 */
const MatrixToolbarSlotContext = React.createContext<HTMLElement | null>(null);

const MatrixFilterBar: React.FC<{
  report: string;
  reportOptions: Array<{ value: string; label: string }>;
  onReportChange: (value: string) => void;
  filters: ReturnType<typeof useMatrixFilters>;
  partyPlaceholder?: string;
  onExportExcel?: () => void;
  exporting?: boolean;
  /** Có truyền thì hiện nút đảo trục (không áp dụng cho chế độ "Chi tiết theo dòng"). */
  axis?: MatrixAxis;
  onAxisChange?: (value: MatrixAxis) => void;
  /** Nhãn bên đối tác trên nút đảo trục: "NCC" hoặc "Khách hàng". */
  partyAxisLabel?: string;
}> = ({
  report,
  reportOptions,
  onReportChange,
  filters,
  partyPlaceholder,
  onExportExcel,
  exporting,
  axis,
  onAxisChange,
  partyAxisLabel = "NCC",
}) => {
  const toolbarSlot = React.useContext(MatrixToolbarSlotContext);
  const [filterOpen, setFilterOpen] = useState(false);
  const areaNames = new Map(
    filters.options.areas.map((item) => [item.value, item.label])
  );
  const supplierNames = new Map(
    filters.options.suppliers.map((item) => [item.value, item.label])
  );
  const activeFilters = [
    ...filters.areaIds.map((id) => ({
      key: `area:${id}`,
      label: `Khu vực: ${areaNames.get(id) ?? id}`,
      onClear: () =>
        filters.setAreaIds(filters.areaIds.filter((value) => value !== id)),
    })),
    ...filters.supplierIds.map((id) => ({
      key: `supplier:${id}`,
      label: `${partyPlaceholder ?? "Nhà cung cấp"}: ${
        supplierNames.get(id) ?? id
      }`,
      onClear: () =>
        filters.setSupplierIds(
          filters.supplierIds.filter((value) => value !== id)
        ),
    })),
  ];
  const filterPanel = (
    <div className="table-filter-panel inventory-matrix-filter-panel">
      <Space direction="vertical" size={10} style={{ width: "100%" }}>
        <div>
          <Typography.Text type="secondary">Khu vực</Typography.Text>
          <Select
            size="small"
            mode="multiple"
            allowClear
            showSearch
            maxTagCount="responsive"
            value={filters.areaIds}
            onChange={filters.setAreaIds}
            style={{ width: "100%", marginTop: 4 }}
            placeholder="Chọn khu vực"
            options={filters.options.areas}
          />
        </div>
        <div>
          <Typography.Text type="secondary">
            {partyPlaceholder ?? "Nhà cung cấp"}
          </Typography.Text>
          <Select
            size="small"
            mode="multiple"
            allowClear
            showSearch
            maxTagCount="responsive"
            value={filters.supplierIds}
            onChange={filters.setSupplierIds}
            style={{ width: "100%", marginTop: 4 }}
            placeholder={`Chọn ${
              partyPlaceholder?.toLocaleLowerCase("vi") ?? "nhà cung cấp"
            }`}
            options={filters.options.suppliers}
          />
        </div>
        {activeFilters.length ? (
          <Button
            size="small"
            onClick={() => {
              filters.setAreaIds([]);
              filters.setSupplierIds([]);
            }}
          >
            Xóa bộ lọc
          </Button>
        ) : null}
      </Space>
    </div>
  );

  const toolbar = (
    <Space size={8} wrap className="inventory-matrix-toolbar">
      <Select
        size="small"
        value={report}
        onChange={onReportChange}
        style={{ width: 190 }}
        options={reportOptions}
      />
      <Input
        size="small"
        allowClear
        prefix={<SearchOutlined />}
        value={filters.productKeyword}
        onChange={(event) => filters.setProductKeyword(event.target.value)}
        placeholder="Tìm mã hoặc tên mặt hàng"
        style={{ width: 210 }}
      />
      {/* Chọn chiều nằm trên trục cột; hai chiều còn lại tự xuống dòng. Chế độ
          "Chi tiết theo dòng" là bảng phẳng nên không có trục để đổi. */}
      {onAxisChange && report !== "detail" ? (
        <Tooltip title={`Chiều nằm trên trục cột: ${partyAxisLabel} hoặc kho`}>
          <Space size={4}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Cột:
            </Typography.Text>
            <Switch
              checked={axis === "byWarehouse"}
              onChange={(checked) => onAxisChange(checked ? "byWarehouse" : "byParty")}
              checkedChildren="Kho"
              unCheckedChildren={partyAxisLabel}
            />
          </Space>
        </Tooltip>
      ) : null}
      <Typography.Text type="secondary">
        {filters.filteredRows.length} dòng
      </Typography.Text>
      {onExportExcel ? (
        <Button
          className="inventory-export-button"
          size="small"
          icon={<DownloadOutlined />}
          loading={exporting}
          disabled={!filters.filteredRows.length}
          onClick={onExportExcel}
        >
          Xuất Excel
        </Button>
      ) : null}
      <FilterButton
        count={activeFilters.length}
        open={filterOpen}
        onOpenChange={setFilterOpen}
        content={filterPanel}
      />
    </Space>
  );

  /* Trong báo cáo ma trận, thanh công cụ được gắn thẳng vào dải tab cho cùng một
     hàng; mở màn riêng lẻ thì không có chỗ gắn nên nó tự đứng thành một hàng. */
  return (
    <>
      {toolbarSlot ? createPortal(toolbar, toolbarSlot) : <FilterToolbar right={toolbar} />}
      <FilterTags items={activeFilters} />
    </>
  );
};

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
      warehouseCode:
        row.supplierLocation?.code ??
        row.supplierLocation?.name ??
        "Chưa xác định",
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
      "vi"
    )
  );
}

const TankStatusDrawer: React.FC<{
  active: { tank: any; status: TankStatus } | null;
  onClose: () => void;
}> = ({ active, onClose }) => {
  const status = active?.status;
  const tank = active?.tank;
  const rows =
    tank && status
      ? tank.rows.filter(
          (row: any) =>
            row.source !== "COMMERCIAL_LOT_ORDER" &&
            metricValue(row, status) > 0
        )
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
              {
                key: "warehouse",
                label: "Kho",
                children: `${tank.warehouseCode} - ${tank.warehouseName}`,
              },
              {
                key: "product",
                label: "Mặt hàng",
                children: `${tank.productCode} - ${tank.productName}`,
              },
              { key: "supplier", label: "NCC", children: tank.supplierCode },
              {
                key: "quantity",
                label: "Số lượng",
                children: n(tankStatusValue(tank, status)),
              },
            ]}
          />
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={rows}
            columns={[
              {
                title: "Nguồn",
                render: (_: any, row: any) => sourceLabel(row.source),
              },
              {
                title: "Chứng từ tham chiếu",
                render: (_: any, row: any) =>
                  row.orderNo ?? row.lot?.lotNo ?? "Số dư tổng hợp kho",
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

const TankInventoryView: React.FC<{ rows: any[]; loading?: boolean }> = ({
  rows,
  loading,
}) => {
  const [active, setActive] = useState<{
    tank: any;
    status: TankStatus;
  } | null>(null);
  const tanks = useMemo(() => inventoryTanks(rows), [rows]);

  if (loading && tanks.length === 0) return <Card size="small" loading />;
  if (tanks.length === 0) return null;

  return (
    <>
      <Row gutter={[12, 12]}>
        {tanks.map((tank) => {
          const total =
            tank.exportableQty + tank.temporaryQty + tank.nonExportableQty;
          const segmentHeight = (status: TankStatus) => {
            const value = tankStatusValue(tank, status);
            if (!total || !value) return 0;
            return Math.max((value / total) * 100, 12);
          };

          return (
            <Col key={tank.key} xs={24} sm={12} lg={8} xl={6}>
              <Card
                size="small"
                style={{ height: "100%" }}
                bodyStyle={{ padding: 12 }}
              >
                <Space
                  direction="vertical"
                  size={2}
                  style={{ width: "100%", marginBottom: 10 }}
                >
                  <Typography.Text strong title={tank.productName}>
                    {tank.productCode}
                  </Typography.Text>
                  <Typography.Text
                    type="secondary"
                    ellipsis={{ tooltip: tank.warehouseName }}
                  >
                    Kho: {tank.warehouseCode}
                  </Typography.Text>
                  <Typography.Text type="secondary">
                    NCC: {tank.supplierCode}
                  </Typography.Text>
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
                  {(
                    ["exportable", "temporary", "nonExportable"] as TankStatus[]
                  ).map((status) => {
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
                          if (event.key === "Enter" || event.key === " ")
                            setActive({ tank, status });
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
                    <Typography.Text
                      type="secondary"
                      style={{ textAlign: "center", margin: "auto" }}
                    >
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
                  <Typography.Text type="secondary">
                    Trong bồn: {n(total)}
                  </Typography.Text>
                  <Typography.Text type="secondary">
                    Tạm xuất: {n(tank.temporaryQty)}
                  </Typography.Text>
                  <Typography.Text
                    type="secondary"
                    style={{ gridColumn: "1 / -1" }}
                  >
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

/**
 * Bảng ma trận dùng chung cho cả ba tab của báo cáo tồn kho.
 *
 * Trước đây mỗi tab tự dựng <Table> riêng nên trôi dạt: chỉ tab "Tồn kinh doanh"
 * có class .inventory-matrix-table (tiêu đề nhóm nền xanh, viền bảng) và dòng khu
 * vực được tô nền; hai tab kia ra bảng antd trần. Gom về một chỗ thì sửa một lần
 * là cả ba đổi theo.
 */
const InventoryMatrixTable: React.FC<{
  matrix: { rows: any[]; columns: any[] };
  loading?: boolean;
}> = ({ matrix, loading }) => (
  <Table
    className="inventory-matrix-table"
    rowKey="id"
    loading={loading}
    size="small"
    bordered
    pagination={false}
    dataSource={matrix.rows}
    columns={matrix.columns}
    expandable={{ defaultExpandAllRows: true }}
    rowClassName={(record: any) =>
      record.isAreaGroup ? "inventory-matrix-area-row" : ""
    }
    scroll={{ x: "max-content", y: 520 }}
  />
);

/** Bảng "Chi tiết theo dòng": phẳng, nhưng tiêu đề và viền vẫn theo ma trận. */
const InventoryDetailTable: React.FC<{
  rows: any[];
  loading?: boolean;
  columns: any[];
  scrollX: number;
}> = ({ rows, loading, columns, scrollX }) => (
  <Table
    className="inventory-matrix-table"
    rowKey="id"
    loading={loading}
    size="small"
    bordered
    dataSource={rows}
    columns={columns}
    scroll={{ x: scrollX, y: 520 }}
  />
);

const BusinessInventoryMatrix: React.FC<{
  rows: any[];
  report: string;
  axis?: MatrixAxis;
  loading?: boolean;
}> = ({ rows, report, axis, loading }) => {
  if (report === "tank")
    return <TankInventoryView rows={rows} loading={loading} />;
  if (report === "detail") {
    return (
      <InventoryDetailTable
        rows={rows}
        loading={loading}
        scrollX={1100}
        columns={[
          {
            title: "Nguồn",
            width: 170,
            render: (_: any, x: any) => sourceLabel(x.source),
          },
          {
            title: "Kho",
            render: (_: any, x: any) => x.supplierLocation?.name,
          },
          { title: "Mã NCC", render: (_: any, x: any) => supplierCodeOf(x) },
          {
            title: "Mã rút",
            width: 90,
            render: (_: any, x: any) => releaseCodeLabel(x),
          },
          { title: "Sản phẩm", render: (_: any, x: any) => x.product?.name },
          {
            title: "Tồn thực tế",
            align: "right",
            render: (_: any, x: any) => n(x.actualQty),
          },
          {
            title: "Có thể bán",
            align: "right",
            render: (_: any, x: any) => n(x.sellableQty),
          },
          {
            // Lượng các đơn bán đang chờ bù tại kho này; tồn bán được ưu tiên bù cho chúng.
            // Con số của cả kho × mặt hàng, hiện ở dòng lô cũ nhất.
            title: "Chờ bù đơn bán",
            align: "right",
            render: (_: any, x: any) => (Number(x.awaitingBackfillQty ?? 0) > 0 ? n(x.awaitingBackfillQty) : "—"),
          },
          {
            title: "Đang giữ/khóa",
            align: "right",
            render: (_: any, x: any) => n(x.heldQty),
          },
          {
            title: "Hàng dự kiến",
            align: "right",
            render: (_: any, x: any) => n(x.expectedQty),
          },
        ]}
      />
    );
  }

  return (
    <InventoryMatrixTable
      matrix={inventoryMatrix(rows, businessMatrixMetric(report), { axis })}
      loading={loading}
    />
  );
};

const AccountingInventoryMatrix: React.FC<{
  rows: any[];
  report: string;
  axis?: MatrixAxis;
  loading?: boolean;
}> = ({ rows, report, axis, loading }) => {
  if (report === "detail") {
    return (
      <InventoryDetailTable
        rows={rows}
        loading={loading}
        scrollX={900}
        columns={[
          {
            title: "Nguồn",
            width: 170,
            render: (_: any, x: any) => sourceLabel(x.source),
          },
          {
            title: "Kho",
            render: (_: any, x: any) => x.supplierLocation?.name,
          },
          { title: "Mã NCC", render: (_: any, x: any) => supplierCodeOf(x) },
          {
            title: "Mã rút",
            width: 90,
            render: (_: any, x: any) => releaseCodeLabel(x),
          },
          { title: "Sản phẩm", render: (_: any, x: any) => x.product?.name },
          {
            title: "Tồn kế toán",
            align: "right",
            render: (_: any, x: any) => n(x.accountingQty),
          },
          {
            title: "Giá trị hóa đơn",
            align: "right",
            render: (_: any, x: any) => `${n(x.accountingValue)} đ`,
          },
        ]}
      />
    );
  }

  return (
    <InventoryMatrixTable
      matrix={inventoryMatrix(
        rows,
        report === "value" ? "accountingValue" : "accountingQty",
        { axis }
      )}
      loading={loading}
    />
  );
};

/**
 * Ba màn tồn kho vừa là tab của "Báo cáo ma trận tồn kho", vừa có đường dẫn riêng.
 * Nằm trong tab thì nhãn tab đã nói rõ đang xem gì, thêm tiêu đề nữa là lặp hai lần
 * trên cùng một màn; mở riêng thì vẫn cần tiêu đề.
 */
type MatrixTabProps = { embedded?: boolean };

export const InventoryAvailabilityPage: React.FC<MatrixTabProps> = ({ embedded }) => {
  const [report, setReport] = useState("actual");
  const [axis, setAxis] = useState<MatrixAxis>("byParty");
  const [exporting, setExporting] = useState(false);
  const query = useOperationList("availability", { page: 1, pageSize: 200 });
  const commercialLots = useOperationList("commercialLotInventory", {
    page: 1,
    pageSize: 200,
  });
  const rows = [
    ...(query.data?.matrixItems || []),
    ...(commercialLots.data?.items || []),
  ];
  const filters = useMatrixFilters(rows);
  const loading = query.isLoading || commercialLots.isLoading;
  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const exported = await exportInventoryToExcel(filters.filteredRows, report, {
        axis,
      });
      if (exported) notify.success("Đã xuất báo cáo tồn kho ra Excel");
    } catch {
      notify.error("Xuất Excel thất bại. Vui lòng thử lại.");
    } finally {
      setExporting(false);
    }
  };
  return (
    <>
      {embedded ? null : <PageTitle title="Tồn kho kinh doanh" />}
      <MatrixFilterBar
        report={report}
        onReportChange={setReport}
        filters={filters}
        onExportExcel={handleExportExcel}
        exporting={exporting}
        axis={axis}
        onAxisChange={setAxis}
        reportOptions={[
          { value: "actual", label: "Ma trận tồn thực tế" },
          { value: "sellable", label: "Ma trận tồn có thể bán" },
          { value: "held", label: "Ma trận đang giữ/khóa" },
          { value: "expected", label: "Ma trận hàng dự kiến" },
          { value: "detail", label: "Chi tiết theo dòng" },
        ]}
      />
      {!loading && filters.filteredRows.length === 0 ? (
        <Alert
          type="info"
          showIcon
          message="Chưa có tồn thực tế hoặc hàng dự kiến từ đơn mua."
          style={{ marginBottom: 12 }}
        />
      ) : null}
      <BusinessInventoryMatrix
        rows={filters.filteredRows}
        report={report}
        axis={axis}
        loading={loading}
      />
    </>
  );
};

export const CustomerHeldInventoryPage: React.FC<MatrixTabProps> = ({ embedded }) => {
  const [axis, setAxis] = useState<MatrixAxis>("byParty");
  const [exporting, setExporting] = useState(false);
  const query = useOperationList("customerHeldInventory", {
    page: 1,
    pageSize: 500,
  });
  // Dùng lại cùng cấu trúc ma trận, nhưng trục cột là khách hàng thay vì nhà cung cấp.
  // NCC gốc vẫn còn trên từng dòng API để có thể mở rộng màn chi tiết sau này.
  const rows = (query.data?.items || []).map((item: any) => ({
    ...item,
    sourceSupplier: item.supplier,
    supplier: item.customer,
  }));
  const filters = useMatrixFilters(rows);
  // Ở màn này "đối tác" là khách hàng đang giữ hàng, không phải NCC — nhãn trục và
  // tiêu đề cột đầu phải nói đúng như vậy.
  const matrix = inventoryMatrix(filters.filteredRows, "held", {
    axis,
    partyLabel: "Khách hàng",
  });
  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const exported = await exportInventoryToExcel(filters.filteredRows, "held", {
        fileName: "ton-giu-theo-khach-hang",
        title: "Ma trận tồn đang giữ cho khách",
        axis,
        partyLabel: "Khách hàng",
      });
      if (exported) notify.success("Đã xuất tồn giữ theo khách hàng ra Excel");
    } catch {
      notify.error("Xuất Excel thất bại. Vui lòng thử lại.");
    } finally {
      setExporting(false);
    }
  };
  return (
    <>
      {embedded ? null : <PageTitle title="Tồn đang giữ theo khách hàng" />}
      <MatrixFilterBar
        report="held"
        onReportChange={() => undefined}
        filters={filters}
        partyPlaceholder="Lọc khách hàng"
        onExportExcel={handleExportExcel}
        exporting={exporting}
        axis={axis}
        onAxisChange={setAxis}
        partyAxisLabel="Khách hàng"
        reportOptions={[
          { value: "held", label: "Ma trận tồn đang giữ cho khách" },
        ]}
      />
      {!query.isLoading && filters.filteredRows.length === 0 ? (
        <Alert
          type="info"
          showIcon
          message="Chưa có lượng hàng nào đang giữ cho khách."
          style={{ marginBottom: 12 }}
        />
      ) : null}
      <InventoryMatrixTable matrix={matrix} loading={query.isLoading} />
    </>
  );
};

export const InventoryAccountingPage: React.FC<MatrixTabProps> = ({ embedded }) => {
  const [report, setReport] = useState("quantity");
  const [axis, setAxis] = useState<MatrixAxis>("byParty");
  const [exporting, setExporting] = useState(false);
  const query = useOperationList("matrix", { page: 1, pageSize: 200 });
  const rows = query.data?.accounting || [];
  const filters = useMatrixFilters(rows);
  const loading = query.isLoading;
  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const exported = await exportInventoryToExcel(filters.filteredRows, report, {
        fileName: "ton-kho-ke-toan",
        axis,
      });
      if (exported) notify.success("Đã xuất tồn kế toán ra Excel");
    } catch {
      notify.error("Xuất Excel thất bại. Vui lòng thử lại.");
    } finally {
      setExporting(false);
    }
  };
  return (
    <>
      {embedded ? null : <PageTitle title="Tồn kho kế toán" />}
      <MatrixFilterBar
        report={report}
        onReportChange={setReport}
        filters={filters}
        onExportExcel={handleExportExcel}
        exporting={exporting}
        axis={axis}
        onAxisChange={setAxis}
        reportOptions={[
          { value: "quantity", label: "Ma trận số lượng" },
          { value: "value", label: "Ma trận giá trị" },
          { value: "detail", label: "Chi tiết theo dòng" },
        ]}
      />
      {!loading && filters.filteredRows.length === 0 ? (
        <Alert
          type="info"
          showIcon
          message="Chưa có tồn kế toán hoặc hóa đơn lô đã ghi nhận."
          style={{ marginBottom: 12 }}
        />
      ) : null}
      <AccountingInventoryMatrix
        rows={filters.filteredRows}
        report={report}
        axis={axis}
        loading={loading}
      />
    </>
  );
};

const MATRIX_TABS: Array<{
  key: string;
  label: string;
  render: () => React.ReactNode;
}> = [
  { key: "business", label: "Tồn kinh doanh", render: () => <InventoryAvailabilityPage embedded /> },
  { key: "customer", label: "Theo khách hàng", render: () => <CustomerHeldInventoryPage embedded /> },
  { key: "accounting", label: "Tồn kế toán", render: () => <InventoryAccountingPage embedded /> },
];

export const InventoryMatrixReportPage = () => {
  const [tab, setTab] = useState(MATRIX_TABS[0].key);
  const [toolbarSlot, setToolbarSlot] = useState<HTMLElement | null>(null);
  const active = MATRIX_TABS.find((item) => item.key === tab) ?? MATRIX_TABS[0];

  return (
    <>
      {/* Dải tab và thanh công cụ là hai khối anh em trong một hàng flex của mình,
          chứ không nhét thanh công cụ vào tabBarExtraContent: hộp nav của antd cao
          theo nhãn tab, thanh công cụ cao hơn thì tràn ra ngoài và bị bảng bên dưới
          đè lên. Dải tab chỉ còn phần nhãn; nội dung dựng bên dưới để mỗi lúc chỉ
          một màn được mount — nếu để antd giữ cả ba thì cả ba cùng bắn thanh công
          cụ vào một ô và chúng chồng lên nhau. */}
      <div className="inventory-matrix-header">
        <Tabs
          className="inventory-matrix-tabs"
          activeKey={tab}
          onChange={setTab}
          items={MATRIX_TABS.map(({ key, label }) => ({ key, label }))}
        />
        <div className="inventory-matrix-header-tools" ref={setToolbarSlot} />
      </div>
      <MatrixToolbarSlotContext.Provider value={toolbarSlot}>
        {active.render()}
      </MatrixToolbarSlotContext.Provider>
    </>
  );
};

export { ExpectedInventoryPage } from "./ExpectedInventoryPage";

export { WarehouseReservationPage } from "./WarehouseReservationPage";

/*
 * Nhóm màn "Chuyển kho" đã tách sang warehouse-transfer-pages.tsx và dựng lại theo
 * khung <RoadListPage> + .data-grid, chỉ hiện mã. Re-export để router không phải đổi.
 */
export {
  WarehouseTransferDetailPage,
  WarehouseTransferFormPage,
  WarehouseTransferListPage,
} from "./warehouse-transfer-pages";

/*
 * Nhóm màn "Quản lý xe" đã tách sang road-vehicle-pages.tsx và dựng lại theo đúng
 * quy ước của nhóm màn kho (.data-grid + FilterButton/FilterTags). Giữ lại re-export
 * ở đây để router và các chỗ import cũ không phải đổi đường dẫn.
 */
export {
  DriverDocumentPage,
  DriverListPage,
  SalesTransportRequestDetailPage,
  SalesTransportRequestListPage,
  TransportVehicleSettingPage,
  VehicleDispatchOrderDetailPage,
  VehicleDispatchOrderFormPage,
  VehicleDispatchOrderListPage,
  VehicleDocumentPage,
  VehicleEfficiencyReportPage,
  VehicleFuelLogPage,
  VehicleListPage,
  VehicleMaintenanceExpensePage,
  VehicleMonthlyFixedCostPage,
} from "./road-vehicle-pages";
