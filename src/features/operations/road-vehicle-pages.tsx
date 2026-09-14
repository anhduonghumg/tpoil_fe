/**
 * Nhóm màn "Quản lý xe" (Vận hành).
 *
 * Trước đây mỗi màn ở đây tự dựng bố cục riêng: tiêu đề cấp 3, Card bọc bảng,
 * ô tìm kiếm rời một dòng, bảng antd mặc định — không khớp với nhóm màn kho đã
 * chuẩn hóa theo .data-grid + FilterButton/FilterTags. Toàn bộ danh sách trong
 * nhóm này nay đi qua <RoadListPage>, nên bố cục, cỡ chữ, cột thao tác và phân
 * trang giống hệt bên kho, và sửa một chỗ là cả nhóm đổi theo.
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Dropdown,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import type { MenuProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  ArrowLeftOutlined,
  EditOutlined,
  MoreOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { CustomerSelect } from "../../shared/ui/CustomerSelect";
import type { CustomerSelectRole } from "../../shared/ui/CustomerSelect";
import { notify } from "../../shared/lib/notification";
import { extractApiError } from "../../shared/lib/httpError";
import {
  FilterButton,
  FilterTags,
  RefreshButton,
} from "../../shared/ui/TableFilter";
import type { ActiveFilterTag } from "../../shared/ui/TableFilter";
import { operationsApi } from "./api";
import {
  useOperationDetail,
  useOperationList,
  useOperationMutation,
} from "./hooks";
import { FileUploadField, StatusBadge } from "./components";
import { PageHeader } from "../../shared/ui/PageHeader";
import "../../shared/ui/data-grid.css";
import "./road-operations.css";

/* ------------------------------------------------------------------ */
/* Định dạng dùng chung                                                */
/* ------------------------------------------------------------------ */

const n = (value: unknown) => Number(value || 0).toLocaleString("vi-VN");
const date = (value?: string | Date | null) =>
  value ? dayjs(value).format("DD/MM/YYYY") : "—";
const EMPTY = <span className="data-grid-empty">—</span>;

const text = (value?: string | null) =>
  value?.toString().trim() ? <span className="data-grid-clip">{value}</span> : EMPTY;

const num = (value: unknown) => <span className="data-grid-num">{n(value)}</span>;

/** Ô hai dòng: nội dung chính + dòng phụ mờ, chiều cao cố định theo .data-grid. */
const stack = (main: React.ReactNode, sub?: React.ReactNode) => (
  <div className="data-grid-stack">
    <span className="data-grid-clip">{main || "—"}</span>
    <span className="data-grid-clip data-grid-sub">{sub || "—"}</span>
  </div>
);

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  REGISTRATION: "Đăng ký xe",
  INSPECTION: "Đăng kiểm",
  INSURANCE: "Bảo hiểm",
  DRIVER_LICENSE: "Giấy phép lái xe",
  ID_CARD: "CCCD",
  TRAINING_CERTIFICATE: "Chứng chỉ đào tạo",
  OTHER: "Khác",
};

const DISPATCH_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Nháp",
  ASSIGNED: "Đã phân công",
  LOADING: "Đang bốc hàng",
  IN_TRANSIT: "Đang vận chuyển",
  DELIVERED: "Đã giao",
  CLOSED: "Đã đóng",
  CANCELLED: "Đã hủy",
};

const activeTag = (isActive?: boolean) => (
  <Tag color={isActive === false ? "default" : "green"}>
    {isActive === false ? "Ngừng" : "Hoạt động"}
  </Tag>
);

/* ------------------------------------------------------------------ */
/* Khai báo field dùng chung cho form nhập liệu                        */
/* ------------------------------------------------------------------ */

export type RoadFieldKind =
  | "text"
  | "number"
  | "money"
  | "date"
  | "datetime"
  | "month"
  | "customer"
  | "select"
  | "textarea"
  | "file";

export type RoadField = {
  name: string;
  label: string;
  kind?: RoadFieldKind;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  customerRole?: CustomerSelectRole;
  placeholder?: string;
  /** Ô rộng hơn một cột: "2" hoặc "all" (trọn hàng). */
  span?: 2 | "all";
  upper?: boolean;
};

/*
 * Ô số của nhóm màn này đều căn phải cho thẳng cột, mà cặp nút tăng/giảm của antd
 * nằm đè lên mép phải khi rê chuột — số bị che mất mấy chữ số cuối. Tắt nút đi:
 * phím mũi tên lên/xuống vẫn tăng giảm được, và ô hẹp 168px lấy lại được 22px.
 */
const numberProps = {
  min: 0,
  controls: false,
  style: { width: "100%" },
};

/** Tiền theo lối Việt: "." ngăn nhóm nghìn, "," ngăn phần lẻ. */
const moneyProps = {
  ...numberProps,
  formatter: (value?: string | number) => {
    if (value === undefined || value === null || value === "") return "";
    const [whole, fraction] = `${value}`.split(".");
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return fraction === undefined ? grouped : `${grouped},${fraction}`;
  },
  parser: (value?: string) =>
    (value ? value.replace(/\./g, "").replace(",", ".") : "") as any,
};

/**
 * Ô nhập theo khai báo field.
 *
 * Form.Item bơm value/onChange/id vào thẳng phần tử con, nên mọi prop lạ phải
 * được chuyển tiếp xuống input thật — nếu nuốt mất thì ô hiện ra nhưng không
 * nhận dữ liệu của form.
 */
const RoadFieldInput: React.FC<{
  field: RoadField;
  disabled?: boolean;
  [prop: string]: unknown;
}> = ({ field, disabled, ...rest }) => {
  const common = { disabled, placeholder: field.placeholder, ...rest };
  switch (field.kind) {
    case "number":
      return <InputNumber {...numberProps} {...(common as any)} />;
    case "money":
      return <InputNumber {...moneyProps} {...(common as any)} />;
    case "date":
      return (
        <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" {...(common as any)} />
      );
    case "datetime":
      return (
        <DatePicker
          showTime
          style={{ width: "100%" }}
          format="DD/MM/YYYY HH:mm"
          {...(common as any)}
        />
      );
    case "month":
      return (
        <DatePicker picker="month" style={{ width: "100%" }} format="MM/YYYY" {...(common as any)} />
      );
    case "customer":
      return (
        <CustomerSelect
          customerRole={field.customerRole}
          style={{ width: "100%" }}
          {...(common as any)}
        />
      );
    case "select":
      return (
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          options={field.options}
          {...(common as any)}
        />
      );
    case "textarea":
      return <Input.TextArea rows={2} {...(common as any)} />;
    case "file":
      return <FileUploadField {...(common as any)} />;
    default:
      return <Input {...(common as any)} />;
  }
};

/** Lưới ô nhập dày; cột tự co theo bề ngang khung chứa (xem road-operations.css). */
export const RoadFieldGrid: React.FC<{
  fields: RoadField[];
  disabled?: boolean;
}> = ({ fields, disabled }) => (
  <div className="road-form-grid">
    {fields.map((field) => (
      <Form.Item
        key={field.name}
        name={field.name}
        label={field.label}
        className={
          field.span === "all"
            ? "road-span-all"
            : field.span === 2
            ? "road-span-2"
            : undefined
        }
        rules={field.required ? [{ required: true, message: `Nhập ${field.label.toLowerCase()}` }] : undefined}
        normalize={field.upper ? (value) => (typeof value === "string" ? value.toUpperCase() : value) : undefined}
      >
        <RoadFieldInput field={field} disabled={disabled} />
      </Form.Item>
    ))}
  </div>
);

/** Chuyển giá trị form về dạng API nhận: ngày -> chuỗi ISO ngắn. */
const serialize = (values: Record<string, any>, fields: RoadField[]) =>
  Object.fromEntries(
    Object.entries(values).map(([key, value]) => {
      const kind = fields.find((field) => field.name === key)?.kind;
      if (kind === "datetime" && value) return [key, value.toISOString()];
      if ((kind === "date" || kind === "month") && value) {
        return [key, (kind === "month" ? value.startOf("month") : value).format("YYYY-MM-DD")];
      }
      return [key, value];
    })
  );

/** Nạp bản ghi vào form: ngày phải là dayjs thì DatePicker mới hiện. */
const deserialize = (row: any, fields: RoadField[]) =>
  Object.fromEntries(
    fields.map((field) => [
      field.name,
      (field.kind === "date" || field.kind === "month" || field.kind === "datetime") &&
      row?.[field.name]
        ? dayjs(row[field.name])
        : row?.[field.name],
    ])
  );

/* ------------------------------------------------------------------ */
/* Khung màn danh sách dùng chung                                      */
/* ------------------------------------------------------------------ */

type RoadFilter = {
  /** Tên tham số gửi lên API (với kind "dateRange" thì dùng fromName/toName). */
  name: string;
  label: string;
  kind?: "select" | "customer" | "text" | "dateRange";
  options?: Array<{ value: string; label: string }>;
  customerRole?: CustomerSelectRole;
  placeholder?: string;
  fromName?: string;
  toName?: string;
  /** Nhãn hiện trên thẻ điều kiện; nhận thêm dữ liệu trang hiện tại để tra tên. */
  display?: (value: any, rows: any[]) => string;
};

const filterToParams = (filter: RoadFilter, value: any) => {
  if (value === undefined || value === null || value === "") return {};
  if (filter.kind === "dateRange") {
    return {
      [filter.fromName ?? "from"]: value?.[0]?.format("YYYY-MM-DD"),
      [filter.toName ?? "to"]: value?.[1]?.format("YYYY-MM-DD"),
    };
  }
  return { [filter.name]: value };
};

const filterTagLabel = (filter: RoadFilter, value: any, rows: any[]) => {
  if (filter.display) return `${filter.label}: ${filter.display(value, rows)}`;
  if (filter.kind === "dateRange") {
    return `${filter.label}: ${value[0].format("DD/MM/YYYY")} – ${value[1].format("DD/MM/YYYY")}`;
  }
  if (filter.kind === "select") {
    return `${filter.label}: ${filter.options?.find((option) => option.value === value)?.label ?? value}`;
  }
  return `${filter.label}: ${value}`;
};

type RoadListPageProps = {
  title: string;
  subtitle?: string;
  resource: Parameters<typeof useOperationList>[0];
  columns: ColumnsType<any>;
  /** Bề ngang tối thiểu để antd ghim được cột thao tác bên phải. */
  scrollX?: number;
  searchPlaceholder?: string;
  totalLabel?: (total: number) => string;
  rowKey?: string | ((row: any) => string);
  /** Có save + fields thì màn tự có nút "Thêm" và mục "Sửa" trong menu dòng. */
  save?: (data: any, id?: string) => Promise<any>;
  fields?: RoadField[];
  createLabel?: string;
  formTitle?: string;
  filters?: RoadFilter[];
  statusTabs?: Array<{ value: string; label: string }>;
  defaultStatus?: string;
  extraQuery?: Record<string, unknown>;
  extraActions?: React.ReactNode;
  rowMenuItems?: (row: any) => MenuProps["items"];
  onRowOpen?: (row: any) => void;
  emptyText?: string;
};

export const RoadListPage: React.FC<RoadListPageProps> = ({
  title,
  subtitle,
  resource,
  columns,
  scrollX = 1100,
  searchPlaceholder = "Tìm kiếm",
  totalLabel = (total) => `${total} bản ghi`,
  rowKey = "id",
  save,
  fields,
  createLabel,
  formTitle,
  filters = [],
  statusTabs,
  defaultStatus = "ALL",
  extraQuery,
  extraActions,
  rowMenuItems,
  onRowOpen,
  emptyText,
}) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState<string>();
  const [status, setStatus] = useState(defaultStatus);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});
  const [filterForm] = Form.useForm();
  const [editing, setEditing] = useState<any>();
  const [formOpen, setFormOpen] = useState(false);
  const [form] = Form.useForm();

  const filterParams = useMemo(
    () =>
      filters.reduce(
        (params, filter) => ({ ...params, ...filterToParams(filter, filterValues[filter.name]) }),
        {} as Record<string, unknown>
      ),
    [filters, filterValues]
  );

  const query = useOperationList(resource, {
    page,
    pageSize,
    keyword: keyword || undefined,
    ...(statusTabs && status !== "ALL" ? { status } : {}),
    ...filterParams,
    ...extraQuery,
  });
  const rows: any[] = query.data?.items ?? (Array.isArray(query.data) ? query.data : []);
  const total = query.data?.total ?? rows.length;

  const mutation = useOperationMutation<{ data: any; id?: string }>(({ data, id }) =>
    save!(data, id)
  );

  const openForm = (row?: any) => {
    setEditing(row);
    form.resetFields();
    if (row) form.setFieldsValue(deserialize(row, fields ?? []));
    setFormOpen(true);
  };

  const submitForm = async () => {
    const values = await form.validateFields();
    try {
      await mutation.mutateAsync({ data: serialize(values, fields ?? []), id: editing?.id });
      notify.success(editing ? "Đã cập nhật." : "Đã thêm mới.");
      setFormOpen(false);
    } catch (error) {
      notify.error(extractApiError(error).message || "Không lưu được dữ liệu.");
    }
  };

  /* Cột thao tác gom vào một nút "..." rộng 46px — đúng chuẩn .data-grid bên kho,
     thay cho nút "Sửa" kiểu link chiếm 120px trên mọi dòng. */
  const actionColumn: ColumnsType<any>[number] = {
    title: "",
    key: "actions",
    width: 46,
    align: "center",
    fixed: "right",
    render: (_: unknown, row: any) => {
      const items: MenuProps["items"] = [
        ...(save && fields
          ? [{ key: "edit", icon: <EditOutlined />, label: "Sửa", onClick: () => openForm(row) }]
          : []),
        ...((rowMenuItems?.(row) ?? []) as any[]),
      ];
      if (!items.length) return null;
      return (
        <Dropdown menu={{ items }} trigger={["click"]} placement="bottomRight">
          <Button size="small" type="text" icon={<MoreOutlined />} aria-label="Thao tác" />
        </Dropdown>
      );
    },
  };

  const activeFilters = filters.filter((filter) => {
    const value = filterValues[filter.name];
    return value !== undefined && value !== null && value !== "";
  });

  const filterTags: ActiveFilterTag[] = activeFilters.map((filter) => ({
    key: filter.name,
    label: filterTagLabel(filter, filterValues[filter.name], rows),
    onClear: () => {
      filterForm.setFieldValue(filter.name, undefined);
      setFilterValues((current) => ({ ...current, [filter.name]: undefined }));
      setPage(1);
    },
  }));

  const filterPanel = (
    <Form
      className="page-shell-filter-panel"
      form={filterForm}
      layout="vertical"
      size="small"
      onFinish={(values) => {
        setFilterValues(values);
        setPage(1);
        setFilterOpen(false);
      }}
    >
      {filters.map((filter) => (
        <Form.Item key={filter.name} name={filter.name} label={filter.label}>
          {filter.kind === "customer" ? (
            <CustomerSelect
              customerRole={filter.customerRole}
              style={{ width: "100%" }}
              placeholder={filter.placeholder}
            />
          ) : filter.kind === "dateRange" ? (
            <DatePicker.RangePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
          ) : filter.kind === "text" ? (
            <Input allowClear placeholder={filter.placeholder} />
          ) : (
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              options={filter.options}
              placeholder={filter.placeholder}
            />
          )}
        </Form.Item>
      ))}
      <Space style={{ width: "100%", justifyContent: "flex-end" }}>
        <Button
          size="small"
          onClick={() => {
            filterForm.resetFields();
            setFilterValues({});
            setPage(1);
            setFilterOpen(false);
          }}
        >
          Đặt lại
        </Button>
        <Button size="small" type="primary" htmlType="submit">
          Áp dụng
        </Button>
      </Space>
    </Form>
  );

  const toolbar = (
    <Space size={6}>
      <Input.Search
        size="small"
        allowClear
        className="page-shell-search"
        placeholder={searchPlaceholder}
        onSearch={(value) => {
          setKeyword(value.trim() || undefined);
          setPage(1);
        }}
      />
      {filters.length ? (
        <FilterButton
          count={activeFilters.length}
          open={filterOpen}
          onOpenChange={(open) => {
            setFilterOpen(open);
            if (open) filterForm.setFieldsValue(filterValues);
          }}
          content={filterPanel}
        />
      ) : null}
      <RefreshButton loading={query.isFetching} onClick={() => query.refetch()} />
      {extraActions}
      {save && fields ? (
        <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => openForm()}>
          {createLabel ?? "Thêm mới"}
        </Button>
      ) : null}
    </Space>
  );

  return (
    <div className="page-shell">
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={statusTabs ? undefined : toolbar}
      />

      {statusTabs ? (
        <Tabs
          className="page-shell-tabs"
          activeKey={status}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          items={statusTabs.map((tab) => ({ key: tab.value, label: tab.label }))}
          tabBarExtraContent={{ right: toolbar }}
        />
      ) : null}

      <FilterTags items={filterTags} />

      <Table
        className="data-grid"
        rowKey={rowKey as any}
        size="small"
        bordered
        tableLayout="fixed"
        scroll={{ x: scrollX }}
        loading={query.isLoading || query.isFetching}
        columns={[...columns, actionColumn]}
        dataSource={rows}
        locale={emptyText ? { emptyText: <Empty description={emptyText} /> } : undefined}
        onRow={(row: any) => ({ onDoubleClick: () => onRowOpen?.(row) })}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (value) => totalLabel(value),
          onChange: (nextPage, nextSize) => {
            setPage(nextPage);
            setPageSize(nextSize);
          },
        }}
      />

      {save && fields ? (
        <Modal
          open={formOpen}
          title={`${editing ? "Cập nhật" : "Thêm"} ${formTitle ?? title.toLowerCase()}`}
          onCancel={() => setFormOpen(false)}
          onOk={submitForm}
          okText="Lưu"
          cancelText="Đóng"
          confirmLoading={mutation.isPending}
          width={820}
          destroyOnHidden
        >
          <Form className="road-modal-form" form={form} layout="vertical" size="small">
            <RoadFieldGrid fields={fields} />
          </Form>
        </Modal>
      ) : null}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Danh mục xe / lái xe                                                */
/* ------------------------------------------------------------------ */

const ACTIVE_OPTIONS = [
  { value: "true", label: "Đang hoạt động" },
  { value: "false", label: "Đã ngừng" },
];

/** Tên đơn vị vận tải cho thẻ điều kiện: tra ngược từ dữ liệu đang hiện trên bảng. */
const supplierName = (customerId: string, rows: any[]) =>
  rows.find((row) => row.supplierCustomerId === customerId)?.supplier?.name ?? "đã chọn";

export const VehicleListPage: React.FC = () => (
  <RoadListPage
    title="Danh mục xe"
    subtitle="Đầu kéo và xe bồn đang khai thác, kèm đơn vị vận tải và sức chứa."
    resource="vehicles"
    save={operationsApi.saveVehicle}
    searchPlaceholder="Biển số hoặc loại xe"
    createLabel="Thêm xe"
    formTitle="xe"
    totalLabel={(total) => `${total} xe`}
    scrollX={981}
    columns={[
      {
        title: "Biển số",
        dataIndex: "licensePlate",
        width: 120,
        render: (value) => <span className="data-grid-clip data-grid-strong">{value}</span>,
      },
      { title: "Loại xe", dataIndex: "type", width: 120, render: text },
      {
        title: "Đơn vị vận tải",
        width: 230,
        render: (_, row: any) => stack(row.supplier?.name, row.supplier?.code),
      },
      {
        title: "Sức chứa",
        dataIndex: "capacity",
        width: 100,
        align: "right",
        render: num,
      },
      {
        title: "Hồ sơ",
        width: 80,
        align: "right",
        render: (_, row: any) => num((row.documents ?? []).length),
      },
      { title: "Ghi chú", dataIndex: "note", width: 180, render: text },
      {
        title: "Trạng thái",
        dataIndex: "isActive",
        width: 105,
        render: (value) => activeTag(value),
      },
    ]}
    filters={[
      {
        name: "supplierCustomerId",
        label: "Đơn vị vận tải",
        kind: "customer",
        placeholder: "Chọn đơn vị vận tải",
        display: supplierName,
      },
      {
        name: "isActive",
        label: "Trạng thái",
        options: ACTIVE_OPTIONS,
        placeholder: "Chọn trạng thái",
      },
    ]}
    fields={[
      {
        name: "supplierCustomerId",
        label: "Đơn vị vận tải",
        kind: "customer",
        required: true,
        span: 2,
      },
      { name: "licensePlate", label: "Biển số", required: true, upper: true },
      { name: "type", label: "Loại xe", placeholder: "Xe bồn, đầu kéo…" },
      { name: "capacity", label: "Sức chứa (lít)", kind: "number" },
      {
        name: "isActive",
        label: "Trạng thái",
        kind: "select",
        options: [
          { value: true as any, label: "Hoạt động" },
          { value: false as any, label: "Ngừng" },
        ],
      },
      { name: "note", label: "Ghi chú", kind: "textarea", span: "all" },
    ]}
  />
);

export const DriverListPage: React.FC = () => (
  <RoadListPage
    title="Lái xe"
    subtitle="Danh sách lái xe theo từng đơn vị vận tải."
    resource="drivers"
    save={operationsApi.saveDriver}
    searchPlaceholder="Họ tên, điện thoại hoặc CCCD"
    createLabel="Thêm lái xe"
    formTitle="lái xe"
    totalLabel={(total) => `${total} lái xe`}
    scrollX={976}
    columns={[
      {
        title: "Họ tên",
        dataIndex: "fullName",
        width: 180,
        render: (value) => <span className="data-grid-clip data-grid-strong">{value}</span>,
      },
      { title: "Điện thoại", dataIndex: "phone", width: 115, render: text },
      { title: "CCCD", dataIndex: "idCard", width: 130, render: text },
      {
        title: "Đơn vị vận tải",
        width: 230,
        render: (_, row: any) => stack(row.supplier?.name, row.supplier?.code),
      },
      { title: "Ghi chú", dataIndex: "note", width: 170, render: text },
      {
        title: "Trạng thái",
        dataIndex: "isActive",
        width: 105,
        render: (value) => activeTag(value),
      },
    ]}
    filters={[
      {
        name: "supplierCustomerId",
        label: "Đơn vị vận tải",
        kind: "customer",
        placeholder: "Chọn đơn vị vận tải",
        display: supplierName,
      },
      {
        name: "isActive",
        label: "Trạng thái",
        options: ACTIVE_OPTIONS,
        placeholder: "Chọn trạng thái",
      },
    ]}
    fields={[
      {
        name: "supplierCustomerId",
        label: "Đơn vị vận tải",
        kind: "customer",
        required: true,
        span: 2,
      },
      { name: "fullName", label: "Họ tên", required: true },
      { name: "phone", label: "Điện thoại" },
      { name: "idCard", label: "CCCD" },
      {
        name: "isActive",
        label: "Trạng thái",
        kind: "select",
        options: [
          { value: true as any, label: "Hoạt động" },
          { value: false as any, label: "Ngừng" },
        ],
      },
      { name: "note", label: "Ghi chú", kind: "textarea", span: "all" },
    ]}
  />
);

/* ------------------------------------------------------------------ */
/* Định mức, nhiên liệu, sửa chữa, chi phí cố định                     */
/* ------------------------------------------------------------------ */

export const TransportVehicleSettingPage: React.FC = () => (
  <RoadListPage
    title="Định mức xe và nhiên liệu"
    subtitle="Định mức tiêu hao và giá nhiên liệu áp dụng theo từng mốc thời gian."
    resource="transportVehicleSettings"
    save={operationsApi.saveTransportVehicleSetting}
    searchPlaceholder="Biển số xe"
    createLabel="Thêm định mức"
    formTitle="định mức"
    totalLabel={(total) => `${total} định mức`}
    scrollX={966}
    columns={[
      {
        title: "Biển số",
        dataIndex: "vehiclePlate",
        width: 130,
        render: (value) => <span className="data-grid-clip data-grid-strong">{value}</span>,
      },
      {
        title: "Áp dụng từ",
        dataIndex: "effectiveFrom",
        width: 120,
        render: (value) => date(value),
      },
      {
        title: "Định mức (lít/100km)",
        dataIndex: "fuelConsumptionPer100",
        width: 160,
        align: "right",
        render: num,
      },
      {
        title: "Giá nhiên liệu",
        dataIndex: "fuelUnitPrice",
        width: 140,
        align: "right",
        render: num,
      },
      {
        title: "Phụ cấp chuyến",
        dataIndex: "defaultTripAllowance",
        width: 150,
        align: "right",
        render: num,
      },
      { title: "Ghi chú", dataIndex: "note", width: 220, render: text },
    ]}
    fields={[
      { name: "vehiclePlate", label: "Biển số xe", required: true, upper: true },
      { name: "effectiveFrom", label: "Áp dụng từ", kind: "date", required: true },
      {
        name: "fuelConsumptionPer100",
        label: "Định mức (lít/100km)",
        kind: "number",
        required: true,
      },
      { name: "fuelUnitPrice", label: "Giá nhiên liệu bình quân", kind: "money", required: true },
      { name: "defaultTripAllowance", label: "Phụ cấp theo chuyến", kind: "money" },
      { name: "note", label: "Ghi chú", kind: "textarea", span: "all" },
    ]}
  />
);

export const VehicleFuelLogPage: React.FC = () => (
  <RoadListPage
    title="Nhật ký đổ dầu xe"
    subtitle="Từng lần bơm nhiên liệu để đối chiếu với định mức tiêu hao."
    resource="vehicleFuelLogs"
    save={operationsApi.saveVehicleFuelLog}
    searchPlaceholder="Biển số hoặc người đổ"
    createLabel="Thêm lần đổ"
    formTitle="lần đổ dầu"
    totalLabel={(total) => `${total} lần đổ`}
    scrollX={1051}
    columns={[
      {
        title: "Biển số",
        dataIndex: "vehiclePlate",
        width: 120,
        render: (value) => <span className="data-grid-clip data-grid-strong">{value}</span>,
      },
      { title: "Ngày bơm", dataIndex: "fueledAt", width: 110, render: (value) => date(value) },
      { title: "Công tơ mét", dataIndex: "odometerKm", width: 115, align: "right", render: num },
      { title: "Số lít", dataIndex: "liters", width: 100, align: "right", render: num },
      { title: "Đơn giá", dataIndex: "unitPrice", width: 115, align: "right", render: num },
      {
        title: "Thành tiền",
        dataIndex: "amount",
        width: 135,
        align: "right",
        render: (value) => <span className="data-grid-num data-grid-strong">{n(value)}</span>,
      },
      { title: "Người đổ", dataIndex: "fueledBy", width: 140, render: text },
      { title: "Ghi chú", dataIndex: "note", width: 170, render: text },
    ]}
    fields={[
      { name: "vehiclePlate", label: "Biển số xe", required: true, upper: true },
      { name: "fueledAt", label: "Ngày bơm", kind: "date", required: true },
      { name: "odometerKm", label: "Công tơ mét", kind: "number" },
      { name: "liters", label: "Số lít", kind: "number", required: true },
      { name: "unitPrice", label: "Đơn giá", kind: "money", required: true },
      { name: "fueledBy", label: "Người đổ" },
      { name: "note", label: "Ghi chú", kind: "textarea", span: "all" },
    ]}
  />
);

export const VehicleMaintenanceExpensePage: React.FC = () => (
  <RoadListPage
    title="Sửa chữa và thay thế xe"
    subtitle="Chi phí sửa chữa, phụ tùng và số tháng phân bổ vào giá thành chuyến."
    resource="vehicleMaintenanceExpenses"
    save={operationsApi.saveVehicleMaintenanceExpense}
    searchPlaceholder="Biển số, nội dung hoặc nhà cung cấp"
    createLabel="Thêm chi phí"
    formTitle="chi phí sửa chữa"
    totalLabel={(total) => `${total} chứng từ`}
    scrollX={1151}
    columns={[
      {
        title: "Biển số",
        dataIndex: "vehiclePlate",
        width: 120,
        render: (value) => <span className="data-grid-clip data-grid-strong">{value}</span>,
      },
      {
        title: "Ngày chứng từ",
        dataIndex: "documentDate",
        width: 115,
        render: (value) => date(value),
      },
      {
        title: "Nội dung",
        width: 210,
        render: (_, row: any) => stack(row.description, row.supplierName),
      },
      { title: "Trước thuế", dataIndex: "amountBeforeTax", width: 125, align: "right", render: num },
      { title: "Thuế", dataIndex: "taxAmount", width: 105, align: "right", render: num },
      {
        title: "Tổng",
        dataIndex: "totalAmount",
        width: 135,
        align: "right",
        render: (value) => <span className="data-grid-num data-grid-strong">{n(value)}</span>,
      },
      { title: "Hóa đơn", dataIndex: "invoiceStatus", width: 105, render: text },
      { title: "Số km", dataIndex: "odometerKm", width: 95, align: "right", render: num },
      {
        title: "Phân bổ",
        width: 95,
        align: "right",
        render: (_, row: any) => (
          <span className="data-grid-num">{`${row.allocationMonths || 1} tháng`}</span>
        ),
      },
    ]}
    fields={[
      { name: "vehiclePlate", label: "Biển số xe", required: true, upper: true },
      { name: "documentDate", label: "Ngày chứng từ", kind: "date", required: true },
      { name: "supplierName", label: "Nhà cung cấp" },
      { name: "description", label: "Nội dung sửa chữa", required: true, span: "all" },
      { name: "amountBeforeTax", label: "Giá trước thuế", kind: "money" },
      { name: "taxAmount", label: "Thuế", kind: "money" },
      { name: "invoiceStatus", label: "Tình trạng hóa đơn" },
      { name: "allocationMonths", label: "Số tháng phân bổ", kind: "number" },
      { name: "odometerKm", label: "Số km", kind: "number" },
      { name: "note", label: "Ghi chú", kind: "textarea", span: "all" },
    ]}
  />
);

export const VehicleMonthlyFixedCostPage: React.FC = () => (
  <RoadListPage
    title="Khấu hao và lương lái xe"
    subtitle="Chi phí cố định theo tháng, dùng để tính lợi nhuận sau chi phí cố định của từng xe."
    resource="vehicleMonthlyFixedCosts"
    save={operationsApi.saveVehicleMonthlyFixedCost}
    searchPlaceholder="Biển số xe"
    createLabel="Thêm chi phí tháng"
    formTitle="chi phí cố định"
    totalLabel={(total) => `${total} dòng`}
    scrollX={956}
    columns={[
      {
        title: "Biển số",
        dataIndex: "vehiclePlate",
        width: 130,
        render: (value) => <span className="data-grid-clip data-grid-strong">{value}</span>,
      },
      {
        title: "Tháng",
        dataIndex: "month",
        width: 110,
        render: (value) => (value ? dayjs(value).format("MM/YYYY") : "—"),
      },
      { title: "Khấu hao", dataIndex: "depreciationCost", width: 150, align: "right", render: num },
      {
        title: "Lương lái xe",
        dataIndex: "driverSalaryCost",
        width: 150,
        align: "right",
        render: num,
      },
      {
        title: "Tổng cố định",
        width: 150,
        align: "right",
        render: (_, row: any) => (
          <span className="data-grid-num data-grid-strong">
            {n(Number(row.depreciationCost || 0) + Number(row.driverSalaryCost || 0))}
          </span>
        ),
      },
      { title: "Ghi chú", dataIndex: "note", width: 220, render: text },
    ]}
    fields={[
      { name: "vehiclePlate", label: "Biển số xe", required: true, upper: true },
      { name: "month", label: "Tháng áp dụng", kind: "month", required: true },
      { name: "depreciationCost", label: "Khấu hao", kind: "money" },
      { name: "driverSalaryCost", label: "Lương lái xe", kind: "money" },
      { name: "note", label: "Ghi chú", kind: "textarea", span: "all" },
    ]}
  />
);

/* ------------------------------------------------------------------ */
/* Hồ sơ xe / hồ sơ lái xe                                             */
/* ------------------------------------------------------------------ */

const VEHICLE_DOCUMENT_TYPES = ["REGISTRATION", "INSPECTION", "INSURANCE", "OTHER"];
const DRIVER_DOCUMENT_TYPES = ["DRIVER_LICENSE", "ID_CARD", "TRAINING_CERTIFICATE", "OTHER"];

/** Hạn hồ sơ: quá hạn và sắp hết hạn phải nhận ra ngay trên bảng. */
const expiryTag = (value?: string | null) => {
  if (!value) return EMPTY;
  const remaining = dayjs(value).startOf("day").diff(dayjs().startOf("day"), "day");
  const color = remaining < 0 ? "volcano" : remaining <= 30 ? "gold" : "default";
  return (
    <Tag color={color}>
      {date(value)}
      {remaining < 0 ? " · quá hạn" : remaining <= 30 ? ` · còn ${remaining} ngày` : ""}
    </Tag>
  );
};

const DOCUMENT_FIELDS = (types: string[]): RoadField[] => [
  {
    name: "documentType",
    label: "Loại hồ sơ",
    kind: "select",
    required: true,
    options: types.map((value) => ({ value, label: DOCUMENT_TYPE_LABELS[value] ?? value })),
  },
  { name: "documentNo", label: "Số hồ sơ" },
  { name: "issuedDate", label: "Ngày cấp", kind: "date" },
  { name: "expiredDate", label: "Hết hạn", kind: "date" },
  { name: "fileUrl", label: "File đính kèm", kind: "file" },
  { name: "note", label: "Ghi chú", kind: "textarea", span: "all" },
];

const DocumentManagerPage: React.FC<{ type: "vehicle" | "driver" }> = ({ type }) => {
  const isVehicle = type === "vehicle";
  const [selectedId, setSelectedId] = useState<string>();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>();
  const [form] = Form.useForm();

  const list = useOperationList(isVehicle ? "vehicles" : "drivers", { page: 1, pageSize: 200 });
  const detail = useOperationDetail(isVehicle ? "vehicle" : "driver", selectedId);
  const mutation = useOperationMutation<{ data: any; id?: string }>(({ data, id }) =>
    isVehicle
      ? operationsApi.saveVehicleDocument(selectedId!, data, id)
      : operationsApi.saveDriverDocument(selectedId!, data, id)
  );

  const fields = DOCUMENT_FIELDS(isVehicle ? VEHICLE_DOCUMENT_TYPES : DRIVER_DOCUMENT_TYPES);
  const options = (list.data?.items ?? []).map((row: any) => ({
    value: row.id,
    label: isVehicle ? row.licensePlate : row.fullName,
  }));
  const documents: any[] = detail.data?.documents ?? [];

  const openForm = (row?: any) => {
    setEditing(row);
    form.resetFields();
    if (row) form.setFieldsValue(deserialize(row, fields));
    setFormOpen(true);
  };

  const submitForm = async () => {
    const values = await form.validateFields();
    try {
      await mutation.mutateAsync({ data: serialize(values, fields), id: editing?.id });
      notify.success(editing ? "Đã cập nhật hồ sơ." : "Đã thêm hồ sơ.");
      setFormOpen(false);
    } catch (error) {
      notify.error(extractApiError(error).message || "Không lưu được hồ sơ.");
    }
  };

  const columns: ColumnsType<any> = [
    {
      title: "Loại hồ sơ",
      dataIndex: "documentType",
      width: 190,
      render: (value) => (
        <span className="data-grid-clip data-grid-strong">
          {DOCUMENT_TYPE_LABELS[value] ?? value}
        </span>
      ),
    },
    { title: "Số hồ sơ", dataIndex: "documentNo", width: 180, render: text },
    { title: "Ngày cấp", dataIndex: "issuedDate", width: 120, render: (value) => date(value) },
    { title: "Hết hạn", dataIndex: "expiredDate", width: 180, render: expiryTag },
    {
      title: "File",
      dataIndex: "fileUrl",
      width: 110,
      render: (value) =>
        value ? (
          <Typography.Link href={value} target="_blank">
            Xem file
          </Typography.Link>
        ) : (
          EMPTY
        ),
    },
    { title: "Ghi chú", dataIndex: "note", render: text },
    {
      title: "",
      key: "actions",
      width: 46,
      align: "center",
      fixed: "right",
      render: (_, row: any) => (
        <Dropdown
          trigger={["click"]}
          placement="bottomRight"
          menu={{
            items: [
              { key: "edit", icon: <EditOutlined />, label: "Sửa hồ sơ", onClick: () => openForm(row) },
            ],
          }}
        >
          <Button size="small" type="text" icon={<MoreOutlined />} aria-label="Thao tác hồ sơ" />
        </Dropdown>
      ),
    },
  ];

  return (
    <div className="page-shell">
      <PageHeader
        title={isVehicle ? "Hồ sơ xe" : "Hồ sơ lái xe"}
        subtitle={
          isVehicle
            ? "Đăng ký, đăng kiểm và bảo hiểm của từng đầu xe."
            : "Giấy phép lái xe, CCCD và chứng chỉ đào tạo của từng lái xe."
        }
        actions={
          <Space size={6}>
            <Select
              size="small"
              showSearch
              allowClear
              optionFilterProp="label"
              className="page-shell-search"
              placeholder={isVehicle ? "Chọn xe" : "Chọn lái xe"}
              options={options}
              value={selectedId}
              onChange={setSelectedId}
              loading={list.isFetching}
            />
            <RefreshButton
              loading={detail.isFetching}
              onClick={() => (selectedId ? detail.refetch() : list.refetch())}
            />
            <Button
              size="small"
              type="primary"
              icon={<PlusOutlined />}
              disabled={!selectedId}
              onClick={() => openForm()}
            >
              Thêm hồ sơ
            </Button>
          </Space>
        }
      />

      <Table
        className="data-grid"
        rowKey="id"
        size="small"
        bordered
        tableLayout="fixed"
        scroll={{ x: 940 }}
        loading={Boolean(selectedId) && detail.isFetching}
        columns={columns}
        dataSource={selectedId ? documents : []}
        pagination={false}
        locale={{
          emptyText: (
            <Empty
              description={
                selectedId
                  ? "Chưa có hồ sơ nào."
                  : `Chọn ${isVehicle ? "xe" : "lái xe"} ở trên để xem hồ sơ.`
              }
            />
          ),
        }}
      />

      <Modal
        open={formOpen}
        title={editing ? "Cập nhật hồ sơ" : "Thêm hồ sơ"}
        onCancel={() => setFormOpen(false)}
        onOk={submitForm}
        okText="Lưu"
        cancelText="Đóng"
        confirmLoading={mutation.isPending}
        width={760}
        destroyOnHidden
      >
        <Form className="road-modal-form" form={form} layout="vertical" size="small">
          <RoadFieldGrid fields={fields} />
        </Form>
      </Modal>
    </div>
  );
};

export const VehicleDocumentPage: React.FC = () => <DocumentManagerPage type="vehicle" />;
export const DriverDocumentPage: React.FC = () => <DocumentManagerPage type="driver" />;

/* ------------------------------------------------------------------ */
/* Đơn có cước vận chuyển                                              */
/* ------------------------------------------------------------------ */

const TRANSPORT_STATUS_META: Record<string, { label: string; color: string }> = {
  NEW: { label: "Mới", color: "orange" },
  ACKNOWLEDGED: { label: "Đang bổ sung", color: "blue" },
  COMPLETED: { label: "Hoàn tất", color: "green" },
  CANCELLED: { label: "Đã hủy", color: "default" },
};

const transportStatusTag = (status?: string) => {
  const meta = TRANSPORT_STATUS_META[status ?? ""] ?? { label: status ?? "—", color: "default" };
  return <Tag color={meta.color}>{meta.label}</Tag>;
};

const profitCell = (value: unknown) => (
  <Typography.Text
    strong
    className="data-grid-num"
    type={Number(value || 0) < 0 ? "danger" : undefined}
  >
    {n(value)}
  </Typography.Text>
);

export const SalesTransportRequestListPage: React.FC = () => {
  const navigate = useNavigate();
  const open = (row: any) => navigate(`/operations/sales-transport-requests/${row.id}`);

  return (
    <RoadListPage
      title="Đơn có cước vận chuyển"
      subtitle="Bổ sung chi phí thực tế cho từng chuyến. Việc này không làm thay đổi trạng thái đơn bán hàng."
      resource="salesTransportRequests"
      searchPlaceholder="Mã chuyến, đơn bán hoặc khách hàng"
      totalLabel={(total) => `${total} chuyến`}
      scrollX={1091}
      onRowOpen={open}
      statusTabs={[
        { value: "NEW", label: "Mới" },
        { value: "ACKNOWLEDGED", label: "Đang bổ sung" },
        { value: "COMPLETED", label: "Hoàn tất" },
        { value: "ALL", label: "Tất cả" },
      ]}
      columns={[
        {
          /* Mã chuyến là "CX-" ghép với số đơn bán, nên để hai cột riêng là chép lại
             gần như cùng một chuỗi và ngốn tới 380px. Xếp chồng vào một cột: dòng
             chính mở chuyến, dòng phụ là số đơn bán để đối chiếu. */
          title: "Chuyến / đơn bán",
          width: 215,
          render: (_, row: any) => (
            <div className="data-grid-stack">
              <Button type="link" className="page-cell-link" onClick={() => open(row)}>
                <span className="data-grid-clip data-grid-strong">{row.tripNo}</span>
              </Button>
              <span className="data-grid-clip data-grid-sub">{row.salesOrder?.orderNo ?? "—"}</span>
            </div>
          ),
        },
        {
          /* Mã khách thay vì tên: tên công ty xăng dầu dài gần hết ô, cắt đi thì cũng
             chẳng phân biệt được khách nào với khách nào. */
          title: "Khách hàng",
          width: 110,
          render: (_, row: any) => text(row.salesOrder?.customer?.code),
        },
        {
          title: "Ngày đơn",
          width: 95,
          render: (_, row: any) => date(row.salesOrder?.orderDate),
        },
        {
          title: "BKS / lái xe",
          width: 145,
          render: (_, row: any) => stack(row.plannedVehiclePlate, row.plannedDriverName),
        },
        {
          title: "Doanh thu cước",
          dataIndex: "transportFeeAmount",
          width: 125,
          align: "right",
          render: num,
        },
        { title: "Tổng chi phí", dataIndex: "totalCost", width: 115, align: "right", render: num },
        {
          title: "Lãi gộp",
          dataIndex: "grossProfit",
          width: 120,
          align: "right",
          render: profitCell,
        },
        {
          title: "Trạng thái",
          dataIndex: "status",
          width: 120,
          render: transportStatusTag,
        },
      ]}
      rowMenuItems={(row) => [
        { key: "open", label: "Mở chuyến", onClick: () => open(row) },
        {
          key: "order",
          label: "Mở đơn bán",
          onClick: () => navigate(`/sales/orders/${row.salesOrder?.id}`),
        },
      ]}
    />
  );
};

/**
 * Màn chi tiết chuyến có cước.
 *
 * Bản cũ xếp dọc: Alert, Card thông tin Sale (Descriptions + bảng dòng hàng),
 * rồi Card form 17 ô chia 3 cột — tổng cộng hơn hai màn hình, lãi gộp nằm tít
 * dưới và nút lưu còn thấp hơn nữa. Ở đây: thông tin Sale nén thành một dải
 * nhãn/giá trị, bảng dòng hàng chuyển vào modal (chỉ tra khi cần), toàn bộ ô
 * nhập nằm trong một lưới dày tự co theo bề ngang, còn kết quả tự tính và hai
 * nút lưu ghim bên phải nên luôn trong tầm mắt.
 */
const TRIP_FIELDS: RoadField[] = [
  { name: "actualVehiclePlate", label: "BKS thực tế", upper: true },
  { name: "actualDriverName", label: "Lái xe thực tế" },
  { name: "actualTripDate", label: "Ngày chạy", kind: "date" },
  { name: "tripDistanceKm", label: "Khoảng cách (km)", kind: "number" },
  { name: "fuelConsumptionPer100", label: "Định mức (l/100km)", kind: "number" },
  { name: "fuelUnitPrice", label: "Đơn giá nhiên liệu", kind: "money" },
];

const COST_FIELDS: RoadField[] = [
  { name: "driverAllowance", label: "Phụ cấp chuyến", kind: "money" },
  { name: "warehouseEntryFee", label: "Phí vào kho", kind: "money" },
  { name: "tollAndTerminalFee", label: "VETC / cầu đường", kind: "money" },
  { name: "portDeliverySurcharge", label: "Phụ phí giao ở cảng", kind: "money" },
  { name: "stationAgencyDutyFee", label: "Trạm / đại lý / trực ban", kind: "money" },
  { name: "portTicketFee", label: "Vé / phí cầu cảng", kind: "money" },
  { name: "invoiceIssuanceFee", label: "Chi phí xuất hóa đơn", kind: "money" },
  { name: "loadingUnloadingFee", label: "Chi phí bốc dỡ", kind: "money" },
  { name: "otherExpense", label: "Chi phí khác", kind: "money" },
];

const WATCHED_COST_FIELDS = COST_FIELDS.map((field) => field.name);

export const SalesTransportRequestDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [linesOpen, setLinesOpen] = useState(false);
  const detail = useOperationDetail("salesTransportRequest", id);
  const save = useOperationMutation<any>((values) =>
    operationsApi.saveSalesTransportActual(id!, values)
  );

  const watched = Form.useWatch([], form) ?? {};
  const numberOf = (name: string) => Number(watched?.[name] || 0);
  const fuelConsumedQty = (numberOf("tripDistanceKm") * numberOf("fuelConsumptionPer100")) / 100;
  const fuelCost = fuelConsumedQty * numberOf("fuelUnitPrice");
  const otherCost = WATCHED_COST_FIELDS.reduce((sum, name) => sum + numberOf(name), 0);
  const totalCost = fuelCost + otherCost;
  const transportRevenue = Number(detail.data?.transportFeeAmount || 0);
  const grossProfit = transportRevenue - totalCost;

  useEffect(() => {
    const request = detail.data;
    if (!request) return;
    const actual = request.actual || {};
    form.setFieldsValue({
      actualVehiclePlate: actual.actualVehiclePlate ?? request.plannedVehiclePlate,
      actualDriverName: actual.actualDriverName ?? request.plannedDriverName,
      actualTripDate: actual.actualTripDate
        ? dayjs(actual.actualTripDate)
        : dayjs(request.salesOrder.orderDate),
      tripDistanceKm: Number(actual.tripDistanceKm || 0),
      fuelConsumptionPer100: Number(
        actual.fuelConsumptionPer100 || request.suggestedSettings?.fuelConsumptionPer100 || 0
      ),
      fuelUnitPrice: Number(actual.fuelUnitPrice || request.suggestedSettings?.fuelUnitPrice || 0),
      warehouseEntryFee: Number(actual.warehouseEntryFee || 0),
      tollAndTerminalFee: Number(actual.tollAndTerminalFee || 0),
      portDeliverySurcharge: Number(actual.portDeliverySurcharge || 0),
      stationAgencyDutyFee: Number(actual.stationAgencyDutyFee || 0),
      portTicketFee: Number(actual.portTicketFee || 0),
      invoiceIssuanceFee: Number(actual.invoiceIssuanceFee || 0),
      driverAllowance: Number(
        actual.driverAllowance || request.suggestedSettings?.defaultTripAllowance || 0
      ),
      loadingUnloadingFee: Number(actual.loadingUnloadingFee || 0),
      otherExpense: Number(actual.otherExpense || 0),
      note: actual.note,
    });
  }, [detail.data, form]);

  const submit = async (complete: boolean) => {
    try {
      const values = await form.validateFields();
      save.mutate(
        { ...values, complete, actualTripDate: values.actualTripDate?.format("YYYY-MM-DD") },
        {
          onSuccess: () =>
            notify.success(complete ? "Đã hoàn tất chuyến xe." : "Đã lưu nháp thông tin chuyến."),
          onError: (error) => notify.error(extractApiError(error).message || "Không lưu được chuyến."),
        }
      );
    } catch {
      // Form đã tô đỏ ô sai; điều kiện hoàn tất vẫn được server kiểm lại.
    }
  };

  if (detail.isLoading) return <Card loading />;
  if (!detail.data)
    return <Alert type="error" showIcon message="Không tìm thấy yêu cầu cước vận chuyển." />;

  const request = detail.data;
  const lines: any[] = request.salesOrder.lines ?? [];
  const feeLines = lines.filter((line: any) => line.isTransportFeeApplicable);
  const missingFields: string[] = request.missingFields ?? [];

  const meta = [
    { label: "Số đơn", value: request.salesOrder.orderNo },
    { label: "Khách hàng", value: request.salesOrder.customer?.name || "—" },
    { label: "Ngày đơn", value: date(request.salesOrder.orderDate) },
    { label: "BKS kế hoạch", value: request.plannedVehiclePlate || "—" },
    { label: "Lái xe kế hoạch", value: request.plannedDriverName || "—" },
    { label: "Doanh thu cước", value: n(request.transportFeeAmount) },
  ];

  return (
    <div className="road-detail-page">
      <PageHeader
        title={`Chuyến ${request.tripNo || ""}`}
        subtitle="Chỉ cập nhật hồ sơ cước và chi phí chuyến; đơn bán vẫn được xử lý độc lập."
        actions={
          <Space size={6}>
            {transportStatusTag(request.status)}
            <Button size="small" onClick={() => setLinesOpen(true)}>
              {`Dòng hàng có cước (${feeLines.length})`}
            </Button>
            <Button
              size="small"
              onClick={() => navigate(`/sales/orders/${request.salesOrder.id}`)}
            >
              Mở đơn bán
            </Button>
            <Button
              size="small"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate("/operations/sales-transport-requests")}
            >
              Danh sách
            </Button>
          </Space>
        }
      />

      <div className="road-meta-strip">
        {meta.map((item) => (
          <div key={item.label}>
            <span>{item.label}</span>
            <strong title={String(item.value)}>{item.value}</strong>
          </div>
        ))}
      </div>

      <div className="road-detail-body">
        <Card className="road-detail-card" size="small" title="Thông tin chuyến và chi phí thực tế">
          <Form form={form} layout="vertical" size="small">
            <div className="road-form-grid">
              <div className="road-form-section">Chuyến thực tế</div>
              {TRIP_FIELDS.map((field) => (
                <Form.Item key={field.name} name={field.name} label={field.label}>
                  <RoadFieldInput field={field} />
                </Form.Item>
              ))}
              <div className="road-field-hint road-span-all">
                Nhiên liệu tiêu hao tự tính: <strong>{n(fuelConsumedQty)}</strong> lít · thành tiền{" "}
                <strong>{n(fuelCost)}</strong> đ
              </div>

              <div className="road-form-section road-section-cost">Chi phí thực tế</div>
              {COST_FIELDS.map((field) => (
                <Form.Item key={field.name} name={field.name} label={field.label}>
                  <RoadFieldInput field={field} />
                </Form.Item>
              ))}

              <Form.Item name="note" label="Ghi chú" className="road-span-all">
                <Input.TextArea rows={2} placeholder="Ghi chú cho kế toán hoặc điều độ" />
              </Form.Item>
            </div>
          </Form>
        </Card>

        <aside className="road-result-panel">
          <div className="road-result-title">Kết quả tự tính</div>
          <div className="road-result-row">
            <span>Doanh thu cước</span>
            <strong>{n(transportRevenue)}</strong>
          </div>
          <div className="road-result-row">
            <span>Nhiên liệu tiêu hao</span>
            <strong>{`${n(fuelConsumedQty)} lít`}</strong>
          </div>
          <div className="road-result-row">
            <span>Chi phí nhiên liệu</span>
            <strong>{n(fuelCost)}</strong>
          </div>
          <div className="road-result-row">
            <span>Chi phí khác</span>
            <strong>{n(otherCost)}</strong>
          </div>
          <div className="road-result-row road-result-cost">
            <span>Tổng chi phí</span>
            <strong>{n(totalCost)}</strong>
          </div>
          <div
            className={`road-result-row road-result-total ${
              grossProfit < 0 ? "road-result-negative" : "road-result-positive"
            }`}
          >
            <span>Lãi gộp</span>
            <strong>{n(grossProfit)}</strong>
          </div>

          {request.status !== "COMPLETED" && missingFields.length ? (
            <div className="road-result-warning">
              <strong>Còn thiếu để hoàn tất</strong>
              {missingFields.join(", ")}
            </div>
          ) : null}

          <div className="road-result-actions">
            <Button size="small" onClick={() => submit(false)} loading={save.isPending}>
              Lưu nháp
            </Button>
            <Button
              size="small"
              type="primary"
              onClick={() => submit(true)}
              loading={save.isPending}
            >
              Hoàn tất
            </Button>
          </div>
        </aside>
      </div>

      <Modal
        open={linesOpen}
        title="Dòng hàng của đơn bán"
        onCancel={() => setLinesOpen(false)}
        footer={null}
        width={760}
      >
        <Table
          className="data-grid"
          size="small"
          bordered
          rowKey="id"
          pagination={false}
          dataSource={lines}
          columns={[
            {
              title: "Mặt hàng",
              render: (_, line: any) => text(line.product?.code || line.product?.name),
            },
            {
              title: "Số lượng",
              align: "right",
              width: 150,
              render: (_, line: any) => (
                <span className="data-grid-num">{`${n(line.orderedActualQty)} ${
                  line.product?.uom || ""
                }`}</span>
              ),
            },
            {
              title: "CPVC/đv",
              align: "right",
              width: 120,
              render: (_, line: any) =>
                line.isTransportFeeApplicable ? num(line.transportFeeUnitPrice) : EMPTY,
            },
            {
              title: "Doanh thu cước",
              align: "right",
              width: 150,
              render: (_, line: any) =>
                line.isTransportFeeApplicable
                  ? num(
                      Number(line.orderedActualQty || 0) * Number(line.transportFeeUnitPrice || 0)
                    )
                  : "Không thu cước",
            },
          ]}
        />
      </Modal>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Hiệu quả xe theo tháng                                              */
/* ------------------------------------------------------------------ */

export const VehicleEfficiencyReportPage: React.FC = () => {
  const [range, setRange] = useState<[any, any]>([dayjs().startOf("year"), dayjs()]);
  const [vehiclePlate, setVehiclePlate] = useState("");
  const from = range?.[0]?.startOf("month").format("YYYY-MM-DD");
  const to = range?.[1]?.endOf("month").format("YYYY-MM-DD");
  const query = useQuery({
    queryKey: ["vehicle-efficiency", from, to, vehiclePlate],
    queryFn: () => operationsApi.vehicleEfficiencyReport({ from, to, vehiclePlate }),
  });
  const rows: any[] = query.data?.items ?? [];

  return (
    <div className="page-shell">
      <PageHeader
        title="Hiệu quả xe theo tháng"
        subtitle="Doanh thu cước, chi phí chuyến và chi phí cố định gộp lại theo từng xe từng tháng."
        actions={
          <Space size={6}>
            <DatePicker.RangePicker
              size="small"
              picker="month"
              format="MM/YYYY"
              allowClear={false}
              value={range}
              onChange={(value) => value && setRange(value as [any, any])}
            />
            <Input.Search
              size="small"
              allowClear
              className="page-shell-search"
              placeholder="Biển số xe"
              onSearch={(value) => setVehiclePlate(value.trim().toUpperCase())}
            />
            <RefreshButton loading={query.isFetching} onClick={() => query.refetch()} />
          </Space>
        }
      />

      <FilterTags
        items={
          vehiclePlate
            ? [{ key: "plate", label: `Biển số: ${vehiclePlate}`, onClear: () => setVehiclePlate("") }]
            : []
        }
      />

      <Table
        className="data-grid"
        rowKey={(row: any) => `${row.vehiclePlate}-${row.month}`}
        size="small"
        bordered
        tableLayout="fixed"
        scroll={{ x: 1560 }}
        loading={query.isLoading || query.isFetching}
        dataSource={rows}
        pagination={false}
        columns={[
          {
            title: "Tháng",
            dataIndex: "month",
            width: 100,
            fixed: "left",
            render: (value) => (value ? dayjs(value).format("MM/YYYY") : value),
          },
          {
            title: "Xe",
            dataIndex: "vehiclePlate",
            width: 120,
            fixed: "left",
            render: (value) => <span className="data-grid-clip data-grid-strong">{value}</span>,
          },
          { title: "Chuyến", dataIndex: "tripCount", width: 90, align: "right", render: num },
          { title: "Km", dataIndex: "totalDistanceKm", width: 110, align: "right", render: num },
          {
            title: "DT cước",
            dataIndex: "transportRevenue",
            width: 130,
            align: "right",
            render: num,
          },
          { title: "CP chuyến", dataIndex: "tripCost", width: 130, align: "right", render: num },
          { title: "Lãi gộp", dataIndex: "grossProfit", width: 130, align: "right", render: num },
          {
            title: "Dầu định mức",
            dataIndex: "expectedFuelLiters",
            width: 130,
            align: "right",
            render: num,
          },
          {
            title: "Dầu thực tế",
            dataIndex: "actualFuelLiters",
            width: 130,
            align: "right",
            render: num,
          },
          {
            title: "CL dầu",
            dataIndex: "fuelVarianceLiters",
            width: 110,
            align: "right",
            render: (value) => (
              <Typography.Text
                className="data-grid-num"
                type={Number(value || 0) > 0 ? "danger" : undefined}
              >
                {n(value)}
              </Typography.Text>
            ),
          },
          {
            title: "Khấu hao",
            dataIndex: "depreciationCost",
            width: 130,
            align: "right",
            render: num,
          },
          {
            title: "Lương LX",
            dataIndex: "driverSalaryCost",
            width: 130,
            align: "right",
            render: num,
          },
          {
            title: "SC phân bổ",
            dataIndex: "maintenanceAllocated",
            width: 130,
            align: "right",
            render: num,
          },
          {
            title: "Lợi nhuận",
            dataIndex: "profitAfterFixed",
            width: 140,
            align: "right",
            fixed: "right",
            render: profitCell,
          },
        ]}
      />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Đơn điều xe / chuyến xe                                             */
/* ------------------------------------------------------------------ */

export const VehicleDispatchOrderListPage: React.FC = () => {
  const navigate = useNavigate();
  const open = (row: any) => navigate(`/operations/vehicle-dispatches/${row.id}`);

  return (
    <RoadListPage
      title="Đơn điều xe / chuyến xe"
      subtitle="Kế hoạch điều xe theo tuyến và trạng thái thực hiện của từng chuyến."
      resource="dispatches"
      searchPlaceholder="Số điều xe, điểm đi hoặc điểm đến"
      totalLabel={(total) => `${total} chuyến`}
      scrollX={1106}
      onRowOpen={open}
      statusTabs={[
        { value: "DRAFT", label: "Nháp" },
        { value: "ASSIGNED", label: "Đã phân công" },
        { value: "IN_TRANSIT", label: "Đang vận chuyển" },
        { value: "DELIVERED", label: "Đã giao" },
        { value: "ALL", label: "Tất cả" },
      ]}
      filters={[
        {
          name: "plannedRange",
          label: "Thời gian dự kiến",
          kind: "dateRange",
          fromName: "from",
          toName: "to",
        },
      ]}
      extraActions={
        <Button
          size="small"
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate("/operations/vehicle-dispatches/create")}
        >
          Tạo chuyến
        </Button>
      }
      columns={[
        {
          title: "Số điều xe",
          dataIndex: "dispatchNo",
          width: 150,
          render: (value, row: any) => (
            <Button type="link" style={{ padding: 0, height: "auto" }} onClick={() => open(row)}>
              <span className="data-grid-clip data-grid-strong">{value}</span>
            </Button>
          ),
        },
        {
          title: "Xe / lái xe",
          width: 175,
          render: (_, row: any) => stack(row.vehicle?.licensePlate, row.driver?.fullName),
        },
        {
          title: "Tuyến",
          width: 235,
          render: (_, row: any) => stack(row.fromLocationText, `→ ${row.toLocationText ?? ""}`),
        },
        {
          title: "Bắt đầu dự kiến",
          dataIndex: "plannedStartAt",
          width: 140,
          render: (value) => (value ? dayjs(value).format("DD/MM/YYYY HH:mm") : "—"),
        },
        { title: "Số lượng", dataIndex: "plannedQty", width: 110, align: "right", render: num },
        {
          title: "Phí vận chuyển",
          dataIndex: "transportFeeVnd",
          width: 125,
          align: "right",
          render: num,
        },
        {
          title: "Trạng thái",
          dataIndex: "status",
          width: 125,
          render: (value) => <StatusBadge status={value} />,
        },
      ]}
      rowMenuItems={(row) => [
        { key: "open", label: "Xem chi tiết", onClick: () => open(row) },
        {
          key: "edit",
          icon: <EditOutlined />,
          label: "Sửa chuyến",
          onClick: () => navigate(`/operations/vehicle-dispatches/${row.id}/edit`),
        },
      ]}
    />
  );
};

const DISPATCH_SOURCE_OPTIONS = [
  { value: "DIRECT", label: "Tạo trực tiếp" },
  { value: "PURCHASE_ORDER", label: "Đơn mua hàng" },
  { value: "SALES_ORDER", label: "Đơn bán hàng" },
  { value: "GOODS_RECEIPT", label: "Phiếu nhập hàng" },
  { value: "WAREHOUSE_TRANSFER", label: "Chuyển kho" },
];

export const VehicleDispatchOrderFormPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const detail = useOperationDetail("dispatch", id);
  const mutation = useOperationMutation<any>((data) => operationsApi.saveDispatch(data, id));
  const [form] = Form.useForm();

  /* Trước đây hai ô này là Input "ID xe" / "ID lái xe" — người điều độ không có
     UUID trong tay. Đổi sang chọn theo biển số và họ tên. */
  const vehicles = useOperationList("vehicles", { page: 1, pageSize: 200, isActive: "true" });
  const drivers = useOperationList("drivers", { page: 1, pageSize: 200, isActive: "true" });

  useEffect(() => {
    if (detail.data) {
      form.setFieldsValue({
        ...detail.data,
        plannedStartAt: detail.data.plannedStartAt ? dayjs(detail.data.plannedStartAt) : undefined,
      });
    }
  }, [detail.data, form]);

  const fields: RoadField[] = [
    { name: "dispatchNo", label: "Số điều xe", required: true, upper: true },
    {
      name: "vehicleId",
      label: "Xe",
      kind: "select",
      required: true,
      placeholder: "Chọn biển số",
      options: (vehicles.data?.items ?? []).map((row: any) => ({
        value: row.id,
        label: row.licensePlate,
      })),
    },
    {
      name: "driverId",
      label: "Lái xe",
      kind: "select",
      required: true,
      placeholder: "Chọn lái xe",
      options: (drivers.data?.items ?? []).map((row: any) => ({
        value: row.id,
        label: row.fullName,
      })),
    },
    { name: "plannedStartAt", label: "Thời gian dự kiến", kind: "datetime", required: true },
    { name: "fromLocationText", label: "Điểm đi", required: true },
    { name: "toLocationText", label: "Điểm đến", required: true },
    { name: "plannedQty", label: "Số lượng dự kiến", kind: "number" },
    { name: "transportFeeVnd", label: "Phí vận chuyển", kind: "money" },
    { name: "sourceType", label: "Nguồn", kind: "select", options: DISPATCH_SOURCE_OPTIONS },
    { name: "fileUrl", label: "File đính kèm", kind: "file" },
  ];

  return (
    <div className="road-detail-page">
      <PageHeader
        title={id ? "Cập nhật chuyến xe" : "Tạo chuyến xe"}
        subtitle="Một chuyến gắn với một xe và một lái xe trong khoảng thời gian dự kiến."
        actions={
          <Button
            size="small"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/operations/vehicle-dispatches")}
          >
            Danh sách
          </Button>
        }
      />

      <Card className="road-detail-card" size="small">
        <Form
          form={form}
          layout="vertical"
          size="small"
          initialValues={{ sourceType: "DIRECT", status: "DRAFT" }}
          onFinish={async (values) => {
            try {
              await mutation.mutateAsync({
                ...values,
                plannedStartAt: values.plannedStartAt?.toISOString(),
              });
              notify.success("Đã lưu chuyến xe.");
              navigate("/operations/vehicle-dispatches");
            } catch (error) {
              notify.error(extractApiError(error).message || "Không lưu được chuyến xe.");
            }
          }}
        >
          <RoadFieldGrid fields={fields} />
          <Space size={6}>
            <Button size="small" onClick={() => navigate("/operations/vehicle-dispatches")}>
              Hủy
            </Button>
            <Button size="small" type="primary" htmlType="submit" loading={mutation.isPending}>
              Lưu chuyến
            </Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
};

export const VehicleDispatchOrderDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const query = useOperationDetail("dispatch", id);
  const mutation = useOperationMutation<string>((status) =>
    operationsApi.changeDispatchStatus(id!, status)
  );
  const row = query.data;

  if (!row) return <Card loading={query.isLoading} />;

  const meta = [
    { label: "Xe", value: row.vehicle?.licensePlate || "—" },
    { label: "Lái xe", value: row.driver?.fullName || "—" },
    { label: "Điểm đi", value: row.fromLocationText || "—" },
    { label: "Điểm đến", value: row.toLocationText || "—" },
    {
      label: "Bắt đầu dự kiến",
      value: row.plannedStartAt ? dayjs(row.plannedStartAt).format("DD/MM/YYYY HH:mm") : "—",
    },
    { label: "Số lượng", value: n(row.plannedQty) },
    { label: "Phí vận chuyển", value: n(row.transportFeeVnd) },
    { label: "Mặt hàng", value: row.product?.name || "—" },
  ];

  const changeStatus = (status: string) => {
    Modal.confirm({
      title: `Chuyển sang "${DISPATCH_STATUS_LABELS[status] ?? status}"?`,
      content: "Trạng thái chuyến sẽ được cập nhật ngay.",
      okText: "Cập nhật",
      cancelText: "Đóng",
      onOk: async () => {
        try {
          await mutation.mutateAsync(status);
          notify.success("Đã cập nhật trạng thái chuyến.");
        } catch (error) {
          notify.error(extractApiError(error).message || "Không đổi được trạng thái.");
          throw error;
        }
      },
    });
  };

  return (
    <div className="road-detail-page">
      <PageHeader
        title={`Chuyến xe ${row.dispatchNo}`}
        subtitle="Theo dõi tiến độ một chuyến điều xe cụ thể."
        actions={
          <Space size={6}>
            <StatusBadge status={row.status} />
            <Dropdown
              trigger={["click"]}
              placement="bottomRight"
              menu={{
                items: ["ASSIGNED", "LOADING", "IN_TRANSIT", "DELIVERED", "CLOSED", "CANCELLED"]
                  .filter((status) => status !== row.status)
                  .map((status) => ({
                    key: status,
                    label: DISPATCH_STATUS_LABELS[status],
                    danger: status === "CANCELLED",
                    onClick: () => changeStatus(status),
                  })),
              }}
            >
              <Button size="small" loading={mutation.isPending}>
                Đổi trạng thái
              </Button>
            </Dropdown>
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => navigate(`/operations/vehicle-dispatches/${row.id}/edit`)}
            >
              Sửa
            </Button>
            <Button
              size="small"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate("/operations/vehicle-dispatches")}
            >
              Danh sách
            </Button>
          </Space>
        }
      />

      <div className="road-meta-strip">
        {meta.map((item) => (
          <div key={item.label}>
            <span>{item.label}</span>
            <strong title={String(item.value)}>{item.value}</strong>
          </div>
        ))}
      </div>

      {row.note ? <Alert type="info" showIcon message={row.note} /> : null}
    </div>
  );
};
