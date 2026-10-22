import { useMemo, useState } from "react";
import { Alert, Button, DatePicker, Drawer, Empty, Select, Table, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { DownloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { Link } from "react-router-dom";
import { useCashLedger, useCashPosition } from "../hooks";
import type { CashAccountRow, CashLedger } from "../types";
import "../../../shared/ui/data-grid.css";
import "../../../shared/ui/table-filter.css";
import { RECONCILIATION_STATUS, dateText, downloadCsv, formatMoney, statusTag } from "../lib/format";
import "../banking.css";

const { RangePicker } = DatePicker;

/* Sao kê cũ hơn ngần này ngày thì số dư không còn đáng tin: có thể đã có giao dịch chưa nhập. */
const STALE_AFTER_DAYS = 3;
const COMPACT_ALERT = { padding: "4px 10px", fontSize: 12 } as const;
const UPCOMING_OPTIONS =[7, 14, 30].map((value) => ({ value, label: `Sắp chi ${value} ngày tới` }));

const signed = (value: number) => `${value > 0 ? "+" : value < 0 ? "−" : ""}${formatMoney(Math.abs(value))}`;
const changeClass = (value: number) => (value > 0 ? "cash-up" : value < 0 ? "cash-down" : undefined);
const num = (value: number, negativeRed = true) => (
  <span className="data-grid-num" style={negativeRed && value < 0 ? { color: "#c0392b" } : undefined}>{formatMoney(value)}</span>
);

function staleness(lastTransactionDate: string | null, asOf: string) {
  if (!lastTransactionDate) return { text: "Chưa có sao kê", stale: true };
  const days = dayjs(asOf).diff(dayjs(lastTransactionDate), "day");
  return { text: `Sao kê đến ${dateText(lastTransactionDate)}`, stale: days > STALE_AFTER_DAYS };
}

export function BankCashPositionPanel() {
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().startOf("month"), dayjs().endOf("day")]);
  const [upcomingDays, setUpcomingDays] = useState(7);
  const [bankFilter, setBankFilter] = useState<string>();
  const [ledgerAccount, setLedgerAccount] = useState<CashAccountRow | null>(null);
  const period = { fromDate: range[0].format("YYYY-MM-DD"), toDate: range[1].format("YYYY-MM-DD") };
  const query = useCashPosition({ ...period, upcomingDays });
  const data = query.data;

  const accounts = useMemo(
    () => (data?.accounts ?? []).filter((row) => !bankFilter || row.bankCode === bankFilter),
    [data?.accounts, bankFilter],
  );
  const total = (pick: (row: CashAccountRow) => number) => accounts.reduce((sum, row) => sum + pick(row), 0);
  const shortAccounts = (data?.accounts ?? []).filter((row) => row.projected < 0);

  const exportCsv = () => {
    if (!data) return;
    downloadCsv(`tien-tai-ngan-hang-${data.asOf.replaceAll("-", "")}.csv`, [
      ["Ngân hàng", "Số tài khoản", "Tên tài khoản", "Đầu kỳ", "Tiền vào", "Tiền ra", "Hiện có", `Sắp chi ${data.upcomingDays} ngày`, "Giải ngân sắp tới", "Còn lại dự kiến", "Sao kê đến", "Chưa đối soát"],
      ...data.accounts.map((row) => [
        row.bankCode, row.accountNo, row.accountName ?? "", row.periodOpening, row.periodIncoming, row.periodOutgoing, row.current,
        row.upcomingTransfer, row.upcomingDisbursement, row.projected, row.lastTransactionDate ?? "", row.pendingReconciliation,
      ]),
    ]);
  };

  const columns: ColumnsType<CashAccountRow> = [
    {
      title: "Tài khoản", key: "account", width: 240, fixed: "left",
      render: (_, row) => (
        <div className="data-grid-stack">
          <span className="data-grid-clip data-grid-strong">{row.bankCode} · {row.accountNo}</span>
          <span className="data-grid-clip data-grid-sub">
            {row.hasOpening ? row.accountName || "—" : <span style={{ color: "#b7791f" }}>Chưa có số dư đầu kỳ</span>}
          </span>
        </div>
      ),
    },
    { title: "Đầu kỳ", dataIndex: "periodOpening", width: 150, align: "right", render: (value) => num(value) },
    { title: "Tiền vào", dataIndex: "periodIncoming", width: 150, align: "right", render: (value) => num(value, false) },
    { title: "Tiền ra", dataIndex: "periodOutgoing", width: 150, align: "right", render: (value) => num(value, false) },
    {
      title: "Hiện có", dataIndex: "current", width: 165, align: "right",
      render: (value) => <b>{num(value)}</b>,
    },
    {
      /* Chỉ tính các đợt chuyển khoản của kế hoạch đã duyệt. Đợt giải ngân có tiền vay bù vào nên
         hiện riêng ở dòng phụ, không trừ vào tiền sẵn có. */
      title: `Sắp chi ${data?.upcomingDays ?? upcomingDays} ngày`, key: "upcoming", width: 165, align: "right",
      render: (_, row) => (
        <div className="data-grid-stack">
          <span className="data-grid-num">{row.upcomingTransfer ? formatMoney(row.upcomingTransfer) : "—"}</span>
          {row.upcomingDisbursement ? <span className="data-grid-sub">Giải ngân {formatMoney(row.upcomingDisbursement)}</span> : null}
          {row.upcomingOverdueCount ? <span className="data-grid-sub" style={{ color: "#c0392b" }}>{row.upcomingOverdueCount} đợt quá hạn</span> : null}
        </div>
      ),
    },
    {
      title: "Còn lại dự kiến", dataIndex: "projected", width: 165, align: "right",
      render: (value: number) => (value < 0 ? <Tooltip title="Tiền hiện có không đủ cho các đợt sắp chi"><b>{num(value)}</b></Tooltip> : num(value)),
    },
    {
      title: "Sao kê", key: "statement", width: 170,
      render: (_, row) => {
        const state = staleness(row.lastTransactionDate, data?.asOf ?? dayjs().format("YYYY-MM-DD"));
        return (
          <div className="data-grid-stack">
            <span className="data-grid-clip" style={state.stale ? { color: "#b7791f" } : undefined}>{state.text}</span>
            {row.pendingReconciliation ? <span className="data-grid-sub">{row.pendingReconciliation} dòng chưa đối soát</span> : null}
          </div>
        );
      },
    },
  ];

  return (
    <>
      {/* Cảnh báo một dòng, gọn: màn này để xem số, không để đọc thông báo. */}
      {data && data.totals.missingOpeningCount ? (
        <Alert
          type="warning"
          showIcon
          style={COMPACT_ALERT}
          message={<>{data.totals.missingOpeningCount} tài khoản chưa có số dư đầu kỳ, số đang hiện chỉ là tiền vào trừ tiền ra. <Link to="/settings/opening-balances">Nhập số dư đầu kỳ</Link></>}
        />
      ) : null}
      {shortAccounts.length ? (
        <Alert
          type="error"
          showIcon
          style={COMPACT_ALERT}
          message={`Không đủ tiền cho các đợt sắp chi: ${shortAccounts.map((row) => `${row.bankCode} · ${row.accountNo} thiếu ${formatMoney(-row.projected)}`).join("; ")}`}
        />
      ) : null}

      <div className="cash-hero">
        <div>
          <div className="cash-hero-label">Tổng tiền hiện có tại ngân hàng{data ? ` · tính đến ${dateText(data.asOf)}` : ""}</div>
          <div className="cash-hero-value">{formatMoney(data?.totals.current)}<small>đ</small></div>
        </div>
        {data ? (
          <div className="cash-hero-facts">
            <span>Hôm nay: <b className={changeClass(data.totals.changeToday)}>{signed(data.totals.changeToday)}</b></span>
            <span>Từ đầu tháng: <b className={changeClass(data.totals.changeThisMonth)}>{signed(data.totals.changeThisMonth)}</b></span>
            <span>Sắp chi {data.upcomingDays} ngày: <b>{formatMoney(data.totals.upcomingTransfer)}</b></span>
            <span>Còn lại dự kiến: <b className={data.totals.projected < 0 ? "cash-down" : undefined}>{formatMoney(data.totals.projected)}</b></span>
          </div>
        ) : null}
      </div>

      {/* Bấm một ngân hàng để chỉ xem các tài khoản của ngân hàng đó; bấm lại để bỏ lọc. */}
      <div className="cash-bank-cards">
        {/* Thẻ tổng chung đứng đầu; bấm vào để bỏ lọc và xem tất cả tài khoản. */}
        {data ? (
          <button type="button" className={`cash-bank-card${bankFilter ? "" : " is-active"}`} onClick={() => setBankFilter(undefined)}>
            <span className="cash-bank-name">Tất cả ngân hàng</span>
            <span className="cash-bank-value" style={data.totals.current < 0 ? { color: "#c0392b" } : undefined}>{formatMoney(data.totals.current)}</span>
            <span className="cash-bank-meta">{data.banks.length} ngân hàng · {data.accounts.length} tài khoản</span>
            <span className="cash-bank-meta">{data.totals.upcomingTransfer ? `Sắp chi ${formatMoney(data.totals.upcomingTransfer)}` : "Chưa có đợt sắp chi"}</span>
          </button>
        ) : null}
        {(data?.banks ?? []).map((bank) => {
          const state = staleness(bank.lastTransactionDate, data!.asOf);
          return (
            <button key={bank.bankCode} type="button" className={`cash-bank-card${bankFilter === bank.bankCode ? " is-active" : ""}`} onClick={() => setBankFilter(bankFilter === bank.bankCode ? undefined : bank.bankCode)}>
              <span className="cash-bank-name">{bank.bankCode}{bank.bankName ? ` · ${bank.bankName}` : ""}</span>
              <span className="cash-bank-value" style={bank.current < 0 ? { color: "#c0392b" } : undefined}>{formatMoney(bank.current)}</span>
              <span className="cash-bank-meta">{bank.accountCount} tài khoản{bank.upcomingTransfer ? ` · sắp chi ${formatMoney(bank.upcomingTransfer)}` : ""}</span>
              <span className={`cash-bank-meta${state.stale ? " is-stale" : ""}`}>{state.stale ? "⚠ " : ""}{state.text}</span>
            </button>
          );
        })}
      </div>

      <div className="table-filter-toolbar" style={{ marginBottom: 0 }}>
        <div className="table-filter-toolbar-left">
          <RangePicker
            size="small"
            allowClear={false}
            format="DD/MM/YYYY"
            value={range}
            onChange={(value) => value?.[0] && value?.[1] && setRange([value[0], value[1]])}
            presets={[
              { label: "Hôm nay", value: [dayjs().startOf("day"), dayjs().endOf("day")] },
              { label: "Tháng này", value: [dayjs().startOf("month"), dayjs().endOf("day")] },
              { label: "Tháng trước", value: [dayjs().subtract(1, "month").startOf("month"), dayjs().subtract(1, "month").endOf("month")] },
              { label: "Năm nay", value: [dayjs().startOf("year"), dayjs().endOf("day")] },
            ]}
          />
          <Select size="small" value={upcomingDays} onChange={setUpcomingDays} options={UPCOMING_OPTIONS} style={{ width: 180 }} />
          {bankFilter ? <Tag closable onClose={() => setBankFilter(undefined)}>Ngân hàng: {bankFilter}</Tag> : null}
        </div>
        <div className="table-filter-toolbar-right">
          <Button size="small" icon={<DownloadOutlined />} onClick={exportCsv} disabled={!data?.accounts.length}>Xuất Excel</Button>
        </div>
      </div>

      <Table<CashAccountRow>
        className="data-grid"
        size="small"
        rowKey="bankAccountId"
        loading={query.isLoading}
        dataSource={accounts}
        columns={columns}
        pagination={false}
        scroll={{ x: 1350 }}
        onRow={(row) => ({ onClick: () => setLedgerAccount(row), style: { cursor: "pointer" } })}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có tài khoản ngân hàng nào đang dùng" /> }}
        summary={() =>
          accounts.length ? (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}><b>{bankFilter ? `Tổng ${bankFilter}` : "Tổng cộng"}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right"><b>{num(total((row) => row.periodOpening))}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right"><b>{num(total((row) => row.periodIncoming), false)}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right"><b>{num(total((row) => row.periodOutgoing), false)}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="right"><b>{num(total((row) => row.current))}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="right"><b>{num(total((row) => row.upcomingTransfer), false)}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={6} align="right"><b>{num(total((row) => row.projected))}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={7} />
            </Table.Summary.Row>
          ) : null
        }
      />

      <CashLedgerDrawer account={ledgerAccount} period={period} onClose={() => setLedgerAccount(null)} />
    </>
  );
}

/* Sổ chi tiết một tài khoản: số dư đầu kỳ xem, từng giao dịch và số dư sau giao dịch đó. */
function CashLedgerDrawer({ account, period, onClose }: { account: CashAccountRow | null; period: { fromDate: string; toDate: string }; onClose: () => void }) {
  const query = useCashLedger(account?.bankAccountId, period);
  const ledger = query.data;
  type Row = CashLedger["transactions"][number];
  const columns: ColumnsType<Row> = [
    { title: "Ngày", dataIndex: "txnDate", width: 130, render: (value) => dayjs(value).format("DD/MM/YYYY HH:mm") },
    {
      title: "Nội dung", dataIndex: "description",
      render: (value, row) => (
        <div className="data-grid-stack">
          <span className="data-grid-clip">{value}</span>
          {row.counterpartyName ? <span className="data-grid-clip data-grid-sub">{row.counterpartyName}</span> : null}
        </div>
      ),
    },
    { title: "Tiền vào", key: "in", width: 150, align: "right", render: (_, row) => (row.direction === "IN" ? <span className="data-grid-num cash-up">{formatMoney(row.amount)}</span> : "") },
    { title: "Tiền ra", key: "out", width: 150, align: "right", render: (_, row) => (row.direction === "OUT" ? <span className="data-grid-num cash-down">{formatMoney(row.amount)}</span> : "") },
    { title: "Số dư", dataIndex: "balanceAfter", width: 165, align: "right", render: (value) => <b>{num(value)}</b> },
    { title: "Đối soát", dataIndex: "reconciliationStatus", width: 140, render: (value) => statusTag(RECONCILIATION_STATUS, value ?? "PENDING") },
  ];

  return (
    <Drawer open={Boolean(account)} onClose={onClose} width={1080} destroyOnClose title={account ? `Sổ chi tiết · ${account.bankCode} · ${account.accountNo}` : ""}>
      {ledger ? (
        <>
          {!ledger.hasOpening ? (
            <Alert type="warning" showIcon style={{ ...COMPACT_ALERT, marginBottom: 8 }} message="Tài khoản chưa có số dư đầu kỳ, cột số dư chỉ cộng dồn tiền vào trừ tiền ra." />
          ) : null}
          {ledger.truncated ? (
            <Alert type="warning" showIcon style={{ ...COMPACT_ALERT, marginBottom: 8 }} message="Kỳ này có quá nhiều giao dịch, sổ chỉ hiện 2.000 dòng đầu. Thu hẹp khoảng ngày để xem đủ." />
          ) : null}
          <div className="cash-hero" style={{ marginBottom: 12 }}>
            <div>
              <div className="cash-hero-label">Số dư cuối {dateText(ledger.toDate)}</div>
              <div className="cash-hero-value" style={{ fontSize: 24 }}>{formatMoney(ledger.closingBalance)}<small>đ</small></div>
            </div>
            <div className="cash-hero-facts">
              <span>Số dư đầu {dateText(ledger.fromDate)}: <b>{formatMoney(ledger.openingBalance)}</b></span>
              <span>{ledger.transactions.length} giao dịch</span>
              {ledger.opening ? <span>Số dư đầu kỳ theo đợt {ledger.opening.batchNo}, chốt {dateText(ledger.opening.cutoverDate)}</span> : null}
            </div>
          </div>
        </>
      ) : null}
      <Table<Row>
        className="data-grid"
        size="small"
        rowKey="id"
        loading={query.isLoading}
        dataSource={ledger?.transactions ?? []}
        columns={columns}
        pagination={{ pageSize: 50, hideOnSinglePage: true, showSizeChanger: false }}
        scroll={{ x: 900 }}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có giao dịch trong kỳ" /> }}
      />
    </Drawer>
  );
}
