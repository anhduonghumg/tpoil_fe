import React, { useEffect, useMemo, useState } from "react";
import { Button, Card, Drawer, Input, InputNumber, Select, Space, Statistic, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { DownloadOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { PartySelect } from "../../../shared/ui/PartySelect";
import { useBankAccountsOptions, useBankTransactions } from "../../banking/hooks";
import ImportStatementModal from "../../banking/ui/ImportStatementModal";
import { ManualBankTransactionModal } from "../../banking/ui/ManualBankTransactionModal";
import type { BankTransactionItem } from "../../banking/types";
import { useAllocateBankReceipt, useBankReceiptSuggestions, useReceivables } from "../hooks";
import { formatMoney } from "../ui/labels";

const receiptStatusLabel: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Chờ xử lý", color: "gold" },
  SUGGESTED: { label: "Có gợi ý", color: "blue" },
  PARTIALLY_ALLOCATED: { label: "Phân bổ một phần", color: "orange" },
  ALLOCATED: { label: "Đã phân bổ", color: "green" },
  IGNORED: { label: "Bỏ qua", color: "default" },
};

function ReceiptDrawer({ transaction, onClose }: { transaction?: BankTransactionItem; onClose: () => void }) {
  const [customerPartyId, setCustomerPartyId] = useState<string>();
  const [draft, setDraft] = useState<Record<string, number>>({});
  const suggestionsQuery = useBankReceiptSuggestions(transaction?.id, Boolean(transaction));
  const customerItemsQuery = useReceivables(
    { customerPartyId, onlyOpen: true, page: 1, limit: 100 },
    Boolean(customerPartyId && transaction),
  );
  const allocateMutation = useAllocateBankReceipt();
  const suggestionRows = suggestionsQuery.data?.suggestions ?? [];

  useEffect(() => {
    if (!transaction) return;
    setCustomerPartyId(undefined);
    setDraft(Object.fromEntries((suggestionsQuery.data?.suggestions ?? []).map((row) => [row.openItemId, Number(row.suggestedAmount)])));
  }, [transaction?.id, suggestionsQuery.data?.transaction?.id]);

  const candidateRows = useMemo(() => {
    const byId = new Map<string, any>();
    for (const row of suggestionRows) byId.set(row.openItemId, row);
    for (const row of customerItemsQuery.data?.items ?? []) {
      byId.set(row.id, {
        openItemId: row.id,
        customer: row.customer,
        salesOrder: row.salesOrder,
        dueDate: row.dueDate,
        outstandingAmount: row.outstandingAmount,
        suggestedAmount: "0",
        score: 0,
      });
    }
    return [...byId.values()];
  }, [suggestionRows, customerItemsQuery.data?.items]);

  const amount = Number(transaction?.amount ?? 0);
  const alreadyAllocated = Number(transaction?.allocatedAmount ?? 0);
  const receivableLeft = Math.max(amount - alreadyAllocated, 0);
  const totalDraft = Object.values(draft).reduce((sum, value) => sum + Number(value || 0), 0);

  const columns: ColumnsType<any> = [
    {
      title: "Khách hàng / chứng từ",
      key: "document",
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <strong>{row.customer?.name}</strong>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {row.salesInvoice?.misaInvoiceNo || row.salesInvoice?.invoiceNoInternal || row.salesOrder?.orderNo || "Khoản phải thu"}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Hạn TT",
      dataIndex: "dueDate",
      width: 105,
      render: (value) => (value ? dayjs(value).format("DD/MM/YYYY") : "—"),
    },
    { title: "Còn nợ", dataIndex: "outstandingAmount", align: "right", width: 135, render: (value) => formatMoney(value) },
    {
      title: "Phân bổ",
      width: 155,
      render: (_, row) => (
        <InputNumber
          min={0}
          max={Math.min(Number(row.outstandingAmount), receivableLeft)}
          value={draft[row.openItemId] || undefined}
          onChange={(value) => setDraft((current) => ({ ...current, [row.openItemId]: Number(value || 0) }))}
          style={{ width: "100%" }}
          controls={false}
        />
      ),
    },
    {
      title: "Gợi ý",
      width: 78,
      align: "center",
      render: (_, row) => (row.score ? <Tag color={row.score >= 80 ? "green" : "blue"}>{row.score}%</Tag> : "—"),
    },
  ];

  return (
    <Drawer
      title="Đối soát tiền khách trả"
      width={980}
      open={Boolean(transaction)}
      onClose={onClose}
      extra={<Button onClick={onClose}>Đóng</Button>}
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <Typography.Text type={totalDraft > receivableLeft ? "danger" : "secondary"}>
            Phân bổ: <strong>{formatMoney(totalDraft)}</strong> / còn dùng được {formatMoney(receivableLeft)}
          </Typography.Text>
          <Button
            type="primary"
            disabled={!transaction || totalDraft <= 0 || totalDraft > receivableLeft}
            loading={allocateMutation.isPending}
            onClick={async () => {
              if (!transaction) return;
              await allocateMutation.mutateAsync({
                bankTransactionId: transaction.id,
                allocations: Object.entries(draft)
                  .filter(([, value]) => Number(value) > 0)
                  .map(([openItemId, value]) => ({ openItemId, amount: Number(value) })),
              });
              onClose();
            }}
          >
            Xác nhận thu tiền
          </Button>
        </div>
      }
    >
      <Card size="small" style={{ marginBottom: 12, background: "#f6ffed" }}>
        <Space size={28} wrap>
          <div><Typography.Text type="secondary">Tiền về</Typography.Text><br /><strong>{formatMoney(amount)}</strong></div>
          <div><Typography.Text type="secondary">Ngày giao dịch</Typography.Text><br />{transaction?.txnDate ? dayjs(transaction.txnDate).format("DD/MM/YYYY HH:mm") : "—"}</div>
          <div><Typography.Text type="secondary">Người chuyển</Typography.Text><br />{transaction?.counterpartyName || "Chưa rõ"}</div>
          <div><Typography.Text type="secondary">Nội dung</Typography.Text><br />{transaction?.description || "—"}</div>
        </Space>
      </Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <Typography.Text strong>Khoản phải thu có thể phân bổ</Typography.Text>
        <PartySelect
          partyRole="CUSTOMER"
          allowClear
          value={customerPartyId}
          onChange={(value) => setCustomerPartyId(value || undefined)}
          placeholder="Chọn khách để tìm thủ công"
          style={{ width: 300 }}
        />
      </div>
      <Table
        size="small"
        rowKey="openItemId"
        loading={suggestionsQuery.isLoading || customerItemsQuery.isLoading}
        columns={columns}
        dataSource={candidateRows}
        pagination={{ pageSize: 8, showSizeChanger: false }}
        locale={{ emptyText: "Chưa có gợi ý. Chọn khách hàng để phân bổ thủ công." }}
        scroll={{ x: 760 }}
      />
    </Drawer>
  );
}

export default function SalesReceiptsPage() {
  const [bankAccountId, setBankAccountId] = useState<string>();
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<string>();
  const [importOpen, setImportOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [selected, setSelected] = useState<BankTransactionItem>();
  const accountsQuery = useBankAccountsOptions();
  const txQuery = useBankTransactions({ page: 1, pageSize: 100, direction: "IN", bankAccountId, keyword: keyword || undefined, reconciliationStatus: status as any, confirmed: "" });
  const result = txQuery.data as any;
  const rows: BankTransactionItem[] = result?.data ?? [];
  const totals = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const pending = rows.filter((row: any) => !["ALLOCATED", "IGNORED"].includes(row.reconciliationStatus || "PENDING"));

  const columns: ColumnsType<BankTransactionItem> = [
    { title: "Ngày tiền về", dataIndex: "txnDate", width: 132, render: (value) => dayjs(value).format("DD/MM/YYYY HH:mm") },
    { title: "Tài khoản nhận", key: "account", width: 155, render: (_, row) => row.bankAccount ? `${row.bankAccount.bankCode} · ${row.bankAccount.accountNo}` : "—" },
    { title: "Người chuyển / nội dung", key: "content", render: (_, row) => <Space direction="vertical" size={0}><strong>{row.counterpartyName || "Chưa rõ"}</strong><Typography.Text type="secondary" ellipsis style={{ maxWidth: 360 }}>{row.description}</Typography.Text></Space> },
    { title: "Tiền về", dataIndex: "amount", align: "right", width: 150, render: (value) => <strong style={{ color: "#1677ff" }}>{formatMoney(value)}</strong> },
    { title: "Đã phân bổ", dataIndex: "allocatedAmount", align: "right", width: 140, render: (value) => formatMoney(value || 0) },
    { title: "Trạng thái", key: "status", width: 145, render: (_, row: any) => { const item = receiptStatusLabel[row.reconciliationStatus || "PENDING"] || receiptStatusLabel.PENDING; return <Tag color={item.color}>{item.label}</Tag>; } },
    { title: "", key: "action", width: 112, render: (_, row) => <Button size="small" type="primary" disabled={(row as any).reconciliationStatus === "IGNORED"} onClick={() => setSelected(row)}>Đối soát</Button> },
  ];

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <div><Typography.Title level={4} style={{ margin: 0 }}>Thu tiền & đối soát</Typography.Title><Typography.Text type="secondary">Tiền vào chỉ giảm công nợ sau khi kế toán xác nhận phân bổ.</Typography.Text></div>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={() => setImportOpen(true)}>Import sao kê</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setManualOpen(true)}>Ghi nhận thủ công</Button>
        </Space>
      </div>
      <Card size="small" style={{ marginBottom: 12 }}>
        <Space size={36} wrap>
          <Statistic title="Giao dịch tiền vào" value={rows.length} />
          <Statistic title="Tổng tiền về" value={formatMoney(totals)} />
          <Statistic title="Chờ đối soát" value={pending.length} valueStyle={{ color: pending.length ? "#d48806" : undefined }} />
        </Space>
      </Card>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <Select allowClear placeholder="Tất cả tài khoản nhận" value={bankAccountId} onChange={setBankAccountId} style={{ width: 250 }} options={(accountsQuery.data || []).map((item: any) => ({ value: item.id, label: `${item.bankCode} · ${item.accountNo} ${item.accountName ? `— ${item.accountName}` : ""}` }))} />
        <Select allowClear placeholder="Trạng thái" value={status} onChange={setStatus} style={{ width: 180 }} options={Object.entries(receiptStatusLabel).map(([value, item]) => ({ value, label: item.label }))} />
        <Input.Search allowClear placeholder="Nội dung, người chuyển, mã giao dịch" value={keyword} onChange={(event) => setKeyword(event.target.value)} onSearch={() => txQuery.refetch()} style={{ width: 300 }} />
        <Button icon={<ReloadOutlined />} onClick={() => txQuery.refetch()} loading={txQuery.isFetching}>Làm mới</Button>
      </div>
      <Table rowKey="id" size="small" loading={txQuery.isLoading} columns={columns} dataSource={rows} pagination={{ pageSize: 20, showSizeChanger: false }} scroll={{ x: 1050 }} />
      <ImportStatementModal open={importOpen} onCancel={() => setImportOpen(false)} onSuccess={() => txQuery.refetch()} />
      <ManualBankTransactionModal open={manualOpen} defaultDirection="IN" onCancel={() => setManualOpen(false)} onSuccess={() => txQuery.refetch()} />
      <ReceiptDrawer transaction={selected} onClose={() => { setSelected(undefined); txQuery.refetch(); }} />
    </div>
  );
}
