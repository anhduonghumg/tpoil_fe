import React, { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Empty,
  Modal,
  Progress,
  Space,
  Spin,
  Steps,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  ArrowLeftOutlined,
  CheckOutlined,
  CloseOutlined,
  FileAddOutlined,
  PlusOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate, useParams } from "react-router-dom";
import {
  useApproveCommercialLot,
  useCancelCommercialLot,
  useCancelLotWithdrawal,
  useCommercialLotDetail,
  useConfirmLotWithdrawal,
} from "../hooks";
import type {
  CommercialLotOrderLine,
  CommercialLotPurchase,
  CommercialLotWithdrawal,
} from "../types";
import LotWithdrawalModal from "../ui/LotWithdrawalModal";
import {
  formatMoney,
  formatQty,
  LifecycleTag,
  STOCK_STATE_LABELS,
} from "../ui/labels";
import "../commercial-lots.css";

const WITHDRAWAL_STATUS = {
  DRAFT: { label: "Nháp", color: "gold" },
  CONFIRMED: { label: "Đã xác nhận", color: "green" },
  CANCELLED: { label: "Đã hủy", color: "default" },
} as const;

function workflowCurrent(order: CommercialLotPurchase) {
  switch (order.lifecycle) {
    case "PENDING_APPROVAL":
      return 0;
    case "PENDING_INVOICE":
      return 1;
    case "PENDING_PAYMENT":
      return 2;
    case "READY_TO_WITHDRAW":
    case "WITHDRAWING":
    case "COMPLETED":
      return 4;
    default:
      return 0;
  }
}

export default function CommercialLotPurchaseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [withdrawalOpen, setWithdrawalOpen] = useState(false);
  const query = useCommercialLotDetail(id);
  const approveMutation = useApproveCommercialLot(id);
  const cancelMutation = useCancelCommercialLot(id);
  const confirmWithdrawal = useConfirmLotWithdrawal(id!);
  const cancelWithdrawal = useCancelLotWithdrawal(id!);
  const order = query.data;

  const lineColumns = useMemo<ColumnsType<CommercialLotOrderLine>>(
    () => [
      {
        title: "Mặt hàng",
        dataIndex: "product",
        width: 230,
        render: (product) =>
          product ? `${product.code} - ${product.name}` : "-",
      },
      {
        title: "Kho nhận dự kiến",
        dataIndex: "receivingWarehouse",
        width: 180,
        render: (warehouse) => warehouse?.name ?? "-",
      },
      {
        title: "Đặt mua",
        dataIndex: "orderedQty",
        width: 125,
        align: "right",
        render: formatQty,
      },
      {
        title: "Đã hóa đơn",
        width: 125,
        align: "right",
        render: (_, line) =>
          formatQty(line.commercialLotPosition?.invoicedQty),
      },
      {
        title: "Đã rút",
        width: 125,
        align: "right",
        render: (_, line) =>
          formatQty(line.commercialLotPosition?.withdrawnQty),
      },
      {
        title: "Còn phải rút",
        width: 130,
        align: "right",
        render: (_, line) => {
          const position = line.commercialLotPosition;
          return formatQty(
            Number(position?.invoicedQty ?? 0) -
              Number(position?.withdrawnQty ?? 0),
          );
        },
      },
      {
        title: "Trạng thái hàng",
        width: 170,
        render: (_, line) =>
          line.commercialLotPosition ? (
            STOCK_STATE_LABELS[line.commercialLotPosition.stockState]
          ) : (
            <span className="commercial-lot-empty-position">
              Chưa có hóa đơn
            </span>
          ),
      },
    ],
    [],
  );

  const withdrawalColumns: ColumnsType<CommercialLotWithdrawal> = [
    {
      title: "Số phiếu",
      dataIndex: "withdrawalNo",
      width: 160,
      render: (value) => <Typography.Text strong>{value}</Typography.Text>,
    },
    {
      title: "Ngày rút",
      dataIndex: "withdrawalDate",
      width: 150,
      render: (value) => dayjs(value).format("DD/MM/YYYY HH:mm"),
    },
    {
      title: "Kho nhận thực tế",
      dataIndex: "destinationWarehouse",
      width: 210,
      render: (warehouse) => `${warehouse.code} - ${warehouse.name}`,
    },
    {
      title: "Mặt hàng / số lượng",
      dataIndex: "lines",
      render: (lines: CommercialLotWithdrawal["lines"]) => (
        <Space direction="vertical" size={0}>
          {lines.map((line) => (
            <span key={line.id}>
              {line.commercialLotPosition.product.code}:{" "}
              <strong>{formatQty(line.actualQty)}</strong>
            </span>
          ))}
        </Space>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 130,
      render: (status: CommercialLotWithdrawal["status"]) => (
        <Tag color={WITHDRAWAL_STATUS[status].color}>
          {WITHDRAWAL_STATUS[status].label}
        </Tag>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 110,
      fixed: "right",
      render: (_, withdrawal) =>
        withdrawal.status === "DRAFT" ? (
          <Space size={4}>
            <Button
              type="text"
              icon={<CheckOutlined />}
              title="Xác nhận rút lô"
              loading={confirmWithdrawal.isPending}
              onClick={() =>
                Modal.confirm({
                  title: "Xác nhận rút lô?",
                  content:
                    "Hệ thống sẽ cộng tồn thực tế vào kho nhận. Thao tác này không thể sửa trực tiếp.",
                  okText: "Xác nhận",
                  cancelText: "Đóng",
                  onOk: () => confirmWithdrawal.mutateAsync(withdrawal.id),
                })
              }
            />
            <Button
              danger
              type="text"
              icon={<CloseOutlined />}
              title="Hủy phiếu"
              loading={cancelWithdrawal.isPending}
              onClick={() => cancelWithdrawal.mutate(withdrawal.id)}
            />
          </Space>
        ) : null,
    },
  ];

  if (query.isLoading) {
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        <Spin />
      </div>
    );
  }
  if (!order) {
    return <Empty description="Không tìm thấy đơn mua lô" />;
  }

  const withdrawPercent = order.quantities.invoicedQty
    ? Math.min(
        Math.round(
          (order.quantities.withdrawnQty / order.quantities.invoicedQty) * 100,
        ),
        100,
      )
    : 0;
  const canCreateInvoice =
    order.status === "APPROVED" || order.status === "IN_PROGRESS";
  const canWithdraw =
    order.payment.isPaid && order.quantities.remainingToWithdraw > 0;

  const tabs = [
    {
      key: "goods",
      label: `Hàng hóa (${order.lines.length})`,
      children: (
        <Table<CommercialLotOrderLine>
          rowKey="id"
          size="small"
          pagination={false}
          columns={lineColumns}
          dataSource={order.lines}
          scroll={{ x: 1000 }}
        />
      ),
    },
    {
      key: "invoices",
      label: `Hóa đơn & công nợ (${order.supplierInvoices.length})`,
      children:
        order.supplierInvoices.length > 0 ? (
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={order.supplierInvoices}
            columns={[
              {
                title: "Số hóa đơn",
                dataIndex: "invoiceNo",
                render: (value, invoice) => (
                  <Button
                    type="link"
                    className="commercial-lot-order-link"
                    onClick={() =>
                      navigate(`/purchase-invoices/${invoice.id}`)
                    }
                  >
                    {value}
                  </Button>
                ),
              },
              {
                title: "Ngày hóa đơn",
                dataIndex: "invoiceDate",
                render: (value) => dayjs(value).format("DD/MM/YYYY"),
              },
              {
                title: "Giá trị",
                dataIndex: "totalAmount",
                align: "right" as const,
                render: (value) => `${formatMoney(value)} đ`,
              },
              {
                title: "Đã thanh toán",
                align: "right" as const,
                render: (_, invoice) =>
                  `${formatMoney(
                    Number(invoice.openItem?.originalAmount ?? 0) -
                      Number(invoice.openItem?.outstandingAmount ?? 0),
                  )} đ`,
              },
              {
                title: "Còn nợ",
                align: "right" as const,
                render: (_, invoice) =>
                  `${formatMoney(invoice.openItem?.outstandingAmount)} đ`,
              },
              {
                title: "Trạng thái",
                dataIndex: "status",
                render: (status) => (
                  <Tag color={status === "POSTED" ? "green" : "gold"}>
                    {status === "POSTED" ? "Đã ghi sổ" : "Nháp"}
                  </Tag>
                ),
              },
            ]}
          />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có hóa đơn" />
        ),
    },
    {
      key: "withdrawals",
      label: `Rút lô (${order.commercialLotWithdrawals.length})`,
      children:
        order.commercialLotWithdrawals.length > 0 ? (
          <Table<CommercialLotWithdrawal>
            rowKey="id"
            size="small"
            pagination={false}
            columns={withdrawalColumns}
            dataSource={order.commercialLotWithdrawals}
            scroll={{ x: 980 }}
          />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có lần rút lô" />
        ),
    },
  ];

  return (
    <div className="commercial-lot-page">
      <div className="commercial-lot-header">
        <Space align="start">
          <Button
            icon={<ArrowLeftOutlined />}
            title="Quay lại"
            onClick={() => navigate("/commercial-purchases/lots")}
          />
          <div>
            <Space align="center">
              <Typography.Title level={3} className="commercial-lot-title">
                {order.orderNo}
              </Typography.Title>
              <LifecycleTag value={order.lifecycle} />
            </Space>
            <Typography.Text className="commercial-lot-subtitle">
              {order.supplier.code} - {order.supplier.name}
            </Typography.Text>
          </div>
        </Space>
        <Space wrap>
          <Button
            icon={<PrinterOutlined />}
            onClick={() =>
              window.open(`/api/purchase-orders/${order.id}/print`, "_blank")
            }
          >
            In đơn
          </Button>
          {order.status === "DRAFT" ? (
            <>
              <Button
                danger
                onClick={() =>
                  Modal.confirm({
                    title: "Hủy đơn mua lô?",
                    okText: "Hủy đơn",
                    okButtonProps: { danger: true },
                    cancelText: "Đóng",
                    onOk: () => cancelMutation.mutateAsync(order.id),
                  })
                }
              >
                Hủy đơn
              </Button>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                loading={approveMutation.isPending}
                onClick={() => approveMutation.mutate(order.id)}
              >
                Duyệt đơn
              </Button>
            </>
          ) : null}
          {canCreateInvoice ? (
            <Button
              icon={<FileAddOutlined />}
              onClick={() =>
                navigate(`/purchase-invoices/create?poId=${order.id}`)
              }
            >
              Nhận hóa đơn
            </Button>
          ) : null}
          {canWithdraw ? (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setWithdrawalOpen(true)}
            >
              Tạo phiếu rút
            </Button>
          ) : null}
        </Space>
      </div>

      <div className="commercial-lot-workflow">
        <Steps
          size="small"
          current={workflowCurrent(order)}
          status={order.lifecycle === "CANCELLED" ? "error" : undefined}
          items={[
            { title: "Đặt mua" },
            { title: "Duyệt đơn" },
            { title: "Hóa đơn & công nợ" },
            { title: "Thanh toán" },
            { title: "Rút lô" },
          ]}
        />
      </div>

      {order.lifecycle === "PENDING_PAYMENT" ? (
        <Alert
          type="warning"
          showIcon
          message={`Còn công nợ ${formatMoney(order.payment.outstandingAmount)} đ. Tồn kinh doanh và kế toán đã được ghi nhận; chỉ mở rút lô sau khi thanh toán.`}
        />
      ) : null}

      <div className="commercial-lot-kpis">
        <div className="commercial-lot-kpi">
          <span className="commercial-lot-kpi-label">Số lượng đặt</span>
          <span className="commercial-lot-kpi-value">
            {formatQty(order.quantities.orderedQty)}
          </span>
        </div>
        <div className="commercial-lot-kpi">
          <span className="commercial-lot-kpi-label">
            Tồn kinh doanh / kế toán
          </span>
          <span className="commercial-lot-kpi-value">
            {formatQty(order.quantities.invoicedQty)}
          </span>
        </div>
        <div className="commercial-lot-kpi">
          <span className="commercial-lot-kpi-label">Tồn thực tế đã rút</span>
          <span className="commercial-lot-kpi-value">
            {formatQty(order.quantities.withdrawnQty)}
          </span>
        </div>
        <div className="commercial-lot-kpi">
          <span className="commercial-lot-kpi-label">Tiến độ rút lô</span>
          <span className="commercial-lot-kpi-value">{withdrawPercent}%</span>
          <Progress percent={withdrawPercent} showInfo={false} size="small" />
        </div>
      </div>

      <div className="commercial-lot-detail-meta">
        <div>
          <span className="commercial-lot-meta-label">Ngày đặt hàng</span>
          <span className="commercial-lot-meta-value">
            {dayjs(order.orderDate).format("DD/MM/YYYY")}
          </span>
        </div>
        <div>
          <span className="commercial-lot-meta-label">Hợp đồng mua</span>
          <span className="commercial-lot-meta-value">
            {order.contract?.code ?? "-"}
          </span>
        </div>
        <div>
          <span className="commercial-lot-meta-label">Đã thanh toán</span>
          <span className="commercial-lot-meta-value">
            {formatMoney(order.payment.paidAmount)} đ
          </span>
        </div>
        <div>
          <span className="commercial-lot-meta-label">Công nợ còn lại</span>
          <span className="commercial-lot-meta-value">
            {formatMoney(order.payment.outstandingAmount)} đ
          </span>
        </div>
      </div>

      <Tabs items={tabs} />

      <LotWithdrawalModal
        open={withdrawalOpen}
        order={order}
        onClose={() => setWithdrawalOpen(false)}
      />
    </div>
  );
}
