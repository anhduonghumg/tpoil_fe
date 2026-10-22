import React, { useEffect, useState } from "react";
import { Alert, Button, DatePicker, Empty, Form, Input, InputNumber, Modal, Pagination, Select, Skeleton, Space, Table, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { FilterOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { PermissionGate } from "../../shared/authz/PermissionGate";
import { PERMS } from "../../shared/authz/perms";
import { apiCall } from "../../shared/lib/api";
import { extractApiError } from "../../shared/lib/httpError";
import { notify } from "../../shared/lib/notification";
import type { ApiResponse } from "../../shared/lib/types";
import { PartySelect } from "../../shared/ui/PartySelect";
import { FilterToolbar, RefreshButton } from "../../shared/ui/TableFilter";
import { MobileActiveFilters, MobileList, MobileListItem, MobileListToolbar, MobileListValues } from "../../shared/ui/MobileList";
import { mobileListSummary, useIsMobile } from "../../shared/ui/mobile";
import { ProductsApi } from "../products/api";
import type { ProductOption } from "../products/types";
import { operationsApi } from "./api";
import { operationKeys, useOperationMutation } from "./hooks";
import { canReleaseReservation, isSalesManaged, reservationProducts, reservationWarehouses, RESERVATION_STATUS } from "./reservation-view";
import type { ReservationRow, ReservationStatus } from "./reservation-view";
import "../../shared/ui/page-shell.css";
import "../../shared/ui/data-grid.css";
import "./warehouse-reservation.css";

type WarehouseOption = { id: string; code: string; name: string };
type ReservationResult = { items: ReservationRow[]; total: number; page: number; pageSize: number };
type CreateValues = { reservationNo: string; supplierLocationId: string; productId: string; customerId?: string | null; reservedQty: number; expiredAt?: Dayjs };
const PAGE_SIZE = 20;
const number = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 6 });
const expiryText = (value?: string | null) => value ? dayjs(value).format("DD/MM/YYYY HH:mm") : "Không giới hạn";
function useDebounced(value: string) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const timer = setTimeout(() => setDebounced(value.trim()), 250); return () => clearTimeout(timer); }, [value]);
  return debounced;
}
function StatusTag({ status }: { status: ReservationStatus }) {
  const item = RESERVATION_STATUS[status];
  return <Tag color={item?.color}>{item?.label ?? status}</Tag>;
}
function HeldQuantities({ row }: { row: ReservationRow }) {
  const products = reservationProducts(row);
  return products.length ? <div className="reservation-stack">{products.map(({ product, qty }) => (
    <span className="data-grid-num" key={`${product.id}:${product.uom ?? ""}`}>
      {products.length > 1 ? <span className="data-grid-sub">{product.code || product.name}: </span> : null}
      {number.format(qty)} <span className="reservation-unit">{product.uom}</span>
    </span>
  ))}</div> : <span className="data-grid-num">{number.format(Number(row.activeQty))}</span>;
}

export const WarehouseReservationPage: React.FC = () => {
  const mobile = useIsMobile();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ReservationStatus>();
  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState<string>();
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<CreateValues>();
  const [warehouseSearch, setWarehouseSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseOption>();
  const [selectedProduct, setSelectedProduct] = useState<ProductOption>();
  const warehouseKeyword = useDebounced(warehouseSearch);
  const productKeyword = useDebounced(productSearch);
  const params = { page, pageSize: PAGE_SIZE, ...(status ? { status } : {}), ...(keyword ? { keyword } : {}) };
  const query = useQuery<ReservationResult>({
    queryKey: operationKeys.list("reservations", params),
    queryFn: () => operationsApi.reservations(params),
  });
  const create = useOperationMutation(operationsApi.saveReservation);
  const release = useOperationMutation<{ id: string; status: string }>(({ id, status }) => operationsApi.changeReservation(id, status));
  const warehouses = useQuery({
    queryKey: ["reservation-warehouses", warehouseKeyword], enabled: open,
    queryFn: () => apiCall<ApiResponse<WarehouseOption[]>>("supplierLocations.select", {
      query: { keyword: warehouseKeyword || undefined, limit: 50, isActive: true },
    }).then((response) => response.data.data ?? []),
  });
  const products = useQuery({
    queryKey: ["products", "select", productKeyword], enabled: open,
    queryFn: () => ProductsApi.select(productKeyword),
  });
  const warehouseOptions = [...(warehouses.data ?? [])];
  if (selectedWarehouse && !warehouseOptions.some((item) => item.id === selectedWarehouse.id)) warehouseOptions.unshift(selectedWarehouse);
  const productOptions = [...(products.data ?? [])];
  if (selectedProduct && !productOptions.some((item) => item.id === selectedProduct.id)) productOptions.unshift(selectedProduct);
  const rows = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const hasData = query.data != null;

  const startCreate = () => {
    form.resetFields(); setSelectedWarehouse(undefined); setSelectedProduct(undefined);
    setWarehouseSearch(""); setProductSearch(""); setOpen(true);
  };
  const closeForm = () => {
    if (create.isPending) return;
    if (form.isFieldsTouched()) Modal.confirm({
      title: "Bỏ thay đổi chưa lưu?", content: "Thông tin giữ hàng vừa nhập sẽ không được lưu.",
      okText: "Bỏ thay đổi", cancelText: "Nhập tiếp", okButtonProps: { size: "small", danger: true }, cancelButtonProps: { size: "small" },
      onOk: () => { setOpen(false); form.resetFields(); },
    });
    else setOpen(false);
  };
  const save = async (values: CreateValues) => {
    if (create.isPending) return;
    try {
      await create.mutateAsync({
        reservationNo: values.reservationNo.trim(), supplierLocationId: values.supplierLocationId,
        productId: values.productId, customerId: values.customerId ?? undefined,
        sourceType: "MANUAL", reservedQty: values.reservedQty, expiredAt: values.expiredAt?.toISOString(),
      });
      notify.success("Đã giữ hàng."); setOpen(false); form.resetFields();
    } catch (error) { notify.error(extractApiError(error).message || "Không tạo được phiếu giữ hàng. Vui lòng thử lại."); }
  };
  const releaseRow = (row: ReservationRow) => {
    if (!canReleaseReservation(row) || release.isPending) return;
    Modal.confirm({
      title: `Giải phóng phiếu ${row.reservationNo}?`,
      content: <div className="reservation-release-summary"><p>Toàn bộ lượng còn giữ dưới đây sẽ trở lại tồn có thể bán:</p><HeldQuantities row={row} /></div>,
      okText: "Giải phóng", cancelText: "Đóng", okButtonProps: { size: "small", danger: true }, cancelButtonProps: { size: "small" },
      onOk: async () => {
        try { await release.mutateAsync({ id: row.id, status: "RELEASED" }); notify.success("Đã giải phóng lượng giữ."); }
        catch (error) { notify.error(extractApiError(error).message || "Không thể giải phóng lượng giữ."); throw error; }
      },
    });
  };
  const actions = (row: ReservationRow) => {
    const salesOrderId = row.salesOrder?.id ?? row.salesOrderId;
    if (salesOrderId) return <Link className="reservation-order-link" to={`/sales/orders/${salesOrderId}`}>{row.salesOrder?.orderNo ?? "Mở đơn bán"}</Link>;
    if (isSalesManaged(row)) return <Tooltip trigger={["hover", "focus", "click"]} title="Hàng giữ theo phiếu rút được xử lý qua luồng bán hàng."><span tabIndex={0}>Theo phiếu rút</span></Tooltip>;
    return canReleaseReservation(row) ? <PermissionGate need={PERMS.OPERATIONS_WAREHOUSE_MANAGE}>
      <Button size="small" danger disabled={release.isPending} loading={release.isPending && release.variables?.id === row.id} onClick={() => releaseRow(row)}>Giải phóng</Button>
    </PermissionGate> : <span className="data-grid-sub">—</span>;
  };
  const columns: ColumnsType<ReservationRow> = [
    { title: "Phiếu giữ", dataIndex: "reservationNo", width: 180, render: (value) => <strong className="reservation-wrap">{value}</strong> },
    { title: "Kho / Mặt hàng", key: "goods", width: 270, render: (_, row) => <div className="reservation-stack">
      <span className="data-grid-strong">{reservationWarehouses(row).map((item) => item.name).join(", ") || "Chưa xác định kho"}</span>
      <span className="data-grid-sub">{reservationProducts(row).map((item) => item.product.name).join(", ") || "Chưa xác định mặt hàng"}</span>
    </div> },
    { title: "Khách hàng", key: "customer", width: 190, render: (_, row) => <div className="reservation-stack"><span>{row.customer?.name ?? "Chưa gắn khách hàng"}</span><span className="data-grid-sub">{row.customer?.code}</span></div> },
    { title: "Đang giữ", key: "quantity", width: 180, align: "right", render: (_, row) => <HeldQuantities row={row} /> },
    { title: "Hết hạn", key: "expiry", width: 145, render: (_, row) => expiryText(row.expiredAt) },
    { title: "Trạng thái", key: "status", width: 145, render: (_, row) => <StatusTag status={row.status} /> },
    { title: "Thao tác", key: "action", width: 145, render: (_, row) => actions(row) },
  ];
  const empty = <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={status || keyword ? "Không có phiếu giữ hàng phù hợp với bộ lọc." : "Chưa có phiếu giữ hàng."} />;
  const searchControl = <Input.Search size="small" value={search} allowClear className="reservation-search"
    placeholder="Tìm số phiếu, tên khách" aria-label="Tìm phiếu giữ hàng"
    onChange={(event) => { setSearch(event.target.value); if (!event.target.value) { setKeyword(undefined); setPage(1); } }}
    onSearch={(value) => { setKeyword(value.trim() || undefined); setPage(1); setActiveTool(null); }} />;
  const statusControl = <Select size="small" aria-label="Lọc trạng thái giữ hàng" className="reservation-status" value={status ?? "ALL"}
    onChange={(value: ReservationStatus | "ALL") => { setStatus(value === "ALL" ? undefined : value); setPage(1); setActiveTool(null); }}
    options={[{ value: "ALL", label: "Tất cả trạng thái" }, ...Object.entries(RESERVATION_STATUS).map(([value, item]) => ({ value, label: item.label }))]} />;
  const pagination = total > PAGE_SIZE ? <Pagination className="reservation-pagination" current={page} pageSize={PAGE_SIZE} total={total} size="small" simple={mobile} disabled={query.isFetching} showSizeChanger={false} onChange={setPage} /> : null;

  return (
    <div className="page-shell warehouse-reservation-page">
      {!mobile ? <FilterToolbar left={<div className="reservation-search-controls">{searchControl}{statusControl}</div>} right={<Space size={6}>
        <RefreshButton loading={query.isFetching} onClick={() => { void query.refetch(); }} />
        <PermissionGate need={PERMS.OPERATIONS_WAREHOUSE_MANAGE}><Button size="small" type="primary" icon={<PlusOutlined />} onClick={startCreate}>Tạo giữ hàng</Button></PermissionGate>
      </Space>} /> : <MobileActiveFilters items={[
        keyword ? { key: "keyword", label: `Tìm: ${keyword}`, onClear: () => { setSearch(""); setKeyword(undefined); setPage(1); } } : null,
        status ? { key: "status", label: RESERVATION_STATUS[status].label, onClear: () => { setStatus(undefined); setPage(1); } } : null,
      ]} />}
      {query.isError ? <Alert type={hasData ? "warning" : "error"} showIcon
        message={hasData ? "Chưa làm mới được dữ liệu; đang hiển thị lần tải trước." : "Không tải được danh sách giữ hàng."}
        action={<Button size="small" loading={query.isFetching} onClick={() => { void query.refetch(); }}>Thử lại</Button>} /> : null}
      {!hasData && query.isPending ? <div role="status" aria-label="Đang tải phiếu giữ hàng"><Skeleton active paragraph={{ rows: 5 }} /></div> : hasData ? (
        <div aria-busy={query.isFetching}>
          {!mobile ? <div className="reservation-result-meta" role="status"><span>{number.format(total)} phiếu giữ hàng</span><span>{query.isFetching ? "Đang làm mới…" : `Cập nhật ${dayjs(query.dataUpdatedAt).format("HH:mm DD/MM/YYYY")}`}</span></div> : null}
          {mobile ? rows.length ? <MobileList>{rows.map((row) => {
            const heldProducts = reservationProducts(row);
            return <MobileListItem key={row.id} title={row.reservationNo} status={<StatusTag status={row.status} />}
              description={<><span>{row.customer?.name ?? "Chưa gắn khách hàng"}</span><span>{reservationWarehouses(row).map((item) => item.name).join(", ") || "Chưa xác định kho"}</span></>}
              moreLabel={`Thông tin và thao tác phiếu ${row.reservationNo}`} detailsTitle={row.reservationNo}
              details={<><dl><div><dt>Hết hạn</dt><dd>{expiryText(row.expiredAt)}</dd></div></dl><div className="reservation-mobile-actions">{actions(row)}</div></>}
            >
              <MobileListValues items={heldProducts.length ? heldProducts.map(({ product, qty }) => ({
                label: product.name,
                value: <span className="data-grid-num">{number.format(qty)} <span className="reservation-unit">{product.uom}</span></span>,
              })) : [{ label: "Đang giữ", value: <HeldQuantities row={row} /> }]} />
            </MobileListItem>;
          })}</MobileList> : empty : <Table<ReservationRow> className="data-grid" size="small" bordered tableLayout="fixed" rowKey="id" columns={columns} dataSource={rows} pagination={false} scroll={{ x: 1255 }} locale={{ emptyText: empty }} />}
          {!mobile ? pagination : null}
        </div>
      ) : null}
      {mobile ? <MobileListToolbar openTool={activeTool} onToolChange={setActiveTool}
        tools={[
          { key: "search", label: "Mở tìm kiếm", title: "Tìm phiếu giữ hàng", icon: <SearchOutlined />, active: Boolean(keyword), content: searchControl },
          { key: "filter", label: "Mở bộ lọc", title: "Trạng thái giữ hàng", icon: <FilterOutlined />, active: Boolean(status), content: statusControl },
        ]}
        actions={<><RefreshButton loading={query.isFetching} onClick={() => { void query.refetch(); }} />
          <PermissionGate need={PERMS.OPERATIONS_WAREHOUSE_MANAGE}><Button size="small" type="text" aria-label="Tạo giữ hàng" icon={<PlusOutlined />} onClick={startCreate} /></PermissionGate></>}
        summary={mobileListSummary(query, total, Boolean(keyword || status))} pagination={pagination}
      /> : null}
      <Modal className="reservation-create-modal" title="Tạo giữ hàng" open={open}
        width={mobile ? "calc(100vw - 24px)" : 600} style={{ top: mobile ? 12 : 60 }} styles={{ body: { maxHeight: "calc(100dvh - 180px)", overflowY: "auto" } }}
        onCancel={closeForm} onOk={() => form.submit()} okText="Giữ hàng" cancelText="Đóng" maskClosable={false}
        closable={!create.isPending} keyboard={!create.isPending} confirmLoading={create.isPending}
        cancelButtonProps={{ size: "small", disabled: create.isPending }} okButtonProps={{ size: "small", disabled: !selectedWarehouse || !selectedProduct }}>
        <Form<CreateValues> form={form} size="small" layout="vertical" onFinish={save} disabled={create.isPending}>
          <Form.Item name="reservationNo" label="Số phiếu giữ hàng" rules={[{ required: true, whitespace: true, message: "Nhập số phiếu giữ hàng" }]}><Input /></Form.Item>
          <Form.Item name="supplierLocationId" label="Kho giữ hàng" rules={[{ required: true, message: "Chọn kho giữ hàng" }]}>
            <Select showSearch filterOption={false} onSearch={setWarehouseSearch} loading={warehouses.isFetching} placeholder="Tìm theo tên hoặc mã kho"
              options={warehouseOptions.map((item) => ({ value: item.id, label: `${item.code} — ${item.name}` }))}
              onChange={(value: string) => setSelectedWarehouse(warehouseOptions.find((item) => item.id === value))}
              notFoundContent={warehouses.isFetching ? "Đang tìm kho…" : warehouses.isError ? "Không tải được kho" : "Không tìm thấy kho"} />
          </Form.Item>
          {warehouses.isError ? <Alert type="error" showIcon message="Không tải được danh sách kho." action={<Button size="small" onClick={() => { void warehouses.refetch(); }}>Thử lại</Button>} /> : null}
          <Form.Item name="productId" label="Mặt hàng" rules={[{ required: true, message: "Chọn mặt hàng" }]}>
            <Select showSearch filterOption={false} onSearch={setProductSearch} loading={products.isFetching} placeholder="Tìm theo tên hoặc mã mặt hàng"
              options={productOptions.map((item) => ({ value: item.id, label: [item.code, item.name].filter(Boolean).join(" — ") }))}
              onChange={(value: string) => setSelectedProduct(productOptions.find((item) => item.id === value))}
              notFoundContent={products.isFetching ? "Đang tìm mặt hàng…" : products.isError ? "Không tải được mặt hàng" : "Không tìm thấy mặt hàng"} />
          </Form.Item>
          {products.isError ? <Alert type="error" showIcon message="Không tải được danh sách mặt hàng." action={<Button size="small" onClick={() => { void products.refetch(); }}>Thử lại</Button>} /> : null}
          <Form.Item name="customerId" label="Khách hàng"><PartySelect partyRole="CUSTOMER" allowClear placeholder="Chọn khách hàng nếu có" styles={{ popup: { root: { minWidth: 0, maxWidth: "calc(100vw - 32px)" } } }} /></Form.Item>
          <div className="reservation-form-row">
            <Form.Item name="reservedQty" label="Số lượng giữ" rules={[{ required: true, type: "number", min: 0.001, message: "Nhập số lượng từ 0,001 trở lên" }]}><InputNumber min={0.001} precision={6} controls={false} addonAfter={selectedProduct?.uom} /></Form.Item>
            <Form.Item name="expiredAt" label="Hết hạn"><DatePicker showTime format="DD/MM/YYYY HH:mm" /></Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};
