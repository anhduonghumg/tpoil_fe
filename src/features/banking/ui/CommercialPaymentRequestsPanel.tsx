import React, { useMemo, useState } from "react";
import { Alert, Button, Col, DatePicker, Dropdown, Empty, Form, Input, InputNumber, Modal, Row, Select, Space, Table, Upload } from "antd";
import type { ColumnsType } from "antd/es/table";
import { CloseOutlined, MoreOutlined, PrinterOutlined, UploadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useBankAccountsOptions } from "../hooks";
import { useCommercialLotPaymentAction, useCommercialLotPaymentRequests, useRecordCommercialLotPayment } from "../../commercial-lots/hooks";
import type { CommercialPaymentRequest } from "../../commercial-lots/types";
import { uploadFile } from "../../../shared/api/uploads";
import { notify } from "../../../shared/lib/notification";
import "../../../shared/ui/data-grid.css";
import { COMMERCIAL_REQUEST_STATUS, dateText, formatMoney, stack, statusTag } from "../lib/format";
import "../banking.css";

export const COMMERCIAL_APPROVAL_STATUSES = ["PENDING_DIRECTOR_APPROVAL"];
export const COMMERCIAL_PAYMENT_STATUSES = ["SUBMITTED", "BANK_VERIFIED", "PARTIALLY_PAID", "PAID"];
type DecisionAction = "approve" | "reject" | "bank-verify" | "bank-return";

export function CommercialPaymentRequestsPanel({ view = "payment", toolbarLeft }: { view?: "approval" | "payment"; toolbarLeft?: React.ReactNode }) {
  const requestsQuery = useCommercialLotPaymentRequests();
  const bankAccountsQuery = useBankAccountsOptions();
  const [paymentForm] = Form.useForm();
  const [decisionForm] = Form.useForm();
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>();
  const [paymentRequest, setPaymentRequest] = useState<CommercialPaymentRequest | null>(null);
  const [decision, setDecision] = useState<{ request: CommercialPaymentRequest; action: DecisionAction } | null>(null);
  const decisionAction = useCommercialLotPaymentAction(decision?.request.purchaseOrderId);
  const recordPayment = useRecordCommercialLotPayment(paymentRequest?.purchaseOrderId);
  const fundingSource = Form.useWatch("fundingSource", paymentForm) ?? "OWN_BANK";
  const isDirectDisbursement = fundingSource === "DIRECT_DISBURSEMENT";

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

  const openDecision = (request: CommercialPaymentRequest, action: DecisionAction) => { decisionForm.resetFields(); setDecision({ request, action }); };
  const openPayment = (request: CommercialPaymentRequest) => { paymentForm.resetFields(); paymentForm.setFieldsValue({ fundingSource: "OWN_BANK", amountVnd: Number(request.remainingAmount), paidAt: dayjs() }); setPaymentRequest(request); };
  const submitDecision = async (values: { note?: string }) => { if (!decision) return; await decisionAction.mutateAsync({ requestId: decision.request.id, action: decision.action, note: values.note }); setDecision(null); };
  const submitPayment = async (values: any) => { if (!paymentRequest) return; await recordPayment.mutateAsync({ requestId: paymentRequest.id, data: { ...values, paidAt: values.paidAt.format("YYYY-MM-DD") } }); setPaymentRequest(null); };

  const columns: ColumnsType<CommercialPaymentRequest> = [
    /* Thứ tự cột theo đúng thứ tự ngân hàng cần khi lập lệnh: đơn nào → trả cho ai,
       vào tài khoản nào → bao nhiêu → căn cứ hóa đơn nào. Nguồn tiền chỉ có sau khi
       đã chi nên xem ở dòng mở rộng. */
    {
      title: "Mã đơn", key: "order", width: 150, fixed: "left",
      render: (_, record) => stack(record.purchaseOrder.orderNo, `${record.requestNo} · ${dateText(record.requestDate)}`, true),
    },
    {
      title: "Thụ hưởng / tài khoản", key: "beneficiary", width: 250,
      render: (_, record) => stack(
        record.beneficiaryAccountName || record.purchaseOrder.supplier.name,
        record.beneficiaryAccountNo ? `${record.beneficiaryBankName ?? ""} · ${record.beneficiaryAccountNo}` : <span style={{ color: "#c0392b" }}>Chưa có tài khoản thụ hưởng</span>,
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
        : <span style={{ color: "#c77700" }}>Chưa gắn</span>,
    },
    { title: "Trạng thái", dataIndex: "status", width: 135, render: (status) => statusTag(COMMERCIAL_REQUEST_STATUS, status) },
    {
      title: "", key: "actions", width: 112, fixed: "right", align: "right",
      render: (_, record) => {
        const canApprove = view === "approval" && record.status === "PENDING_DIRECTOR_APPROVAL";
        const canVerify = view === "payment" && record.status === "SUBMITTED";
        const canPay = view === "payment" && ["BANK_VERIFIED", "PARTIALLY_PAID"].includes(record.status);
        const primaryAction = canApprove ? { label: "Duyệt", onClick: () => openDecision(record, "approve") } : canVerify ? { label: "Kiểm tra", onClick: () => openDecision(record, "bank-verify") } : canPay ? { label: "Ghi nhận chi", onClick: () => openPayment(record) } : null;
        const items = [
          ...(canApprove ? [{ key: "reject", icon: <CloseOutlined />, danger: true, label: "Từ chối", onClick: () => openDecision(record, "reject") }] : []),
          ...(canVerify ? [{ key: "return", icon: <CloseOutlined />, danger: true, label: "Trả lại hồ sơ", onClick: () => openDecision(record, "bank-return") }] : []),
          { key: "print", icon: <PrinterOutlined />, label: "In đề nghị", onClick: () => window.open(`/api/purchase-orders/payment-requests/${record.id}/print`, "_blank") },
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

  const decisionIsReject = decision?.action === "reject" || decision?.action === "bank-return";
  const decisionTitle = decision?.action === "approve" ? "Phê duyệt hồ sơ chi" : decision?.action === "reject" ? "Từ chối hồ sơ chi" : decision?.action === "bank-return" ? "Trả lại hồ sơ" : "Kiểm tra hồ sơ trước khi lập lệnh";
  const decisionOkText = decision?.action === "approve" ? "Phê duyệt" : decision?.action === "reject" ? "Từ chối" : decision?.action === "bank-return" ? "Trả lại" : "Xác nhận đủ điều kiện";
  const statusOptions = viewStatuses.map((value) => ({ value, label: COMMERCIAL_REQUEST_STATUS[value]?.label ?? value }));

  return (
    <>
      <div className="table-filter-toolbar">
        <div className="table-filter-toolbar-left">
          {toolbarLeft}
          <Input.Search size="small" allowClear value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Số đề nghị, đơn hàng, NCC, hóa đơn" className="page-shell-search" />
          {statusOptions.length > 1 ? <Select size="small" allowClear value={statusFilter} onChange={setStatusFilter} placeholder="Trạng thái" style={{ width: 150 }} options={statusOptions} /> : null}
        </div>
      </div>
      <Table<CommercialPaymentRequest>
        className="data-grid"
        rowKey="id" size="small" loading={requestsQuery.isLoading} columns={columns} dataSource={rows} scroll={{ x: 1000 }}
        expandable={{
          rowExpandable: (record) => record.payments.length > 0,
          expandedRowRender: (record) => (
            <Table
              rowKey="id" size="small" pagination={false} dataSource={record.payments}
              columns={[
                { title: "Ngày", dataIndex: "paidAt", width: 110, render: (value) => dateText(value) },
                { title: "Tài khoản nguồn", render: (_: unknown, payment: any) => payment.fundingSource === "DIRECT_DISBURSEMENT" ? `Giải ngân · ${payment.lenderBankName ?? ""}` : payment.sourceBankAccount ? `${payment.sourceBankAccount.bankCode} · ${payment.sourceBankAccount.accountNo}` : "—" },
                { title: "Số tiền", dataIndex: "amountVnd", align: "right", width: 160, render: (value) => `${formatMoney(value)} đ` },
                { title: "Chứng từ", width: 150, render: (_: unknown, payment: any) => payment.proofFileUrl ? <a href={payment.proofFileUrl} target="_blank" rel="noreferrer">{payment.proofFileName ?? "Mở chứng từ"}</a> : "Chưa đính kèm" },
                { title: "Ghi chú", dataIndex: "note", render: (value) => value || "—" },
              ]}
            />
          ),
        }}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={view === "approval" ? "Không có đề nghị mua hàng chờ phê duyệt" : "Không có đề nghị mua hàng cần thanh toán"} /> }}
        pagination={{ pageSize: 20, hideOnSinglePage: true, showSizeChanger: false }}
      />

      <Modal className="banking-modal" open={Boolean(decision)} title={decisionTitle} okText={decisionOkText} okButtonProps={decisionIsReject ? { danger: true } : undefined} cancelText="Đóng" onCancel={() => setDecision(null)} confirmLoading={decisionAction.isPending} onOk={() => decisionForm.submit()} destroyOnHidden width={480}>
        {decision ? (
          <Alert
            type="info"
            style={{ marginBottom: 12 }}
            message={`${decision.request.requestNo} · ${decision.request.purchaseOrder.supplier.name}`}
            description={`Đơn ${decision.request.purchaseOrder.orderNo} — còn phải trả ${formatMoney(decision.request.remainingAmount)} đ`}
          />
        ) : null}
        <Form className="banking-form" form={decisionForm} layout="vertical" onFinish={submitDecision}>
          <Form.Item name="note" label={decisionIsReject ? "Lý do" : "Ghi chú kiểm tra"} rules={decisionIsReject ? [{ required: true, message: "Nhập lý do từ chối hoặc trả lại" }] : []}>
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} placeholder="Nêu nội dung kiểm tra hoặc lý do trả lại" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal className="banking-modal" open={Boolean(paymentRequest)} title="Ghi nhận đã chi" okText="Ghi nhận đã thực hiện" cancelText="Đóng" onCancel={() => setPaymentRequest(null)} confirmLoading={recordPayment.isPending} onOk={() => paymentForm.submit()} destroyOnHidden width={560}>
        {paymentRequest ? (
          <Alert
            type="success"
            style={{ marginBottom: 12 }}
            message={<Space size={16} wrap><span>Còn phải trả: <b>{formatMoney(paymentRequest.remainingAmount)} đ</b></span><span>Thụ hưởng: <b>{paymentRequest.purchaseOrder.supplier.name}</b></span></Space>}
            description={isDirectDisbursement ? "Ngân hàng giải ngân trực tiếp cho NCC: bắt buộc lưu giấy báo giải ngân, không ghi nhận tiền ra từ tài khoản công ty." : "Chỉ ghi nhận khi lệnh đã được ngân hàng thực hiện. Bước tiếp theo là đối soát với sao kê ngân hàng."}
          />
        ) : null}
        <Form className="banking-form" form={paymentForm} layout="vertical" onFinish={submitPayment}>
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
          <Row gutter={10}>
            <Col span={14}>
              <Form.Item name="amountVnd" label="Số tiền" rules={[{ required: true, message: "Nhập số tiền" }]}>
                <InputNumber min={0.01} max={Number(paymentRequest?.remainingAmount ?? 0)} precision={0} style={{ width: "100%" }} formatter={(value) => formatMoney(value)} parser={(value) => Number(String(value || "").replace(/[^\d.-]/g, ""))} />
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
