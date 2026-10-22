import React, { useMemo, useState } from "react";
import { CloseOutlined, DownloadOutlined, MoreOutlined, UploadOutlined } from "@ant-design/icons";
import { Alert, Button, Col, DatePicker, Dropdown, Empty, Form, Input, InputNumber, Modal, Row, Select, Space, Table, Tag, Tooltip, Upload } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import {
  useBankAccountsOptions,
  useGeneralPaymentRequestAction,
  useGeneralPaymentRequests,
  useRecordGeneralPayment,
} from "../hooks";
import type { GeneralPaymentRequest } from "../types";
import { uploadFile } from "../../../shared/api/uploads";
import { notify } from "../../../shared/lib/notification";
import "../../../shared/ui/data-grid.css";
import { GENERAL_CATEGORY_META, GENERAL_CATEGORY_OPTIONS } from "./GeneralPaymentCreateModal";
import { UndoReasonModal, type UndoRequest } from "./UndoReasonModal";
import { GENERAL_REQUEST_STATUS, dateText, downloadCsv, formatMoney, stack, statusTag } from "../lib/format";
import "../banking.css";

type DecisionAction = "approve" | "reject" | "bankVerify" | "bankReturn" | "resubmit";

export const GENERAL_APPROVAL_STATUSES = ["PENDING_APPROVAL", "REJECTED", "BANK_RETURNED"];
export const GENERAL_PAYMENT_STATUSES = ["APPROVED", "BANK_VERIFIED", "PARTIALLY_PAID", "PAID"];

const moneyInput = {
  precision: 0,
  style: { width: "100%" },
  formatter: (value?: string | number) => formatMoney(value),
  parser: (value?: string) => Number(String(value || "").replace(/[^\d.-]/g, "")),
};

export function GeneralPaymentRequestsPanel({ view, toolbarLeft }: { view: "approval" | "payment"; toolbarLeft?: React.ReactNode }) {
  const requestsQuery = useGeneralPaymentRequests();
  const bankAccountsQuery = useBankAccountsOptions();
  const actionMutation = useGeneralPaymentRequestAction();
  const recordMutation = useRecordGeneralPayment();
  const [decisionForm] = Form.useForm();
  const [paymentForm] = Form.useForm();
  const [keyword, setKeyword] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>();
  const [statusFilter, setStatusFilter] = useState<string>();
  const [decision, setDecision] = useState<{ row: GeneralPaymentRequest; action: DecisionAction } | null>(null);
  const [paymentRequest, setPaymentRequest] = useState<GeneralPaymentRequest | null>(null);
  const [undo, setUndo] = useState<UndoRequest | null>(null);
  const fundingSource = Form.useWatch("fundingSource", paymentForm) ?? "OWN_BANK";
  const isDirectDisbursement = fundingSource === "DIRECT_DISBURSEMENT";
  const bankAccounts = useMemo(
    () => (bankAccountsQuery.data ?? []).filter((item: any) => item.isActive !== false),
    [bankAccountsQuery.data],
  );

  const viewStatuses = view === "approval" ? GENERAL_APPROVAL_STATUSES : GENERAL_PAYMENT_STATUSES;
  const allRows = useMemo(
    () => (requestsQuery.data ?? []).filter((item) => viewStatuses.includes(item.status)),
    [requestsQuery.data, viewStatuses],
  );
  const rows = useMemo(() => {
    const query = keyword.trim().toLocaleLowerCase("vi");
    return allRows.filter((item) => {
      const haystack = [item.requestNo, item.beneficiaryName, item.content, item.referenceNo, item.invoiceNo]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("vi");
      return (
        (!query || haystack.includes(query)) &&
        (!categoryFilter || item.category === categoryFilter) &&
        (!statusFilter || item.status === statusFilter)
      );
    });
  }, [allRows, keyword, categoryFilter, statusFilter]);

  const alerts = useMemo(() => {
    const items = requestsQuery.data ?? [];
    return {
      overdue: items.filter((item) => item.paymentDeadline && dayjs(item.paymentDeadline).isBefore(dayjs(), "day") && !["PAID", "CANCELLED"].includes(item.status)).length,
      missingBank: items.filter((item) => ["APPROVED", "BANK_RETURNED"].includes(item.status) && (!item.beneficiaryBankName || !item.beneficiaryAccountNo)).length,
      missingProof: items.filter((item) => item.status === "PAID" && item.payments.some((payment) => !payment.proofFileUrl)).length,
    };
  }, [requestsQuery.data]);

  const exportRows = () => {
    const header = ["Số hồ sơ", "Ngày đề nghị", "Loại chi", "Thụ hưởng", "Nội dung", "Số tiền", "Đã trả", "Còn lại", "Nguồn tiền", "Trạng thái", "Hạn thanh toán"];
    downloadCsv(`ho-so-chi-${dayjs().format("YYYYMMDD")}.csv`, [
      header,
      ...(requestsQuery.data ?? []).map((item) => [
        item.requestNo,
        dateText(item.requestDate),
        GENERAL_CATEGORY_META[item.category]?.label ?? item.category,
        item.beneficiaryName,
        item.content,
        item.amountVnd,
        item.paidAmount,
        item.remainingAmount,
        item.payments[0]?.fundingSource === "DIRECT_DISBURSEMENT" ? "Giải ngân thẳng" : item.payments[0]?.sourceBankAccount ? "Vốn tự có" : "",
        GENERAL_REQUEST_STATUS[item.status]?.label ?? item.status,
        item.paymentDeadline ? dateText(item.paymentDeadline) : "",
      ]),
    ]);
  };

  const openDecision = (row: GeneralPaymentRequest, action: DecisionAction) => {
    decisionForm.resetFields();
    decisionForm.setFieldsValue({
      beneficiaryAccountNo: row.beneficiaryAccountNo,
      beneficiaryAccountName: row.beneficiaryAccountName,
      beneficiaryBankName: row.beneficiaryBankName,
    });
    setDecision({ row, action });
  };
  const openPayment = (row: GeneralPaymentRequest) => {
    paymentForm.resetFields();
    paymentForm.setFieldsValue({ fundingSource: "OWN_BANK", amountVnd: Number(row.remainingAmount), paidAt: dayjs() });
    setPaymentRequest(row);
  };
  const submitDecision = async (values: any) => {
    if (!decision) return;
    await actionMutation.mutateAsync({ id: decision.row.id, action: decision.action, data: values });
    setDecision(null);
  };
  const submitPayment = async (values: any) => {
    if (!paymentRequest) return;
    await recordMutation.mutateAsync({
      id: paymentRequest.id,
      data: { ...values, paidAt: values.paidAt.format("YYYY-MM-DD") },
    });
    setPaymentRequest(null);
  };

  const columns: ColumnsType<GeneralPaymentRequest> = [
    /* Chi khác không gắn đơn hàng: số hồ sơ đóng vai mã đơn. Thứ tự còn lại theo
       nhu cầu lập lệnh: trả cho ai, tài khoản nào → bao nhiêu → hạn → nội dung CK. */
    {
      title: "Số hồ sơ",
      dataIndex: "requestNo",
      width: 140,
      fixed: "left",
      render: (value, row) => stack(value, dateText(row.requestDate), true),
    },
    {
      title: "Thụ hưởng / tài khoản",
      width: 240,
      render: (_, row) =>
        stack(
          row.beneficiaryAccountName || row.beneficiaryName,
          row.beneficiaryAccountNo ? `${row.beneficiaryBankName ?? ""} · ${row.beneficiaryAccountNo}` : <span style={{ color: "#c0392b" }}>Chưa có tài khoản thụ hưởng</span>,
          true,
        ),
    },
    {
      title: "Còn phải chi",
      width: 135,
      align: "right",
      render: (_, row) => stack(<span className="data-grid-num">{formatMoney(row.remainingAmount)}</span>, `Đã trả ${formatMoney(row.paidAmount)}`, true),
    },
    {
      title: "Hạn TT",
      dataIndex: "paymentDeadline",
      width: 92,
      render: (value, row) => {
        const overdue = value && dayjs(value).isBefore(dayjs(), "day") && !["PAID", "CANCELLED"].includes(row.status);
        return <span style={overdue ? { color: "#c0392b", fontWeight: 600 } : undefined}>{dateText(value)}</span>;
      },
    },
    {
      title: "Nội dung chi",
      width: 250,
      render: (_, row) => (
        <Tooltip title={row.content} placement="topLeft">
          {stack(
            row.content,
            [GENERAL_CATEGORY_META[row.category]?.label ?? row.category, row.invoiceNo ? `HĐ ${row.invoiceNo}` : null, row.referenceNo ? `CT ${row.referenceNo}` : null].filter(Boolean).join(" · "),
          )}
        </Tooltip>
      ),
    },
    { title: "Trạng thái", dataIndex: "status", width: 135, render: (status) => statusTag(GENERAL_REQUEST_STATUS, status) },
    {
      title: "",
      width: 112,
      fixed: "right",
      align: "right",
      render: (_, row) => {
        const canApprove = view === "approval" && row.status === "PENDING_APPROVAL";
        const canResubmit = view === "approval" && ["REJECTED", "BANK_RETURNED"].includes(row.status);
        const canVerify = view === "payment" && row.status === "APPROVED";
        const canPay = view === "payment" && ["BANK_VERIFIED", "PARTIALLY_PAID"].includes(row.status);
        const primary = canApprove ? { label: "Duyệt", onClick: () => openDecision(row, "approve") }
          : canResubmit ? { label: "Gửi lại", onClick: () => openDecision(row, "resubmit") }
            : canVerify ? { label: "Kiểm tra", onClick: () => openDecision(row, "bankVerify") }
              : canPay ? { label: "Ghi nhận chi", onClick: () => openPayment(row) } : null;
        const items = [
          ...(canApprove ? [{ key: "reject", label: "Từ chối", danger: true, icon: <CloseOutlined />, onClick: () => openDecision(row, "reject") }] : []),
          ...(canVerify ? [{ key: "return", label: "Trả lại hồ sơ", danger: true, icon: <CloseOutlined />, onClick: () => openDecision(row, "bankReturn") }] : []),
          /* Chỉ hủy được hồ sơ chưa có lần chi nào. */
          ...(!["PAID", "PARTIALLY_PAID", "CANCELLED"].includes(row.status) && !row.payments.length
            ? [{
                key: "cancel", label: "Hủy hồ sơ", danger: true, icon: <CloseOutlined />,
                onClick: () => setUndo({
                  title: "Hủy hồ sơ chi",
                  description: `Hủy hồ sơ ${row.requestNo} (${formatMoney(row.amountVnd)} đ) — ${row.beneficiaryName}.`,
                  okText: "Hủy hồ sơ",
                  successText: "Đã hủy hồ sơ chi",
                  route: "generalPaymentRequests.cancel",
                  params: { id: row.id },
                }),
              }]
            : []),
        ];
        return (
          <Space size={2}>
            {primary ? <Button size="small" type="primary" onClick={primary.onClick}>{primary.label}</Button> : null}
            {items.length ? (
              <Dropdown trigger={["click"]} menu={{ items }} placement="bottomRight">
                <Button size="small" type="text" icon={<MoreOutlined />} aria-label="Thêm thao tác" />
              </Dropdown>
            ) : null}
          </Space>
        );
      },
    },
  ];

  const decisionTitle = decision?.action === "approve" ? "Phê duyệt hồ sơ chi" : decision?.action === "reject" ? "Từ chối hồ sơ chi" : decision?.action === "bankVerify" ? "Kiểm tra thông tin thụ hưởng" : decision?.action === "bankReturn" ? "Trả lại hồ sơ" : "Bổ sung và gửi lại hồ sơ";
  const needsReason = decision?.action === "reject" || decision?.action === "bankReturn";
  const needsBankInfo = decision?.action === "bankVerify" || decision?.action === "resubmit";
  const alertTags = view === "payment"
    ? [
      alerts.overdue ? <Tag key="overdue" color="red">{alerts.overdue} quá hạn</Tag> : null,
      alerts.missingBank ? <Tag key="bank" color="orange">{alerts.missingBank} thiếu TK thụ hưởng</Tag> : null,
      alerts.missingProof ? <Tag key="proof" color="gold">{alerts.missingProof} thiếu chứng từ</Tag> : null,
    ].filter(Boolean)
    : [];
  const statusOptions = viewStatuses.map((value) => ({ value, label: GENERAL_REQUEST_STATUS[value]?.label ?? value }));

  return (
    <>
      <div className="table-filter-toolbar">
        <div className="table-filter-toolbar-left">
          {toolbarLeft}
          <Input.Search size="small" allowClear placeholder="Số hồ sơ, thụ hưởng, nội dung" value={keyword} onChange={(event) => setKeyword(event.target.value)} className="page-shell-search" />
          <Select size="small" allowClear placeholder="Loại chi" value={categoryFilter} onChange={setCategoryFilter} style={{ width: 150 }} options={GENERAL_CATEGORY_OPTIONS} />
          <Select size="small" allowClear placeholder="Trạng thái" value={statusFilter} onChange={setStatusFilter} style={{ width: 150 }} options={statusOptions} />
        </div>
        <div className="table-filter-toolbar-right">
          {alertTags}
          <Button size="small" icon={<DownloadOutlined />} onClick={exportRows}>Xuất Excel</Button>
        </div>
      </div>
      <Table<GeneralPaymentRequest>
        className="data-grid"
        size="small"
        rowKey="id"
        loading={requestsQuery.isLoading}
        columns={columns}
        dataSource={rows}
        scroll={{ x: 1150 }}
        pagination={{ pageSize: 20, hideOnSinglePage: true, showSizeChanger: false }}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={view === "approval" ? "Không có hồ sơ chi ngoài mua hàng chờ duyệt" : "Chưa có hồ sơ chi ngoài mua hàng cần xử lý"} /> }}
        expandable={{
          rowExpandable: (row) => row.payments.length > 0,
          expandedRowRender: (row) => (
            <Table
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={row.payments}
              columns={[
                { title: "Ngày", dataIndex: "paidAt", width: 105, render: (value) => dateText(value) },
                { title: "Nguồn", width: 190, render: (_, payment: any) => payment.fundingSource === "DIRECT_DISBURSEMENT" ? `Giải ngân · ${payment.lenderBankName ?? ""}` : payment.sourceBankAccount ? `${payment.sourceBankAccount.bankCode} · ${payment.sourceBankAccount.accountNo}` : "—" },
                { title: "Số tiền", dataIndex: "amountVnd", align: "right", width: 145, render: (value) => `${formatMoney(value)} đ` },
                { title: "Chứng từ", width: 150, render: (_, payment: any) => payment.proofFileUrl ? <a href={payment.proofFileUrl} target="_blank" rel="noreferrer">{payment.proofFileName ?? "Mở chứng từ"}</a> : "Chưa đính kèm" },
                { title: "Ghi chú", dataIndex: "note", render: (value) => value || "—" },
                ...(view === "payment"
                  ? [{
                      title: "", key: "remove", width: 70, align: "right" as const,
                      render: (_: unknown, payment: any) => (
                        <Button
                          size="small" type="link" danger style={{ padding: 0 }}
                          onClick={() => setUndo({
                            title: "Xóa lần chi ghi nhận sai",
                            description: `Xóa lần chi ${formatMoney(payment.amountVnd)} đ ngày ${dateText(payment.paidAt)} của hồ sơ ${row.requestNo}. Lần chi đang ghép sao kê thì phải hủy ghép trước.`,
                            okText: "Xóa lần chi",
                            successText: "Đã xóa lần chi",
                            route: "generalPaymentRequests.removePayment",
                            params: { id: row.id, paymentId: payment.id },
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
      />

      <UndoReasonModal request={undo} onClose={() => setUndo(null)} />

      <Modal
        className="banking-modal"
        open={Boolean(decision)}
        title={decisionTitle}
        okText={decision?.action === "approve" ? "Phê duyệt" : decision?.action === "resubmit" ? "Gửi lại" : decision?.action === "bankVerify" ? "Xác nhận đủ điều kiện" : "Xác nhận"}
        okButtonProps={needsReason ? { danger: true } : undefined}
        cancelText="Đóng"
        onCancel={() => setDecision(null)}
        onOk={() => decisionForm.submit()}
        confirmLoading={actionMutation.isPending}
        destroyOnHidden
        width={540}
      >
        {decision ? (
          <Alert
            type="info"
            style={{ marginBottom: 12 }}
            message={`${decision.row.requestNo} · ${decision.row.beneficiaryName}`}
            description={`${decision.row.content} — ${formatMoney(decision.row.remainingAmount)} đ`}
          />
        ) : null}
        <Form className="banking-form" form={decisionForm} layout="vertical" onFinish={submitDecision}>
          {needsBankInfo ? (
            <Row gutter={10}>
              <Col span={8}>
                <Form.Item name="beneficiaryBankName" label="Ngân hàng thụ hưởng" rules={decision?.action === "bankVerify" ? [{ required: true, message: "Nhập ngân hàng" }] : []}>
                  <Input />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="beneficiaryAccountNo" label="Số tài khoản" rules={decision?.action === "bankVerify" ? [{ required: true, message: "Nhập số tài khoản" }] : []}>
                  <Input />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="beneficiaryAccountName" label="Chủ tài khoản">
                  <Input />
                </Form.Item>
              </Col>
            </Row>
          ) : null}
          <Form.Item name="note" label={needsReason ? "Lý do" : "Ghi chú"} rules={needsReason ? [{ required: true, message: "Nhập lý do" }] : []}>
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        className="banking-modal"
        open={Boolean(paymentRequest)}
        title="Ghi nhận đã chi"
        okText="Ghi nhận đã thực hiện"
        cancelText="Đóng"
        onCancel={() => setPaymentRequest(null)}
        onOk={() => paymentForm.submit()}
        confirmLoading={recordMutation.isPending}
        destroyOnHidden
        width={560}
      >
        {paymentRequest ? (
          <Alert
            type="success"
            style={{ marginBottom: 12 }}
            message={<Space size={14} wrap><span>Còn phải chi: <b>{formatMoney(paymentRequest.remainingAmount)} đ</b></span><span>Thụ hưởng: <b>{paymentRequest.beneficiaryName}</b></span></Space>}
            description={isDirectDisbursement ? "Ngân hàng giải ngân trực tiếp cho bên thụ hưởng: bắt buộc lưu giấy báo giải ngân; không ghi nhận tiền ra từ tài khoản công ty." : "Chỉ ghi nhận sau khi ngân hàng đã thực hiện, sau đó đối soát với sao kê."}
          />
        ) : null}
        <Form className="banking-form" form={paymentForm} layout="vertical" onFinish={submitPayment}>
          <Form.Item name="fundingSource" label="Nguồn thanh toán" rules={[{ required: true }]}>
            <Select options={[{ value: "OWN_BANK", label: "Vốn tự có — công ty chuyển khoản" }, { value: "DIRECT_DISBURSEMENT", label: "Giải ngân — ngân hàng trả thẳng thụ hưởng" }]} />
          </Form.Item>
          {isDirectDisbursement ? (
            <Row gutter={10}>
              <Col span={12}>
                <Form.Item name="lenderBankName" label="Ngân hàng giải ngân" rules={[{ required: true, message: "Nhập ngân hàng" }]}><Input /></Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="disbursementNo" label="Số giấy báo giải ngân" rules={[{ required: true, message: "Nhập số giấy báo" }]}><Input /></Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="creditFacilityRef" label="Khế ước / HĐ tín dụng"><Input /></Form.Item>
              </Col>
            </Row>
          ) : (
            <Form.Item name="sourceBankAccountId" label="Tài khoản nguồn" rules={[{ required: true, message: "Chọn tài khoản nguồn" }]}>
              <Select showSearch optionFilterProp="label" options={bankAccounts.map((account: any) => ({ value: account.id, label: `${account.bankCode} · ${account.accountNo}${account.accountName ? ` — ${account.accountName}` : ""}` }))} />
            </Form.Item>
          )}
          <Row gutter={10}>
            <Col span={14}>
              <Form.Item name="amountVnd" label="Số tiền" rules={[{ required: true }]}>
                <InputNumber min={0.01} max={Number(paymentRequest?.remainingAmount ?? 0)} {...moneyInput} />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="paidAt" label={isDirectDisbursement ? "Ngày giải ngân" : "Ngày thực hiện"} rules={[{ required: true }]}>
                <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="proofFileUrl" hidden rules={isDirectDisbursement ? [{ required: true, message: "Tải giấy báo giải ngân" }] : []}><Input /></Form.Item>
          <Form.Item name="proofFileName" hidden><Input /></Form.Item>
          <Form.Item label={isDirectDisbursement ? "Giấy báo giải ngân *" : "UNC hoặc giấy báo nợ"}>
            <Upload
              maxCount={1}
              beforeUpload={async (file) => {
                try {
                  const url = await uploadFile(file, `general-payment-requests/${paymentRequest?.requestNo ?? "payment"}`, file.name);
                  paymentForm.setFieldsValue({ proofFileUrl: url, proofFileName: file.name });
                  notify.success("Đã tải chứng từ");
                } catch (error: any) {
                  notify.error(error?.message || "Không tải được chứng từ");
                }
                return false;
              }}
            >
              <Button size="small" icon={<UploadOutlined />}>Tải chứng từ</Button>
            </Upload>
          </Form.Item>
          <Form.Item name="note" label="Ghi chú"><Input.TextArea autoSize={{ minRows: 2, maxRows: 3 }} /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}
