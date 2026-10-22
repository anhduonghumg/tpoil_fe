/**
 * Nhóm màn "Chuyển kho" (Vận hành).
 *
 * Trước đây nằm trong pages.tsx với Table/Descriptions/Card mặc định của antd và hiện
 * tên kho đầy đủ. Nay dùng chung khung <RoadListPage> + .data-grid + .road-detail-page
 * như nhóm màn xe, và chỉ hiện mã (kho, hàng, khách) — tên đầy đủ để ở tooltip.
 */
import React, { useEffect } from "react";
import { Button, Card, DatePicker, Dropdown, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ArrowLeftOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { notify } from "../../shared/lib/notification";
import { extractApiError } from "../../shared/lib/httpError";
import { PageHeader } from "../../shared/ui/PageHeader";
import { operationsApi } from "./api";
import { useOperationDetail, useOperationMutation } from "./hooks";
import { StatusBadge } from "./components";
import { RoadListPage } from "./road-vehicle-pages";
import { ProductsApi } from "../products/api";
import { SupplierLocationsApi } from "../supplierLocations/api";
import { InternalSalesApi } from "../sales/api";
import "../../shared/ui/data-grid.css";
import "./road-operations.css";

const n = (value: unknown) => Number(value || 0).toLocaleString("vi-VN");
const EMPTY = <span className="data-grid-empty">—</span>;
const num = (value: unknown) => <span className="data-grid-num">{n(value)}</span>;
const stack = (main: React.ReactNode, sub?: React.ReactNode) => (
  <div className="data-grid-stack">
    <span className="data-grid-clip">{main || "—"}</span>
    <span className="data-grid-clip data-grid-sub">{sub || "—"}</span>
  </div>
);
/** Mã hiển thị, tên đầy đủ khi rê chuột. */
const code = (ref?: { code?: string | null; name?: string | null } | null) =>
  ref ? <Tooltip title={ref.name}><span className="data-grid-clip">{ref.code || ref.name}</span></Tooltip> : EMPTY;
const codeOptions = (rows: any[]) =>
  rows.map((r) => ({ value: r.id, label: r.code || r.name, title: r.name, search: `${r.code ?? ""} ${r.name ?? ""}` }));

const TRANSPORT_LABELS: Record<string, string> = { ROAD: "Đường bộ", SEA: "Đường thủy", PIPELINE: "Đường ống" };
const OWNER_LABELS: Record<string, string> = { INTERNAL: "Hàng công ty", CUSTOMER: "Hàng khách", SUPPLIER: "Hàng NCC" };
const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Nháp", CONFIRMED: "Đã xác nhận", IN_TRANSIT: "Đang chuyển", COMPLETED: "Hoàn tất", CANCELLED: "Đã hủy",
};
/** Bước tiếp theo của phiếu: nhãn nút theo việc người dùng làm, không theo tên trạng thái. */
const NEXT_STEPS: Record<string, Array<{ status: string; label: string; danger?: boolean }>> = {
  DRAFT: [{ status: "CONFIRMED", label: "Xác nhận phiếu" }, { status: "CANCELLED", label: "Hủy phiếu", danger: true }],
  CONFIRMED: [{ status: "IN_TRANSIT", label: "Bắt đầu chuyển" }, { status: "CANCELLED", label: "Hủy phiếu", danger: true }],
  IN_TRANSIT: [{ status: "COMPLETED", label: "Đã nhận hàng" }],
};
const feeText = (row: any) => Number(row.transferFee || 0) > 0 ? stack(num(row.transferFee), row.chargeCustomer ? "Thu khách" : "Công ty chịu") : EMPTY;

/* ------------------------------------------------------------------ */
/* Danh sách                                                           */
/* ------------------------------------------------------------------ */

export const WarehouseTransferListPage: React.FC = () => {
  const navigate = useNavigate();
  const open = (row: any) => navigate(`/operations/warehouse-transfers/${row.id}`);

  const columns: ColumnsType<any> = [
    {
      title: "Số phiếu", dataIndex: "transferNo", width: 130, fixed: "left",
      render: (value, row) => (
        <Button type="link" style={{ padding: 0, height: "auto" }} onClick={() => open(row)}>
          <span className="data-grid-clip data-grid-strong">{value}</span>
        </Button>
      ),
    },
    { title: "Ngày", dataIndex: "transferDate", width: 76, render: (value) => (value ? dayjs(value).format("DD/MM/YY") : "—") },
    {
      title: "Kho xuất → nhập", width: 150,
      render: (_, row) => (
        <Tooltip title={`${row.fromSupplierLocation?.name ?? ""} → ${row.toSupplierLocation?.name ?? ""}`}>
          <span className="data-grid-clip data-grid-strong">
            {row.fromSupplierLocation?.code ?? "—"} → {row.toSupplierLocation?.code ?? "—"}
          </span>
        </Tooltip>
      ),
    },
    {
      title: "Hàng", width: 120,
      render: (_, row) => {
        const lines: any[] = row.lines ?? [];
        return lines.length ? (
          <Tooltip title={lines.map((l) => `${l.product?.code}: ${n(l.qty)}`).join("\n")}>
            <span className="data-grid-clip">{lines.map((l) => l.product?.code ?? l.product?.name).join(", ")}</span>
          </Tooltip>
        ) : EMPTY;
      },
    },
    {
      title: "Số lượng", width: 104, align: "right",
      render: (_, row) => {
        const lines: any[] = row.lines ?? [];
        const total = lines.reduce((s, l) => s + Number(l.qty || 0), 0);
        const posted = lines.reduce((s, l) => s + Number(l.postedQty || 0), 0);
        return stack(num(total), posted ? `Đã xuất ${n(posted)}` : "Chưa xuất");
      },
    },
    {
      title: "Đơn bán", width: 124,
      render: (_, row) => row.salesOrder ? stack(row.salesOrder.orderNo, row.salesOrder.customer?.code) : EMPTY,
    },
    { title: "Phương thức", dataIndex: "transportMode", width: 92, render: (value) => TRANSPORT_LABELS[value] ?? value ?? "—" },
    { title: "Phí", width: 104, align: "right", render: (_, row) => feeText(row) },
    { title: "Trạng thái", dataIndex: "status", width: 108, render: (value) => <StatusBadge status={value} /> },
  ];

  return (
    <RoadListPage
      title="Chuyển kho"
      subtitle="Chuyển hàng giữa các kho, kể cả khi khách đổi kho nhận của đơn bán."
      resource="transfers"
      searchPlaceholder="Số phiếu, mã kho, số đơn bán"
      totalLabel={(total) => `${total} phiếu`}
      scrollX={columns.reduce((sum, c) => sum + (Number(c.width) || 0), 0) + 46}
      onRowOpen={open}
      statusTabs={[
        { value: "DRAFT", label: "Nháp" },
        { value: "CONFIRMED", label: "Đã xác nhận" },
        { value: "IN_TRANSIT", label: "Đang chuyển" },
        { value: "COMPLETED", label: "Hoàn tất" },
        { value: "ALL", label: "Tất cả" },
      ]}
      extraActions={
        <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => navigate("/operations/warehouse-transfers/create")}>
          Tạo chuyển kho
        </Button>
      }
      columns={columns}
      rowMenuItems={(row) => [
        { key: "open", label: "Xem chi tiết", onClick: () => open(row) },
        ...(row.status === "DRAFT"
          ? [{ key: "edit", icon: <EditOutlined />, label: "Sửa phiếu", onClick: () => navigate(`/operations/warehouse-transfers/${row.id}/edit`) }]
          : []),
      ]}
    />
  );
};

/* ------------------------------------------------------------------ */
/* Tạo / sửa                                                           */
/* ------------------------------------------------------------------ */

export const WarehouseTransferFormPage: React.FC = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const requestedSalesOrderId = searchParams.get("salesOrderId") || undefined;
  const navigate = useNavigate();
  const detail = useOperationDetail("transfer", id);
  const mutation = useOperationMutation<any>((data) => operationsApi.saveTransfer(data, id));
  const [form] = Form.useForm();
  const salesOrderId = Form.useWatch("salesOrderId", form);
  const fromWarehouseId = Form.useWatch("fromSupplierLocationId", form);
  const chargeCustomer = Form.useWatch("chargeCustomer", form);
  const masters = useQuery({
    queryKey: ["warehouse-transfer", "masters"],
    queryFn: async () => {
      const [warehouses, products, orders] = await Promise.all([
        SupplierLocationsApi.list({ isActive: true, page: 1, pageSize: 200 }),
        ProductsApi.select(""),
        InternalSalesApi.list({ page: 1, limit: 100 }),
      ]);
      return {
        warehouses: warehouses.items,
        products,
        orders: orders.items.filter((order: any) => order.approvedAt && order.status !== "CANCELLED"),
      };
    },
  });
  const masterData = masters.data ?? { warehouses: [], products: [], orders: [] };
  const back = () => navigate(id ? `/operations/warehouse-transfers/${id}` : "/operations/warehouse-transfers");

  /** Chọn đơn bán: điền sẵn kho xuất (nếu đơn chỉ xuất một kho) và hàng theo đơn. */
  const applySalesOrder = (orderId?: string) => {
    const order: any = masterData.orders.find((item: any) => item.id === orderId);
    if (!order) return;
    const warehouseIds = [...new Set((order.lines || []).map((line: any) => line.issueWarehouseId).filter(Boolean))];
    const sourceWarehouseId = warehouseIds.length === 1 ? warehouseIds[0] : undefined;
    const grouped = new Map<string, { productId: string; qty: number; qtyV15?: number }>();
    for (const line of order.lines || []) {
      if (sourceWarehouseId && line.issueWarehouseId !== sourceWarehouseId) continue;
      const current = grouped.get(line.productId) ?? { productId: line.productId, qty: 0, qtyV15: 0 };
      current.qty += Number(line.orderedActualQty || 0);
      if (line.orderedV15Qty != null) current.qtyV15 = (current.qtyV15 || 0) + Number(line.orderedV15Qty);
      grouped.set(line.productId, current);
    }
    form.setFieldsValue({
      fromSupplierLocationId: sourceWarehouseId,
      toSupplierLocationId: undefined,
      lines: [...grouped.values()].map((line) => ({ ...line, qtyV15: line.qtyV15 || undefined })),
    });
  };
  useEffect(() => {
    if (id || !requestedSalesOrderId || !masterData.orders.length || form.getFieldValue("salesOrderId") === requestedSalesOrderId) return;
    form.setFieldValue("salesOrderId", requestedSalesOrderId);
    applySalesOrder(requestedSalesOrderId);
  }, [id, requestedSalesOrderId, masterData.orders, form]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (detail.data) form.setFieldsValue({ ...detail.data, transferDate: dayjs(detail.data.transferDate) });
  }, [detail.data, form]);

  const warehouseOptions = codeOptions(masterData.warehouses);
  const select = { showSearch: true, optionFilterProp: "search" } as const;

  return (
    <div className="road-detail-page">
      <PageHeader
        title={id ? "Sửa phiếu chuyển kho" : "Tạo chuyển kho"}
        subtitle={salesOrderId
          ? "Phiếu gắn đơn bán chuyển đúng các lô đang giữ và mã TP/NCC sang kho mới; kho trên đơn đổi sau khi xác nhận đã nhận hàng."
          : "Phiếu chuyển kho thông thường dùng tồn có thể bán tại kho xuất."}
        actions={<Button size="small" icon={<ArrowLeftOutlined />} onClick={back}>Quay lại</Button>}
      />
      <Card className="road-detail-card" size="small">
        <Form
          form={form} layout="vertical" size="small"
          initialValues={{ ownerType: "INTERNAL", transportMode: "ROAD", transferDate: dayjs(), transferFee: 0, chargeCustomer: false, lines: [{}] }}
          onFinish={async (values) => {
            try {
              await mutation.mutateAsync({ ...values, transferDate: values.transferDate.format("YYYY-MM-DD") });
              notify.success("Đã lưu phiếu chuyển kho.");
              navigate("/operations/warehouse-transfers");
            } catch (error) {
              notify.error(extractApiError(error).message || "Không lưu được phiếu chuyển kho.");
            }
          }}
        >
          <div className="road-form-grid">
            <Form.Item name="transferNo" label="Số phiếu" rules={[{ required: true, message: "Nhập số phiếu" }]}
              normalize={(v) => (typeof v === "string" ? v.toUpperCase() : v)}>
              <Input />
            </Form.Item>
            <Form.Item name="transferDate" label="Ngày chuyển" rules={[{ required: true, message: "Chọn ngày" }]}>
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="salesOrderId" label="Đơn bán (khi khách đổi kho)">
              <Select {...select} allowClear loading={masters.isLoading} placeholder="Không gắn đơn" onChange={applySalesOrder}
                options={masterData.orders.map((order: any) => ({
                  value: order.id, label: `${order.orderNo} · ${order.customer?.code ?? ""}`,
                  title: order.customer?.name, search: `${order.orderNo} ${order.customer?.code ?? ""} ${order.customer?.name ?? ""}`,
                }))} />
            </Form.Item>
            <Form.Item name="fromSupplierLocationId" label="Kho xuất" rules={[{ required: true, message: "Chọn kho xuất" }]}>
              <Select {...select} placeholder="Mã kho" options={warehouseOptions} />
            </Form.Item>
            <Form.Item name="toSupplierLocationId" label="Kho nhận" rules={[{ required: true, message: "Chọn kho nhận" }]}>
              <Select {...select} placeholder="Mã kho" options={warehouseOptions.filter((w) => w.value !== fromWarehouseId)} />
            </Form.Item>
            <Form.Item name="transportMode" label="Phương thức">
              <Select options={Object.entries(TRANSPORT_LABELS).map(([value, label]) => ({ value, label }))} />
            </Form.Item>
            <Form.Item name="ownerType" label="Chủ hàng">
              <Select options={Object.entries(OWNER_LABELS).map(([value, label]) => ({ value, label }))} />
            </Form.Item>
            <Form.Item name="transferFee" label="Phí chuyển kho">
              <InputNumber min={0} controls={false} style={{ width: "100%" }}
                formatter={(v) => `${v ?? ""}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                parser={(v) => (v ? v.replace(/\./g, "") : "") as any} />
            </Form.Item>
            <Form.Item name="chargeCustomer" label="Ai chịu phí">
              <Select options={[{ value: false, label: "Công ty chịu" }, { value: true, label: "Thu khách" }]} />
            </Form.Item>
            <Form.Item name="transferReason" label="Lý do" className="road-span-2"
              rules={salesOrderId || chargeCustomer ? [{ required: true, message: "Nhập lý do khách đổi kho" }] : []}>
              <Input placeholder="VD: kho cũ không cấp được hàng" />
            </Form.Item>
          </div>

          <Typography.Text strong style={{ fontSize: 12, display: "block", margin: "4px 0 6px" }}>Hàng chuyển</Typography.Text>
          <Form.List name="lines">
            {(fields, { add, remove }) => (
              <div style={{ maxWidth: 620 }}>
                <div className="transfer-lines-head" style={{ display: "grid", gridTemplateColumns: "1fr 130px 130px 28px", gap: 6, fontSize: 11, color: "#21418f", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>
                  <span>Mặt hàng</span><span style={{ textAlign: "right" }}>Lít thực tế</span><span style={{ textAlign: "right" }}>Lít 15</span><span />
                </div>
                {fields.map(({ key, name }) => (
                  <div key={key} style={{ display: "grid", gridTemplateColumns: "1fr 130px 130px 28px", gap: 6 }}>
                    <Form.Item name={[name, "productId"]} rules={[{ required: true, message: "Chọn hàng" }]} style={{ marginBottom: 6 }}>
                      <Select {...select} placeholder="Mã hàng" options={codeOptions(masterData.products)} />
                    </Form.Item>
                    <Form.Item name={[name, "qty"]} rules={[{ required: true, message: "Nhập SL" }]} style={{ marginBottom: 6 }}>
                      <InputNumber min={0.001} controls={false} style={{ width: "100%" }} />
                    </Form.Item>
                    <Form.Item name={[name, "qtyV15"]} style={{ marginBottom: 6 }}>
                      <InputNumber min={0.001} controls={false} style={{ width: "100%" }} />
                    </Form.Item>
                    <Button size="small" type="text" danger icon={<DeleteOutlined />} disabled={fields.length === 1} onClick={() => remove(name)} />
                  </div>
                ))}
                <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={() => add()}>Thêm hàng</Button>
              </div>
            )}
          </Form.List>

          <Space size={6} style={{ marginTop: 12 }}>
            <Button size="small" onClick={back}>Hủy</Button>
            <Button size="small" type="primary" htmlType="submit" loading={mutation.isPending}>Lưu phiếu</Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Chi tiết                                                            */
/* ------------------------------------------------------------------ */

export const WarehouseTransferDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const query = useOperationDetail("transfer", id);
  const mutation = useOperationMutation<string>((status) => operationsApi.changeTransferStatus(id!, status));
  const row = query.data;
  if (!row) return <Card loading={query.isLoading} />;

  const steps = NEXT_STEPS[row.status] ?? [];
  const changeStatus = (step: { status: string; label: string; danger?: boolean }) =>
    Modal.confirm({
      title: `${step.label} ${row.transferNo}?`,
      content: step.status === "COMPLETED" && row.salesOrder
        ? "Kho nhận trên đơn bán sẽ đổi sang kho mới." : `Phiếu chuyển sang "${STATUS_LABELS[step.status]}".`,
      okText: step.label, okButtonProps: { danger: step.danger }, cancelText: "Đóng",
      onOk: async () => {
        try { await mutation.mutateAsync(step.status); notify.success("Đã cập nhật phiếu chuyển kho."); }
        catch (error) { notify.error(extractApiError(error).message || "Không đổi được trạng thái."); throw error; }
      },
    });

  const meta = [
    { label: "Kho xuất", value: row.fromSupplierLocation?.code, title: row.fromSupplierLocation?.name },
    { label: "Kho nhận", value: row.toSupplierLocation?.code, title: row.toSupplierLocation?.name },
    { label: "Ngày chuyển", value: row.transferDate ? dayjs(row.transferDate).format("DD/MM/YYYY") : "—" },
    { label: "Phương thức", value: TRANSPORT_LABELS[row.transportMode] ?? row.transportMode },
    { label: "Chủ hàng", value: row.ownerType === "INTERNAL" ? "Hàng công ty" : row.ownerCustomer?.code ?? OWNER_LABELS[row.ownerType], title: row.ownerCustomer?.name },
    { label: "Đơn bán", value: row.salesOrder ? `${row.salesOrder.orderNo} · ${row.salesOrder.customer?.code ?? ""}` : "—", title: row.salesOrder?.customer?.name },
    { label: "Phí chuyển", value: Number(row.transferFee || 0) > 0 ? `${n(row.transferFee)} đ${row.chargeCustomer ? " · thu khách" : ""}` : "—" },
    { label: "Lý do", value: row.transferReason || "—" },
  ];

  const columns: ColumnsType<any> = [
    { title: "Hàng", width: 100, render: (_, x) => <span className="data-grid-strong">{code(x.product)}</span> },
    {
      title: "Nguồn (TP/NCC)", width: 220,
      render: (_, x) => {
        const allocations: any[] = x.allocations ?? [];
        return allocations.length ? (
          <Tooltip title={allocations.map((a) => `${a.sourceType}${a.sourceType === "NCC" ? ` ${a.owner?.name ?? ""}` : ""}: ${n(a.qty)}`).join("\n")}>
            <span className="data-grid-clip">
              {allocations.map((a, i) => (
                <Tag key={`${a.inventoryLotId}-${i}`} color={a.sourceType === "TP" ? "blue" : "purple"} style={{ marginInlineEnd: 4 }}>
                  {a.sourceType}{a.sourceType === "NCC" && a.owner?.code ? ` ${a.owner.code}` : ""} · {n(a.qty)}
                </Tag>
              ))}
            </span>
          </Tooltip>
        ) : EMPTY;
      },
    },
    { title: "Lít thực tế", dataIndex: "qty", width: 110, align: "right", render: num },
    { title: "Lít 15", dataIndex: "qtyV15", width: 100, align: "right", render: (v) => (v == null ? EMPTY : num(v)) },
    { title: "Đã xuất", dataIndex: "postedQty", width: 100, align: "right", render: num },
    { title: "Còn lại", dataIndex: "pendingDocQty", width: 100, align: "right",
      render: (v) => Number(v || 0) > 0 ? <span className="data-grid-num" style={{ color: "#d46b08", fontWeight: 600 }}>{n(v)}</span> : num(v) },
  ];

  return (
    <div className="road-detail-page">
      <PageHeader
        title={`Chuyển kho ${row.transferNo}`}
        subtitle={row.salesOrder ? "Chuyển kho theo đơn bán: khách đổi kho nhận hàng." : "Chuyển hàng giữa hai kho."}
        actions={
          <Space size={6}>
            <StatusBadge status={row.status} />
            {steps.length > 0 && (
              <Dropdown trigger={["click"]} placement="bottomRight" menu={{
                items: steps.map((step) => ({ key: step.status, label: step.label, danger: step.danger, onClick: () => changeStatus(step) })),
              }}>
                <Button size="small" type="primary" loading={mutation.isPending}>Cập nhật phiếu</Button>
              </Dropdown>
            )}
            {row.status === "DRAFT" && (
              <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/operations/warehouse-transfers/${row.id}/edit`)}>Sửa</Button>
            )}
            <Button size="small" icon={<ArrowLeftOutlined />} onClick={() => navigate("/operations/warehouse-transfers")}>Danh sách</Button>
          </Space>
        }
      />

      <div className="road-meta-strip">
        {meta.map((item) => (
          <div key={item.label}>
            <span>{item.label}</span>
            <strong title={item.title ?? String(item.value ?? "")}>{item.value || "—"}</strong>
          </div>
        ))}
      </div>

      <Table
        className="data-grid" size="small" rowKey="id" pagination={false} dataSource={row.lines || []} columns={columns}
        scroll={{ x: columns.reduce((sum, c) => sum + (Number(c.width) || 0), 0) }}
        summary={(lines) => lines.length > 1 ? (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={2}><b>Tổng cộng</b></Table.Summary.Cell>
            {(["qty", "qtyV15", "postedQty", "pendingDocQty"] as const).map((k, i) => (
              <Table.Summary.Cell key={k} index={i + 2} align="right">
                <b>{num(lines.reduce((s: number, l: any) => s + Number(l[k] || 0), 0))}</b>
              </Table.Summary.Cell>
            ))}
          </Table.Summary.Row>
        ) : null}
      />
    </div>
  );
};
