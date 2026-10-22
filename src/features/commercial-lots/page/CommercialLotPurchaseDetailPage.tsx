import React, { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Empty,
  Form,
  Input,
  InputNumber,
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
  EditOutlined,
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
  useCreateCommercialLotPaymentRequest,
  useCommercialLotPaymentAction,
  useResubmitCommercialLotPaymentRequest,
  useUpdateCommercialLotActualReceived,
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

const PAYMENT_REQUEST_STATUS: Record<string, { label: string; color: string }> = {
  PENDING_BANK_PLAN: { label: "Chờ ngân hàng lập kế hoạch", color: "purple" },
  PENDING_DIRECTOR_APPROVAL: { label: "Chờ giám đốc duyệt", color: "gold" },
  APPROVED: { label: "Đã duyệt · chờ thanh toán", color: "cyan" },
  DIRECTOR_REJECTED: { label: "Giám đốc từ chối", color: "red" },
  SUBMITTED: { label: "Chờ ngân hàng kiểm tra", color: "blue" },
  BANK_VERIFIED: { label: "Chờ thanh toán", color: "cyan" },
  BANK_RETURNED: { label: "Ngân hàng trả lại", color: "orange" },
  PARTIALLY_PAID: { label: "Thanh toán một phần", color: "geekblue" },
  PAID: { label: "Đã thanh toán", color: "green" },
  CANCELLED: { label: "Đã hủy", color: "default" },
};

function workflowCurrent(order: CommercialLotPurchase) {
  switch (order.lifecycle) {
    case "PENDING_APPROVAL":
      return 0;
    case "PENDING_INVOICE":
      return 1;
    case "PENDING_PAYMENT":
      return order.termPaymentRequests?.some(
        (request) => request.status !== "CANCELLED",
      )
        ? 3
        : 2;
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
  const [paymentRequestEditor, setPaymentRequestEditor] = useState<any>(null);
  const [actualReceivedOpen, setActualReceivedOpen] = useState(false);
  const [paymentRequestForm] = Form.useForm();
  const [actualReceivedForm] = Form.useForm();
  const query = useCommercialLotDetail(id);
  const approveMutation = useApproveCommercialLot(id);
  const cancelMutation = useCancelCommercialLot(id);
  const confirmWithdrawal = useConfirmLotWithdrawal(id!);
  const cancelWithdrawal = useCancelLotWithdrawal(id!);
  const createPaymentRequest = useCreateCommercialLotPaymentRequest(id);
  const paymentAction = useCommercialLotPaymentAction(id);
  const resubmitPaymentRequest = useResubmitCommercialLotPaymentRequest(id);
  const updateActualReceived = useUpdateCommercialLotActualReceived(id);
  const order = query.data;
  const financials = useMemo(
    () =>
      (order?.lines ?? []).reduce(
        (summary, line) => {
          const qty = Number(line.orderedQty ?? 0);
          const unitPrice = Number(line.unitPrice ?? 0);
          const unitDiscount = Number(line.discountAmount ?? 0);
          const taxRate = Number(line.taxRate ?? 0);
          const beforeDiscount = qty * unitPrice;
          const discount = qty * unitDiscount;
          const net = Math.max(beforeDiscount - discount, 0);
          const tax = net * (taxRate / 100);

          return {
            beforeDiscount: summary.beforeDiscount + beforeDiscount,
            discount: summary.discount + discount,
            tax: summary.tax + tax,
            total: summary.total + net + tax,
          };
        },
        { beforeDiscount: 0, discount: 0, tax: 0, total: 0 },
      ),
    [order?.lines],
  );
  const expectedInventoryQty = useMemo(
    () => (order?.lines ?? []).reduce((sum, line) => sum + Number(line.actualReceivedQty ?? line.orderedQty ?? 0), 0),
    [order?.lines],
  );

  const lineColumns = useMemo<ColumnsType<CommercialLotOrderLine>>(
    () => [
      {
        title: "Mặt hàng",
        dataIndex: "product",
        render: (product) =>
          product ? `${product.code} - ${product.name}` : "-",
      },
      {
        title: "Nhận",
        width: 105,
        align: "right",
        render: (_, line) => formatQty(line.actualReceivedQty ?? line.orderedQty),
      },
      {
        title: "Thành tiền",
        width: 145,
        align: "right",
        render: (_, line) => {
          const qty = Number(line.orderedQty ?? 0);
          const unitPrice = Number(line.unitPrice ?? 0);
          const discount = Number(line.discountAmount ?? 0);
          const taxRate = Number(line.taxRate ?? 0);
          const net = qty * Math.max(unitPrice - discount, 0);
          return `${formatMoney(net * (1 + taxRate / 100))} đ`;
        },
      },
      {
        title: "Đã HĐ",
        width: 95,
        align: "right",
        render: (_, line) =>
          formatQty(line.commercialLotPosition?.invoicedQty),
      },
      {
        title: "Rút / còn",
        width: 105,
        align: "right",
        render: (_, line) => {
          const position = line.commercialLotPosition;
          return (
            <Space direction="vertical" size={0} align="end">
              <span>{formatQty(position?.withdrawnQty)}</span>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                còn {formatQty(Number(position?.invoicedQty ?? 0) - Number(position?.withdrawnQty ?? 0))}
              </Typography.Text>
            </Space>
          );
        },
      },
      {
        title: "Trạng thái",
        width: 120,
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

  const renderLineDetails = (line: CommercialLotOrderLine) => (
    <div className="commercial-lot-line-details">
      <span>Kho nhận: <strong>{line.receivingWarehouse?.name ?? line.plannedReceivingArea?.name ?? "-"}</strong></span>
      <span>Đặt mua: <strong>{formatQty(line.orderedQty)}</strong></span>
      <span>Đơn giá: <strong>{formatMoney(line.unitPrice)} đ</strong></span>
      <span>Chiết khấu/đv: <strong>{formatMoney(line.discountAmount)} đ</strong></span>
      <span>Thuế: <strong>{Number(line.taxRate ?? 0)}%</strong></span>
    </div>
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
      width: 250,
      render: (_, withdrawal) => {
        const warehouses = Array.from(
          new Map(
            withdrawal.lines.map((line) => {
              const warehouse = line.destinationWarehouse ?? withdrawal.destinationWarehouse;
              return [warehouse.id, warehouse];
            }),
          ).values(),
        );
        return warehouses.map((warehouse) => `${warehouse.code} - ${warehouse.name}`).join(", ");
      },
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

  const openPaymentRequestEditor = (invoice?: any, request?: any) => {
    paymentRequestForm.setFieldsValue({
      beneficiaryAccountNo:
        request?.beneficiaryAccountNo ?? order.supplier.bankAccountNo ?? "",
      note: request?.returnedReason ?? request?.approvalNote ?? "",
    });
    setPaymentRequestEditor({ invoice, request });
  };

  const submitPaymentRequest = async (values: any) => {
    if (paymentRequestEditor?.request) {
      await resubmitPaymentRequest.mutateAsync({
        requestId: paymentRequestEditor.request.id,
        data: values,
      });
    } else {
      await createPaymentRequest.mutateAsync({
        supplierInvoiceId: paymentRequestEditor.invoice.id,
        ...values,
      });
    }
    setPaymentRequestEditor(null);
  };

  const submitActualReceived = async (values: { lines: Array<{ purchaseOrderLineId: string; actualReceivedQty: number }> }) => {
    await updateActualReceived.mutateAsync(values.lines);
    setActualReceivedOpen(false);
  };

  const withdrawPercent = order.quantities.invoicedQty
    ? Math.min(
        Math.round(
          (order.quantities.withdrawnQty / order.quantities.invoicedQty) * 100,
        ),
        100,
      )
    : 0;
  const canCreateInvoice =
    (order.status === "APPROVED" || order.status === "IN_PROGRESS") &&
    order.quantities.invoicedQty < order.quantities.orderedQty;
  const canWithdraw =
    order.payment.isPaid && order.quantities.remainingToWithdraw > 0;
  const paymentRequestInvoiceIds = new Set(
    (order.termPaymentRequests ?? [])
      .filter((request) => request.status !== "CANCELLED")
      .map((request) => request.supplierInvoiceId)
      .filter(Boolean),
  );
  const payableInvoice = order.supplierInvoices.find((invoice) =>
    invoice.status === "POSTED" &&
    Number(invoice.openItem?.outstandingAmount ?? 0) > 0 &&
    !paymentRequestInvoiceIds.has(invoice.id),
  );

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
          className="commercial-lot-table commercial-lot-line-table"
          expandable={{
            expandedRowRender: renderLineDetails,
          }}
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
              {
                title: "Thanh toán",
                width: 150,
                render: (_, invoice) => {
                  const outstanding = Number(invoice.openItem?.outstandingAmount ?? 0);
                  const canRequest =
                    invoice.status === "POSTED" &&
                    outstanding > 0 &&
                    !paymentRequestInvoiceIds.has(invoice.id);
                  if (paymentRequestInvoiceIds.has(invoice.id)) {
                    return <Tag color="cyan">Đã có đề nghị</Tag>;
                  }
                  return canRequest ? (
                    <Button
                      size="small"
                      type="primary"
                      loading={createPaymentRequest.isPending}
                      onClick={() => openPaymentRequestEditor(invoice)}
                    >
                      Đề nghị TT
                    </Button>
                  ) : (
                    "-"
                  );
                },
              },
            ]}
          />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có hóa đơn" />
        ),
    },
    {
      key: "payment-requests",
      label: `Đề nghị thanh toán (${order.termPaymentRequests?.length ?? 0})`,
      children:
        order.termPaymentRequests?.length ? (
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={order.termPaymentRequests}
            columns={[
              { title: "Số đề nghị", dataIndex: "requestNo" },
              {
                title: "Hóa đơn",
                render: (_, request) => request.supplierInvoice?.invoiceNo ?? "-",
              },
              {
                title: "Giá trị",
                dataIndex: "amountVnd",
                align: "right" as const,
                render: (value) => `${formatMoney(value)} đ`,
              },
              {
                title: "Trạng thái",
                dataIndex: "status",
                render: (status) => {
                  const meta = PAYMENT_REQUEST_STATUS[status] ?? {
                    label: status,
                    color: "default",
                  };
                  return <Tag color={meta.color}>{meta.label}</Tag>;
                },
              },
              {
                title: "In",
                width: 56,
                align: "center" as const,
                render: (_, request) => (
                  <Button
                    size="small"
                    type="text"
                    icon={<PrinterOutlined />}
                    title="In đề nghị thanh toán"
                    onClick={() =>
                      window.open(
                        `/api/purchase-orders/payment-requests/${request.id}/print`,
                        "_blank",
                      )
                    }
                  />
                ),
              },
              {
                title: "Xử lý",
                width: 190,
                render: (_, request) => {
                  /* Giám đốc duyệt đề nghị kèm kế hoạch thanh toán của ngân hàng, nên việc duyệt
                     nằm ở màn Chi tiền — nơi xem được các đợt, tài khoản chuyển và người nhận. */
                  if (request.status === "PENDING_DIRECTOR_APPROVAL") {
                    return <Button size="small" onClick={() => navigate("/banking/payment-approvals?source=commercial")}>Xem và duyệt</Button>;
                  }
                  if (request.status === "DIRECTOR_REJECTED" || request.status === "BANK_RETURNED") {
                    return <Button size="small" onClick={() => openPaymentRequestEditor(undefined, request)}>Gửi lại</Button>;
                  }
                  return "-";
                },
              },
            ]}
          />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có đề nghị thanh toán" />
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
            className="commercial-lot-table"
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
            <Space align="center" size={8} className="commercial-lot-identity">
              <Typography.Title level={3} className="commercial-lot-title">
                {order.orderNo}
              </Typography.Title>
              <LifecycleTag value={order.lifecycle} />
              <Typography.Text className="commercial-lot-subtitle">
                {order.supplier.code}
              </Typography.Text>
            </Space>
          </div>
        </Space>
        <Space wrap size={8}>
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
                icon={<EditOutlined />}
                onClick={() => navigate(`/commercial-purchases/lots/${order.id}/edit`)}
              >
                Sửa đơn
              </Button>
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
          {order.supplierInvoices.length === 0 ? (
            <Button
              onClick={() => {
                actualReceivedForm.setFieldsValue({
                  lines: order.lines.map((line) => ({
                    purchaseOrderLineId: line.id,
                    actualReceivedQty: Number(line.actualReceivedQty ?? line.orderedQty ?? 0),
                  })),
                });
                setActualReceivedOpen(true);
              }}
            >
              Thực nhận
            </Button>
          ) : null}
          {payableInvoice ? (
            <Button
              type="primary"
              icon={<FileAddOutlined />}
              onClick={() => openPaymentRequestEditor(payableInvoice)}
            >
              Thanh toán
            </Button>
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
          <span className="commercial-lot-kpi-label">Tồn dự kiến</span>
          <span className="commercial-lot-kpi-value">{formatQty(expectedInventoryQty)}</span>
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
          <span className="commercial-lot-meta-label">Mã rút</span>
          <span className="commercial-lot-meta-value">
            {order.releaseCode ?? "Chưa xác định"}
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

      <div className="commercial-lot-detail-meta commercial-lot-financial-summary">
        <div>
          <span className="commercial-lot-meta-label">Tổng trước chiết khấu</span>
          <span className="commercial-lot-meta-value">{formatMoney(financials.beforeDiscount)} đ</span>
        </div>
        <div>
          <span className="commercial-lot-meta-label">Tổng chiết khấu</span>
          <span className="commercial-lot-meta-value">{formatMoney(financials.discount)} đ</span>
        </div>
        <div>
          <span className="commercial-lot-meta-label">Thuế GTGT</span>
          <span className="commercial-lot-meta-value">{formatMoney(financials.tax)} đ</span>
        </div>
        <div>
          <span className="commercial-lot-meta-label">Tổng thanh toán</span>
          <span className="commercial-lot-meta-value">{formatMoney(financials.total)} đ</span>
        </div>
      </div>

      <Tabs items={tabs} />

      <LotWithdrawalModal
        open={withdrawalOpen}
        order={order}
        onClose={() => setWithdrawalOpen(false)}
      />

      <Modal
        open={actualReceivedOpen}
        title="Cập nhật số lượng thực nhận"
        okText="Cập nhật"
        cancelText="Đóng"
        onCancel={() => setActualReceivedOpen(false)}
        confirmLoading={updateActualReceived.isPending}
        onOk={() => actualReceivedForm.submit()}
        destroyOnHidden
        width={640}
      >
        <Form form={actualReceivedForm} layout="vertical" onFinish={submitActualReceived}>
          <Form.List name="lines">
            {(fields) => (
              <Space direction="vertical" size={10} style={{ width: "100%" }}>
                {fields.map((field) => {
                  const line = order.lines[field.name];
                  return (
                    <div key={field.key} className="commercial-lot-actual-row">
                      <div>
                        <Typography.Text strong>{line?.product ? `${line.product.code} - ${line.product.name}` : "Mặt hàng"}</Typography.Text>
                        <Typography.Text type="secondary">Đặt mua: {formatQty(line?.orderedQty)}</Typography.Text>
                      </div>
                      <Form.Item name={[field.name, "purchaseOrderLineId"]} hidden><Input /></Form.Item>
                      <Form.Item name={[field.name, "actualReceivedQty"]} rules={[{ required: true, message: "Nhập số lượng thực nhận" }]}>
                        <InputNumber min={0} precision={3} controls={false} style={{ width: 150 }} />
                      </Form.Item>
                    </div>
                  );
                })}
              </Space>
            )}
          </Form.List>
        </Form>
      </Modal>

      <Modal
        open={Boolean(paymentRequestEditor)}
        title={paymentRequestEditor?.request ? "Cập nhật đề nghị thanh toán" : "Đề nghị thanh toán"}
        okText={paymentRequestEditor?.request ? "Gửi lại duyệt" : "Gửi giám đốc duyệt"}
        cancelText="Đóng"
        onCancel={() => setPaymentRequestEditor(null)}
        confirmLoading={createPaymentRequest.isPending || resubmitPaymentRequest.isPending}
        onOk={() => paymentRequestForm.submit()}
        destroyOnHidden
        width={520}
      >
        <Form form={paymentRequestForm} layout="vertical" size="small" onFinish={submitPaymentRequest}>
          <Form.Item
            name="beneficiaryAccountNo"
            label="Tài khoản nhận của nhà cung cấp"
            rules={[{ required: true, message: "Nhập tài khoản nhận thanh toán" }]}
          >
            <Input placeholder="Tự lấy từ danh mục nhà cung cấp" />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 3 }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
