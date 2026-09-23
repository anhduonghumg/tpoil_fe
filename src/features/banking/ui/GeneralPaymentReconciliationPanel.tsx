import { useMemo, useState } from "react";
import { CheckOutlined, LinkOutlined } from "@ant-design/icons";
import { Button, Empty, Form, Input, Modal, Select, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useGeneralPaymentReconciliationQueue, useRecentGeneralPaymentReconciliations, useReconcileGeneralPayment, useReverseGeneralPaymentReconciliation } from "../hooks";
import type { GeneralPaymentReconciliation, GeneralPaymentReconciliationQueueItem } from "../types";
import { BankingSection } from "./BankingKpis";
import "../../../shared/ui/data-grid.css";
import "../banking.css";

const money = (value?: number) => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Number(value ?? 0));

export function GeneralPaymentReconciliationPanel() {
  const queueQuery = useGeneralPaymentReconciliationQueue();
  const reconcileMutation = useReconcileGeneralPayment();
  const recentQuery = useRecentGeneralPaymentReconciliations();
  const reverseMutation = useReverseGeneralPaymentReconciliation();
  const [selected, setSelected] = useState<Record<string, string | undefined>>({});
  const [reversal, setReversal] = useState<GeneralPaymentReconciliation | null>(null);
  const [reversalForm] = Form.useForm();
  const rows = queueQuery.data ?? [];
  const candidateFor = (row: GeneralPaymentReconciliationQueueItem) => selected[row.id] ?? row.candidates[0]?.paymentId;
  const columns = useMemo<ColumnsType<GeneralPaymentReconciliationQueueItem>>(() => [
    { title: "Ngày / tài khoản", width: 155, render: (_, row) => <Space direction="vertical" size={0}><Typography.Text>{dayjs(row.txnDate).format("DD/MM/YYYY")}</Typography.Text><Typography.Text type="secondary" style={{ fontSize: 12 }}>{row.bankAccount.bankCode} · {row.bankAccount.accountNo}</Typography.Text></Space> },
    { title: "Giao dịch trên sao kê", width: 300, render: (_, row) => <Space direction="vertical" size={1}><Typography.Text ellipsis={{ tooltip: row.description }} style={{ maxWidth: 280 }}>{row.description}</Typography.Text><Typography.Text type="secondary" style={{ fontSize: 12 }}>{row.counterpartyName || row.counterpartyAcc || row.externalRef || "-"}</Typography.Text></Space> },
    { title: "Số tiền", dataIndex: "amount", width: 160, align: "right", render: (value, row) => <Space direction="vertical" size={0} align="end"><Typography.Text strong>{money(value)} đ</Typography.Text>{row.allocatedAmount ? <Typography.Text type="secondary" style={{ fontSize: 12 }}>Còn {money(row.remainingAmount)} đ</Typography.Text> : null}</Space> },
    { title: "Gợi ý hồ sơ chi", width: 300, render: (_, row) => row.candidates.length ? <Select size="small" value={candidateFor(row)} onChange={(value) => setSelected((current) => ({ ...current, [row.id]: value }))} style={{ width: "100%" }} options={row.candidates.map((candidate) => ({ value: candidate.paymentId, label: `${candidate.requestNo} · ${candidate.beneficiaryName} · ${money(candidate.amountVnd)} đ` }))} /> : <Typography.Text type="secondary">Chưa có hồ sơ cùng tài khoản và số tiền</Typography.Text> },
    { title: "", width: 90, align: "right", render: (_, row) => <Button size="small" type="primary" disabled={!candidateFor(row)} loading={reconcileMutation.isPending} icon={<LinkOutlined />} onClick={() => reconcileMutation.mutate({ bankTransactionId: row.id, paymentId: candidateFor(row)! })}>Khớp</Button> },
  ], [reconcileMutation, selected]);
  const suggestions = rows.filter((row) => row.candidates.length).length;
  const recentColumns: ColumnsType<GeneralPaymentReconciliation> = [
    { title: "Đối soát lúc", dataIndex: "reconciledAt", width: 135, render: (value) => dayjs(value).format("DD/MM/YYYY HH:mm") },
    { title: "Dòng sao kê", width: 290, render: (_, row) => <Space direction="vertical" size={0}><Typography.Text>{row.bankTransaction.description}</Typography.Text><Typography.Text type="secondary" style={{ fontSize: 12 }}>{dayjs(row.bankTransaction.txnDate).format("DD/MM/YYYY")} · {money(row.bankTransaction.amount)} đ</Typography.Text></Space> },
    { title: "Hồ sơ chi", width: 230, render: (_, row) => <Space direction="vertical" size={0}><Typography.Text strong>{row.payment.paymentRequest.requestNo}</Typography.Text><Typography.Text type="secondary" style={{ fontSize: 12 }}>{row.payment.paymentRequest.beneficiaryName} · {money(row.payment.amountVnd)} đ</Typography.Text></Space> },
    { title: "", width: 92, align: "right", render: (_, row) => <Button size="small" danger onClick={() => { reversalForm.resetFields(); setReversal(row); }}>Đảo khớp</Button> },
  ];
  const submitReversal = async (values: { reason: string }) => {
    if (!reversal) return;
    await reverseMutation.mutateAsync({ reconciliationId: reversal.id, reason: values.reason });
    setReversal(null);
  };
  return <Space direction="vertical" size={12} style={{ width: "100%" }}>
    <BankingSection
      title="Tiền ra chờ khớp hồ sơ chi"
      hint="Chỉ gồm chuyển khoản từ tài khoản công ty; giải ngân thẳng NCC đối soát bằng giấy báo giải ngân."
      extra={<Tag icon={<CheckOutlined />} color={suggestions ? "blue" : "default"}>{suggestions} giao dịch có gợi ý</Tag>}
    >
      <Table<GeneralPaymentReconciliationQueueItem> className="data-grid" size="small" rowKey="id" loading={queueQuery.isLoading} dataSource={rows} columns={columns} scroll={{ x: 980 }} pagination={{ pageSize: 10, hideOnSinglePage: true, showSizeChanger: false }} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có giao dịch chi ngoài mua hàng chờ đối soát" /> }} />
    </BankingSection>
    <BankingSection title="Đối soát gần đây" hint="Đảo khớp nếu ghép nhầm; bản ghi cũ vẫn lưu trong nhật ký.">
      <Table<GeneralPaymentReconciliation> className="data-grid" size="small" rowKey="id" loading={recentQuery.isLoading} dataSource={recentQuery.data ?? []} columns={recentColumns} scroll={{ x: 760 }} pagination={{ pageSize: 5, hideOnSinglePage: true, showSizeChanger: false }} locale={{ emptyText: "Chưa có đối soát" }} />
    </BankingSection>
    <Modal className="banking-modal" open={Boolean(reversal)} title="Đảo đối soát" okText="Xác nhận đảo" okButtonProps={{ danger: true }} cancelText="Đóng" onCancel={() => setReversal(null)} onOk={() => reversalForm.submit()} confirmLoading={reverseMutation.isPending} destroyOnHidden width={440}>
      <Typography.Paragraph type="secondary">Thao tác sẽ đưa dòng sao kê và lần thanh toán trở lại hàng đợi đối soát. Bản ghi cũ vẫn được lưu trong nhật ký kiểm toán.</Typography.Paragraph>
      <Form className="banking-form" form={reversalForm} layout="vertical" onFinish={submitReversal}><Form.Item name="reason" label="Lý do đảo" rules={[{ required: true, message: "Nhập lý do đảo đối soát" }]}><Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} /></Form.Item></Form>
    </Modal>
  </Space>;
}
