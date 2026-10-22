import React, { useMemo, useState } from "react";
import { Alert, Button, Col, DatePicker, Dropdown, Empty, Form, Input, InputNumber, Modal, Row, Select, Space, Table, Upload } from "antd";
import type { ColumnsType } from "antd/es/table";
import { CloseOutlined, EditOutlined, EyeOutlined, MoreOutlined, PrinterOutlined, StopOutlined, UploadOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { bankingKeys, useBankAccountsOptions, usePaymentPlanAction, usePaymentPlanRequests } from "../hooks";
import { useRecordCommercialLotPayment } from "../../commercial-lots/hooks";
import type { PaymentPlanLine, PaymentPlanRequest } from "../types";
import { uploadFile } from "../../../shared/api/uploads";
import { notify } from "../../../shared/lib/notification";
import "../../../shared/ui/data-grid.css";
import { COMMERCIAL_REQUEST_STATUS, dateText, formatMoney, stack, statusTag } from "../lib/format";
import { PaymentPlanDrawer, type PaymentPlanDrawerMode } from "./PaymentPlanDrawer";
import { UndoReasonModal, type UndoRequest } from "./UndoReasonModal";
import "../banking.css";

/* Luồng đề nghị thanh toán đơn TE/TM: mua hàng gửi → ngân hàng lập kế hoạch thanh toán →
   giám đốc duyệt đề nghị kèm kế hoạch → chi theo từng đợt (TM) hoặc đưa vào bảng kê (TE). */
export const COMMERCIAL_APPROVAL_STATUSES = ["PENDING_DIRECTOR_APPROVAL"];
export const COMMERCIAL_PAYMENT_STATUSES = ["PENDING_BANK_PLAN", "DIRECTOR_REJECTED", "PENDING_DIRECTOR_APPROVAL", "APPROVED", "BANK_VERIFIED", "PARTIALLY_PAID", "PAID"];
/* Việc ngân hàng còn phải làm ở bước "Thực hiện chi". Đề nghị TE đã duyệt chuyển sang bảng kê. */
export const isCommercialExecutionTodo = (request: PaymentPlanRequest) =>
  ["PENDING_BANK_PLAN", "DIRECTOR_REJECTED"].includes(request.status) ||
  (Boolean(request.supplierInvoice) && ["APPROVED", "BANK_VERIFIED", "PARTIALLY_PAID"].includes(request.status));

type ReasonAction = "return" | "revise";
const PLANNABLE = ["PENDING_BANK_PLAN", "DIRECTOR_REJECTED"];
const PAYABLE = ["APPROVED", "BANK_VERIFIED", "PARTIALLY_PAID"];
const CANCELLABLE = ["PENDING_BANK_PLAN", "PENDING_DIRECTOR_APPROVAL", "DIRECTOR_REJECTED", "BANK_RETURNED", "BANK_VERIFIED", "APPROVED"];

const lineLabel = (line: PaymentPlanLine, index: number) =>
  `Đợt ${index + 1} · ${dateText(line.plannedDate)} · còn ${formatMoney(line.remainingAmount)} đ · ${line.bankAccount ? `${line.bankAccount.bankCode} ${line.bankAccount.accountNo}` : ""} · ${line.method === "DISBURSEMENT" ? "Giải ngân" : "Chuyển khoản"}`;

export function CommercialPaymentRequestsPanel({ view = "payment", toolbarLeft }: { view?: "approval" | "payment"; toolbarLeft?: React.ReactNode }) {
  const queryClient = useQueryClient();
  const requestsQuery = usePaymentPlanRequests();
  const bankAccountsQuery = useBankAccountsOptions();
  const planAction = usePaymentPlanAction();
  const [paymentForm] = Form.useForm();
  const [reasonForm] = Form.useForm();
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>();
  const [paymentRequest, setPaymentRequest] = useState<PaymentPlanRequest | null>(null);
  const [planTarget, setPlanTarget] = useState<{ id: string; mode: PaymentPlanDrawerMode } | null>(null);
  const [reason, setReason] = useState<{ request: PaymentPlanRequest; action: ReasonAction } | null>(null);
  const [undo, setUndo] = useState<UndoRequest | null>(null);
  const recordPayment = useRecordCommercialLotPayment(paymentRequest?.purchaseOrderId);
  const fundingSource = Form.useWatch("fundingSource", paymentForm) ?? "OWN_BANK";
  const planLineId = Form.useWatch("planLineId", paymentForm);

  const bankAccounts = useMemo(() => (bankAccountsQuery.data ?? []).filter((account: any) => account.isActive !== false), [bankAccountsQuery.data]);
  const viewStatuses = view === "approval" ? COMMERCIAL_APPROVAL_STATUSES : COMMERCIAL_PAYMENT_STATUSES;
  const allRows = useMemo(
    () => (requestsQuery.data ?? []).filter((request) => viewStatuses.includes(request.status)),
    [requestsQuery.data, viewStatuses],
  );
  const rows = useMemo(() => {
    const query = keyword.trim().toLocaleLowerCase("vi");
    return allRows.filter((request) => {
      const haystack = [request.requestNo, request.purchaseOrder.orderNo, request.purchaseOrder.supplier.code, request.purchaseOrder.supplier.name, request.supplierInvoice?.invoiceNo].filter(Boolean).join(" ").toLocaleLowerCase("vi");
      return (!query || haystack.includes(query)) && (!statusFilter || request.status === statusFilter);
    });
  }, [allRows, keyword, statusFilter]);
  /* Drawer đọc đề nghị từ danh sách mới nhất, nên sau khi lưu nháp hay điều chỉnh không phải mở lại. */
  const planRequest = planTarget ? (requestsQuery.data ?? []).find((request) => request.id === planTarget.id) ?? null : null;

  /* Đề nghị có kế hoạch thì chi theo đợt: tài khoản và kiểu lấy từ đợt. Đề nghị cũ (đã qua kiểm tra
     trước khi có bước kế hoạch) vẫn chi tự do như trước. */
  const openLines = (paymentRequest?.plan?.lines ?? []).map((line, index) => ({ line, index })).filter(({ line }) => Number(line.remainingAmount) > 0);
  const hasPlan = Boolean(paymentRequest?.plan);
  const selectedLine = openLines.find(({ line }) => line.id === planLineId)?.line;
  const isDirectDisbursement = !hasPlan && fundingSource === "DIRECT_DISBURSEMENT";
  const maxAmount = selectedLine ? Number(selectedLine.remainingAmount) : Number(paymentRequest?.remainingAmount ?? 0);

  const openPayment = (request: PaymentPlanRequest) => {
    paymentForm.resetFields();
    const first = (request.plan?.lines ?? []).find((line) => Number(line.remainingAmount) > 0);
    paymentForm.setFieldsValue({
      fundingSource: "OWN_BANK",
      planLineId: first?.id,
      amountVnd: Number(first ? first.remainingAmount : request.remainingAmount),
      paidAt: dayjs(),
    });
    setPaymentRequest(request);
  };
  const submitPayment = async (values: any) => {
    if (!paymentRequest) return;
    await recordPayment.mutateAsync({ requestId: paymentRequest.id, data: { ...values, paidAt: values.paidAt.format("YYYY-MM-DD") } });
    queryClient.invalidateQueries({ queryKey: bankingKeys.paymentPlanRequests() });
    setPaymentRequest(null);
  };
  const openReason = (request: PaymentPlanRequest, action: ReasonAction) => { reasonForm.resetFields(); setReason({ request, action }); };
  const submitReason = async (values: { reason: string }) => {
    if (!reason) return;
    await planAction.mutateAsync({ requestId: reason.request.id, action: reason.action, data: { reason: values.reason } });
    const { request, action } = reason;
    setReason(null);
    if (action === "revise") setPlanTarget({ id: request.id, mode: "edit" });
    else notify.success("Đã trả đề nghị lại cho mua hàng");
  };

  const columns: ColumnsType<PaymentPlanRequest> = [
    /* Thứ tự cột theo đúng thứ tự ngân hàng cần khi lập lệnh: đơn nào → trả cho ai → bao nhiêu →
       căn cứ hóa đơn nào → kế hoạch chia mấy đợt. */
    {
      title: "Mã đơn", key: "order", width: 150, fixed: "left",
      render: (_, record) => stack(record.purchaseOrder.orderNo, `${record.requestNo} · ${dateText(record.requestDate)}`, true),
    },
    {
      title: "Nhà cung cấp", key: "supplier", width: 230,
      render: (_, record) => stack(
        record.purchaseOrder.supplier.name,
        record.purchaseOrder.supplier.bankAccounts.length ? `${record.purchaseOrder.supplier.bankAccounts.length} tài khoản nhận` : <span style={{ color: "#c0392b" }}>Chưa có tài khoản ngân hàng</span>,
        true,
      ),
    },
    {
      title: "Còn phải trả", key: "amount", width: 135, align: "right",
      render: (_, record) => stack(<span className="data-grid-num">{formatMoney(record.remainingAmount)}</span>, `Đã trả ${formatMoney(record.paidAmount)}`, true),
    },
    {
      title: "Hóa đơn", key: "invoice", width: 130,
      render: (_, record) => record.supplierInvoice
        ? stack(record.supplierInvoice.invoiceNo, dateText(record.supplierInvoice.invoiceDate))
        : <span style={{ color: "#8a8f98" }}>Đơn TE</span>,
    },
    {
      title: "Kế hoạch", key: "plan", width: 130,
      render: (_, record) => {
        const lines = record.plan?.lines ?? [];
        if (!lines.length) return <span style={{ color: "#c77700" }}>Chưa lập</span>;
        const paid = lines.filter((line) => line.status === "PAID").length;
        return stack(`${lines.length} đợt`, paid ? `Đã chi ${paid}/${lines.length}` : `Từ ${dateText(lines[0].plannedDate)}`);
      },
    },
    { title: "Trạng thái", dataIndex: "status", width: 150, render: (status) => statusTag(COMMERCIAL_REQUEST_STATUS, status) },
    {
      title: "", key: "actions", width: 132, fixed: "right", align: "right",
      render: (_, record) => {
        const canReview = view === "approval" && record.status === "PENDING_DIRECTOR_APPROVAL";
        const canPlan = view === "payment" && PLANNABLE.includes(record.status);
        /* Đề nghị TE đã duyệt được chi qua bảng kê, không ghi nhận chi ở đây. */
        const canPay = view === "payment" && Boolean(record.supplierInvoice) && PAYABLE.includes(record.status);
        const canRevise = view === "payment" && record.plan?.status === "APPROVED" && ["APPROVED", "PARTIALLY_PAID"].includes(record.status);
        const primaryAction = canReview
          ? { label: "Xem và duyệt", onClick: () => setPlanTarget({ id: record.id, mode: "review" }) }
          : canPlan
            ? { label: "Lập kế hoạch", onClick: () => setPlanTarget({ id: record.id, mode: "edit" }) }
            : canPay
              ? { label: "Ghi nhận chi", onClick: () => openPayment(record) }
              : null;
        const items = [
          ...(record.plan && !canPlan && !canReview ? [{ key: "view-plan", icon: <EyeOutlined />, label: "Xem kế hoạch", onClick: () => setPlanTarget({ id: record.id, mode: "view" }) }] : []),
          ...(canRevise ? [{ key: "revise", icon: <EditOutlined />, label: "Điều chỉnh kế hoạch", onClick: () => openReason(record, "revise") }] : []),
          ...(canPlan && !record.payments.length ? [{ key: "return", icon: <CloseOutlined />, danger: true, label: "Trả lại mua hàng", onClick: () => openReason(record, "return") }] : []),
          { key: "print", icon: <PrinterOutlined />, label: "In đề nghị", onClick: () => window.open(`/api/purchase-orders/payment-requests/${record.id}/print`, "_blank") },
          /* Chỉ hủy được khi chưa có tiền nào đi: chưa có lần chi, chưa có đợt nào trong bảng kê. */
          ...(CANCELLABLE.includes(record.status) && !record.payments.length && !(record.plan?.lines ?? []).some((line) => line.batchItems?.length)
            ? [{
                key: "cancel", icon: <StopOutlined />, danger: true, label: "Hủy đề nghị",
                onClick: () => setUndo({
                  title: "Hủy đề nghị thanh toán",
                  description: `Hủy đề nghị ${record.requestNo} (${formatMoney(record.amountVnd)} đ) của đơn ${record.purchaseOrder.orderNo}. Mua hàng phải lập đề nghị mới nếu vẫn cần thanh toán.`,
                  okText: "Hủy đề nghị",
                  successText: "Đã hủy đề nghị thanh toán",
                  route: "paymentPlans.cancel",
                  params: { requestId: record.id },
                }),
              }]
            : []),
        ];
        return (
          <Space size={2}>
            {primaryAction ? <Button size="small" type="primary" onClick={primaryAction.onClick}>{primaryAction.label}</Button> : null}
            <Dropdown trigger={["click"]} menu={{ items }} placement="bottomRight">
              <Button size="small" type="text" icon={<MoreOutlined />} aria-label="Thêm thao tác" />
            </Dropdown>
          </Space>
        );
      },
    },
  ];

  const statusOptions = viewStatuses.map((value) => ({ value, label: COMMERCIAL_REQUEST_STATUS[value]?.label ?? value }));

  return (
    <>
      <div className="table-filter-toolbar">
        <div className="table-filter-toolbar-left">
          {toolbarLeft}
          <Input.Search size="small" allowClear value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Số đề nghị, đơn hàng, NCC, hóa đơn" className="page-shell-search" />
          {statusOptions.length > 1 ? <Select size="small" allowClear value={statusFilter} onChange={setStatusFilter} placeholder="Trạng thái" style={{ width: 170 }} options={statusOptions} /> : null}
        </div>
      </div>
      <Table<PaymentPlanRequest>
        className="data-grid"
        rowKey="id" size="small" loading={requestsQuery.isLoading} columns={columns} dataSource={rows} scroll={{ x: 1100 }}
        expandable={{
          rowExpandable: (record) => record.payments.length > 0,
          expandedRowRender: (record) => (
            <Table
              rowKey="id" size="small" pagination={false} dataSource={record.payments}
              columns={[
                { title: "Ngày", dataIndex: "paidAt", width: 110, render: (value) => dateText(value) },
                {
                  title: "Đợt", width: 70,
                  render: (_: unknown, payment: any) => {
                    const index = (record.plan?.lines ?? []).findIndex((line) => line.id === payment.planLineId);
                    return index >= 0 ? `Đợt ${index + 1}` : "—";
                  },
                },
                { title: "Tài khoản nguồn", render: (_: unknown, payment: any) => payment.fundingSource === "DIRECT_DISBURSEMENT" ? `Giải ngân thẳng · ${payment.lenderBankName ?? ""}` : payment.sourceBankAccount ? `${payment.sourceBankAccount.bankCode} · ${payment.sourceBankAccount.accountNo}${payment.lenderBankName ? ` · giải ngân ${payment.lenderBankName}` : ""}` : "—" },
                { title: "Số tiền", dataIndex: "amountVnd", align: "right", width: 160, render: (value) => `${formatMoney(value)} đ` },
                { title: "Chứng từ", width: 150, render: (_: unknown, payment: any) => payment.proofFileUrl ? <a href={payment.proofFileUrl} target="_blank" rel="noreferrer">{payment.proofFileName ?? "Mở chứng từ"}</a> : "Chưa đính kèm" },
                { title: "Ghi chú", dataIndex: "note", render: (value) => value || "—" },
                ...(view === "payment"
                  ? [{
                      title: "", key: "remove", width: 70, align: "right" as const,
                      render: (_: unknown, payment: any) => (
                        <Button
                          size="small" type="link" danger style={{ padding: 0 }}
                          onClick={() => setUndo({
                            title: "Xóa lần chi ghi nhận sai",
                            description: `Xóa lần chi ${formatMoney(payment.amountVnd)} đ ngày ${dateText(payment.paidAt)}. Công nợ phải trả của hóa đơn được hoàn lại và đợt quay về chưa chi. Lần chi đang ghép sao kê thì phải gỡ ghép trước.`,
                            okText: "Xóa lần chi",
                            successText: "Đã xóa lần chi và hoàn lại công nợ",
                            route: "commercialPayments.removePayment",
                            params: { id: record.purchaseOrderId, requestId: record.id, paymentId: payment.id },
                          })}
                        >
                          Xóa
                        </Button>
                      ),
                    }]
                  : []),
              ]}
            />
          ),
        }}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={view === "approval" ? "Không có đề nghị mua hàng chờ phê duyệt" : "Không có đề nghị mua hàng cần xử lý"} /> }}
        pagination={{ pageSize: 20, hideOnSinglePage: true, showSizeChanger: false }}
      />

      <UndoReasonModal request={undo} onClose={() => setUndo(null)} />

      <PaymentPlanDrawer request={planRequest} mode={planTarget?.mode ?? "view"} onClose={() => setPlanTarget(null)} />

      <Modal className="banking-modal" open={Boolean(reason)} title={reason?.action === "revise" ? "Điều chỉnh kế hoạch đã duyệt" : "Trả đề nghị lại cho mua hàng"} okText={reason?.action === "revise" ? "Mở lại để sửa" : "Trả lại"} okButtonProps={reason?.action === "return" ? { danger: true } : undefined} cancelText="Đóng" onCancel={() => setReason(null)} confirmLoading={planAction.isPending} onOk={() => reasonForm.submit()} destroyOnHidden width={480}>
        {reason ? (
          <Alert
            type={reason.action === "revise" ? "warning" : "info"}
            style={{ marginBottom: 12 }}
            message={`${reason.request.requestNo} · ${reason.request.purchaseOrder.supplier.name}`}
            description={reason.action === "revise" ? "Kế hoạch sẽ quay về nháp và phải gửi giám đốc duyệt lại mới chi tiếp được. Các đợt đã chi được giữ nguyên." : `Đơn ${reason.request.purchaseOrder.orderNo} — ${formatMoney(reason.request.amountVnd)} đ`}
          />
        ) : null}
        <Form className="banking-form" form={reasonForm} layout="vertical" onFinish={submitReason}>
          <Form.Item name="reason" label="Lý do" rules={[{ required: true, min: 3, message: "Nhập lý do" }]}>
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} placeholder={reason?.action === "revise" ? "Vì sao cần điều chỉnh kế hoạch" : "Hồ sơ còn thiếu gì, mua hàng cần bổ sung gì"} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal className="banking-modal" open={Boolean(paymentRequest)} title="Ghi nhận đã chi" okText="Ghi nhận đã thực hiện" cancelText="Đóng" onCancel={() => setPaymentRequest(null)} confirmLoading={recordPayment.isPending} onOk={() => paymentForm.submit()} destroyOnHidden width={560}>
        {paymentRequest ? (
          <Alert
            type="success"
            style={{ marginBottom: 12 }}
            message={<Space size={16} wrap><span>Còn phải trả: <b>{formatMoney(paymentRequest.remainingAmount)} đ</b></span><span>Thụ hưởng: <b>{paymentRequest.purchaseOrder.supplier.name}</b></span></Space>}
            description={hasPlan
              ? "Chi theo từng đợt của kế hoạch đã duyệt. Muốn đổi tài khoản, kiểu hoặc số tiền thì điều chỉnh kế hoạch và duyệt lại."
              : isDirectDisbursement ? "Ngân hàng giải ngân trực tiếp cho NCC: bắt buộc lưu giấy báo giải ngân, không ghi nhận tiền ra từ tài khoản công ty." : "Chỉ ghi nhận khi lệnh đã được ngân hàng thực hiện. Bước tiếp theo là đối soát với sao kê ngân hàng."}
          />
        ) : null}
        <Form className="banking-form" form={paymentForm} layout="vertical" onFinish={submitPayment}>
          {hasPlan ? (
            <>
              <Form.Item name="planLineId" label="Đợt thanh toán" rules={[{ required: true, message: "Chọn đợt thanh toán" }]}>
                <Select
                  placeholder="Chọn đợt trong kế hoạch"
                  options={openLines.map(({ line, index }) => ({ value: line.id, label: lineLabel(line, index) }))}
                  onChange={(value) => paymentForm.setFieldsValue({ amountVnd: Number(openLines.find(({ line }) => line.id === value)?.line.remainingAmount ?? 0) })}
                />
              </Form.Item>
              {selectedLine ? (
                <Alert
                  type="info"
                  style={{ marginBottom: 12 }}
                  message={`Chuyển từ ${selectedLine.bankAccount ? `${selectedLine.bankAccount.bankCode} · ${selectedLine.bankAccount.accountNo}` : "—"} đến ${selectedLine.beneficiaryBankName ?? ""} · ${selectedLine.beneficiaryAccountNo ?? ""}`}
                  description={selectedLine.method === "DISBURSEMENT" ? `Giải ngân từ ${selectedLine.lenderBankName ?? ""} về tài khoản công ty rồi chuyển đi: sao kê có một dòng tiền vào và một dòng tiền ra.` : undefined}
                />
              ) : null}
              {selectedLine?.method === "DISBURSEMENT" ? <Form.Item name="disbursementNo" label="Số giấy báo giải ngân"><Input placeholder="Số chứng từ ngân hàng" /></Form.Item> : null}
            </>
          ) : (
            <>
              <Form.Item name="fundingSource" label="Nguồn thanh toán" rules={[{ required: true }]}>
                <Select options={[{ value: "OWN_BANK", label: "Vốn tự có — công ty chuyển khoản" }, { value: "DIRECT_DISBURSEMENT", label: "Giải ngân — ngân hàng trả thẳng NCC" }]} />
              </Form.Item>
              {isDirectDisbursement ? (
                <Row gutter={10}>
                  <Col span={12}><Form.Item name="lenderBankName" label="Ngân hàng giải ngân" rules={[{ required: true, message: "Nhập ngân hàng giải ngân" }]}><Input placeholder="Ví dụ: Vietcombank" /></Form.Item></Col>
                  <Col span={12}><Form.Item name="disbursementNo" label="Số giấy báo giải ngân" rules={[{ required: true, message: "Nhập số giấy báo" }]}><Input placeholder="Số chứng từ ngân hàng" /></Form.Item></Col>
                  <Col span={24}><Form.Item name="creditFacilityRef" label="Khế ước / hợp đồng tín dụng"><Input placeholder="Ví dụ: HM-2026-03" /></Form.Item></Col>
                </Row>
              ) : (
                <Form.Item name="sourceBankAccountId" label="Tài khoản nguồn" rules={[{ required: true, message: "Chọn tài khoản nguồn" }]}>
                  <Select showSearch optionFilterProp="label" placeholder="Chọn tài khoản vốn tự có" options={bankAccounts.map((account: any) => ({ value: account.id, label: `${account.bankCode} · ${account.accountNo}${account.accountName ? ` — ${account.accountName}` : ""}` }))} />
                </Form.Item>
              )}
            </>
          )}
          <Row gutter={10}>
            <Col span={14}>
              <Form.Item name="amountVnd" label="Số tiền" rules={[{ required: true, message: "Nhập số tiền" }]}>
                <InputNumber min={0.01} max={maxAmount} precision={0} style={{ width: "100%" }} formatter={(value) => formatMoney(value)} parser={(value) => Number(String(value || "").replace(/[^\d.-]/g, ""))} />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="paidAt" label={isDirectDisbursement ? "Ngày giải ngân" : "Ngày thực hiện"} rules={[{ required: true, message: "Chọn ngày" }]}>
                <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="proofFileUrl" hidden rules={isDirectDisbursement ? [{ required: true, message: "Tải giấy báo giải ngân" }] : []}><Input /></Form.Item>
          <Form.Item name="proofFileName" hidden><Input /></Form.Item>
          <Form.Item label={isDirectDisbursement ? "Giấy báo giải ngân *" : "UNC hoặc giấy báo nợ"}>
            <Upload maxCount={1} beforeUpload={async (file) => { try { const url = await uploadFile(file, `commercial-lot-payments/${paymentRequest?.requestNo ?? "payment"}`, file.name); paymentForm.setFieldsValue({ proofFileUrl: url, proofFileName: file.name }); notify.success(isDirectDisbursement ? "Đã tải giấy báo giải ngân" : "Đã tải chứng từ thanh toán"); } catch (error: any) { notify.error(error?.message || "Không tải được chứng từ"); } return false; }}>
              <Button size="small" icon={<UploadOutlined />}>Tải chứng từ</Button>
            </Upload>
          </Form.Item>
          <Form.Item name="note" label="Ghi chú"><Input.TextArea autoSize={{ minRows: 2, maxRows: 3 }} /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}
