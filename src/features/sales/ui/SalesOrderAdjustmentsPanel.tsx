import React, { useMemo, useState } from "react";
import { Alert, Button, Card, Input, InputNumber, Modal, Space, Table, Tag, Typography } from "antd";
import { CheckOutlined, EditOutlined, PlusOutlined, StopOutlined } from "@ant-design/icons";
import { useCan } from "../../../shared/authz/useCan";
import { PERMS } from "../../../shared/authz/perms";
import {
  useCreateSalesOrderAdjustment,
  useDecideSalesOrderAdjustment,
  useSalesOrderAdjustments,
} from "../hooks";
import type { SalesOrder, SalesOrderAdjustment } from "../types";
import { formatMoney, formatQty } from "./labels";

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
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [values, setValues] = useState<
    Record<string, { adjustedQty: number; adjustedUnitPrice: number }>
  >({});
  const [rejecting, setRejecting] = useState<SalesOrderAdjustment | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const begin = () => {
    setReason("");
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
              width: 230,
              render: (_, record) => (
                <Space size={4} wrap>
                  {record.requiresWarehouseCorrection && <Tag color="orange">Điều chỉnh kho</Tag>}
                  {record.requiresInvoiceCorrection && <Tag color="purple">Điều chỉnh HĐ</Tag>}
                  {record.status === "APPROVED" &&
                    !record.requiresWarehouseCorrection &&
                    !record.requiresInvoiceCorrection && <Tag color="green">Đã áp dụng</Tag>}
                </Space>
              ),
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
        width={860}
        title={`Tạo đơn điều chỉnh ${order.orderNo}`}
        okText="Gửi duyệt"
        cancelText="Đóng"
        okButtonProps={{ disabled: !reason.trim() || !changedLines.length }}
        confirmLoading={createMutation.isPending}
        onCancel={() => setOpen(false)}
        onOk={async () => {
          await createMutation.mutateAsync({ salesOrderId: order.id, reason: reason.trim(), lines: changedLines });
          setOpen(false);
        }}
      >
        <Alert
          showIcon
          type="info"
          style={{ marginBottom: 12 }}
          message="Chỉ nhập dòng bị sai. Nếu đơn đã phát sinh kho hoặc hóa đơn, hệ thống sẽ yêu cầu chứng từ điều chỉnh tương ứng."
        />
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
              width: 130,
              render: (_: unknown, line: SalesOrder["lines"][number]) =>
                formatQty(line.orderedActualQty),
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
          ]}
        />
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
    </>
  );
};
