import React, { useMemo, useState } from "react";
import { Alert, Button, Card, Input, InputNumber, Modal, Space, Table, Tag, Typography } from "antd";
import { CheckOutlined, EditOutlined, FileAddOutlined, PlusOutlined, StopOutlined } from "@ant-design/icons";
import { useCan } from "../../../shared/authz/useCan";
import { PERMS } from "../../../shared/authz/perms";
import {
  useCreateAdjustmentInvoices,
  useCreateSalesOrderAdjustment,
  useDecideSalesOrderAdjustment,
  useSalesOrderAdjustments,
} from "../hooks";
import type { SalesOrder, SalesOrderAdjustment } from "../types";
import { DELIVERY_STATUS_LABELS, formatMoney, formatQty } from "./labels";
import { SalesInvoiceDrawer } from "./SalesInvoiceDrawer";

const statusColor: Record<string, string> = {
  PENDING: "gold",
  APPROVED: "green",
  REJECTED: "red",
  CANCELLED: "default",
};

export const SalesOrderAdjustmentsPanel: React.FC<{ order: SalesOrder }> = ({ order }) => {
  const { can } = useCan();
  const query = useSalesOrderAdjustments(order.id);
  const createMutation = useCreateSalesOrderAdjustment(order.id);
  const decideMutation = useDecideSalesOrderAdjustment(order.id);
  const adjustmentInvoiceMutation = useCreateAdjustmentInvoices();
  const [invoiceId, setInvoiceId] = useState<string>();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [values, setValues] = useState<
    Record<string, { adjustedQty: number; adjustedUnitPrice: number }>
  >({});
  const [rejecting, setRejecting] = useState<SalesOrderAdjustment | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [supplementaryVehiclePlate, setSupplementaryVehiclePlate] = useState("");
  const [supplementaryDriverName, setSupplementaryDriverName] = useState("");

  /** Lượng đã xuất thật còn lại ở khách (đã trừ phần trả lại). Đơn lô xuất theo phiếu rút → 0. */
  const netIssued = (line: SalesOrder["lines"][number]) =>
    order.kind === "LOT" ? 0 : Number(line.issuedQty ?? 0) - Number(line.returnedQty ?? 0);

  /** Việc kho sẽ phát sinh nếu đổi lượng dòng này — nói trước cho Sale biết. */
  const warehouseImpact = (line: SalesOrder["lines"][number]) => {
    const next = values[line.id]?.adjustedQty;
    const current = Number(line.orderedActualQty);
    if (next == null || next === current) return null;
    if (netIssued(line) > 0) {
      return next > current
        ? { color: "purple", text: `Xuất bổ sung +${formatQty(next - current)}` }
        : { color: "volcano", text: `Nhập trả −${formatQty(current - next)}` };
    }
    return order.kind === "LOT"
      ? { color: "blue", text: "Đổi tổng lô" }
      : { color: "blue", text: "Sửa lệnh xuất đang chờ" };
  };

  const begin = () => {
    setReason("");
    setSupplementaryVehiclePlate("");
    setSupplementaryDriverName("");
    setValues(
      Object.fromEntries(
        order.lines.map((line) => [
          line.id,
          {
            adjustedQty: Number(line.orderedActualQty),
            adjustedUnitPrice: Number(line.unitPrice),
          },
        ])
      )
    );
    setOpen(true);
  };

  const changedLines = useMemo(
    () =>
      order.lines
        .filter((line) => {
          const next = values[line.id];
          return (
            next &&
            (next.adjustedQty !== Number(line.orderedActualQty) ||
              next.adjustedUnitPrice !== Number(line.unitPrice))
          );
        })
        .map((line) => ({ salesOrderLineId: line.id, ...values[line.id] })),
    [order.lines, values]
  );

  const needsSupplementary = order.lines.some((line) => {
    const next = values[line.id]?.adjustedQty;
    return netIssued(line) > 0 && next != null && next > Number(line.orderedActualQty);
  });
  /** Giảm quá phần đã xuất còn ở khách thì không có gì để nhận trả — chặn ngay trên form. */
  const overReturnLine = order.lines.find((line) => {
    const next = values[line.id]?.adjustedQty;
    const issued = netIssued(line);
    return issued > 0 && next != null && Number(line.orderedActualQty) - next > issued;
  });

  const rows = query.data ?? [];
  const mayCreate =
    Boolean(order.approvedAt) &&
    !["DRAFT", "PENDING_REVIEW", "REJECTED", "CANCELLED"].includes(order.status) &&
    can(PERMS.SALES_UPDATE);

  return (
    <>
      <Card
        size="small"
        title="Đơn điều chỉnh"
        style={{ marginBottom: 12 }}
        extra={
          mayCreate ? (
            <Button size="small" icon={<PlusOutlined />} onClick={begin}>
              Tạo điều chỉnh
            </Button>
          ) : null
        }
      >
        <Table<SalesOrderAdjustment>
          rowKey="id"
          size="small"
          loading={query.isLoading}
          pagination={false}
          locale={{ emptyText: "Chưa có đơn điều chỉnh" }}
          dataSource={rows}
          expandable={{
            expandedRowRender: (record) => (
              <Table
                rowKey="id"
                size="small"
                pagination={false}
                dataSource={record.lines}
                columns={[
                  {
                    title: "Mặt hàng",
                    render: (_: unknown, line: SalesOrderAdjustment["lines"][number]) =>
                      line.orderLine.product.code || line.orderLine.product.name,
                  },
                  {
                    title: "Số lượng",
                    render: (_: unknown, line: SalesOrderAdjustment["lines"][number]) =>
                      line.quantityChanged
                        ? `${formatQty(line.previousQty)} → ${formatQty(line.adjustedQty)}`
                        : formatQty(line.previousQty),
                  },
                  {
                    title: "Đơn giá",
                    render: (_: unknown, line: SalesOrderAdjustment["lines"][number]) =>
                      line.unitPriceChanged
                        ? `${formatMoney(line.previousUnitPrice)} → ${formatMoney(line.adjustedUnitPrice)}`
                        : formatMoney(line.previousUnitPrice),
                  },
                ]}
              />
            ),
          }}
          columns={[
            { title: "Số phiếu", dataIndex: "adjustmentNo", width: 150 },
            { title: "Lý do", dataIndex: "reason" },
            {
              title: "Trạng thái",
              width: 120,
              render: (_, record) => (
                <Tag color={statusColor[record.status]}>{record.status}</Tag>
              ),
            },
            {
              title: "Xử lý tiếp",
              width: 360,
              render: (_, record) => {
                const liveInvoices = (record.invoices ?? []).filter(
                  (invoice) => invoice.status !== "CANCELLED",
                );
                const mayCreateInvoice =
                  record.status === "APPROVED" &&
                  record.requiresInvoiceCorrection &&
                  !record.invoiceCorrectedAt &&
                  !liveInvoices.length &&
                  can(PERMS.SALES_INVOICE_ISSUE);
                return (
                  <Space size={4} wrap>
                    {record.requiresWarehouseCorrection &&
                      (record.warehouseCorrectedAt ? (
                        <Tag color="green">Đã điều chỉnh kho</Tag>
                      ) : (
                        <Tag color="orange">Chờ kho</Tag>
                      ))}
                    {(record.deliveries ?? []).map((delivery) => (
                      <Tag key={delivery.id} color={delivery.status === "POSTED" ? "green" : delivery.status === "VOIDED" ? "default" : "purple"}>
                        Xuất bổ sung {delivery.deliveryNo} · {DELIVERY_STATUS_LABELS[delivery.status] ?? delivery.status}
                      </Tag>
                    ))}
                    {(record.returns ?? []).map((row) => {
                      const qty = row.lines.reduce(
                        (sum, line) => sum + Number(line.actualQty ?? line.requestedActualQty),
                        0,
                      );
                      return (
                        <Tag
                          key={row.id}
                          color={row.status === "POSTED" ? "green" : row.status === "CANCELLED" ? "default" : "volcano"}
                        >
                          Nhập trả {row.returnNo} · {formatQty(qty)} ·{" "}
                          {row.status === "POSTED" ? "đã nhận" : row.status === "CANCELLED" ? "đã hủy" : "chờ kho"}
                        </Tag>
                      );
                    })}
                    {record.requiresInvoiceCorrection &&
                      (record.invoiceCorrectedAt ? (
                        <Tag color="green">Đã điều chỉnh HĐ</Tag>
                      ) : (
                        <Tag color="purple">Điều chỉnh HĐ</Tag>
                      ))}
                    {record.status === "APPROVED" && record.appliedAt && (
                      <Tag color="green">Đã áp dụng</Tag>
                    )}
                    {liveInvoices.map((invoice) => (
                      <Button
                        key={invoice.id}
                        type="link"
                        size="small"
                        style={{ padding: 0 }}
                        onClick={() => setInvoiceId(invoice.id)}
                      >
                        {invoice.adjustmentDirection === "DECREASE" ? "HĐ giảm" : "HĐ tăng"}{" "}
                        {invoice.misaInvoiceNo ?? invoice.invoiceNoInternal} ({invoice.status})
                      </Button>
                    ))}
                    {mayCreateInvoice && (
                      <Button
                        size="small"
                        icon={<FileAddOutlined />}
                        loading={
                          adjustmentInvoiceMutation.isPending &&
                          adjustmentInvoiceMutation.variables === record.id
                        }
                        onClick={() =>
                          adjustmentInvoiceMutation.mutate(record.id, {
                            onSuccess: (result) => {
                              if (result.invoices[0]) setInvoiceId(result.invoices[0].id);
                            },
                          })
                        }
                      >
                        Lập HĐ điều chỉnh
                      </Button>
                    )}
                  </Space>
                );
              },
            },
            {
              title: "Thao tác",
              width: 128,
              render: (_, record) =>
                record.status === "PENDING" && can(PERMS.SALES_APPROVE_ORDER) ? (
                  <Space size={4}>
                    <Button
                      size="small"
                      type="primary"
                      icon={<CheckOutlined />}
                      loading={decideMutation.isPending}
                      onClick={() =>
                        decideMutation.mutate({ id: record.id, decision: "approve" })
                      }
                    />
                    <Button
                      size="small"
                      danger
                      icon={<StopOutlined />}
                      onClick={() => {
                        setRejectReason("");
                        setRejecting(record);
                      }}
                    />
                  </Space>
                ) : null,
            },
          ]}
        />
      </Card>

      <Modal
        open={open}
        width={1000}
        title={`Tạo đơn điều chỉnh ${order.orderNo}`}
        okText="Gửi duyệt"
        cancelText="Đóng"
        okButtonProps={{ disabled: !reason.trim() || !changedLines.length || Boolean(overReturnLine) }}
        confirmLoading={createMutation.isPending}
        onCancel={() => setOpen(false)}
        onOk={async () => {
          await createMutation.mutateAsync({
            salesOrderId: order.id,
            reason: reason.trim(),
            lines: changedLines,
            ...(needsSupplementary
              ? {
                  supplementaryVehiclePlate: supplementaryVehiclePlate.trim() || undefined,
                  supplementaryDriverName: supplementaryDriverName.trim() || undefined,
                }
              : {}),
          });
          setOpen(false);
        }}
      >
        <Alert
          showIcon
          type="info"
          style={{ marginBottom: 12 }}
          message="Chỉ nhập dòng cần đổi. Hệ thống tự xử lý phần kho khi phiếu được duyệt:"
          description={
            <ul className="so-plain-list">
              <li>Hàng <strong>chưa xuất</strong>: cập nhật lệnh xuất đang chờ kho.</li>
              <li>Hàng <strong>đã xuất</strong>, tăng: tạo <strong>lệnh xuất bổ sung</strong> phần tăng.</li>
              <li>Hàng <strong>đã xuất</strong>, giảm: tạo <strong>phiếu nhập trả</strong> để kho nhận lại hàng.</li>
              <li>Chỉ đổi giá: không có việc kho; đã có hóa đơn thì hệ thống dựng hóa đơn điều chỉnh.</li>
            </ul>
          }
        />
        {overReturnLine && (
          <Alert
            showIcon
            type="error"
            style={{ marginBottom: 12 }}
            message={`Dòng ${overReturnLine.lineNo}: giảm nhiều hơn lượng đã xuất còn ở khách (${formatQty(netIssued(overReturnLine))}) — không có hàng để nhận trả.`}
          />
        )}
        <Typography.Text>Lý do điều chỉnh *</Typography.Text>
        <Input.TextArea
          rows={2}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          style={{ margin: "6px 0 12px" }}
          placeholder="Ví dụ: khách xác nhận sai lượng / sai đơn giá"
        />
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={order.lines}
          columns={[
            {
              title: "Mặt hàng",
              render: (_: unknown, line: SalesOrder["lines"][number]) =>
                line.product.code || line.product.name,
            },
            {
              title: "Số lượng cũ",
              width: 110,
              render: (_: unknown, line: SalesOrder["lines"][number]) =>
                formatQty(line.orderedActualQty),
            },
            {
              title: "Đã xuất",
              width: 100,
              render: (_: unknown, line: SalesOrder["lines"][number]) =>
                order.kind === "LOT" ? (
                  <Typography.Text type="secondary">theo phiếu rút</Typography.Text>
                ) : netIssued(line) > 0 ? (
                  formatQty(netIssued(line))
                ) : (
                  <Typography.Text type="secondary">chưa xuất</Typography.Text>
                ),
            },
            {
              title: "Số lượng mới",
              width: 160,
              render: (_: unknown, line: SalesOrder["lines"][number]) => (
                <InputNumber
                  min={0.001}
                  precision={3}
                  style={{ width: "100%" }}
                  value={values[line.id]?.adjustedQty}
                  onChange={(value) =>
                    setValues((current) => ({
                      ...current,
                      [line.id]: {
                        ...current[line.id],
                        adjustedQty: Number(value ?? line.orderedActualQty),
                      },
                    }))
                  }
                />
              ),
            },
            {
              title: "Đơn giá cũ",
              width: 130,
              render: (_: unknown, line: SalesOrder["lines"][number]) =>
                formatMoney(line.unitPrice),
            },
            {
              title: "Đơn giá mới",
              width: 160,
              render: (_: unknown, line: SalesOrder["lines"][number]) => (
                <InputNumber
                  min={0}
                  precision={2}
                  style={{ width: "100%" }}
                  value={values[line.id]?.adjustedUnitPrice}
                  onChange={(value) =>
                    setValues((current) => ({
                      ...current,
                      [line.id]: {
                        ...current[line.id],
                        adjustedUnitPrice: Number(value ?? line.unitPrice),
                      },
                    }))
                  }
                />
              ),
            },
            {
              title: "Việc kho",
              width: 170,
              render: (_: unknown, line: SalesOrder["lines"][number]) => {
                const impact = warehouseImpact(line);
                return impact ? <Tag color={impact.color}>{impact.text}</Tag> : null;
              },
            },
          ]}
        />
        {needsSupplementary && (
          <div style={{ marginTop: 12 }}>
            <Typography.Text strong>Xe / lái xe cho lần xuất bổ sung</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
              (bỏ trống thì lấy theo lệnh xuất trước)
            </Typography.Text>
            <Space style={{ display: "flex", marginTop: 6 }}>
              <Input
                placeholder="Biển số xe"
                value={supplementaryVehiclePlate}
                onChange={(event) => setSupplementaryVehiclePlate(event.target.value)}
                style={{ width: 180 }}
              />
              <Input
                placeholder="Lái xe"
                value={supplementaryDriverName}
                onChange={(event) => setSupplementaryDriverName(event.target.value)}
                style={{ width: 240 }}
              />
            </Space>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(rejecting)}
        title={`Từ chối ${rejecting?.adjustmentNo ?? "đơn điều chỉnh"}`}
        okText="Từ chối"
        okButtonProps={{ danger: true, disabled: !rejectReason.trim() }}
        confirmLoading={decideMutation.isPending}
        onCancel={() => setRejecting(null)}
        onOk={async () => {
          if (!rejecting) return;
          await decideMutation.mutateAsync({
            id: rejecting.id,
            decision: "reject",
            note: rejectReason.trim(),
          });
          setRejecting(null);
        }}
      >
        <Input.TextArea
          rows={3}
          value={rejectReason}
          onChange={(event) => setRejectReason(event.target.value)}
          placeholder="Lý do từ chối (bắt buộc)"
        />
      </Modal>

      <SalesInvoiceDrawer
        id={invoiceId}
        open={Boolean(invoiceId)}
        onClose={() => setInvoiceId(undefined)}
      />
    </>
  );
};
