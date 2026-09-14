import React, { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Empty,
  Input,
  Modal,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  EditOutlined,
  PrinterOutlined,
  ReloadOutlined,
  RollbackOutlined,
  SendOutlined,
  StopOutlined,
  SwapOutlined,
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
  useSalesOrderChecks,
  useSalesOrderDetail,
  useSubmitSalesOrder,
} from "../hooks";
import type { SalesApprovalRequest, SalesOrderLine } from "../types";
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

export default function SalesOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can } = useCan();
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const orderQuery = useSalesOrderDetail(id);
  const order = orderQuery.data;
  const isEditable = Boolean(order && EDITABLE_STATUSES.has(order.status));

  const checksQuery = useSalesOrderChecks(id, isEditable);
  const approvalsQuery = useSalesApprovals(id ? { salesOrderId: id, limit: 50 } : {});

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
      <div style={{ padding: 16 }}>
        <Skeleton active />
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ padding: 16 }}>
        <Empty description="Không tìm thấy đơn bán" />
      </div>
    );
  }

  const isInternal = order.kind !== "DAY_TRADE";
  const violations = checksQuery.data?.violations ?? [];
  const warnings = checksQuery.data?.warnings ?? [];
  const approvals = approvalsQuery.data?.items ?? [];

  const lineColumns: ColumnsType<SalesOrderLine> = [
    { title: "#", dataIndex: "lineNo", width: 46 },
    {
      title: "Mặt hàng",
      key: "product",
      render: (_, line) => (
        <div>
          <div>{line.product.name}</div>
          {line.product.code && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {line.product.code}
            </Typography.Text>
          )}
        </div>
      ),
    },
    {
      title: "Kho nhận",
      key: "warehouse",
      width: 190,
      render: (_, line) =>
        (isInternal
          ? line.issueWarehouse ?? line.receivingWarehouseArea
          : line.receivingWarehouse
        )?.name ?? "—",
    },
    {
      title: "Số lượng",
      dataIndex: "orderedActualQty",
      width: 110,
      align: "right",
      render: (value, line) => `${formatQty(value)} ${line.product.uom}`,
    },
    {
      title: "Đơn giá",
      dataIndex: "unitPrice",
      width: 110,
      align: "right",
      render: (value) => formatMoney(value),
    },
    {
      title: "Chiết khấu",
      dataIndex: "discountAmount",
      width: 100,
      align: "right",
      render: (value) => formatMoney(value ?? 0),
    },
    {
      title: "CPVC/đv",
      dataIndex: "transportFeeUnitPrice",
      width: 105,
      align: "right",
      render: (value) => formatMoney(value ?? 0),
    },
    {
      title: "Thành tiền",
      key: "amount",
      width: 120,
      align: "right",
      render: (_, line) => <strong>{formatMoney(lineNetAmount(line))}</strong>,
    },
    {
      title: "BKS / Lái xe",
      key: "vehicle",
      hidden: order.kind === "LOT",
      width: 150,
      render: (_, line) =>
        line.vehiclePlate || line.driverName ? (
          <div>
            <div>{line.vehiclePlate ?? "—"}</div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {line.driverName ?? ""}
            </Typography.Text>
          </div>
        ) : (
          "—"
        ),
    },
  ];

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
      width: 130,
      render: (value) => <ApprovalStatusTag status={value} />,
    },
    { title: "Vòng", dataIndex: "approvalCycle", width: 70 },
    {
      title: "Lý do",
      key: "reason",
      render: (_, request) => (
        <ul style={{ margin: 0, paddingInlineStart: 16 }}>
          {(request.reasonDetail?.violations ?? []).map((violation) => (
            <li key={violation.code}>{violation.message}</li>
          ))}
        </ul>
      ),
    },
    {
      title: "Ghi chú duyệt",
      dataIndex: "decisionNote",
      width: 200,
      render: (value) => value ?? "—",
    },
    {
      title: "Thời điểm",
      key: "time",
      width: 150,
      render: (_, request) =>
        dayjs(request.decidedAt ?? request.createdAt).format("DD/MM/YYYY HH:mm"),
    },
  ];

  const doDelete = () =>
    confirmDialog.delete("Xóa đơn nháp", `Xóa đơn ${order.orderNo}?`, async () => {
      await deleteMutation.mutateAsync(order.id);
      navigate("/sales/orders");
    });

  return (
    <div style={{ padding: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/sales/orders")}>
            Danh sách
          </Button>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {order.orderNo}
          </Typography.Title>
          <OrderStatusTag status={order.status} />
          <OrderKindTag kind={order.kind} />
        </Space>
        <Space wrap>
          {/* Mở tab mới thay vì tải file: Sale thường xem rồi mới in hoặc gửi khách. */}
          <Button
            icon={<PrinterOutlined />}
            onClick={() => window.open(`${API_BASE}/sales-orders/${order.id}/print`, "_blank")}
          >
            In đơn đặt hàng
          </Button>
          {isEditable && can(PERMS.SALES_UPDATE) && (
            <Button icon={<EditOutlined />} onClick={() => setEditOpen(true)}>
              Sửa
            </Button>
          )}
          {isEditable && isInternal && can(PERMS.SALES_SUBMIT) && (
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={submitMutation.isPending}
              onClick={() => submitMutation.mutate(order.id)}
            >
              Gửi kiểm duyệt
            </Button>
          )}
          {order.status === "PENDING_REVIEW" && can(PERMS.SALES_RECALL) && (
            <Button
              icon={<RollbackOutlined />}
              loading={recallMutation.isPending}
              onClick={() =>
                confirmDialog.confirm(
                  "Thu hồi đơn",
                  "Đơn sẽ quay về nháp và các yêu cầu duyệt đang chờ sẽ bị hủy. Tiếp tục?",
                  () => recallMutation.mutate(order.id),
                )
              }
            >
              Thu hồi
            </Button>
          )}
          {RESERVABLE_STATUSES.has(order.status) && can(PERMS.SALES_UPDATE) && (
            <Button
              icon={<ReloadOutlined />}
              loading={reserveMutation.isPending}
              onClick={() => reserveMutation.mutate(order.id)}
            >
              Giữ hàng lại
            </Button>
          )}
          {CANCELLABLE_STATUSES.has(order.status) && can(PERMS.SALES_CANCEL) && (
            <Button danger icon={<StopOutlined />} onClick={() => setCancelOpen(true)}>
              Hủy đơn
            </Button>
          )}
          {order.status === "RESERVED" && can(PERMS.OPERATIONS_WAREHOUSE_MANAGE) && (
            <Button
              icon={<SwapOutlined />}
              onClick={() =>
                navigate(`/operations/warehouse-transfers/create?salesOrderId=${order.id}`)
              }
            >
              Đổi kho nhận
            </Button>
          )}
          {isEditable && can(PERMS.SALES_DELETE) && (
            <Button danger type="text" icon={<DeleteOutlined />} onClick={doDelete}>
              Xóa
            </Button>
          )}
        </Space>
      </div>

      {order.status === "REJECTED" && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 12 }}
          message="Đơn bị từ chối"
          description={order.rejectedReason ?? "Không có lý do kèm theo."}
        />
      )}

      {order.kind === "LOT" && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="Đơn lô: khách rút dần bằng phiếu rút lô, không có hạn rút và không tạo đơn bán mới."
          description={
            order.lotInvoiceMode === "ON_CONFIRMATION"
              ? "Hóa đơn: một hóa đơn cho cả lô, ngay sau khi xác nhận đơn hàng."
              : "Hóa đơn: xuất nhiều lần theo tiến độ khách rút hàng."
          }
        />
      )}

      <Card size="small" style={{ marginBottom: 12 }}>
        <Descriptions size="small" column={4}>
          <Descriptions.Item label="Khách hàng">{order.customer.name}</Descriptions.Item>
          <Descriptions.Item label="Mã KH">{order.customer.code ?? "—"}</Descriptions.Item>
          <Descriptions.Item label="Ngày đơn">
            {dayjs(order.orderDate).format("DD/MM/YYYY")}
          </Descriptions.Item>
          <Descriptions.Item label="Điều khoản TT">
            {order.paymentTermType === "NET_DAYS"
              ? `Công nợ ${order.paymentTermDays ?? 0} ngày`
              : "Trong ngày"}
          </Descriptions.Item>
          <Descriptions.Item label="Gửi duyệt">
            {order.submittedAt ? dayjs(order.submittedAt).format("DD/MM/YYYY HH:mm") : "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Duyệt lúc">
            {order.approvedAt ? dayjs(order.approvedAt).format("DD/MM/YYYY HH:mm") : "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Vòng duyệt">{order.approvalCycle ?? 1}</Descriptions.Item>
          <Descriptions.Item label="Tổng tiền chưa thuế">
            <strong>{formatMoney(total)} đ</strong>
          </Descriptions.Item>
          {order.hasTransportFee && (
            <>
              <Descriptions.Item label="Tổng CPVC">
                <strong>{formatMoney(transportTotal)} đ</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Xe / lái xe" span={2}>
                {[order.transportVehiclePlate, order.transportDriverName].filter(Boolean).join(" / ") || "—"}
              </Descriptions.Item>
            </>
          )}
          <Descriptions.Item label="Ghi chú" span={4}>
            {order.note ?? "—"}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {isEditable && isInternal && (violations.length > 0 || warnings.length > 0) && (
        <Alert
          type={violations.length ? "warning" : "info"}
          showIcon
          style={{ marginBottom: 12 }}
          message={
            violations.length
              ? `Gửi kiểm duyệt sẽ cần ${violations.length} phê duyệt`
              : "Lưu ý khi gửi kiểm duyệt"
          }
          description={
            <div>
              <ul style={{ margin: 0, paddingInlineStart: 18 }}>
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
                  <Space size={16} wrap>
                    <span>
                      Giá trị đơn: <strong>{formatMoney(checksQuery.data.orderValue)}</strong>
                    </span>
                  </Space>
                </div>
              )}
            </div>
          }
        />
      )}

      <Card size="small" title="Dòng hàng" style={{ marginBottom: 12 }}>
        <Table<SalesOrderLine>
          rowKey="id"
          size="small"
          pagination={false}
          columns={lineColumns}
          dataSource={order.lines}
          scroll={{ x: 1000 }}
        />
      </Card>

      <SalesOrderAdjustmentsPanel order={order} />

      {(order.warehouseTransfers?.length ?? 0) > 0 && (
        <Card size="small" title="Phiếu chuyển kho" style={{ marginBottom: 12 }}>
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={order.warehouseTransfers}
            onRow={(transfer) => ({
              onClick: () => navigate(`/operations/warehouse-transfers/${transfer.id}`),
              style: { cursor: "pointer" },
            })}
            columns={[
              { title: "Số phiếu", dataIndex: "movementNo", width: 170 },
              {
                title: "Từ kho",
                render: (_, transfer) => transfer.fromWarehouse?.name ?? "—",
              },
              {
                title: "Sang kho",
                render: (_, transfer) => transfer.toWarehouse?.name ?? "—",
              },
              { title: "Trạng thái", dataIndex: "status", width: 130 },
              {
                title: "Phí",
                width: 150,
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

      {/*
        Đơn lô "theo tiến độ rút" xuất hóa đơn ở từng phiếu rút, không xuất cho cả đơn —
        nên chỉ ẩn panel ở đúng trường hợp đó.
      */}
      {!(order.kind === "LOT" && order.lotInvoiceMode === "ON_WITHDRAWAL") && (
        <InvoicePanel salesOrderId={order.id} />
      )}

      {can(PERMS.SALES_PROFITABILITY_VIEW) && <ProfitabilityPanel salesOrderId={order.id} />}

      {approvals.length > 0 && (
        <Card size="small" title="Lịch sử phê duyệt">
          <Table<SalesApprovalRequest>
            rowKey="id"
            size="small"
            pagination={false}
            columns={approvalColumns}
            dataSource={approvals}
            scroll={{ x: 900 }}
          />
        </Card>
      )}

      {order.purchaseOrders.length > 0 && (
        <Card size="small" title="Đơn mua gắn kèm" style={{ marginTop: 12 }}>
          <Space direction="vertical">
            {order.purchaseOrders.map((purchase) => (
              <Space key={purchase.id}>
                <Tag>{purchase.orderNo}</Tag>
                <span>{purchase.supplier.name}</span>
                <Typography.Text type="secondary">{purchase.status}</Typography.Text>
              </Space>
            ))}
          </Space>
        </Card>
      )}

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
