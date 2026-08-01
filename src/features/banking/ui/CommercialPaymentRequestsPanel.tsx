import { useMemo, useState } from "react";
import {
  Button,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { CheckOutlined, CloseOutlined, PrinterOutlined, UploadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useBankAccountsOptions } from "../hooks";
import {
  useCommercialLotPaymentAction,
  useCommercialLotPaymentRequests,
  useRecordCommercialLotPayment,
} from "../../commercial-lots/hooks";
import type { CommercialPaymentRequest } from "../../commercial-lots/types";
import { uploadFile } from "../../../shared/api/uploads";
import { notify } from "../../../shared/lib/notification";

const STATUS_META: Record<string, { label: string; color: string }> = {
  PENDING_DIRECTOR_APPROVAL: { label: "Chờ giám đốc duyệt", color: "gold" },
  DIRECTOR_REJECTED: { label: "Giám đốc từ chối", color: "red" },
  SUBMITTED: { label: "Chờ ngân hàng kiểm tra", color: "blue" },
  BANK_VERIFIED: { label: "Sẵn sàng thanh toán", color: "cyan" },
  BANK_RETURNED: { label: "Trả lại mua hàng", color: "orange" },
  PARTIALLY_PAID: { label: "Thanh toán một phần", color: "geekblue" },
  PAID: { label: "Đã thanh toán", color: "green" },
  CANCELLED: { label: "Đã hủy", color: "default" },
};

const formatMoney = (value?: string | number | null) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Number(value ?? 0));

const formatQty = (value?: string | number | null) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 }).format(Number(value ?? 0));

export function CommercialPaymentRequestsPanel({ view = "payment" }: { view?: "approval" | "payment" }) {
  const requestsQuery = useCommercialLotPaymentRequests();
  const bankAccountsQuery = useBankAccountsOptions();
  const [paymentForm] = Form.useForm();
  const [decisionForm] = Form.useForm();
  const [paymentRequest, setPaymentRequest] = useState<CommercialPaymentRequest | null>(null);
  const [decision, setDecision] = useState<{
    request: CommercialPaymentRequest;
    action: "approve" | "reject" | "bank-verify" | "bank-return";
  } | null>(null);
  const paymentAction = useCommercialLotPaymentAction(paymentRequest?.purchaseOrderId);
  const decisionAction = useCommercialLotPaymentAction(decision?.request.purchaseOrderId);
  const recordPayment = useRecordCommercialLotPayment(paymentRequest?.purchaseOrderId);

  const bankAccounts = useMemo(
    () => (bankAccountsQuery.data ?? []).filter((account: any) => account.isActive !== false),
    [bankAccountsQuery.data],
  );

  const openPayment = (request: CommercialPaymentRequest) => {
    paymentForm.resetFields();
    paymentForm.setFieldsValue({
      amountVnd: Number(request.remainingAmount),
      paidAt: dayjs(),
    });
    setPaymentRequest(request);
  };

  const submitDecision = async (values: { note?: string }) => {
    if (!decision) return;
    await decisionAction.mutateAsync({
      requestId: decision.request.id,
      action: decision.action,
      note: values.note,
    });
    setDecision(null);
  };

  const submitPayment = async (values: any) => {
    if (!paymentRequest) return;
    await recordPayment.mutateAsync({
      requestId: paymentRequest.id,
      data: {
        ...values,
        paidAt: values.paidAt.format("YYYY-MM-DD"),
      },
    });
    setPaymentRequest(null);
  };

  const columns = useMemo<ColumnsType<CommercialPaymentRequest>>(
    () => [
      {
        title: "Số đề nghị",
        dataIndex: "requestNo",
        width: 220,
        render: (value, record) => (
          <Space size={4} direction="vertical">
            <Typography.Text strong>{value}</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {dayjs(record.requestDate).format("DD/MM/YYYY")}
            </Typography.Text>
          </Space>
        ),
      },
      {
        title: "Đơn hàng",
        width: 170,
        render: (_, record) => record.purchaseOrder.orderNo,
      },
      {
        title: "NCC / hóa đơn",
        width: 190,
        render: (_, record) => (
          <Space size={2} direction="vertical">
            <Typography.Text>{record.purchaseOrder.supplier.code}</Typography.Text>
            <Typography.Text type="secondary">{record.supplierInvoice?.invoiceNo ?? "-"}</Typography.Text>
          </Space>
        ),
      },
      {
        title: "Số lượng",
        dataIndex: "quantity",
        align: "right",
        width: 115,
        render: formatQty,
      },
      {
        title: "Phải thanh toán",
        dataIndex: "amountVnd",
        align: "right",
        width: 145,
        render: (value) => `${formatMoney(value)} đ`,
      },
      {
        title: "Đã thanh toán",
        dataIndex: "paidAmount",
        align: "right",
        width: 145,
        render: (value) => `${formatMoney(value)} đ`,
      },
      {
        title: "Còn lại",
        dataIndex: "remainingAmount",
        align: "right",
        width: 135,
        render: (value) => `${formatMoney(value)} đ`,
      },
      {
        title: "Trạng thái",
        dataIndex: "status",
        width: 170,
        render: (status) => {
          const meta = STATUS_META[status] ?? { label: status, color: "default" };
          return <Tag color={meta.color}>{meta.label}</Tag>;
        },
      },
      {
        title: "Xử lý",
        width: 170,
        fixed: "right",
        render: (_, record) => {
          if (view === "approval" && record.status === "PENDING_DIRECTOR_APPROVAL") {
            return (
              <Space size={4}>
                <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => {
                  decisionForm.resetFields();
                  setDecision({ request: record, action: "approve" });
                }}>
                  Duyệt
                </Button>
                <Button size="small" danger icon={<CloseOutlined />} onClick={() => {
                  decisionForm.resetFields();
                  setDecision({ request: record, action: "reject" });
                }}>
                  Từ chối
                </Button>
              </Space>
            );
          }
          if (view === "payment" && record.status === "SUBMITTED") {
            return (
              <Space size={4}>
                <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => {
                  decisionForm.resetFields();
                  setDecision({ request: record, action: "bank-verify" });
                }}>
                  Đúng
                </Button>
                <Button size="small" danger icon={<CloseOutlined />} onClick={() => {
                  decisionForm.resetFields();
                  setDecision({ request: record, action: "bank-return" });
                }}>
                  Trả lại
                </Button>
              </Space>
            );
          }
          if (view === "payment" && (record.status === "BANK_VERIFIED" || record.status === "PARTIALLY_PAID")) {
            return <Button size="small" type="primary" onClick={() => openPayment(record)}>Thanh toán</Button>;
          }
          return "-";
        },
      },
      {
        title: "In",
        width: 56,
        fixed: "right",
        align: "center",
        render: (_, record) => (
          <Button
            size="small"
            type="text"
            icon={<PrinterOutlined />}
            title="In đề nghị thanh toán"
            onClick={() => window.open(`/api/purchase-orders/payment-requests/${record.id}/print`, "_blank")}
          />
        ),
      },
    ],
    [decisionForm, view],
  );

  const rows = useMemo(() => {
    const requests = requestsQuery.data ?? [];
    return view === "approval"
      ? requests.filter((request) => request.status === "PENDING_DIRECTOR_APPROVAL")
      : requests.filter((request) =>
          ["SUBMITTED", "BANK_VERIFIED", "PARTIALLY_PAID", "PAID"].includes(request.status),
        );
  }, [requestsQuery.data, view]);

  const decisionIsReject = decision?.action === "reject" || decision?.action === "bank-return";
  const decisionTitle = decision?.action === "approve"
    ? "Duyệt đề nghị chi"
    : decision?.action === "reject"
      ? "Từ chối đề nghị chi"
      : decision?.action === "bank-return"
        ? "Yêu cầu mua hàng kiểm tra lại"
        : "Xác nhận đề nghị thanh toán";
  const decisionOkText = decision?.action === "approve"
    ? "Duyệt"
    : decision?.action === "reject"
      ? "Từ chối"
      : decision?.action === "bank-return"
        ? "Trả lại mua hàng"
        : "Xác nhận đúng";

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Typography.Text type="secondary">
        {view === "approval"
          ? "Đề nghị chi do mua hàng lập, chờ giám đốc hoặc người có quyền phê duyệt."
          : "Đề nghị đã duyệt được ngân hàng kiểm tra trước khi ghi nhận từng lần thanh toán."}
      </Typography.Text>
      <Table<CommercialPaymentRequest>
        rowKey="id"
        size="small"
        loading={requestsQuery.isLoading}
        columns={columns}
        dataSource={rows}
        scroll={{ x: 1460 }}
        expandable={{
          rowExpandable: (record) => record.payments.length > 0,
          expandedRowRender: (record) => (
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={record.payments}
              columns={[
                { title: "Ngày thanh toán", dataIndex: "paidAt", render: (value) => dayjs(value).format("DD/MM/YYYY") },
                { title: "Tài khoản nguồn", render: (_, payment: any) => payment.sourceBankAccount ? `${payment.sourceBankAccount.bankCode} - ${payment.sourceBankAccount.accountNo}` : "-" },
                { title: "Số tiền", dataIndex: "amountVnd", align: "right", render: (value) => `${formatMoney(value)} đ` },
                { title: "Chứng từ", render: (_, payment: any) => payment.proofFileUrl ? <a href={payment.proofFileUrl} target="_blank" rel="noreferrer">{payment.proofFileName ?? "Mở file"}</a> : "-" },
                { title: "Ghi chú", dataIndex: "note", render: (value) => value || "-" },
              ]}
            />
          ),
        }}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={view === "approval" ? "Không có đề nghị chi chờ duyệt" : "Không có đề nghị cần thanh toán"} /> }}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
      />

      <Modal
        open={Boolean(decision)}
        title={decisionTitle}
        okText={decisionOkText}
        okButtonProps={decisionIsReject ? { danger: true } : undefined}
        cancelText="Đóng"
        onCancel={() => setDecision(null)}
        confirmLoading={decisionAction.isPending}
        onOk={() => decisionForm.submit()}
        destroyOnHidden
        width={480}
      >
        <Form form={decisionForm} layout="vertical" size="small" onFinish={submitDecision}>
          <Form.Item
            name="note"
            label="Ghi chú"
            rules={decisionIsReject ? [{ required: true, message: "Nhập lý do từ chối hoặc trả lại" }] : []}
          >
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} placeholder="Nội dung kiểm tra hoặc lý do trả lại" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={Boolean(paymentRequest)}
        title="Ghi nhận thanh toán"
        okText="Lưu thanh toán"
        cancelText="Đóng"
        onCancel={() => setPaymentRequest(null)}
        confirmLoading={recordPayment.isPending}
        onOk={() => paymentForm.submit()}
        destroyOnHidden
        width={560}
      >
        {paymentRequest ? (
          <Space direction="vertical" size={4} style={{ marginBottom: 12 }}>
            <Typography.Text>Phải thanh toán: <b>{formatMoney(paymentRequest.amountVnd)} đ</b></Typography.Text>
            <Typography.Text>Đã thanh toán: <b>{formatMoney(paymentRequest.paidAmount)} đ</b></Typography.Text>
            <Typography.Text>Còn lại: <b>{formatMoney(paymentRequest.remainingAmount)} đ</b></Typography.Text>
            <Typography.Text type="secondary">Tài khoản NCC: {paymentRequest.beneficiaryAccountNo || "-"}</Typography.Text>
          </Space>
        ) : null}
        <Form form={paymentForm} layout="vertical" size="small" onFinish={submitPayment}>
          <Form.Item name="sourceBankAccountId" label="Tài khoản nguồn của công ty" rules={[{ required: true, message: "Chọn tài khoản nguồn" }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Chọn tài khoản nguồn"
              options={bankAccounts.map((account: any) => ({
                value: account.id,
                label: `${account.bankCode} - ${account.bankName || "Ngân hàng"} - ${account.accountNo}`,
              }))}
            />
          </Form.Item>
          <Space size={12} style={{ width: "100%", alignItems: "flex-start" }}>
            <Form.Item name="amountVnd" label="Số tiền thanh toán" rules={[{ required: true, message: "Nhập số tiền thanh toán" }]} style={{ flex: 1 }}>
              <InputNumber min={0.01} max={Number(paymentRequest?.remainingAmount ?? 0)} precision={0} style={{ width: "100%" }} formatter={(value) => formatMoney(value)} parser={(value) => Number(String(value || "").replace(/[^\d.-]/g, ""))} />
            </Form.Item>
            <Form.Item name="paidAt" label="Ngày thanh toán" rules={[{ required: true, message: "Chọn ngày" }]} style={{ width: 170 }}>
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
            </Form.Item>
          </Space>
          <Form.Item label="Ảnh hoặc sao kê thanh toán">
            <Upload
              maxCount={1}
              beforeUpload={async (file) => {
                try {
                  const url = await uploadFile(file, `commercial-lot-payments/${paymentRequest?.requestNo ?? "payment"}`, file.name);
                  paymentForm.setFieldsValue({ proofFileUrl: url, proofFileName: file.name });
                  notify.success("Đã tải chứng từ thanh toán");
                } catch (error: any) {
                  notify.error(error?.message || "Không tải được chứng từ");
                }
                return false;
              }}
            >
              <Button size="small" icon={<UploadOutlined />}>Tải chứng từ</Button>
            </Upload>
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 3 }} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
