import React, { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Dropdown,
  Empty,
  Input,
  Modal,
  Row,
  Skeleton,
  Space,
  Steps,
  Table,
  Tabs,
  Tag,
  Timeline,
  Tooltip,
  Typography,
} from "antd";
import type { MenuProps, StepsProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  AppstoreOutlined,
  ArrowLeftOutlined,
  CarOutlined,
  DeleteOutlined,
  DollarOutlined,
  EditOutlined,
  FileTextOutlined,
  HomeOutlined,
  MoreOutlined,
  PrinterOutlined,
  ProfileOutlined,
  ReloadOutlined,
  RollbackOutlined,
  SafetyCertificateOutlined,
  SendOutlined,
  ShoppingCartOutlined,
  StopOutlined,
  SwapOutlined,
  UserOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE } from "../../../config/env";
import { useCan } from "../../../shared/authz/useCan";
import { PERMS } from "../../../shared/authz/perms";
import { confirmDialog } from "../../../shared/lib/confirm";
import {
  useCancelSalesOrder,
  useDeleteSalesOrder,
  useRecallSalesOrder,
  useReserveSalesOrder,
  useSalesApprovals,
  useSalesOrderAdjustments,
  useSalesOrderChecks,
  useSalesOrderDetail,
  useSalesReconciliation,
  useSubmitSalesOrder,
} from "../hooks";
import type { SalesApprovalRequest, SalesOrder, SalesOrderLine } from "../types";
import { InternalSalesOrderModal } from "../ui/InternalSalesOrderModal";
import { InvoicePanel } from "../ui/InvoicePanel";
import { ProfitabilityPanel } from "../ui/ProfitabilityPanel";
import { ReconciliationPanel } from "../ui/ReconciliationPanel";
import { SalesOrderAdjustmentsPanel } from "../ui/SalesOrderAdjustmentsPanel";
import "../sales.css";
import {
  ApprovalStatusTag,
  ApprovalTypeTag,
  formatMoney,
  formatQty,
  lineNetAmount,
  OrderKindTag,
  OrderStatusTag,
} from "../ui/labels";
import { OrderHoldTags } from "../ui/HoldReallocationsPanel";

/** Đơn còn sửa/xóa được khi chưa gửi duyệt hoặc vừa bị từ chối. */
const EDITABLE_STATUSES = new Set(["DRAFT", "REJECTED"]);
const RESERVABLE_STATUSES = new Set(["CONFIRMED", "AWAITING_STOCK", "PARTIALLY_RESERVED"]);
/** Khớp danh sách phía backend; WAREHOUSE_PROCESSING chỉ hủy được khi chưa xuất thực tế. */
const CANCELLABLE_STATUSES = new Set([
  "DRAFT",
  "PENDING_REVIEW",
  "REJECTED",
  "CONFIRMED",
  "AWAITING_STOCK",
  "PARTIALLY_RESERVED",
  "RESERVED",
  "WAREHOUSE_PROCESSING",
]);

const formatDateTime = (value?: string | null) =>
  value ? dayjs(value).format("DD/MM/YYYY HH:mm") : "—";

function SideTitle({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="so-side-title">
      <span className="so-side-icon">{icon}</span>
      {text}
    </span>
  );
}

/** Hai chữ cái đầu của tên khách, bỏ các tiền tố pháp lý hay gặp. */
function customerInitials(name: string) {
  const words = name
    .replace(/^(công ty|cty|tnhh|cổ phần|cp|doanh nghiệp|dntn)\s+/gi, "")
    .split(/\s+/)
    .filter((word) => !/^(công|ty|cty|tnhh|cổ|phần|cp|mtv|và)$/i.test(word));
  return (words.slice(-2).map((word) => word[0]).join("") || name.slice(0, 2)).toUpperCase();
}

/** Tab kèm số đếm nhỏ phía sau, như các hệ thống ERP hay dùng. */
function TabLabel({ text, count }: { text: string; count?: number }) {
  return (
    <span>
      {text}
      {count ? <span className="so-tab-count">{count}</span> : null}
    </span>
  );
}

/**
 * Tiến trình của đơn theo năm chặng. Trạng thái từng chặng lấy từ `workflow` do backend
 * tổng hợp, không tự suy từ dòng đơn — để màn hình không nói khác danh sách đơn.
 */
function orderProgress(order: SalesOrder): StepsProps["items"] {
  const flow = order.workflow;
  const cancelled = order.status === "CANCELLED";
  const approval: NonNullable<StepsProps["items"]>[number] =
    order.status === "REJECTED"
      ? { title: "Kiểm duyệt", status: "error", description: "Bị từ chối" }
      : order.approvedAt
        ? { title: "Kiểm duyệt", status: "finish", description: dayjs(order.approvedAt).format("DD/MM HH:mm") }
        : order.status === "PENDING_REVIEW"
          ? { title: "Kiểm duyệt", status: "process", description: "Đang chờ duyệt" }
          : { title: "Kiểm duyệt", status: "wait" };

  const qtyText = (done?: string, all?: string) =>
    all && Number(all) > 0 ? `${formatQty(done ?? 0)} / ${formatQty(all)}` : undefined;

  const warehouse = flow?.warehouse ?? "NOT_STARTED";
  const invoicing = flow?.invoicing ?? "NOT_INVOICED";
  const receivable = flow?.receivable ?? "NOT_OPEN";

  const items: NonNullable<StepsProps["items"]> = [
    { title: "Tạo đơn", status: "finish", description: dayjs(order.orderDate).format("DD/MM/YYYY") },
    approval,
    {
      title: "Xuất kho",
      status:
        warehouse === "ISSUED"
          ? "finish"
          : warehouse === "NOT_STARTED" || warehouse === "CANCELLED"
            ? "wait"
            : "process",
      description: warehouse === "NOT_STARTED" ? undefined : qtyText(flow?.issuedQty, flow?.totalQty),
    },
    {
      title: "Hóa đơn",
      status:
        invoicing === "INVOICED"
          ? "finish"
          : invoicing === "ISSUE_FAILED"
            ? "error"
            : invoicing === "NOT_INVOICED" || invoicing === "CANCELLED"
              ? "wait"
              : "process",
      description:
        invoicing === "DRAFT"
          ? "Có hóa đơn nháp"
          : invoicing === "ISSUE_FAILED"
            ? "Phát hành lỗi"
            : invoicing === "NOT_INVOICED"
              ? undefined
              : qtyText(flow?.invoicedQty, flow?.totalQty),
    },
    {
      title: "Thu tiền",
      status: receivable === "SETTLED" ? "finish" : receivable === "NOT_OPEN" ? "wait" : "process",
      description:
        receivable === "NOT_OPEN"
          ? undefined
          : receivable === "SETTLED"
            ? "Đã thu đủ"
            : `Còn ${formatMoney(flow?.outstandingAmount ?? 0)}`,
    },
  ];
  // Đơn hủy dừng ở chặng đang dở: đánh dấu đỏ chặng đầu tiên chưa xong.
  if (cancelled) {
    const stopAt = items.findIndex((item) => item.status !== "finish");
    if (stopAt >= 0) items[stopAt] = { ...items[stopAt], status: "error", description: "Đã hủy" };
  }
  return items;
}

export default function SalesOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can } = useCan();
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [activeTab, setActiveTab] = useState("lines");

  const orderQuery = useSalesOrderDetail(id);
  const order = orderQuery.data;
  const isEditable = Boolean(order && EDITABLE_STATUSES.has(order.status));

  const checksQuery = useSalesOrderChecks(id, isEditable);
  const approvalsQuery = useSalesApprovals(id ? { salesOrderId: id, limit: 50 } : {});
  // Dùng chung cache với các panel bên dưới — chỉ để đếm trên tab, không gọi thêm API.
  const adjustmentsQuery = useSalesOrderAdjustments(id);
  const reconciliationQuery = useSalesReconciliation({ salesOrderId: id });

  const submitMutation = useSubmitSalesOrder(id);
  const recallMutation = useRecallSalesOrder(id);
  const reserveMutation = useReserveSalesOrder(id);
  const cancelMutation = useCancelSalesOrder(id);
  const deleteMutation = useDeleteSalesOrder();

  const total = useMemo(
    () => (order?.lines ?? []).reduce((sum, line) => sum + lineNetAmount(line), 0),
    [order],
  );
  const transportTotal = useMemo(
    () =>
      (order?.lines ?? []).reduce(
        (sum, line) => sum + Number(line.orderedActualQty ?? 0) * Number(line.transportFeeUnitPrice ?? 0),
        0,
      ),
    [order],
  );

  if (orderQuery.isLoading) {
    return (
      <div className="so-detail">
        <Card>
          <Skeleton active />
        </Card>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="so-detail">
        <Card>
          <Empty description="Không tìm thấy đơn bán" />
        </Card>
      </div>
    );
  }

  const isInternal = order.kind !== "DAY_TRADE";
  const violations = checksQuery.data?.violations ?? [];
  const warnings = checksQuery.data?.warnings ?? [];
  const approvals = approvalsQuery.data?.items ?? [];
  const adjustmentCount = adjustmentsQuery.data?.length ?? 0;
  const transfers = order.warehouseTransfers ?? [];
  const hasReconciliation = Boolean(reconciliationQuery.data);
  const showInvoices = !(order.kind === "LOT" && order.lotInvoiceMode === "ON_WITHDRAWAL");
  const flow = order.workflow;
  const uoms = new Set(order.lines.map((line) => line.product.uom));
  const totalQty = order.lines.reduce((sum, line) => sum + Number(line.orderedActualQty ?? 0), 0);

  // Cột phụ gộp vào cột chính (kiểu Odoo/Shopify) để bảng vừa khung, không cuộn ngang.
  const hasVehicle = order.kind !== "LOT" && order.lines.some((line) => line.vehiclePlate || line.driverName);
  const lineColumns: ColumnsType<SalesOrderLine> = [
    {
      title: "#",
      dataIndex: "lineNo",
      width: 44,
      align: "center",
      render: (value) => <span className="so-line-no">{value}</span>,
    },
    {
      title: "Mặt hàng",
      key: "product",
      render: (_, line) => {
        const warehouse = (
          isInternal ? line.issueWarehouse ?? line.receivingWarehouseArea : line.receivingWarehouse
        )?.name;
        return (
          <div className="so-product">
            <div className="so-strong">{line.product.name}</div>
            <div className="so-product-meta">
              {line.product.code && <span className="so-code">{line.product.code}</span>}
              {warehouse && (
                <span>
                  <HomeOutlined /> {warehouse}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: "Số lượng",
      dataIndex: "orderedActualQty",
      width: 120,
      align: "right",
      render: (value, line) => (
        <span className="so-num">
          {formatQty(value)} <span className="so-uom">{line.product.uom}</span>
        </span>
      ),
    },
    {
      title: "Đơn giá",
      dataIndex: "unitPrice",
      width: 130,
      align: "right",
      render: (value, line) => (
        <div className="so-num">
          <div>{formatMoney(value)}</div>
          {Number(line.discountAmount ?? 0) > 0 && (
            <div className="so-price-note so-price-discount">CK −{formatMoney(line.discountAmount)}</div>
          )}
          {Number(line.transportFeeUnitPrice ?? 0) > 0 && (
            <div className="so-price-note so-price-fee">CPVC +{formatMoney(line.transportFeeUnitPrice)}</div>
          )}
        </div>
      ),
    },
    {
      title: "Thành tiền",
      key: "amount",
      width: 140,
      align: "right",
      render: (_, line) => <span className="so-num so-amount">{formatMoney(lineNetAmount(line))}</span>,
    },
    {
      title: "Xe",
      key: "vehicle",
      hidden: !hasVehicle,
      width: 130,
      render: (_, line) =>
        line.vehiclePlate || line.driverName ? (
          <div>
            {line.vehiclePlate && <span className="so-plate">{line.vehiclePlate}</span>}
            {line.driverName && <div className="so-product-meta">{line.driverName}</div>}
          </div>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        ),
    },
  ];
  const visibleLineColumns = lineColumns.filter((column) => !column.hidden);
  const amountColumnIndex = visibleLineColumns.findIndex((column) => column.key === "amount");
  const qtyColumnIndex = visibleLineColumns.findIndex(
    (column) => "dataIndex" in column && column.dataIndex === "orderedActualQty",
  );

  const approvalColumns: ColumnsType<SalesApprovalRequest> = [
    {
      title: "Loại",
      dataIndex: "type",
      width: 110,
      render: (value) => <ApprovalTypeTag type={value} />,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 120,
      render: (value) => <ApprovalStatusTag status={value} />,
    },
    { title: "Vòng", dataIndex: "approvalCycle", width: 64, align: "center" },
    {
      title: "Lý do cần duyệt",
      key: "reason",
      render: (_, request) => {
        const items = request.reasonDetail?.violations ?? [];
        return items.length ? (
          <ul className="so-plain-list">
            {items.map((violation) => (
              <li key={violation.code}>{violation.message}</li>
            ))}
          </ul>
        ) : (
          <Typography.Text type="secondary">Duyệt thường</Typography.Text>
        );
      },
    },
    {
      title: "Ghi chú duyệt",
      dataIndex: "decisionNote",
      width: 200,
      render: (value) => value ?? <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: "Thời điểm",
      key: "time",
      width: 140,
      render: (_, request) => formatDateTime(request.decidedAt ?? request.createdAt),
    },
  ];

  const doDelete = () =>
    confirmDialog.delete("Xóa đơn nháp", `Xóa đơn ${order.orderNo}?`, async () => {
      await deleteMutation.mutateAsync(order.id);
      navigate("/sales/orders");
    });

  // ----- Thao tác: một nút chính theo ngữ cảnh, phần còn lại gom vào "Thêm" -----
  const canSubmit = isEditable && isInternal && can(PERMS.SALES_SUBMIT);
  const canReserve = RESERVABLE_STATUSES.has(order.status) && can(PERMS.SALES_UPDATE);
  const canRecall = order.status === "PENDING_REVIEW" && can(PERMS.SALES_RECALL);
  const canCancel = CANCELLABLE_STATUSES.has(order.status) && can(PERMS.SALES_CANCEL);
  const canTransfer = order.status === "RESERVED" && can(PERMS.OPERATIONS_WAREHOUSE_MANAGE);
  const canDelete = isEditable && can(PERMS.SALES_DELETE);

  const primaryAction = canSubmit ? (
    <Button
      type="primary"
      icon={<SendOutlined />}
      loading={submitMutation.isPending}
      onClick={() => submitMutation.mutate(order.id)}
    >
      Gửi kiểm duyệt
    </Button>
  ) : canReserve ? (
    <Button
      type="primary"
      icon={<ReloadOutlined />}
      loading={reserveMutation.isPending}
      onClick={() => reserveMutation.mutate(order.id)}
    >
      Giữ hàng lại
    </Button>
  ) : null;

  const moreItems: MenuProps["items"] = [
    canRecall && {
      key: "recall",
      icon: <RollbackOutlined />,
      label: "Thu hồi về nháp",
      onClick: () =>
        confirmDialog.confirm(
          "Thu hồi đơn",
          "Đơn sẽ quay về nháp và các yêu cầu duyệt đang chờ sẽ bị hủy. Tiếp tục?",
          () => recallMutation.mutate(order.id),
        ),
    },
    canTransfer && {
      key: "transfer",
      icon: <SwapOutlined />,
      label: "Đổi kho nhận",
      onClick: () => navigate(`/operations/warehouse-transfers/create?salesOrderId=${order.id}`),
    },
    (canCancel || canDelete) && (canRecall || canTransfer) && { type: "divider" as const },
    canCancel && {
      key: "cancel",
      icon: <StopOutlined />,
      danger: true,
      label: "Hủy đơn",
      onClick: () => setCancelOpen(true),
    },
    canDelete && {
      key: "delete",
      icon: <DeleteOutlined />,
      danger: true,
      label: "Xóa đơn nháp",
      onClick: doDelete,
    },
  ].filter(Boolean) as MenuProps["items"];

  // ----- Tabs nội dung chính -----
  const tabItems = [
    {
      key: "lines",
      label: <TabLabel text="Dòng hàng" count={order.lines.length} />,
      children: (
        <Table<SalesOrderLine>
          rowKey="id"
          size="middle"
          className="so-lines-table"
          pagination={false}
          columns={visibleLineColumns}
          dataSource={order.lines}
          summary={() => (
            <Table.Summary.Row className="so-summary-row">
              <Table.Summary.Cell index={0} colSpan={qtyColumnIndex}>
                Tổng cộng
              </Table.Summary.Cell>
              <Table.Summary.Cell index={qtyColumnIndex} align="right">
                {uoms.size === 1 ? (
                  <span className="so-num">
                    {formatQty(totalQty)} <Typography.Text type="secondary">{[...uoms][0]}</Typography.Text>
                  </span>
                ) : null}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={qtyColumnIndex + 1} colSpan={amountColumnIndex - qtyColumnIndex - 1} />
              <Table.Summary.Cell index={amountColumnIndex} align="right">
                <span className="so-num so-amount so-amount-total">{formatMoney(total)}</span>
              </Table.Summary.Cell>
              {amountColumnIndex < visibleLineColumns.length - 1 && (
                <Table.Summary.Cell
                  index={amountColumnIndex + 1}
                  colSpan={visibleLineColumns.length - amountColumnIndex - 1}
                />
              )}
            </Table.Summary.Row>
          )}
        />
      ),
    },
    {
      key: "adjustments",
      label: <TabLabel text="Điều chỉnh" count={adjustmentCount} />,
      children: (
        <div className="so-tab-body">
          <SalesOrderAdjustmentsPanel order={order} />
        </div>
      ),
    },
    {
      key: "warehouse",
      label: <TabLabel text="Kho & đối soát" count={transfers.length + (hasReconciliation ? 1 : 0)} />,
      children: (
        <div className="so-tab-body">
          {transfers.length > 0 && (
            <Card size="small" title="Phiếu chuyển kho">
              <Table
                rowKey="id"
                size="small"
                pagination={false}
                dataSource={transfers}
                onRow={(transfer) => ({
                  onClick: () => navigate(`/operations/warehouse-transfers/${transfer.id}`),
                  style: { cursor: "pointer" },
                })}
                columns={[
                  { title: "Số phiếu", dataIndex: "movementNo", width: 170 },
                  { title: "Từ kho", render: (_, transfer) => transfer.fromWarehouse?.name ?? "—" },
                  { title: "Sang kho", render: (_, transfer) => transfer.toWarehouse?.name ?? "—" },
                  { title: "Trạng thái", dataIndex: "status", width: 130 },
                  {
                    title: "Phí",
                    width: 160,
                    align: "right" as const,
                    render: (_, transfer) =>
                      Number(transfer.transferFee || 0) > 0
                        ? `${formatMoney(transfer.transferFee)} đ${transfer.chargeCustomer ? " · thu khách" : ""}`
                        : "—",
                  },
                ]}
              />
            </Card>
          )}
          <ReconciliationPanel salesOrderId={order.id} />
          {!transfers.length && !hasReconciliation && !reconciliationQuery.isLoading && (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Chưa có phiếu chuyển kho hay bản đối soát — sẽ xuất hiện sau lần xuất kho đầu tiên."
            />
          )}
        </div>
      ),
    },
    showInvoices && {
      key: "invoices",
      label: <TabLabel text="Hóa đơn" />,
      children: (
        <div className="so-tab-body">
          <InvoicePanel salesOrderId={order.id} />
        </div>
      ),
    },
    can(PERMS.SALES_PROFITABILITY_VIEW) && {
      key: "profit",
      label: <TabLabel text="Lãi/lỗ" />,
      children: (
        <div className="so-tab-body">
          <ProfitabilityPanel salesOrderId={order.id} />
        </div>
      ),
    },
    {
      key: "approvals",
      label: <TabLabel text="Lịch sử duyệt" count={approvals.length} />,
      children: approvals.length ? (
        <Table<SalesApprovalRequest>
          rowKey="id"
          size="middle"
          pagination={false}
          columns={approvalColumns}
          dataSource={approvals}
        />
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có yêu cầu duyệt nào" />
      ),
    },
  ].filter(Boolean) as NonNullable<React.ComponentProps<typeof Tabs>["items"]>;

  // ----- Chỉ số tóm tắt -----
  const kpis: Array<{
    label: string;
    value: React.ReactNode;
    hint?: React.ReactNode;
    tone?: "warn" | "ok";
    icon: React.ReactNode;
    color: "blue" | "purple" | "cyan" | "geekblue" | "orange";
  }> = [
    {
      icon: <DollarOutlined />,
      color: "blue",
      label: "Giá trị hàng (chưa thuế)",
      value: `${formatMoney(total)} đ`,
      hint: order.hasTransportFee ? `gồm CPVC ${formatMoney(transportTotal)} đ` : undefined,
    },
    {
      icon: <AppstoreOutlined />,
      color: "purple",
      label: "Số lượng đặt",
      value: uoms.size === 1 ? `${formatQty(totalQty)} ${[...uoms][0]}` : `${order.lines.length} dòng`,
    },
    {
      icon: <CarOutlined />,
      color: "cyan",
      label: "Đã xuất kho",
      value: flow ? `${formatQty(flow.issuedQty)}` : "—",
      hint: flow && Number(flow.totalQty) > 0 ? `/ ${formatQty(flow.totalQty)}` : undefined,
      tone: flow?.warehouse === "ISSUED" ? "ok" : undefined,
    },
    {
      icon: <FileTextOutlined />,
      color: "geekblue",
      label: "Đã xuất hóa đơn",
      value: flow ? `${formatQty(flow.invoicedQty)}` : "—",
      hint: flow && Number(flow.totalQty) > 0 ? `/ ${formatQty(flow.totalQty)}` : undefined,
      tone: flow?.invoicing === "INVOICED" ? "ok" : flow?.invoicing === "ISSUE_FAILED" ? "warn" : undefined,
    },
    {
      icon: <WalletOutlined />,
      color: "orange",
      label: "Còn phải thu",
      value: flow && flow.receivable !== "NOT_OPEN" ? `${formatMoney(flow.outstandingAmount)} đ` : "—",
      hint:
        flow && flow.receivable !== "NOT_OPEN" ? `trên ${formatMoney(flow.receivableAmount)} đ` : "chưa phát sinh",
      tone: flow?.receivable === "SETTLED" ? "ok" : Number(flow?.outstandingAmount ?? 0) > 0 ? "warn" : undefined,
    },
  ];

  const plans = order.paymentPlans ?? [];

  return (
    <div className="so-detail">
      {/* ===== Đầu trang ===== */}
      <Card className="so-header" bordered={false}>
        <div className="so-header-top">
          <div className="so-header-title">
            <Tooltip title="Về danh sách đơn bán">
              <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate("/sales/orders")} />
            </Tooltip>
            <div>
              <Space size={8} wrap align="center">
                <Typography.Title level={3} style={{ margin: 0 }}>
                  {order.orderNo}
                </Typography.Title>
                <OrderStatusTag status={order.status} />
                <OrderKindTag kind={order.kind} />
                <OrderHoldTags salesOrderId={order.id} />
              </Space>
              <div className="so-header-sub">
                <span className="so-strong">{order.customer.name}</span>
                {order.customer.code && <span>{order.customer.code}</span>}
                <span>Ngày đơn {dayjs(order.orderDate).format("DD/MM/YYYY")}</span>
                <span>
                  {order.paymentTermType === "NET_DAYS"
                    ? `Công nợ ${order.paymentTermDays ?? 0} ngày`
                    : "Thanh toán trong ngày"}
                </span>
                {order.draftNo && order.draftNo !== order.orderNo && <span>Số nháp {order.draftNo}</span>}
                {order.mergedOrders?.length ? (
                  <span>Gộp từ {order.mergedOrders.map((row) => row.orderNo).join(", ")}</span>
                ) : null}
              </div>
              {order.mergedInto && (
                <Alert
                  type="info"
                  showIcon
                  style={{ marginTop: 8 }}
                  message={
                    <>
                      Đơn này đã được gộp vào{" "}
                      <Button
                        type="link"
                        size="small"
                        style={{ padding: 0 }}
                        onClick={() => navigate(`/sales/orders/${order.mergedInto!.id}`)}
                      >
                        {order.mergedInto.orderNo}
                      </Button>
                    </>
                  }
                />
              )}
            </div>
          </div>
          <Space wrap>
            {/* Mở tab mới thay vì tải file: Sale thường xem rồi mới in hoặc gửi khách. */}
            <Button
              icon={<PrinterOutlined />}
              onClick={() => window.open(`${API_BASE}/sales-orders/${order.id}/print`, "_blank")}
            >
              In đơn
            </Button>
            {isEditable && can(PERMS.SALES_UPDATE) && (
              <Button icon={<EditOutlined />} onClick={() => setEditOpen(true)}>
                Sửa
              </Button>
            )}
            {moreItems && moreItems.length > 0 && (
              <Dropdown menu={{ items: moreItems }} trigger={["click"]} placement="bottomRight">
                <Button icon={<MoreOutlined />}>Thêm</Button>
              </Dropdown>
            )}
            {primaryAction}
          </Space>
        </div>

        <Steps size="small" className="so-steps" items={orderProgress(order)} />

        <div className="so-kpis">
          {kpis.map((kpi) => (
            <div key={kpi.label} className={`so-kpi so-kpi--${kpi.color}${kpi.tone ? ` so-kpi-${kpi.tone}` : ""}`}>
              <div className="so-kpi-icon">{kpi.icon}</div>
              <div className="so-kpi-text">
                <div className="so-kpi-label">{kpi.label}</div>
                <div className="so-kpi-value">
                  {kpi.value}
                  {kpi.hint && <span className="so-kpi-hint"> {kpi.hint}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ===== Cảnh báo ===== */}
      {order.status === "REJECTED" && (
        <Alert
          type="error"
          showIcon
          className="so-alert"
          message="Đơn bị từ chối"
          description={order.rejectedReason ?? "Không có lý do kèm theo."}
        />
      )}
      {order.kind === "LOT" && (
        <Alert
          type="info"
          showIcon
          className="so-alert"
          message="Đơn lô: khách rút dần bằng phiếu rút lô, không có hạn rút và không tạo đơn bán mới."
          description={
            order.lotInvoiceMode === "ON_CONFIRMATION"
              ? "Hóa đơn: một hóa đơn cho cả lô, ngay sau khi xác nhận đơn hàng."
              : "Hóa đơn: xuất nhiều lần theo tiến độ khách rút hàng."
          }
        />
      )}
      {isEditable && isInternal && (violations.length > 0 || warnings.length > 0) && (
        <Alert
          type={violations.length ? "warning" : "info"}
          showIcon
          className="so-alert"
          message={
            violations.length
              ? `Gửi kiểm duyệt sẽ cần ${violations.length} phê duyệt`
              : "Lưu ý khi gửi kiểm duyệt"
          }
          description={
            <div>
              <ul className="so-plain-list">
                {violations.map((violation) => (
                  <li key={violation.code}>
                    <ApprovalTypeTag type={violation.approvalType} /> {violation.message}
                  </li>
                ))}
                {warnings.map((warning) => (
                  <li key={warning.code}>{warning.message}</li>
                ))}
              </ul>
              {checksQuery.data && (
                <div style={{ marginTop: 8 }}>
                  Giá trị đơn: <strong>{formatMoney(checksQuery.data.orderValue)}</strong>
                </div>
              )}
            </div>
          }
        />
      )}

      {/* ===== Nội dung ===== */}
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={17}>
          <Card className="so-main" bordered={false}>
            <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
          </Card>
        </Col>

        <Col xs={24} xl={7}>
          <Card className="so-side" bordered={false} title={<SideTitle icon={<UserOutlined />} text="Khách hàng" />}>
            <div className="so-customer">
              <div className="so-avatar">{customerInitials(order.customer.name)}</div>
              <div className="so-strong so-side-name">{order.customer.name}</div>
            </div>
            <Descriptions size="small" column={1} colon={false} className="so-side-desc">
              <Descriptions.Item label="Mã KH">{order.customer.code ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="MST">{order.customer.taxCode ?? "—"}</Descriptions.Item>
            </Descriptions>
          </Card>

          <Card className="so-side" bordered={false} title={<SideTitle icon={<ProfileOutlined />} text="Thông tin đơn" />}>
            <Descriptions size="small" column={1} colon={false} className="so-side-desc">
              <Descriptions.Item label="Ngày đơn">{dayjs(order.orderDate).format("DD/MM/YYYY")}</Descriptions.Item>
              <Descriptions.Item label="Loại đơn">
                <OrderKindTag kind={order.kind} />
              </Descriptions.Item>
              <Descriptions.Item label="Điều khoản TT">
                {order.paymentTermType === "NET_DAYS"
                  ? `Công nợ ${order.paymentTermDays ?? 0} ngày`
                  : "Trong ngày"}
              </Descriptions.Item>
              {plans.length > 0 && (
                <Descriptions.Item label="Lịch thanh toán">
                  <ul className="so-plain-list">
                    {plans.map((plan, index) => (
                      <li key={plan.id ?? index}>
                        {dayjs(plan.dueDate).format("DD/MM/YYYY")} —{" "}
                        {plan.percent != null && plan.percent !== ""
                          ? `${plan.percent}%`
                          : `${formatMoney(plan.amount ?? 0)} đ`}
                      </li>
                    ))}
                  </ul>
                </Descriptions.Item>
              )}
              {order.hasTransportFee && (
                <Descriptions.Item label="Xe / lái xe">
                  {[order.transportVehiclePlate, order.transportDriverName].filter(Boolean).join(" / ") || "—"}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Ghi chú">
                {order.note || <Typography.Text type="secondary">—</Typography.Text>}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card
            className="so-side"
            bordered={false}
            title={<SideTitle icon={<SafetyCertificateOutlined />} text="Tiến trình duyệt" />}
          >
            <Timeline
              className="so-timeline"
              items={[
                { color: "gray", children: <>Tạo đơn · {dayjs(order.orderDate).format("DD/MM/YYYY")}</> },
                order.submittedAt && {
                  color: "blue",
                  children: <>Gửi kiểm duyệt · {formatDateTime(order.submittedAt)}</>,
                },
                order.status === "REJECTED" && {
                  color: "red",
                  children: <>Bị từ chối{order.rejectedReason ? `: ${order.rejectedReason}` : ""}</>,
                },
                order.approvedAt && {
                  color: "green",
                  children: (
                    <>
                      Đã duyệt · {formatDateTime(order.approvedAt)}
                      {(order.approvalCycle ?? 1) > 1 && (
                        <Typography.Text type="secondary"> (vòng {order.approvalCycle})</Typography.Text>
                      )}
                    </>
                  ),
                },
                order.status === "CANCELLED" && { color: "red", children: "Đã hủy" },
              ].filter(Boolean) as NonNullable<React.ComponentProps<typeof Timeline>["items"]>}
            />
            {approvals.length > 0 && (
              <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setActiveTab("approvals")}>
                Xem {approvals.length} yêu cầu duyệt
              </Button>
            )}
          </Card>

          {order.purchaseOrders.length > 0 && (
            <Card className="so-side" bordered={false} title={<SideTitle icon={<ShoppingCartOutlined />} text="Đơn mua gắn kèm" />}>
              <Space direction="vertical" style={{ width: "100%" }}>
                {order.purchaseOrders.map((purchase) => (
                  <div key={purchase.id} className="so-side-row">
                    <div>
                      <div className="so-strong">{purchase.orderNo}</div>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {purchase.supplier.name}
                      </Typography.Text>
                    </div>
                    <Tag style={{ marginInlineEnd: 0 }}>{purchase.status}</Tag>
                  </div>
                ))}
              </Space>
            </Card>
          )}
        </Col>
      </Row>

      <InternalSalesOrderModal
        open={editOpen}
        order={order}
        onClose={() => setEditOpen(false)}
        onSaved={() => orderQuery.refetch()}
      />

      <Modal
        open={cancelOpen}
        title={`Hủy đơn ${order.orderNo}`}
        okText="Hủy đơn"
        okButtonProps={{ danger: true, disabled: !cancelReason.trim() }}
        cancelText="Đóng"
        confirmLoading={cancelMutation.isPending}
        onCancel={() => setCancelOpen(false)}
        onOk={async () => {
          await cancelMutation.mutateAsync({ orderId: order.id, reason: cancelReason.trim() });
          setCancelOpen(false);
          setCancelReason("");
        }}
      >
        <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
          Hàng đang giữ sẽ được trả lại kho và các bên liên quan sẽ nhận được thông báo.
        </Typography.Paragraph>
        <Input.TextArea
          rows={3}
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          placeholder="Lý do hủy (bắt buộc)"
        />
      </Modal>
    </div>
  );
}
