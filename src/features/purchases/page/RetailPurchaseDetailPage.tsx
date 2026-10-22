import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Empty,
  Form,
  Input,
  Modal,
  Progress,
  Space,
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
  FileAddOutlined,
  InboxOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate, useParams } from "react-router-dom";
import {
  useApprovePurchaseOrder,
  useCancelPurchaseOrder,
  useRetailPurchaseDetail,
} from "../hooks";
import { useCreateCommercialLotPaymentRequest, useResubmitCommercialLotPaymentRequest } from "../../commercial-lots/hooks";
import { RetailReceiptRequestModal } from "../ui/RetailReceiptRequestModal";
import type {
  RetailLifecycle,
  RetailProfitRow,
  RetailPurchaseDetail,
} from "../retail-detail.types";
import "../../commercial-lots/commercial-lots.css";

const LIFECYCLE_LABELS: Record<RetailLifecycle, string> = {
  PENDING_APPROVAL: "Chờ duyệt",
  PENDING_INVOICE: "Chờ hóa đơn",
  PENDING_PAYMENT: "Chờ thanh toán",
  READY_TO_RECEIVE: "Sẵn sàng nhập kho",
  RECEIVING: "Đang nhập kho",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
};

const LIFECYCLE_COLORS: Record<RetailLifecycle, string> = {
  PENDING_APPROVAL: "gold",
  PENDING_INVOICE: "cyan",
  PENDING_PAYMENT: "orange",
  READY_TO_RECEIVE: "blue",
  RECEIVING: "geekblue",
  COMPLETED: "green",
  CANCELLED: "default",
};

const RECEIPT_STATUS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Chờ kho duyệt", color: "gold" },
  CONFIRMED: { label: "Đã nhập kho", color: "green" },
  VOID: { label: "Đã hủy", color: "default" },
};

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

const formatQty = (value?: number | string | null) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 }).format(Number(value ?? 0));

const formatMoney = (value?: number | string | null) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Number(value ?? 0));

function workflowCurrent(order: RetailPurchaseDetail) {
  switch (order.lifecycle) {
    case "PENDING_APPROVAL":
      return 0;
    case "PENDING_INVOICE":
      return 1;
    case "PENDING_PAYMENT":
      return order.termPaymentRequests?.some((request) => request.status !== "CANCELLED")
        ? 3
        : 2;
    case "READY_TO_RECEIVE":
    case "RECEIVING":
    case "COMPLETED":
      return 4;
    default:
      return 0;
  }
}

/** Retail purchases mirror the lot screen; withdrawals become warehouse receipt requests. */
export default function RetailPurchaseDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const detail = useRetailPurchaseDetail(id);
  const approveMutation = useApprovePurchaseOrder();
  const cancelMutation = useCancelPurchaseOrder();
  const createPaymentRequest = useCreateCommercialLotPaymentRequest(id);
  const resubmitPaymentRequest = useResubmitCommercialLotPaymentRequest(id);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [paymentRequestOpen, setPaymentRequestOpen] = useState(false);
  const [paymentRequestForm] = Form.useForm<{
    beneficiaryAccountNo: string;
    note?: string;
  }>();

  const order = detail.data;

  const receivePercent = useMemo(() => {
    if (!order?.quantities.orderedQty) return 0;
    return Math.min(
      Math.round((order.quantities.receivedQty / order.quantities.orderedQty) * 100),
      100,
    );
  }, [order]);

  const payableInvoice = useMemo(
    () =>
      order?.supplierInvoices.find(
        (invoice) =>
          invoice.status === "POSTED" &&
          invoice.openItem &&
          invoice.openItem.status !== "SETTLED" &&
          !order.termPaymentRequests.some(
            (request) =>
              request.supplierInvoiceId === invoice.id && request.status !== "CANCELLED",
          ),
      ),
    [order],
  );

  // Only expose a new receipt request while the purchase still has an
  // outstanding quantity. A completed receipt must never invite users to
  // create a duplicate request.
  const canRequestReceipt = Boolean(
    order &&
      order.status !== "DRAFT" &&
      order.status !== "CANCELLED" &&
      Number(order.quantities.remainingToReceive) > 0,
  );

  const openPaymentRequest = () => {
    paymentRequestForm.setFieldsValue({
      beneficiaryAccountNo: (order?.supplier as any)?.bankAccountNo ?? "",
      note: "",
    });
    setPaymentRequestOpen(true);
  };

  const submitPaymentRequest = async (values: {
    beneficiaryAccountNo: string;
    note?: string;
  }) => {
    if (!payableInvoice) return;
    await createPaymentRequest.mutateAsync({
      supplierInvoiceId: payableInvoice.id,
      beneficiaryAccountNo: values.beneficiaryAccountNo.trim(),
      note: values.note?.trim() || undefined,
    });
    setPaymentRequestOpen(false);
  };

  const lineColumns: ColumnsType<RetailPurchaseDetail["lines"][number]> = [
    { title: "#", dataIndex: "lineNo", width: 50 },
    {
      title: "Mặt hàng",
      key: "product",
      render: (_, row) => `${row.product?.code ?? ""} - ${row.product?.name ?? ""}`,
    },
    {
      title: "Kho nhận",
      key: "warehouse",
      width: 180,
      render: (_, row) => row.receivingWarehouse?.name ?? row.plannedReceivingArea?.name ?? "-",
    },
    {
      title: "Số lượng",
      dataIndex: "orderedQty",
      width: 120,
      align: "right",
      render: formatQty,
    },
    {
      title: "Đơn giá",
      dataIndex: "unitPrice",
      width: 120,
      align: "right",
      render: formatMoney,
    },
    {
      title: "Chiết khấu",
      dataIndex: "discountAmount",
      width: 110,
      align: "right",
      render: formatMoney,
    },
    {
      title: "Thành tiền",
      key: "amount",
      width: 130,
      align: "right",
      render: (_, row) =>
        formatMoney(
          Number(row.orderedQty ?? 0) *
            Math.max(Number(row.unitPrice ?? 0) - Number(row.discountAmount ?? 0), 0),
        ),
    },
  ];

  const profitColumns: ColumnsType<RetailProfitRow> = [
    {
      title: "Mặt hàng",
      key: "product",
      render: (_, row) => row.product?.code ?? row.productId,
    },
    { title: "Khách đặt", dataIndex: "orderedQty", width: 110, align: "right", render: formatQty },
    { title: "Đã mua", dataIndex: "purchasedQty", width: 110, align: "right", render: formatQty },
    {
      title: "Chênh lệch SL",
      dataIndex: "varianceQty",
      width: 120,
      align: "right",
      render: (value: number) => (
        <Typography.Text type={value === 0 ? undefined : "warning"}>
          {value > 0 ? "+" : ""}
          {formatQty(value)}
        </Typography.Text>
      ),
    },
    { title: "Doanh thu", dataIndex: "revenue", width: 130, align: "right", render: formatMoney },
    { title: "Giá vốn", dataIndex: "cost", width: 130, align: "right", render: formatMoney },
    {
      title: "Lãi/lỗ",
      dataIndex: "profit",
      width: 130,
      align: "right",
      render: (value: number) => (
        <Typography.Text strong type={value >= 0 ? "success" : "danger"}>
          {formatMoney(value)}
        </Typography.Text>
      ),
    },
  ];

  if (detail.isLoading) return <div className="commercial-lot-page">Đang tải...</div>;
  if (!order) return <div className="commercial-lot-page">Không tìm thấy đơn mua</div>;

  const pnl = order.profitAndLoss;

  const tabs = [
    {
      key: "lines",
      label: `Hàng hóa (${order.lines.length})`,
      children: (
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          columns={lineColumns}
          dataSource={order.lines}
          className="commercial-lot-table"
        />
      ),
    },
    {
      key: "invoices",
      label: `Hóa đơn & công nợ (${order.supplierInvoices.length})`,
      children: order.supplierInvoices.length ? (
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          className="commercial-lot-table"
          dataSource={order.supplierInvoices}
          columns={[
            { title: "Số hóa đơn", dataIndex: "invoiceNo", width: 160 },
            {
              title: "Ngày hóa đơn",
              dataIndex: "invoiceDate",
              width: 130,
              render: (value) => dayjs(value).format("DD/MM/YYYY"),
            },
            {
              title: "Trạng thái",
              dataIndex: "status",
              width: 120,
              render: (value) => (
                <Tag color={value === "POSTED" ? "green" : "gold"}>
                  {value === "POSTED" ? "Đã ghi sổ" : "Nháp"}
                </Tag>
              ),
            },
            {
              title: "Giá trị",
              dataIndex: "totalAmount",
              width: 140,
              align: "right",
              render: formatMoney,
            },
            {
              title: "Còn nợ",
              key: "outstanding",
              width: 140,
              align: "right",
              render: (_, row: any) => formatMoney(row.openItem?.outstandingAmount ?? 0),
            },
            {
              title: "",
              key: "action",
              width: 120,
              render: (_, row: any) => (
                <Button size="small" onClick={() => navigate(`/purchase-invoices/${row.id}`)}>
                  Xem
                </Button>
              ),
            },
          ]}
        />
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có hóa đơn nhà cung cấp" />
      ),
    },
    {
      key: "payments",
      label: `Đề nghị thanh toán (${order.termPaymentRequests.length})`,
      children: order.termPaymentRequests.length ? (
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          className="commercial-lot-table"
          dataSource={order.termPaymentRequests}
          columns={[
            { title: "Số đề nghị", dataIndex: "requestNo" },
            {
              title: "Hóa đơn",
              key: "invoice",
              width: 150,
              render: (_, row: any) => row.supplierInvoice?.invoiceNo ?? "-",
            },
            {
              title: "Số tiền",
              dataIndex: "amountVnd",
              width: 140,
              align: "right",
              render: formatMoney,
            },
            {
              title: "Trạng thái",
              dataIndex: "status",
              width: 180,
              render: (value: string) => {
                const meta = PAYMENT_REQUEST_STATUS[value] ?? { label: value, color: "default" };
                return <Tag color={meta.color}>{meta.label}</Tag>;
              },
            },
            {
              /* Đề nghị bị ngân hàng trả lại hoặc giám đốc từ chối: xem lý do và gửi lại cho ngân hàng. */
              title: "",
              key: "actions",
              width: 260,
              render: (_, row: any) => {
                if (row.status !== "BANK_RETURNED" && row.status !== "DIRECTOR_REJECTED") return null;
                const reason = row.status === "BANK_RETURNED" ? row.returnedReason : row.approvalNote;
                return (
                  <Space size={8}>
                    {reason ? <span style={{ color: "#c0392b", fontSize: 12 }}>{reason}</span> : null}
                    <Button
                      size="small"
                      loading={resubmitPaymentRequest.isPending}
                      onClick={() => resubmitPaymentRequest.mutate({ requestId: row.id, data: {} })}
                    >
                      Gửi lại
                    </Button>
                  </Space>
                );
              },
            },
          ]}
        />
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có đề nghị thanh toán" />
      ),
    },
    {
      key: "receipts",
      label: `Đề nghị nhập hàng (${order.receipts.length})`,
      children: order.receipts.length ? (
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          className="commercial-lot-table"
          dataSource={order.receipts}
          columns={[
            { title: "Số phiếu", dataIndex: "receiptNo", width: 200 },
            {
              title: "Ngày nhập",
              dataIndex: "receiptDate",
              width: 120,
              render: (value) => dayjs(value).format("DD/MM/YYYY"),
            },
            {
              title: "Kho nhận",
              key: "warehouse",
              render: (_, row: any) => row.warehouse?.name ?? "-",
            },
            {
              title: "Số lượng",
              key: "qty",
              width: 120,
              align: "right",
              render: (_, row: any) =>
                formatQty(
                  (row.lines ?? []).reduce(
                    (sum: number, line: any) => sum + Number(line.actualQty ?? 0),
                    0,
                  ),
                ),
            },
            {
              title: "Trạng thái",
              dataIndex: "status",
              width: 150,
              render: (value: string) => {
                const meta = RECEIPT_STATUS[value] ?? { label: value, color: "default" };
                return <Tag color={meta.color}>{meta.label}</Tag>;
              },
            },
          ]}
        />
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Chưa có đề nghị nhập hàng nào gửi kho"
        />
      ),
    },
    {
      key: "pnl",
      label: "So sánh lãi lỗ",
      children: pnl.hasSalesOrder ? (
        <>
          <div className="commercial-lot-detail-meta" style={{ marginBottom: 12 }}>
            <div>
              <span className="commercial-lot-meta-label">Đơn khách đặt</span>
              <span className="commercial-lot-meta-value">
                {order.salesOrder?.orderNo} · {order.salesOrder?.customer?.name}
              </span>
            </div>
            <div>
              <span className="commercial-lot-meta-label">Doanh thu (chưa VAT)</span>
              <span className="commercial-lot-meta-value">{formatMoney(pnl.revenue)} đ</span>
            </div>
            <div>
              <span className="commercial-lot-meta-label">Giá vốn (chưa VAT)</span>
              <span className="commercial-lot-meta-value">{formatMoney(pnl.cost)} đ</span>
            </div>
            <div>
              <span className="commercial-lot-meta-label">Lãi/lỗ</span>
              <span
                className="commercial-lot-meta-value"
                style={{ color: pnl.profit >= 0 ? "#17866b" : "#c23b3b" }}
              >
                {formatMoney(pnl.profit)} đ ({pnl.marginPercent.toFixed(1)}%)
              </span>
            </div>
          </div>
          <Table
            rowKey="productId"
            size="small"
            pagination={false}
            className="commercial-lot-table"
            columns={profitColumns}
            dataSource={pnl.items}
          />
        </>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Đơn mua này chưa gắn với đơn đặt hàng của khách nên chưa so sánh được"
        />
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
            onClick={() => navigate("/commercial-purchases/retail")}
          />
          <div>
            <Space align="center" size={8} className="commercial-lot-identity">
              <Typography.Title level={3} className="commercial-lot-title">
                {order.orderNo}
              </Typography.Title>
              <Tag color={LIFECYCLE_COLORS[order.lifecycle]}>
                {LIFECYCLE_LABELS[order.lifecycle]}
              </Tag>
              <Typography.Text className="commercial-lot-subtitle">
                {order.supplier.code}
              </Typography.Text>
            </Space>
          </div>
        </Space>
        <Space wrap size={8}>
          <Button
            icon={<PrinterOutlined />}
            onClick={() => window.open(`/api/purchase-orders/${order.id}/print`, "_blank")}
          >
            In đơn
          </Button>
          {order.status === "DRAFT" ? (
            <>
              <Button
                icon={<EditOutlined />}
                onClick={() => navigate(`/commercial-purchases/retail/${order.id}/edit`)}
              >
                Sửa đơn
              </Button>
              <Button
                danger
                onClick={() =>
                  Modal.confirm({
                    title: "Hủy đơn mua lẻ?",
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
          {payableInvoice ? (
            <Button
              type="primary"
              icon={<FileAddOutlined />}
              loading={createPaymentRequest.isPending}
              onClick={openPaymentRequest}
            >
              Đề nghị thanh toán
            </Button>
          ) : order.supplierInvoices.length === 0 && order.status !== "DRAFT" ? (
            <Button
              icon={<FileAddOutlined />}
              onClick={() => navigate(`/purchase-invoices/create?poId=${order.id}`)}
            >
              Nhận hóa đơn
            </Button>
          ) : null}
          {canRequestReceipt ? (
            <Button
              type="primary"
              icon={<InboxOutlined />}
              onClick={() => setReceiveOpen(true)}
            >
              Đề nghị nhập hàng
            </Button>
          ) : null}
        </Space>
      </div>

      <Modal
        title="Lập đề nghị thanh toán"
        open={paymentRequestOpen}
        onCancel={() => setPaymentRequestOpen(false)}
        onOk={() => paymentRequestForm.submit()}
        confirmLoading={createPaymentRequest.isPending}
        okText="Gửi đề nghị"
        cancelText="Đóng"
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
            { title: "Nhập kho" },
          ]}
        />
      </div>

      {order.lifecycle === "PENDING_PAYMENT" ? (
        <Alert
          type="warning"
          showIcon
          message={`Còn công nợ ${formatMoney(order.payment.outstandingAmount)} đ. Nên hoàn tất thanh toán trước khi đề nghị kho nhập hàng.`}
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
          <span className="commercial-lot-kpi-label">Đã có hóa đơn</span>
          <span className="commercial-lot-kpi-value">
            {formatQty(order.quantities.invoicedQty)}
          </span>
        </div>
        <div className="commercial-lot-kpi">
          <span className="commercial-lot-kpi-label">Đã nhập kho</span>
          <span className="commercial-lot-kpi-value">
            {formatQty(order.quantities.receivedQty)}
          </span>
        </div>
        <div className="commercial-lot-kpi">
          <span className="commercial-lot-kpi-label">Còn phải nhập</span>
          <span className="commercial-lot-kpi-value">
            {formatQty(order.quantities.remainingToReceive)}
          </span>
        </div>
        <div className="commercial-lot-kpi">
          <span className="commercial-lot-kpi-label">Tiến độ nhập kho</span>
          <span className="commercial-lot-kpi-value">{receivePercent}%</span>
          <Progress percent={receivePercent} showInfo={false} size="small" />
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
          <span className="commercial-lot-meta-value">{order.contract?.code ?? "-"}</span>
        </div>
        <div>
          <span className="commercial-lot-meta-label">Mã rút</span>
          <span className="commercial-lot-meta-value">{order.releaseCode ?? "Chưa xác định"}</span>
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

      <RetailReceiptRequestModal
        open={receiveOpen}
        order={order}
        onClose={() => setReceiveOpen(false)}
      />
    </div>
  );
}
