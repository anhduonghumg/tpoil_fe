import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Checkbox, Drawer, Dropdown, Input, InputNumber, Modal, Select, Space, Table, Tag, Tooltip, Typography } from "antd";
import type { MenuProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { DownloadOutlined, MoreOutlined, PlusOutlined } from "@ant-design/icons";
import { Link, useSearchParams } from "react-router-dom";
import { PartySelect } from "../../../shared/ui/PartySelect";
import { useBankAccountsOptions, useBankTransactions, useIgnoreBankTransactions, useRecognizeBankTransactions, useRestoreBankTransaction } from "../../banking/hooks";
import ImportStatementModal from "../../banking/ui/ImportStatementModal";
import { ManualBankTransactionModal } from "../../banking/ui/ManualBankTransactionModal";
import type { BankTransactionItem } from "../../banking/types";
import { useAllocateBankReceipt, useBankReceiptSuggestions, usePostBankReceiptsFifo, useReceivables, useReverseBankReceipt } from "../hooks";
import { ReverseReceiptModal } from "../ui/ReverseReceiptModal";
import { formatMoney } from "../ui/labels";
import { PageHeader } from "../../../shared/ui/PageHeader";
import { RefreshButton } from "../../../shared/ui/TableFilter";
import "../../../shared/ui/data-grid.css";
import { BankingKpis } from "../../banking/ui/BankingKpis";
import { RecognitionTag } from "../../banking/ui/RecognitionTag";

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

type QueueTab = "ready" | "review" | "internal" | "done";
type Choice = { customerPartyId: string; label: string };

const isPending = (row: BankTransactionItem) => !["ALLOCATED", "PARTIALLY_ALLOCATED", "IGNORED"].includes(row.reconciliationStatus || "PENDING");

/**
 * Hàng đợi tiền về: hệ thống nhận ra khách, kế toán chỉ xác nhận rồi ghi nhận hàng loạt.
 * Công nợ trừ theo lũy kế (FIFO, khoản đến hạn sớm nhất trước) nên không phải chọn đơn;
 * phân bổ theo từng khoản vẫn còn trong menu "⋯" cho trường hợp đặc biệt.
 */
export function SalesReceiptsPanel({ embedded = false }: { embedded?: boolean }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<QueueTab>("ready");
  const [bankAccountId, setBankAccountId] = useState<string>();
  const [keyword, setKeyword] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [selected, setSelected] = useState<BankTransactionItem>();
  const [choices, setChoices] = useState<Record<string, Choice | null>>({});
  const [searchMode, setSearchMode] = useState<Record<string, boolean>>({});
  /* Dòng người dùng nói "không phải nội bộ": đưa về nhóm cần xác định khách. */
  const [notInternal, setNotInternal] = useState<Record<string, boolean>>({});
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [rememberAccount, setRememberAccount] = useState(true);
  const accountsQuery = useBankAccountsOptions();
  const postFifo = usePostBankReceiptsFifo();
  const reverseBankReceipt = useReverseBankReceipt();
  const restore = useRestoreBankTransaction();
  const [reversingRow, setReversingRow] = useState<BankTransactionItem | null>(null);
  const ignoreMany = useIgnoreBankTransactions();
  const txQuery = useBankTransactions({ page: 1, pageSize: 300, direction: "IN", bankAccountId, keyword: keyword || undefined, confirmed: "" });
  const rows: BankTransactionItem[] = (txQuery.data as any)?.data ?? [];
  const pendingRows = useMemo(() => rows.filter(isPending), [rows]);
  const recognitionQuery = useRecognizeBankTransactions(pendingRows.map((row) => row.id));
  const recognitionById = useMemo(
    () => new Map((recognitionQuery.data ?? []).map((item) => [item.id, item] as const)),
    [recognitionQuery.data],
  );

  useEffect(() => {
    const transactionId = searchParams.get("transactionId");
    if (!transactionId || selected) return;
    const transaction = rows.find((row) => row.id === transactionId);
    if (transaction) setSelected(transaction);
  }, [rows, searchParams, selected]);

  const groupOf = (row: BankTransactionItem): QueueTab => {
    if (!isPending(row)) return "done";
    const recognition = recognitionById.get(row.id);
    if (!notInternal[row.id] && (recognition?.kind === "INTERNAL" || recognition?.kind === "BANK_FEE")) return "internal";
    // Chỉ căn cứ chắc chắn mới vào "Sẵn sàng". Dòng kế toán vừa chọn khách vẫn ở yên nhóm cũ để
    // không biến mất khỏi màn đang xem; bấm ghi nhận ngay tại đó.
    if (recognition?.party && recognition.confidence === "HIGH" && recognition.kind === "CUSTOMER" && choices[row.id] !== null) return "ready";
    return "review";
  };
  const groups = useMemo(() => {
    const result: Record<QueueTab, BankTransactionItem[]> = { ready: [], review: [], internal: [], done: [] };
    for (const row of rows) result[groupOf(row)].push(row);
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, recognitionById, choices, notInternal]);
  const sum = (list: BankTransactionItem[]) => list.reduce((total, row) => total + Number(row.amount || 0), 0);

  /** Khách sẽ ghi nhận cho dòng này: người dùng chọn, không thì lấy khách hệ thống nhận ra. */
  const customerOf = (row: BankTransactionItem): Choice | null => {
    const choice = choices[row.id];
    if (choice !== undefined) return choice;
    const party = recognitionById.get(row.id)?.party;
    return party ? { customerPartyId: party.partyId, label: party.partyName } : null;
  };

  const visible = groups[tab];
  const selectable = tab === "ready" || tab === "review" || tab === "internal";
  const selectedRows = visible.filter((row) => selectedKeys.includes(row.id));
  const postable = selectedRows.filter((row) => customerOf(row));

  const switchTab = (next: QueueTab) => {
    setTab(next);
    setSelectedKeys([]);
  };

  const postRows = async (list: BankTransactionItem[]) => {
    const items = list
      .map((row) => {
        const customer = customerOf(row);
        if (!customer) return null;
        const recognition = recognitionById.get(row.id);
        // Chỉ ghép khoản sale đã báo khi đúng khách hệ thống đã khớp khoản đó.
        const reported = recognition?.reportedReceipt && recognition.party?.partyId === customer.customerPartyId ? recognition.reportedReceipt.id : undefined;
        return {
          bankTransactionId: row.id,
          customerPartyId: customer.customerPartyId,
          customerReceiptId: reported,
          rememberAccount: rememberAccount && Boolean(row.counterpartyAcc || recognition?.payerAccount),
        };
      })
      .filter(Boolean) as Array<{ bankTransactionId: string; customerPartyId: string; customerReceiptId?: string; rememberAccount: boolean }>;
    if (!items.length) return;
    const result = await postFifo.mutateAsync(items);
    const posted = new Set(result.results.filter((item) => item.ok).map((item) => item.bankTransactionId));
    setSelectedKeys((keys) => keys.filter((key) => !posted.has(String(key))));
  };

  const confirmPost = (list: BankTransactionItem[]) => {
    const withCustomer = list.filter((row) => customerOf(row));
    Modal.confirm({
      title: `Ghi nhận ${withCustomer.length} giao dịch vào công nợ khách?`,
      content: (
        <div>
          Tổng <b>{formatMoney(sum(withCustomer))} đ</b>. Hệ thống trừ vào các khoản phải thu có hạn sớm nhất trước, ngày trừ nợ là ngày giao dịch trên
          sao kê.
          {withCustomer.length < list.length ? <div style={{ marginTop: 6 }}>{list.length - withCustomer.length} dòng chưa chọn khách sẽ được giữ lại.</div> : null}
        </div>
      ),
      okText: "Ghi nhận",
      cancelText: "Hủy",
      onOk: () => postRows(withCustomer),
    });
  };

  const markIgnored = (list: BankTransactionItem[], counterpartyType: "INTERNAL" | "OTHER", reason?: string) =>
    ignoreMany.mutateAsync({ ids: list.map((row) => row.id), counterpartyType, reason }).then(() => setSelectedKeys([]));

  const confirmInternal = (list: BankTransactionItem[]) => {
    const internal = list.filter((row) => recognitionById.get(row.id)?.kind !== "BANK_FEE");
    const fees = list.filter((row) => recognitionById.get(row.id)?.kind === "BANK_FEE");
    Modal.confirm({
      title: `Xác nhận ${list.length} giao dịch không phải tiền khách?`,
      content: "Các dòng này được đánh dấu chuyển nội bộ / phí ngân hàng và không tính vào công nợ.",
      okText: "Xác nhận",
      cancelText: "Hủy",
      onOk: async () => {
        if (internal.length) await markIgnored(internal, "INTERNAL", "Chuyển nội bộ giữa các tài khoản công ty");
        if (fees.length) await markIgnored(fees, "OTHER", "Phí / lãi ngân hàng");
      },
    });
  };

  const customerCell = (row: BankTransactionItem) => {
    const recognition = recognitionById.get(row.id);
    const customer = customerOf(row);
    const candidates = recognition?.candidates ?? [];
    const setChoice = (value: Choice | null) => setChoices((current) => ({ ...current, [row.id]: value }));
    if (candidates.length > 1 && !customer && !searchMode[row.id]) {
      return (
        <Select
          size="small"
          placeholder={`Chọn 1 trong ${candidates.length} khách gợi ý`}
          style={{ width: "100%" }}
          onChange={(value: string) => {
            if (value === "__search") return setSearchMode((current) => ({ ...current, [row.id]: true }));
            const hit = candidates.find((candidate) => candidate.partyId === value);
            if (hit) setChoice({ customerPartyId: hit.partyId, label: hit.partyName });
          }}
          options={[
            ...candidates.map((candidate) => ({ value: candidate.partyId, label: `${candidate.partyName} · ${candidate.reason}` })),
            { value: "__search", label: "Tìm khách khác…" },
          ]}
        />
      );
    }
    return (
      <PartySelect
        size="small"
        partyRole="CUSTOMER"
        allowClear
        placeholder="Chọn khách"
        value={customer?.customerPartyId ?? null}
        fallbackLabel={customer?.label ?? null}
        onChange={(value) => setChoice(value ? { customerPartyId: value, label: "" } : null)}
        style={{ width: "100%" }}
      />
    );
  };

  const rowMenu = (row: BankTransactionItem): MenuProps["items"] => [
    { key: "detail", label: "Phân bổ chi tiết theo khoản", onClick: () => setSelected(row) },
    {
      key: "ignore",
      label: "Không phải tiền khách (bỏ qua)",
      danger: true,
      onClick: () =>
        Modal.confirm({
          title: "Bỏ qua giao dịch này?",
          content: "Giao dịch được giữ trên sao kê nhưng không tính vào công nợ khách.",
          okText: "Bỏ qua",
          okButtonProps: { danger: true },
          cancelText: "Hủy",
          onOk: () => markIgnored([row], "OTHER", "Không phải tiền khách trả"),
        }),
    },
  ];

  const baseColumns: ColumnsType<BankTransactionItem> = [
    {
      title: "Ngày / TK nhận",
      dataIndex: "txnDate",
      width: 130,
      render: (value, row) => (
        <div className="data-grid-stack">
          <span className="data-grid-clip">{dayjs(value).format("DD/MM/YYYY HH:mm")}</span>
          <span className="data-grid-clip data-grid-sub">{row.bankAccount ? `${row.bankAccount.bankCode} · ${row.bankAccount.accountNo}` : "—"}</span>
        </div>
      ),
    },
    {
      title: "Người chuyển / nội dung",
      key: "content",
      render: (_, row) => {
        const recognition = recognitionById.get(row.id);
        const payer = row.counterpartyName || recognition?.payerName;
        const account = row.counterpartyAcc || recognition?.payerAccount;
        return (
          <Tooltip title={row.description} placement="topLeft">
            <div className="data-grid-stack">
              <span className="data-grid-clip data-grid-strong">
                {payer || "Chưa rõ người chuyển"}
                {account ? <span className="data-grid-sub-inline"> · {account}</span> : null}
              </span>
              <span className="data-grid-clip data-grid-sub">{row.description || "—"}</span>
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: "Tiền về",
      dataIndex: "amount",
      align: "right",
      width: 135,
      render: (value) => <span className="data-grid-num data-grid-strong banking-amount-in">+{formatMoney(value)}</span>,
    },
  ];

  const queueColumns: ColumnsType<BankTransactionItem> = [
    ...baseColumns,
    {
      title: "Khách",
      key: "customer",
      width: 270,
      render: (_, row) => customerCell(row),
    },
    {
      title: "Căn cứ",
      key: "reason",
      width: 210,
      render: (_, row) => {
        const recognition = recognitionById.get(row.id);
        if (choices[row.id]) return <span className="data-grid-sub">Kế toán chọn</span>;
        return <RecognitionTag recognition={recognition} />;
      },
    },
    {
      title: "",
      key: "action",
      width: 118,
      fixed: "right",
      align: "right",
      render: (_, row) => (
        <Space size={2}>
          <Button size="small" type="primary" disabled={!customerOf(row)} loading={postFifo.isPending} onClick={() => confirmPost([row])}>
            Ghi nhận
          </Button>
          <Dropdown trigger={["click"]} placement="bottomRight" menu={{ items: rowMenu(row) }}>
            <Button size="small" type="text" icon={<MoreOutlined />} aria-label="Thêm thao tác" />
          </Dropdown>
        </Space>
      ),
    },
  ];

  const internalColumns: ColumnsType<BankTransactionItem> = [
    ...baseColumns,
    { title: "Nhận diện", key: "recognition", width: 280, render: (_, row) => <RecognitionTag recognition={recognitionById.get(row.id)} /> },
    {
      title: "",
      key: "action",
      width: 150,
      align: "right",
      render: (_, row) => (
        <Button size="small" type="link" onClick={() => setNotInternal((current) => ({ ...current, [row.id]: true }))}>
          Là tiền khách trả
        </Button>
      ),
    },
  ];

  const doneColumns: ColumnsType<BankTransactionItem> = [
    ...baseColumns,
    { title: "Đã trừ nợ", dataIndex: "allocatedAmount", align: "right", width: 130, render: (value) => <span className="data-grid-num">{formatMoney(value || 0)}</span> },
    {
      title: "Trạng thái",
      key: "status",
      width: 170,
      render: (_, row: any) => {
        const item = receiptStatusLabel[row.reconciliationStatus || "PENDING"] || receiptStatusLabel.PENDING;
        return (
          <div className="data-grid-stack">
            <span>
              <Tag color={item.color} style={{ margin: 0 }}>{item.label}</Tag>
            </span>
            <span className="data-grid-clip data-grid-sub">
              {row.reconciliationStatus === "PARTIALLY_ALLOCATED" ? `Khách trả thừa ${formatMoney(row.remainingAmount)}` : row.ignoredReason || ""}
            </span>
          </div>
        );
      },
    },
    {
      /* Làm lại được: dòng đã ghi nhận thì đảo, dòng bỏ qua nhầm thì khôi phục về hàng đợi. */
      title: "",
      key: "action",
      width: 120,
      align: "right",
      render: (_, row: any) =>
        row.reconciliationStatus === "IGNORED" ? (
          <Button size="small" loading={restore.isPending} onClick={() => restore.mutate(row.id)}>
            Khôi phục
          </Button>
        ) : (
          <Button size="small" danger onClick={() => setReversingRow(row)}>
            Đảo ghi nhận
          </Button>
        ),
    },
  ];

  const columns = tab === "internal" ? internalColumns : tab === "done" ? doneColumns : queueColumns;
  const undeclared = [...new Set(groups.internal.map((row) => recognitionById.get(row.id)?.undeclaredCompanyAccount).filter(Boolean))];

  return (
    <div className="page-shell" style={{ padding: embedded ? 0 : 16 }}>
      <PageHeader
        title="Thu tiền & đối soát"
        subtitle="Hệ thống nhận ra khách từ sao kê; kế toán xác nhận rồi ghi nhận — công nợ trừ theo lũy kế, khoản đến hạn sớm nhất trước."
        actions={
          <>
            <Button size="small" icon={<PlusOutlined />} onClick={() => setManualOpen(true)}>Ghi nhận thủ công</Button>
            <Button size="small" type="primary" icon={<DownloadOutlined />} onClick={() => setImportOpen(true)}>Import sao kê</Button>
          </>
        }
      />
      <BankingKpis
        activeKey={tab}
        items={[
          { key: "ready", label: "Sẵn sàng ghi nhận", value: groups.ready.length, hint: `${formatMoney(sum(groups.ready))} đ · đã rõ khách`, color: "#1d7a3a", onClick: () => switchTab("ready") },
          { key: "review", label: "Cần xác định khách", value: groups.review.length, hint: `${formatMoney(sum(groups.review))} đ`, warning: groups.review.length > 0, onClick: () => switchTab("review") },
          { key: "internal", label: "Nội bộ / phí NH", value: groups.internal.length, hint: "Không tính vào công nợ", onClick: () => switchTab("internal") },
          { key: "done", label: "Đã xử lý", value: groups.done.length, hint: "Trong danh sách đang tải", onClick: () => switchTab("done") },
        ]}
      />
      <div className="table-filter-toolbar" style={{ marginBottom: 0 }}>
        <div className="table-filter-toolbar-left">
          <Input.Search size="small" allowClear placeholder="Nội dung, người chuyển, mã giao dịch" onSearch={setKeyword} onChange={(event) => { if (!event.target.value) setKeyword(""); }} className="page-shell-search" />
          <Select size="small" allowClear placeholder="Tất cả tài khoản nhận" value={bankAccountId} onChange={setBankAccountId} style={{ width: 230 }} options={(accountsQuery.data || []).map((item: any) => ({ value: item.id, label: `${item.bankCode} · ${item.accountNo} ${item.accountName ? `— ${item.accountName}` : ""}` }))} />
        </div>
        <div className="table-filter-toolbar-right">
          {recognitionQuery.isFetching ? <span className="banking-hint">Đang nhận diện…</span> : null}
          <RefreshButton loading={txQuery.isFetching} onClick={() => { txQuery.refetch(); recognitionQuery.refetch(); }} />
        </div>
      </div>

      {tab === "internal" && undeclared.length ? (
        <Alert
          type="warning"
          showIcon
          message={`Tài khoản ${undeclared.join(", ")} có vẻ là của công ty nhưng chưa khai báo`}
          description={<>Khai báo ở <Link to="/bank-accounts">Tài khoản công ty</Link> để lần sau nhận ra chuyển nội bộ ngay theo số tài khoản.</>}
        />
      ) : null}

      {selectedRows.length ? (
        <div className="banking-bulkbar">
          <span className="banking-bulkbar-count">
            Đã chọn {selectedRows.length} giao dịch · {formatMoney(sum(selectedRows))} đ
          </span>
          {tab === "internal" ? (
            <Button size="small" type="primary" loading={ignoreMany.isPending} onClick={() => confirmInternal(selectedRows)}>
              Xác nhận không phải tiền khách
            </Button>
          ) : (
            <>
              <Checkbox checked={rememberAccount} onChange={(event) => setRememberAccount(event.target.checked)}>
                Ghi nhớ STK người chuyển cho khách
              </Checkbox>
              <Button size="small" type="primary" disabled={!postable.length} loading={postFifo.isPending} onClick={() => confirmPost(selectedRows)}>
                Ghi nhận vào công nợ ({postable.length})
              </Button>
            </>
          )}
          <Button size="small" type="text" onClick={() => setSelectedKeys([])}>Bỏ chọn</Button>
        </div>
      ) : tab === "ready" && groups.ready.length ? (
        <div className="banking-bulkbar">
          <span className="banking-bulkbar-count">{groups.ready.length} giao dịch đã rõ khách · {formatMoney(sum(groups.ready))} đ</span>
          <Button size="small" type="primary" loading={postFifo.isPending} onClick={() => confirmPost(groups.ready)}>
            Ghi nhận tất cả
          </Button>
        </div>
      ) : null}

      <Table
        className="data-grid"
        rowKey="id"
        size="small"
        loading={txQuery.isLoading || (recognitionQuery.isLoading && pendingRows.length > 0)}
        columns={columns}
        dataSource={visible}
        rowSelection={selectable ? { selectedRowKeys: selectedKeys, onChange: setSelectedKeys } : undefined}
        pagination={{ pageSize: 30, showSizeChanger: false, hideOnSinglePage: true, showTotal: (count) => `${count} giao dịch` }}
        scroll={{ x: 1000 }}
        locale={{
          emptyText:
            tab === "ready"
              ? "Không có giao dịch đã rõ khách chờ ghi nhận"
              : tab === "review"
                ? "Không còn giao dịch cần xác định khách"
                : tab === "internal"
                  ? "Không có chuyển nội bộ / phí chờ xác nhận"
                  : "Chưa có giao dịch đã xử lý",
        }}
      />
      <ImportStatementModal open={importOpen} onCancel={() => setImportOpen(false)} onSuccess={() => txQuery.refetch()} />
      <ManualBankTransactionModal open={manualOpen} defaultDirection="IN" onCancel={() => setManualOpen(false)} onSuccess={() => txQuery.refetch()} />
      <ReverseReceiptModal
        open={Boolean(reversingRow)}
        summary={
          reversingRow
            ? `+${formatMoney(reversingRow.amount)} đ · ${dayjs(reversingRow.txnDate).format("DD/MM/YYYY")} · ${reversingRow.counterpartyName || reversingRow.description}`
            : undefined
        }
        loading={reverseBankReceipt.isPending}
        onCancel={() => setReversingRow(null)}
        onConfirm={(payload) =>
          reversingRow &&
          reverseBankReceipt.mutate({ bankTransactionId: reversingRow.id, ...payload }, { onSuccess: () => setReversingRow(null) })
        }
      />
      <ReceiptDrawer transaction={selected} onClose={() => {
        setSelected(undefined);
        if (searchParams.has("transactionId")) {
          const next = new URLSearchParams(searchParams);
          next.delete("transactionId");
          setSearchParams(next, { replace: true });
        }
        txQuery.refetch();
      }} />
    </div>
  );
}

export default function SalesReceiptsPage() {
  return <SalesReceiptsPanel />;
}
