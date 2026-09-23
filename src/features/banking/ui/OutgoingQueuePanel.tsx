import { useMemo, useState } from "react";
import { Alert, Button, Checkbox, Input, Modal, Select, Table, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { Link } from "react-router-dom";
import { useApplyPaymentMatch, useBankAccountsOptions, useBankTransactions, useIgnoreBankTransactions, useRecognizeBankTransactions, useRestoreBankTransaction } from "../hooks";
import type { BankTransactionItem, BankTransactionRecognition, PaymentMatch } from "../types";
import { BankingKpis } from "./BankingKpis";
import { RecognitionTag } from "./RecognitionTag";
import { RefreshButton } from "../../../shared/ui/TableFilter";
import { notify } from "../../../shared/lib/notification";
import { extractApiError } from "../../../shared/lib/httpError";
import { accountText, formatMoney } from "../lib/format";
import "../../../shared/ui/data-grid.css";

type Group = "matched" | "internal" | "other" | "done";

const isPending = (row: BankTransactionItem) => !["ALLOCATED", "IGNORED"].includes(row.reconciliationStatus || "PENDING");
const matchKey = (match: PaymentMatch) =>
  match.type === "COMMERCIAL_PAYMENT" ? `p:${match.paymentId}` : match.type === "COMMERCIAL_REQUEST" ? `r:${match.paymentRequestId}` : `t:${match.itemId}`;

function matchLabel(match: PaymentMatch) {
  if (match.type === "COMMERCIAL_PAYMENT") return `Lần chi ${match.requestNo} · ${dayjs(match.paidAt).format("DD/MM")} · ${formatMoney(match.remaining)}`;
  if (match.type === "COMMERCIAL_REQUEST") return `Ghi nhận chi ${match.requestNo} · còn ${formatMoney(match.remaining)}`;
  return `Bảng kê ${match.batchNo} · ${formatMoney(match.remaining)}${match.hasUnc ? "" : " · chưa có UNC"}`;
}

/**
 * Hàng đợi tiền ra: hệ thống đọc mã đơn trong nội dung chuyển khoản để tìm hồ sơ chi (Mua TM,
 * bảng kê TERM), nhận ra chuyển nội bộ và ghép cặp với dòng đối ứng ở tài khoản kia.
 */
export function OutgoingQueuePanel({ onOpenDetail }: { onOpenDetail: (row: BankTransactionItem) => void }) {
  const [group, setGroup] = useState<Group>("matched");
  const [bankAccountId, setBankAccountId] = useState<string>();
  const [keyword, setKeyword] = useState("");
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [withPairs, setWithPairs] = useState(true);
  const accountsQuery = useBankAccountsOptions();
  const txQuery = useBankTransactions({ page: 1, pageSize: 300, direction: "OUT", bankAccountId, keyword: keyword || undefined, confirmed: "" });
  const allRows = ((txQuery.data as any)?.data ?? []) as BankTransactionItem[];
  const pendingRows = useMemo(() => allRows.filter(isPending), [allRows]);
  const doneRows = useMemo(() => allRows.filter((row) => !isPending(row)), [allRows]);
  const recognitionQuery = useRecognizeBankTransactions(pendingRows.map((row) => row.id));
  const recognitionById = useMemo(
    () => new Map((recognitionQuery.data ?? []).map((item) => [item.id, item as BankTransactionRecognition] as const)),
    [recognitionQuery.data],
  );
  const applyMatch = useApplyPaymentMatch();
  const ignoreMany = useIgnoreBankTransactions();
  const restore = useRestoreBankTransaction();

  const groups = useMemo(() => {
    const result: Record<Group, BankTransactionItem[]> = { matched: [], internal: [], other: [], done: doneRows };
    for (const row of pendingRows) {
      const recognition = recognitionById.get(row.id);
      if (recognition?.kind === "INTERNAL" || recognition?.kind === "BANK_FEE") result.internal.push(row);
      else if (recognition?.paymentMatches?.length) result.matched.push(row);
      else result.other.push(row);
    }
    return result;
  }, [pendingRows, doneRows, recognitionById]);
  const sum = (list: BankTransactionItem[]) => list.reduce((total, row) => total + Number(row.remainingAmount ?? row.amount ?? 0), 0);

  const matchOf = (row: BankTransactionItem) => {
    const matches = recognitionById.get(row.id)?.paymentMatches ?? [];
    return matches.find((match) => matchKey(match) === picked[row.id]) ?? matches[0];
  };
  /* "Khớp đúng": số tiền bằng nhau và (với bảng kê) đã có UNC — đủ an toàn để khớp hàng loạt. */
  const isExact = (row: BankTransactionItem) => {
    const match = matchOf(row);
    if (!match) return false;
    const amount = Number(row.remainingAmount ?? row.amount);
    return Math.abs(match.remaining - amount) < 0.5 && (match.type !== "TERM_BATCH_ITEM" || match.hasUnc);
  };

  const visible = groups[group];
  const selectedRows = visible.filter((row) => selectedKeys.includes(row.id));

  const runMatches = async (list: BankTransactionItem[]) => {
    let ok = 0;
    const errors: string[] = [];
    for (const row of list) {
      const match = matchOf(row);
      if (!match) continue;
      try {
        await applyMatch.mutateAsync({ bankTransactionId: row.id, match });
        ok += 1;
      } catch (error) {
        errors.push(extractApiError(error).message || "Lỗi không xác định");
      }
    }
    if (ok) notify.success(`Đã khớp ${ok} giao dịch tiền ra`);
    if (errors.length) notify.warning(`${errors.length} giao dịch chưa khớp được: ${errors[0]}`);
    setSelectedKeys([]);
  };

  const confirmMatches = (list: BankTransactionItem[]) =>
    Modal.confirm({
      title: `Khớp ${list.length} giao dịch tiền ra?`,
      content: (
        <div>
          Tổng <b>{formatMoney(sum(list))} đ</b>. Dòng nào gợi ý "Ghi nhận chi" sẽ được ghi nhận đã chi Mua TM theo đúng số tiền và ngày giao dịch trên
          sao kê, rồi ghép luôn.
        </div>
      ),
      okText: "Khớp",
      cancelText: "Hủy",
      onOk: () => runMatches(list),
    });

  const confirmInternal = (list: BankTransactionItem[]) => {
    const pairIds = withPairs
      ? list.map((row) => recognitionById.get(row.id)?.pairedTransaction).filter((pair) => pair && !["ALLOCATED", "IGNORED"].includes(pair.reconciliationStatus)).map((pair) => pair!.id)
      : [];
    const fees = list.filter((row) => recognitionById.get(row.id)?.kind === "BANK_FEE");
    const internal = list.filter((row) => recognitionById.get(row.id)?.kind !== "BANK_FEE");
    Modal.confirm({
      title: `Xác nhận ${list.length} giao dịch không phải chi cho NCC?`,
      content: pairIds.length ? `Kèm ${pairIds.length} dòng đối ứng ở tài khoản công ty kia.` : "Các dòng được đánh dấu chuyển nội bộ / phí ngân hàng.",
      okText: "Xác nhận",
      cancelText: "Hủy",
      onOk: async () => {
        const internalIds = [...internal.map((row) => row.id), ...pairIds];
        if (internalIds.length) await ignoreMany.mutateAsync({ ids: internalIds, counterpartyType: "INTERNAL", reason: "Chuyển nội bộ giữa các tài khoản công ty" });
        if (fees.length) await ignoreMany.mutateAsync({ ids: fees.map((row) => row.id), counterpartyType: "OTHER", reason: "Phí / lãi ngân hàng" });
        setSelectedKeys([]);
      },
    });
  };

  const baseColumns: ColumnsType<BankTransactionItem> = [
    {
      title: "Ngày / TK chi",
      dataIndex: "txnDate",
      width: 130,
      render: (value, row) => (
        <div className="data-grid-stack">
          <span className="data-grid-clip">{dayjs(value).format("DD/MM/YYYY HH:mm")}</span>
          <span className="data-grid-clip data-grid-sub">{accountText(row.bankAccount)}</span>
        </div>
      ),
    },
    {
      title: "Người nhận / nội dung",
      key: "content",
      render: (_, row) => {
        const recognition = recognitionById.get(row.id);
        return (
          <Tooltip title={row.description} placement="topLeft">
            <div className="data-grid-stack">
              <span className="data-grid-clip data-grid-strong">{recognition?.party?.partyName || row.counterpartyName || recognition?.payerName || "Chưa rõ người nhận"}</span>
              <span className="data-grid-clip data-grid-sub">{row.description || "—"}</span>
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: "Tiền ra",
      dataIndex: "amount",
      align: "right",
      width: 135,
      render: (value, row) => (
        <div className="data-grid-stack">
          <span className="data-grid-num data-grid-strong banking-amount-out">−{formatMoney(value)}</span>
          <span className="data-grid-sub">{Number(row.allocatedAmount || 0) > 0 ? `Còn ${formatMoney(row.remainingAmount)}` : " "}</span>
        </div>
      ),
    },
  ];

  const matchedColumns: ColumnsType<BankTransactionItem> = [
    ...baseColumns,
    {
      title: "Hồ sơ chi",
      key: "match",
      width: 330,
      render: (_, row) => {
        const matches = recognitionById.get(row.id)?.paymentMatches ?? [];
        const current = matchOf(row);
        const diff = current ? current.remaining - Number(row.remainingAmount ?? row.amount) : 0;
        return (
          <div className="data-grid-stack">
            <Select
              size="small"
              value={current ? matchKey(current) : undefined}
              onChange={(value) => setPicked((state) => ({ ...state, [row.id]: value }))}
              style={{ width: "100%" }}
              options={matches.map((match) => ({ value: matchKey(match), label: `${match.orderNo} · ${matchLabel(match)}` }))}
            />
            <span className="data-grid-clip data-grid-sub" style={Math.abs(diff) >= 0.5 ? { color: "#c77700" } : undefined}>
              {Math.abs(diff) < 0.5 ? "Khớp đúng số tiền" : diff > 0 ? `Hồ sơ còn ${formatMoney(diff)} chưa trả sau lần này` : `Tiền ra lớn hơn hồ sơ ${formatMoney(-diff)}`}
            </span>
          </div>
        );
      },
    },
    {
      title: "",
      key: "action",
      width: 92,
      align: "right",
      fixed: "right",
      render: (_, row) => {
        const match = matchOf(row);
        const blocked = match?.type === "TERM_BATCH_ITEM" && !match.hasUnc;
        return (
          <Tooltip title={blocked ? "Bảng kê chưa có UNC — tải UNC ở Chi tiền → Mua Term trước" : undefined}>
            <Button size="small" type="primary" disabled={!match || blocked} loading={applyMatch.isPending} onClick={() => confirmMatches([row])}>
              {match?.type === "COMMERCIAL_REQUEST" ? "Ghi nhận" : "Khớp"}
            </Button>
          </Tooltip>
        );
      },
    },
  ];

  const internalColumns: ColumnsType<BankTransactionItem> = [
    ...baseColumns,
    { title: "Nhận diện", key: "recognition", width: 230, render: (_, row) => <RecognitionTag recognition={recognitionById.get(row.id)} /> },
    {
      title: "Dòng đối ứng",
      key: "pair",
      width: 190,
      render: (_, row) => {
        const pair = recognitionById.get(row.id)?.pairedTransaction;
        if (!pair) return <span className="data-grid-empty">Chưa thấy (chưa import tài khoản kia?)</span>;
        return (
          <div className="data-grid-stack">
            <span className="data-grid-clip">{pair.bankCode} · {pair.accountNo}</span>
            <span className="data-grid-clip data-grid-sub">{dayjs(pair.txnDate).format("DD/MM HH:mm")}{pair.reconciliationStatus === "IGNORED" ? " · đã xác nhận" : ""}</span>
          </div>
        );
      },
    },
  ];

  const otherColumns: ColumnsType<BankTransactionItem> = [
    ...baseColumns,
    { title: "Nhận diện", key: "recognition", width: 260, render: (_, row) => <RecognitionTag recognition={recognitionById.get(row.id)} /> },
    {
      title: "",
      key: "action",
      width: 92,
      align: "right",
      render: (_, row) => (
        <Button size="small" onClick={() => onOpenDetail(row)}>
          Xử lý
        </Button>
      ),
    },
  ];

  const doneColumns: ColumnsType<BankTransactionItem> = [
    ...baseColumns,
    {
      title: "Kết quả",
      key: "result",
      width: 260,
      render: (_, row: any) => (
        <div className="data-grid-stack">
          <span className="data-grid-clip data-grid-strong">{row.reconciliationStatus === "IGNORED" ? "Đã bỏ qua" : "Đã khớp hồ sơ chi"}</span>
          <span className="data-grid-clip data-grid-sub">{row.ignoredReason || (Number(row.allocatedAmount) ? `Đã khớp ${formatMoney(row.allocatedAmount)}` : "—")}</span>
        </div>
      ),
    },
    {
      /* Đánh dấu nhầm là nội bộ / phí thì khôi phục để xử lý lại; dòng đã khớp hồ sơ thì đảo ở nơi khớp. */
      title: "",
      key: "action",
      width: 110,
      align: "right",
      render: (_, row: any) =>
        row.reconciliationStatus === "IGNORED" ? (
          <Button size="small" loading={restore.isPending} onClick={() => restore.mutate(row.id)}>
            Khôi phục
          </Button>
        ) : null,
    },
  ];

  const exactRows = groups.matched.filter(isExact);
  const undeclared = [...new Set(groups.internal.map((row) => recognitionById.get(row.id)?.undeclaredCompanyAccount).filter(Boolean))];

  return (
    <>
      <BankingKpis
        activeKey={group}
        items={[
          { key: "matched", label: "Khớp được hồ sơ chi", value: groups.matched.length, hint: `${formatMoney(sum(groups.matched))} đ · theo mã đơn`, color: "#1d7a3a", onClick: () => { setGroup("matched"); setSelectedKeys([]); } },
          { key: "internal", label: "Nội bộ / phí NH", value: groups.internal.length, hint: `${formatMoney(sum(groups.internal))} đ`, onClick: () => { setGroup("internal"); setSelectedKeys([]); } },
          { key: "other", label: "Chưa rõ hồ sơ", value: groups.other.length, hint: "Chi khác, hoặc nội dung không có mã đơn", warning: groups.other.length > 0, onClick: () => { setGroup("other"); setSelectedKeys([]); } },
          { key: "done", label: "Đã xử lý", value: groups.done.length, hint: "Đã khớp hoặc đã bỏ qua", onClick: () => { setGroup("done"); setSelectedKeys([]); } },
        ]}
      />
      <div className="table-filter-toolbar" style={{ marginBottom: 0 }}>
        <div className="table-filter-toolbar-left">
          <Input.Search size="small" allowClear placeholder="Nội dung, mã đơn, người nhận" onSearch={setKeyword} onChange={(event) => { if (!event.target.value) setKeyword(""); }} className="page-shell-search" />
          <Select
            size="small"
            allowClear
            placeholder="Tất cả tài khoản"
            value={bankAccountId}
            onChange={setBankAccountId}
            style={{ width: 210 }}
            options={((accountsQuery.data ?? []) as any[]).map((item) => ({ value: item.id, label: `${accountText(item)}${item.accountName ? ` — ${item.accountName}` : ""}` }))}
          />
        </div>
        <div className="table-filter-toolbar-right">
          {recognitionQuery.isFetching ? <span className="banking-hint">Đang nhận diện…</span> : null}
          <RefreshButton loading={txQuery.isFetching} onClick={() => { txQuery.refetch(); recognitionQuery.refetch(); }} />
        </div>
      </div>

      {group === "internal" && undeclared.length ? (
        <Alert
          type="warning"
          showIcon
          message={`Tài khoản ${undeclared.join(", ")} có vẻ là của công ty nhưng chưa khai báo`}
          description={<>Khai báo ở <Link to="/bank-accounts">Tài khoản công ty</Link> để nhận ra chuyển nội bộ theo số tài khoản.</>}
        />
      ) : null}
      {group === "other" && groups.other.length ? (
        <div className="banking-hint">
          Chi ngoài mua hàng (nội bộ, tài sản, thuế phí…) ghép ở tab <b>Đối soát chi khác</b>; dòng còn lại bấm "Xử lý" để khớp với công nợ NCC.
        </div>
      ) : null}

      {selectedRows.length ? (
        <div className="banking-bulkbar">
          <span className="banking-bulkbar-count">Đã chọn {selectedRows.length} giao dịch · {formatMoney(sum(selectedRows))} đ</span>
          {group === "internal" ? (
            <>
              <Checkbox checked={withPairs} onChange={(event) => setWithPairs(event.target.checked)}>Kèm dòng đối ứng</Checkbox>
              <Button size="small" type="primary" loading={ignoreMany.isPending} onClick={() => confirmInternal(selectedRows)}>Xác nhận chuyển nội bộ / phí</Button>
            </>
          ) : (
            <Button size="small" type="primary" loading={applyMatch.isPending} onClick={() => confirmMatches(selectedRows)}>Khớp {selectedRows.length} giao dịch</Button>
          )}
          <Button size="small" type="text" onClick={() => setSelectedKeys([])}>Bỏ chọn</Button>
        </div>
      ) : group === "matched" && exactRows.length ? (
        <div className="banking-bulkbar">
          <span className="banking-bulkbar-count">{exactRows.length} giao dịch khớp đúng số tiền · {formatMoney(sum(exactRows))} đ</span>
          <Button size="small" type="primary" loading={applyMatch.isPending} onClick={() => confirmMatches(exactRows)}>Khớp tất cả</Button>
        </div>
      ) : group === "internal" && groups.internal.length ? (
        <div className="banking-bulkbar">
          <span className="banking-bulkbar-count">{groups.internal.length} giao dịch nội bộ / phí</span>
          <Checkbox checked={withPairs} onChange={(event) => setWithPairs(event.target.checked)}>Kèm dòng đối ứng</Checkbox>
          <Button size="small" type="primary" loading={ignoreMany.isPending} onClick={() => confirmInternal(groups.internal)}>Xác nhận tất cả</Button>
        </div>
      ) : null}

      <Table
        className="data-grid"
        rowKey="id"
        size="small"
        loading={txQuery.isLoading || (recognitionQuery.isLoading && pendingRows.length > 0)}
        columns={group === "matched" ? matchedColumns : group === "internal" ? internalColumns : group === "done" ? doneColumns : otherColumns}
        dataSource={visible}
        rowSelection={group === "other" || group === "done" ? undefined : { selectedRowKeys: selectedKeys, onChange: setSelectedKeys }}
        pagination={{ pageSize: 30, showSizeChanger: false, hideOnSinglePage: true, showTotal: (count) => `${count} giao dịch` }}
        scroll={{ x: 1000 }}
        locale={{
          emptyText:
            group === "matched" ? "Không có tiền ra nào khớp được hồ sơ chi theo mã đơn" : group === "internal" ? "Không có chuyển nội bộ / phí chờ xác nhận" : group === "done" ? "Chưa có tiền ra đã xử lý" : "Không còn tiền ra chưa rõ hồ sơ",
        }}
      />

    </>
  );
}
