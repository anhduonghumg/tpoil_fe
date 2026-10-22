import React, { useState } from "react";
import {
  Alert,
  Button,
  DatePicker,
  Input,
  InputNumber,
  Modal,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { CheckOutlined, StopOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useNavigate } from "react-router-dom";
import { useCan } from "../../../shared/authz/useCan";
import { PERMS } from "../../../shared/authz/perms";
import { useCancelSalesReturn, useConfirmSalesReturn, useSalesReturns } from "../hooks";
import type { SalesReturn, SalesReturnStatus } from "../types";
import { formatQty } from "./labels";

const RETURN_STATUS: Record<SalesReturnStatus, { label: string; color: string }> = {
  PENDING: { label: "Chờ nhận hàng", color: "gold" },
  POSTED: { label: "Đã nhận", color: "green" },
  CANCELLED: { label: "Đã hủy", color: "default" },
};

export function SalesReturnStatusTag({ status }: { status: SalesReturnStatus }) {
  const meta = RETURN_STATUS[status];
  return (
    <Tag color={meta?.color} style={{ marginInlineEnd: 0 }}>
      {meta?.label ?? status}
    </Tag>
  );
}

type LineInput = { actualQty: number | null; v15Qty?: number | null; temperatureC?: number | null };

/**
 * Hàng đợi phiếu nhập hàng bán bị trả lại của kho. Phiếu sinh từ phiếu điều chỉnh (khách
 * giảm lượng sau khi đã xuất); kho nhận hàng, nhập số thực nhận — số này quyết định lượng
 * đơn còn lại và hóa đơn điều chỉnh giảm.
 */
export function SalesReturnsPanel({
  status,
  warehouseId,
}: {
  status?: SalesReturnStatus;
  warehouseId?: string;
}) {
  const navigate = useNavigate();
  const { can } = useCan();
  const [page, setPage] = useState(1);
  const [confirmTarget, setConfirmTarget] = useState<SalesReturn>();
  const [lineInputs, setLineInputs] = useState<Record<string, LineInput>>({});
  const [receiptDocNo, setReceiptDocNo] = useState("");
  const [receivedAt, setReceivedAt] = useState<Dayjs>(dayjs());
  const [cancelTarget, setCancelTarget] = useState<SalesReturn>();
  const [cancelReason, setCancelReason] = useState("");

  const query = useSalesReturns({ status, warehouseId, page, limit: 20 });
  const confirmMutation = useConfirmSalesReturn();
  const cancelMutation = useCancelSalesReturn();

  const openConfirm = (row: SalesReturn) => {
    setLineInputs(
      Object.fromEntries(
        row.lines.map((line) => [line.id, { actualQty: Number(line.requestedActualQty), v15Qty: null, temperatureC: null }]),
      ),
    );
    setReceiptDocNo("");
    setReceivedAt(dayjs());
    setConfirmTarget(row);
  };

  const columns: ColumnsType<SalesReturn> = [
    {
      title: "Số phiếu",
      dataIndex: "returnNo",
      width: 120,
      render: (value: string) => <span className="sales-grid-strong">{value}</span>,
    },
    {
      title: "Ngày",
      dataIndex: "createdAt",
      width: 88,
      render: (value: string) => dayjs(value).format("DD/MM/YYYY"),
    },
    {
      title: "Đơn hàng",
      key: "order",
      width: 140,
      render: (_, row) => (
        <Button type="link" style={{ padding: 0 }} onClick={() => navigate(`/sales/orders/${row.salesOrder.id}`)}>
          {row.salesOrder.orderNo}
        </Button>
      ),
    },
    {
      title: "Khách",
      key: "customer",
      width: 100,
      ellipsis: true,
      render: (_, row) => (
        <Tooltip title={row.salesOrder.customer.name}>{row.salesOrder.customer.code ?? row.salesOrder.customer.name}</Tooltip>
      ),
    },
    { title: "Kho nhận", key: "warehouse", width: 110, ellipsis: true, render: (_, row) => row.warehouse.name },
    {
      title: "Lệnh xuất gốc",
      key: "delivery",
      width: 110,
      render: (_, row) => row.delivery.deliveryNo,
    },
    {
      title: "Hàng trả",
      key: "lines",
      render: (_, row) => (
        <div>
          {row.lines.map((line) => (
            <div key={line.id} style={{ fontSize: 12 }}>
              {line.orderLine.product.code ?? line.orderLine.product.name}:{" "}
              <strong>{formatQty(line.actualQty ?? line.requestedActualQty)}</strong>
              {line.actualQty != null && line.actualQty !== line.requestedActualQty && (
                <Typography.Text type="secondary"> (báo trả {formatQty(line.requestedActualQty)})</Typography.Text>
              )}
            </div>
          ))}
        </div>
      ),
    },
    {
      title: "Theo phiếu điều chỉnh",
      key: "adjustment",
      width: 150,
      ellipsis: true,
      render: (_, row) =>
        row.salesOrderAdjustment ? (
          <Tooltip title={row.salesOrderAdjustment.reason}>{row.salesOrderAdjustment.adjustmentNo}</Tooltip>
        ) : (
          "—"
        ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 120,
      render: (value: SalesReturnStatus) => <SalesReturnStatusTag status={value} />,
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 90,
      render: (_, row) =>
        row.status === "PENDING" ? (
          <Space size={4}>
            {can(PERMS.SALES_DELIVERY_CONFIRM) && (
              <Tooltip title="Nhận hàng trả (nhập số thực nhận)">
                <Button type="primary" size="small" shape="circle" icon={<CheckOutlined />} onClick={() => openConfirm(row)} />
              </Tooltip>
            )}
            {(can(PERMS.SALES_UPDATE) || can(PERMS.SALES_DELIVERY_CONFIRM)) && (
              <Tooltip title="Hủy phiếu (khách không trả nữa)">
                <Button
                  danger
                  size="small"
                  shape="circle"
                  icon={<StopOutlined />}
                  onClick={() => {
                    setCancelReason("");
                    setCancelTarget(row);
                  }}
                />
              </Tooltip>
            )}
          </Space>
        ) : null,
    },
  ];

  const confirmReady =
    confirmTarget &&
    confirmTarget.lines.every((line) => lineInputs[line.id]?.actualQty != null) &&
    confirmTarget.lines.some((line) => Number(lineInputs[line.id]?.actualQty ?? 0) > 0);

  return (
    <>
      <Table<SalesReturn>
        className="sales-grid"
        rowKey="id"
        size="small"
        bordered
        loading={query.isLoading}
        columns={columns}
        dataSource={query.data?.items ?? []}
        locale={{ emptyText: "Không có phiếu nhập trả nào" }}
        scroll={{ x: 1150 }}
        pagination={{
          current: page,
          pageSize: 20,
          total: query.data?.total ?? 0,
          showSizeChanger: false,
          onChange: setPage,
        }}
      />

      <Modal
        open={Boolean(confirmTarget)}
        width={760}
        title={`Nhận hàng trả — phiếu ${confirmTarget?.returnNo ?? ""}`}
        okText="Xác nhận nhận hàng"
        cancelText="Đóng"
        okButtonProps={{ disabled: !confirmReady }}
        confirmLoading={confirmMutation.isPending}
        onCancel={() => setConfirmTarget(undefined)}
        onOk={async () => {
          if (!confirmTarget) return;
          await confirmMutation.mutateAsync({
            id: confirmTarget.id,
            payload: {
              receiptDocNo: receiptDocNo.trim() || undefined,
              receivedAt: receivedAt.toISOString(),
              lines: confirmTarget.lines.map((line) => {
                const input = lineInputs[line.id];
                return {
                  salesReturnLineId: line.id,
                  actualQty: Number(input?.actualQty ?? 0),
                  v15Qty: input?.v15Qty ?? undefined,
                  temperatureC: input?.temperatureC ?? undefined,
                };
              }),
            },
          });
          setConfirmTarget(undefined);
        }}
      >
        {confirmTarget && (
          <>
            <Alert
              showIcon
              type="info"
              style={{ marginBottom: 12 }}
              message={`Khách ${confirmTarget.salesOrder.customer.name} trả lại hàng của lệnh xuất ${confirmTarget.delivery.deliveryNo} (đơn ${confirmTarget.salesOrder.orderNo}).`}
              description="Nhập số THỰC NHẬN. Hàng nhập lại đúng các lô đã xuất, đơn và hóa đơn điều chỉnh tính theo số này. Dòng khách không trả thì nhập 0."
            />
            <Space style={{ marginBottom: 12 }} wrap>
              <div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Số phiếu nhập kho
                </Typography.Text>
                <Input value={receiptDocNo} onChange={(event) => setReceiptDocNo(event.target.value)} placeholder="Tùy chọn" />
              </div>
              <div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Thời điểm nhận
                </Typography.Text>
                <DatePicker
                  showTime
                  format="DD/MM/YYYY HH:mm"
                  value={receivedAt}
                  onChange={(value) => value && setReceivedAt(value)}
                  style={{ display: "block" }}
                />
              </div>
            </Space>
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={confirmTarget.lines}
              columns={[
                {
                  title: "Mặt hàng",
                  render: (_: unknown, line: SalesReturn["lines"][number]) =>
                    line.orderLine.product.code ?? line.orderLine.product.name,
                },
                {
                  title: "Đã xuất",
                  width: 100,
                  align: "right" as const,
                  render: (_: unknown, line: SalesReturn["lines"][number]) => formatQty(line.deliveryLine.actualQty),
                },
                {
                  title: "Báo trả",
                  width: 100,
                  align: "right" as const,
                  render: (_: unknown, line: SalesReturn["lines"][number]) => formatQty(line.requestedActualQty),
                },
                {
                  title: "Thực nhận *",
                  width: 130,
                  render: (_: unknown, line: SalesReturn["lines"][number]) => (
                    <InputNumber
                      min={0}
                      precision={3}
                      style={{ width: "100%" }}
                      value={lineInputs[line.id]?.actualQty ?? undefined}
                      onChange={(value) =>
                        setLineInputs((current) => ({
                          ...current,
                          [line.id]: { ...current[line.id], actualQty: value == null ? null : Number(value) },
                        }))
                      }
                    />
                  ),
                },
                {
                  title: "V15",
                  width: 110,
                  render: (_: unknown, line: SalesReturn["lines"][number]) => (
                    <InputNumber
                      min={0}
                      precision={3}
                      style={{ width: "100%" }}
                      value={lineInputs[line.id]?.v15Qty ?? undefined}
                      onChange={(value) =>
                        setLineInputs((current) => ({
                          ...current,
                          [line.id]: { ...current[line.id], v15Qty: value == null ? null : Number(value) },
                        }))
                      }
                    />
                  ),
                },
                {
                  title: "Nhiệt độ",
                  width: 90,
                  render: (_: unknown, line: SalesReturn["lines"][number]) => (
                    <InputNumber
                      precision={1}
                      style={{ width: "100%" }}
                      value={lineInputs[line.id]?.temperatureC ?? undefined}
                      onChange={(value) =>
                        setLineInputs((current) => ({
                          ...current,
                          [line.id]: { ...current[line.id], temperatureC: value == null ? null : Number(value) },
                        }))
                      }
                    />
                  ),
                },
              ]}
            />
          </>
        )}
      </Modal>

      <Modal
        open={Boolean(cancelTarget)}
        title={`Hủy phiếu nhập trả ${cancelTarget?.returnNo ?? ""}`}
        okText="Hủy phiếu"
        cancelText="Đóng"
        okButtonProps={{ danger: true, disabled: !cancelReason.trim() }}
        confirmLoading={cancelMutation.isPending}
        onCancel={() => setCancelTarget(undefined)}
        onOk={async () => {
          if (!cancelTarget) return;
          await cancelMutation.mutateAsync({ id: cancelTarget.id, reason: cancelReason.trim() });
          setCancelTarget(undefined);
        }}
      >
        <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
          Dùng khi khách đổi ý không trả hàng nữa. Lượng đặt của đơn chưa bị giảm nên không phải hoàn tác gì thêm.
        </Typography.Paragraph>
        <Input.TextArea
          rows={3}
          value={cancelReason}
          onChange={(event) => setCancelReason(event.target.value)}
          placeholder="Lý do hủy (bắt buộc)"
        />
      </Modal>
    </>
  );
}
