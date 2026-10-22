import React, { useState } from "react";
import { Alert, Button, DatePicker, Empty, Form, Input, InputNumber, Modal, Pagination, Select, Skeleton, Space, Table, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { FilterOutlined, InfoCircleOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { PermissionGate } from "../../shared/authz/PermissionGate";
import { PERMS } from "../../shared/authz/perms";
import { notify } from "../../shared/lib/notification";
import { extractApiError } from "../../shared/lib/httpError";
import { CustomerSelect } from "../../shared/ui/CustomerSelect";
import { FilterToolbar, RefreshButton } from "../../shared/ui/TableFilter";
import { MobileActiveFilters, MobileList, MobileListItem, MobileListToolbar, MobileListValues } from "../../shared/ui/MobileList";
import { mobileListSummary, useIsMobile } from "../../shared/ui/mobile";
import { ProductsApi } from "../products/api";
import { SupplierLocationsApi } from "../supplierLocations/api";
import { decodeWarehouseSource } from "../supplierLocations/ui/WarehouseSourceSelect";
import { operationsApi } from "./api";
import { operationKeys, useOperationMutation } from "./hooks";
import "../../shared/ui/page-shell.css";
import "../../shared/ui/data-grid.css";
import "./expected-inventory.css";

type Ref = { id: string; code?: string | null; name: string };
type ExpectedStatus = "OPEN" | "PARTIALLY_FULFILLED" | "FULFILLED" | "CANCELLED";
type SourceType = "PURCHASE_ORDER" | "SHIP_CHARTER_ORDER" | "WAREHOUSE_TRANSFER" | "MANUAL";
type ExpectedRow = {
  id: string;
  expectedNo: string;
  warehouseArea: Ref | null;
  supplierLocation: Ref | null;
  product: Ref & { uom: string };
  ownerCustomer?: Ref | null;
  sourceType?: SourceType;
  purchaseOrderLineId?: string | null;
  movementLineId?: string | null;
  manualReference?: string | null;
  expectedQty: string | number;
  receivedQty: string | number;
  expectedDate: string | null;
  status: ExpectedStatus;
};
type ExpectedResult = { items: ExpectedRow[]; total: number; page: number; pageSize: number };
type CreateValues = {
  sourceType: SourceType;
  sourceId: string;
  sourceLocation: string;
  productId: string;
  ownerType: "INTERNAL" | "CUSTOMER" | "SUPPLIER";
  ownerCustomerId?: string;
  expectedQty: number;
  expectedDate?: Dayjs;
};

const PAGE_SIZE = 20;
const STATUS: Record<ExpectedStatus, { label: string; color: string }> = {
  OPEN: { label: "Chờ nhận", color: "blue" },
  PARTIALLY_FULFILLED: { label: "Nhận một phần", color: "orange" },
  FULFILLED: { label: "Đã nhận đủ", color: "green" },
  CANCELLED: { label: "Đã hủy", color: "default" },
};
const SOURCES: Record<SourceType, string> = {
  PURCHASE_ORDER: "Đơn mua hàng",
  SHIP_CHARTER_ORDER: "Đơn thuê tàu",
  WAREHOUSE_TRANSFER: "Chuyển kho",
  MANUAL: "Nhập tay",
};
const number = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 6 });
const sourceLabel = (row: ExpectedRow) => {
  if (row.sourceType && SOURCES[row.sourceType]) return SOURCES[row.sourceType];
  // Legacy responses identify the source through the generated reference and linked lines.
  const source = (Object.keys(SOURCES) as SourceType[]).find((key) => row.expectedNo?.startsWith(`EXP-${key}-`));
  if (source) return SOURCES[source];
  if (row.purchaseOrderLineId) return SOURCES.PURCHASE_ORDER;
  if (row.movementLineId) return SOURCES.WAREHOUSE_TRANSFER;
  return row.manualReference ? SOURCES.MANUAL : "—";
};
const dateText = (value: string | null) => value ? dayjs(value).format("DD/MM/YYYY") : "Chưa có lịch";
const quantity = (value: string | number, unit?: string) => (
  <span className="data-grid-num">{number.format(Number(value ?? 0))}{unit ? <span className="expected-inventory-unit"> {unit}</span> : null}</span>
);
const statusTag = (status: ExpectedStatus) => {
  const item = STATUS[status];
  return <Tag color={item?.color}>{item?.label ?? status}</Tag>;
};

export const ExpectedInventoryPage: React.FC = () => {
  const mobile = useIsMobile();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ExpectedStatus>();
  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<CreateValues>();
  const ownerType = Form.useWatch("ownerType", form);
  const params = { page, pageSize: PAGE_SIZE, ...(status ? { status } : {}), ...(keyword ? { keyword } : {}) };
  const query = useQuery<ExpectedResult>({
    queryKey: operationKeys.list("expectedInventory", params),
    queryFn: () => operationsApi.expectedInventory(params),
  });
  const mutation = useOperationMutation(operationsApi.saveExpectedInventory);
  const masters = useQuery({
    queryKey: ["expected-inventory", "masters"],
    enabled: open,
    queryFn: async () => {
      const [areas, warehouses, products] = await Promise.all([
        SupplierLocationsApi.areas(true),
        SupplierLocationsApi.list({ isActive: true, page: 1, pageSize: 200 }),
        ProductsApi.select(""),
      ]);
      return { areas, warehouses: warehouses.items, products };
    },
  });
  const rows = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const hasData = query.data != null;
  const data = masters.data ?? { areas: [], warehouses: [], products: [] };
  const sourceOptions = [
    { label: "Theo khu vực — chưa xác định kho", options: data.areas.map((area) => ({ value: `area:${area.id}`, label: `Khu vực ${area.name}` })) },
    { label: "Kho cụ thể", options: data.warehouses.filter((warehouse) => warehouse.areaId).map((warehouse) => ({ value: `warehouse:${warehouse.id}`, label: [warehouse.code, warehouse.name].filter(Boolean).join(" — ") })) },
  ];

  const closeForm = () => {
    if (mutation.isPending) return;
    if (form.isFieldsTouched()) {
      Modal.confirm({
        title: "Bỏ thay đổi chưa lưu?", content: "Thông tin hàng dự kiến vừa nhập sẽ không được lưu.",
        okText: "Bỏ thay đổi", cancelText: "Nhập tiếp", okButtonProps: { danger: true },
        onOk: () => { setOpen(false); form.resetFields(); },
      });
    } else setOpen(false);
  };
  const save = async (values: CreateValues) => {
    if (mutation.isPending) return;
    const location = decodeWarehouseSource(values.sourceLocation, data.warehouses);
    if (!location?.areaId) {
      form.setFields([{ name: "sourceLocation", errors: ["Khu vực hoặc kho không còn hợp lệ. Vui lòng chọn lại."] }]);
      return;
    }
    try {
      await mutation.mutateAsync({
        sourceType: values.sourceType,
        sourceId: values.sourceId.trim(),
        warehouseAreaId: location.areaId,
        supplierLocationId: location.warehouseId,
        productId: values.productId,
        ownerType: values.ownerType,
        ownerCustomerId: values.ownerType === "INTERNAL" ? undefined : values.ownerCustomerId,
        expectedQty: values.expectedQty,
        expectedDate: values.expectedDate?.format("YYYY-MM-DD"),
      });
      notify.success("Đã tạo hàng dự kiến.");
      setOpen(false);
      form.resetFields();
    } catch (error) {
      notify.error(extractApiError(error).message || "Không tạo được hàng dự kiến. Vui lòng thử lại.");
    }
  };
  const columns: ColumnsType<ExpectedRow> = [
    { title: "Khu vực / Kho nhận", key: "location", width: 240, render: (_, row) => (
      <div className="expected-inventory-stack"><span className="data-grid-strong">{row.warehouseArea?.name ?? "Chưa xác định khu vực"}</span><span className="data-grid-sub">{row.supplierLocation?.name ?? "Chưa xác định kho"}</span></div>
    ) },
    { title: "Mặt hàng", key: "product", width: 200, render: (_, row) => (
      <div className="expected-inventory-stack"><span className="data-grid-strong">{row.product?.name ?? "—"}</span><span className="data-grid-sub">{row.product?.code}</span></div>
    ) },
    { title: "Nguồn", key: "source", width: 145, render: (_, row) => <span title={row.expectedNo}>{sourceLabel(row)}</span> },
    { title: "Dự kiến", key: "expected", width: 140, align: "right", render: (_, row) => quantity(row.expectedQty, row.product?.uom) },
    { title: "Đã nhận", key: "received", width: 140, align: "right", render: (_, row) => quantity(row.receivedQty, row.product?.uom) },
    { title: "Ngày về", key: "date", width: 125, render: (_, row) => dateText(row.expectedDate) },
    { title: "Trạng thái", key: "status", width: 135, render: (_, row) => statusTag(row.status) },
  ];
  const empty = <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={keyword ? "Không có hàng dự kiến phù hợp từ khóa và bộ lọc." : status ? "Không có hàng dự kiến ở trạng thái này." : "Chưa có hàng dự kiến."} />;
  const searchControl = <Input.Search
    size="small" className="expected-inventory-search" aria-label="Tìm hàng dự kiến"
    placeholder="Tìm mã, mặt hàng, kho…" allowClear value={search}
    onChange={(event) => {
      setSearch(event.target.value);
      if (!event.target.value) { setKeyword(""); setPage(1); }
    }}
    onSearch={(value) => { setKeyword(value.trim()); setPage(1); setActiveTool(null); }}
  />;
  const statusControl = <Select
    aria-label="Lọc trạng thái hàng dự kiến" size="small"
    className="expected-inventory-status" value={status ?? "ALL"}
    onChange={(value: ExpectedStatus | "ALL") => { setStatus(value === "ALL" ? undefined : value); setPage(1); setActiveTool(null); }}
    options={[{ value: "ALL", label: "Tất cả trạng thái" }, ...Object.entries(STATUS).map(([value, item]) => ({ value, label: item.label }))]}
  />;
  const pagination = total > PAGE_SIZE ? <Pagination
    className="expected-inventory-pagination" current={page} pageSize={PAGE_SIZE} total={total}
    size="small" simple={mobile} showSizeChanger={false} disabled={query.isFetching}
    onChange={setPage}
  /> : null;

  return (
    <div className="page-shell expected-inventory-page">
      {!mobile && <FilterToolbar
        left={<>{searchControl}{statusControl}</>}
        right={<Space size={6}>
          {!mobile && <Tooltip trigger={["hover", "focus", "click"]} title="Hàng dự kiến chỉ phục vụ kế hoạch, chưa phải tồn có thể xuất.">
            <Button size="small" aria-label="Thông tin hàng dự kiến" icon={<InfoCircleOutlined />} />
          </Tooltip>}
          <RefreshButton loading={query.isFetching} onClick={() => { void query.refetch(); }} />
          <PermissionGate need={PERMS.OPERATIONS_WAREHOUSE_MANAGE}>
            <Button size="small" type="primary" aria-label="Tạo hàng dự kiến" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setOpen(true); }}>{mobile ? "Tạo mới" : "Tạo dự kiến"}</Button>
          </PermissionGate>
        </Space>}
      />}
      {mobile ? <MobileActiveFilters items={[
        keyword ? { key: "keyword", label: `Tìm: ${keyword}`, onClear: () => { setSearch(""); setKeyword(""); setPage(1); } } : null,
        status ? { key: "status", label: STATUS[status].label, onClear: () => { setStatus(undefined); setPage(1); } } : null,
      ]} /> : null}
      {query.isError ? <Alert
        type={hasData ? "warning" : "error"} showIcon
        message={hasData ? "Chưa làm mới được dữ liệu; đang hiển thị lần tải trước." : "Không tải được hàng dự kiến."}
        action={<Button size="small" loading={query.isFetching} onClick={() => { void query.refetch(); }}>Thử lại</Button>}
      /> : null}
      {!hasData && query.isPending ? <div role="status" aria-label="Đang tải hàng dự kiến"><Skeleton active paragraph={{ rows: 5 }} /></div> : hasData ? (
        <div className="expected-inventory-results" aria-busy={query.isFetching}>
          {!mobile ? <div className="expected-inventory-meta" role="status"><span>{number.format(total)} bản ghi</span><span title={dayjs(query.dataUpdatedAt).format("HH:mm DD/MM/YYYY")}>{query.isFetching ? "Đang làm mới…" : `Cập nhật ${dayjs(query.dataUpdatedAt).format("HH:mm DD/MM/YYYY")}`}</span></div> : null}
          {mobile ? rows.length ? <MobileList>{rows.map((row) => (
            <MobileListItem key={row.id} title={row.product?.name ?? "—"} status={statusTag(row.status)}
              detailsTitle="Thông tin hàng dự kiến" moreLabel={`Thông tin ${row.product?.name ?? "hàng dự kiến"}`}
              details={
                  <dl>
                    <div><dt>Mã dự kiến</dt><dd>{row.expectedNo || "—"}</dd></div>
                    <div><dt>Nguồn</dt><dd>{sourceLabel(row)}</dd></div>
                    {row.warehouseArea?.name ? <div><dt>Khu vực</dt><dd>{row.warehouseArea.name}</dd></div> : null}
                    {row.ownerCustomer?.name ? <div><dt>Chủ hàng</dt><dd>{row.ownerCustomer.name}</dd></div> : null}
                  </dl>
              }
              description={<>
                <span>{row.supplierLocation?.name ?? "Chưa xác định kho"}</span>
                <span>{row.expectedDate ? `Về ${dateText(row.expectedDate)}` : "Chưa có lịch"}</span>
              </>}
            >
              <MobileListValues items={[
                { label: "Dự kiến", value: quantity(row.expectedQty, row.product?.uom) },
                { label: "Đã nhận", value: quantity(row.receivedQty, row.product?.uom) },
              ]} />
            </MobileListItem>
          ))}</MobileList> : empty : <Table<ExpectedRow>
            className="data-grid" rowKey="id" size="small" bordered tableLayout="fixed"
            columns={columns} dataSource={rows} scroll={{ x: 1125 }} pagination={false} locale={{ emptyText: empty }}
          />}
          {!mobile ? pagination : null}
        </div>
      ) : null}

      {mobile ? <MobileListToolbar
        openTool={activeTool} onToolChange={setActiveTool}
        tools={[
          { key: "search", label: "Mở tìm kiếm", title: "Tìm hàng dự kiến", icon: <SearchOutlined />, active: Boolean(keyword), content: searchControl },
          { key: "filter", label: "Mở bộ lọc", title: "Trạng thái", icon: <FilterOutlined />, active: Boolean(status), content: statusControl },
        ]}
        actions={<>
            <RefreshButton loading={query.isFetching} onClick={() => { void query.refetch(); }} />
            <PermissionGate need={PERMS.OPERATIONS_WAREHOUSE_MANAGE}><Button size="small" type="text" aria-label="Tạo hàng dự kiến" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setOpen(true); }} /></PermissionGate>
        </>}
        summary={mobileListSummary(query, total, Boolean(keyword || status))}
        pagination={pagination}
      /> : null}
      <Modal
        className="expected-inventory-modal" title="Tạo hàng dự kiến" open={open}
        width={mobile ? "calc(100vw - 24px)" : 640} style={{ top: mobile ? 12 : 60 }}
        styles={{ body: { maxHeight: "calc(100dvh - 180px)", overflowY: "auto" } }}
        onCancel={closeForm} onOk={() => form.submit()} okText="Tạo dự kiến" cancelText="Đóng"
        confirmLoading={mutation.isPending} maskClosable={false} closable={!mutation.isPending}
        keyboard={!mutation.isPending} cancelButtonProps={{ size: "small", disabled: mutation.isPending }}
        okButtonProps={{ size: "small", disabled: masters.isPending || masters.isError }}
      >
        {masters.isError ? <Alert type="error" showIcon message="Không tải được danh mục khu vực, kho hoặc mặt hàng." action={<Button size="small" onClick={() => { void masters.refetch(); }}>Thử lại</Button>} /> : null}
        <Form<CreateValues>
          form={form} size="small" layout="vertical" disabled={masters.isPending || masters.isError || mutation.isPending}
          initialValues={{ sourceType: "MANUAL", ownerType: "INTERNAL" }} onFinish={save}
          onValuesChange={(changed) => { if ("ownerType" in changed) form.setFieldValue("ownerCustomerId", undefined); }}
        >
          <Form.Item name="sourceType" label="Nguồn hàng" rules={[{ required: true, message: "Chọn nguồn hàng" }]}><Select options={Object.entries(SOURCES).map(([value, label]) => ({ value, label }))} /></Form.Item>
          <Form.Item name="sourceId" label="ID chứng từ nguồn" rules={[
            { required: true, whitespace: true, message: "Nhập ID chứng từ nguồn" },
            { validator: (_, value: string) => !value || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim()) ? Promise.resolve() : Promise.reject(new Error("ID chứng từ nguồn không hợp lệ.")) },
          ]}><Input /></Form.Item>
          <Form.Item name="sourceLocation" label="Khu vực / kho nhận dự kiến" rules={[{ required: true, message: "Chọn khu vực hoặc kho" }]}>
            <Select showSearch optionFilterProp="label" loading={masters.isFetching} options={sourceOptions} placeholder="Chọn khu vực hoặc kho" />
          </Form.Item>
          <Form.Item name="productId" label="Mặt hàng" rules={[{ required: true, message: "Chọn mặt hàng" }]}><Select showSearch optionFilterProp="label" loading={masters.isFetching} options={data.products.map((product) => ({ value: product.id, label: `${product.code} — ${product.name}` }))} /></Form.Item>
          <Form.Item name="ownerType" label="Loại chủ hàng" rules={[{ required: true, message: "Chọn loại chủ hàng" }]}><Select options={[{ value: "INTERNAL", label: "Hàng công ty" }, { value: "CUSTOMER", label: "Hàng khách hàng" }, { value: "SUPPLIER", label: "Hàng nhà cung cấp" }]} /></Form.Item>
          {ownerType && ownerType !== "INTERNAL" ? <Form.Item name="ownerCustomerId" label="Chủ hàng" rules={[{ required: true, message: "Chọn chủ hàng" }]}><CustomerSelect customerRole={ownerType} style={{ width: "100%" }} /></Form.Item> : null}
          <div className="expected-inventory-form-row">
            <Form.Item name="expectedQty" label="Số lượng dự kiến" rules={[{ required: true, type: "number", min: 0.001, message: "Nhập số lượng từ 0,001 trở lên" }]}><InputNumber min={0.001} precision={6} controls={false} /></Form.Item>
            <Form.Item name="expectedDate" label="Ngày về dự kiến"><DatePicker format="DD/MM/YYYY" /></Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};
