import React, { useMemo, useState } from "react";
import { Alert, Button, DatePicker, Select, Table, Tag } from "antd";
import { ArrowDownOutlined, ArrowUpOutlined, ClockCircleOutlined, DownloadOutlined, SwapOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { useBankAccountsOptions, useBankTransactions } from "../hooks";
import type { BankTransactionItem } from "../types";
import { PageHeader } from "../../../shared/ui/PageHeader";
import "../../../shared/ui/data-grid.css";
import "../../../shared/ui/table-filter.css";
import { RECONCILIATION_STATUS, accountText, downloadCsv, formatMoney, isReconciled } from "../lib/format";
import { BankingKpis } from "./BankingKpis";

const { RangePicker } = DatePicker;
const REPORT_LIMIT = 1000;

type AccountRow = { key: string; account: string; incoming: number; outgoing: number; count: number; pending: number };

/* embedded: nằm trong một tab của trang báo cáo, nên bỏ khung trang và tiêu đề riêng. */
export function BankingReportPanel({ embedded = false }: { embedded?: boolean }) {
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().startOf("month"), dayjs().endOf("day")]);
  const [bankAccountId, setBankAccountId] = useState<string>();
  const accountsQuery = useBankAccountsOptions();
  const query = useBankTransactions({
    page: 1,
    pageSize: REPORT_LIMIT,
    confirmed: "",
    bankAccountId,
    fromDate: range[0].format("YYYY-MM-DD"),
    toDate: range[1].format("YYYY-MM-DD"),
  });
  const rows = useMemo(() => query.data?.data ?? [], [query.data]);
  const total = query.data?.meta?.total ?? rows.length;

  const summary = useMemo(() => {
    const incoming = rows.filter((row) => row.direction === "IN").reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const outgoing = rows.filter((row) => row.direction === "OUT").reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const pending = rows.filter((row) => !isReconciled(row.reconciliationStatus)).length;
    return { incoming, outgoing, net: incoming - outgoing, pending };
  }, [rows]);

  const byAccount = useMemo(() => {
    const grouped = new Map<string, AccountRow>();
    rows.forEach((row) => {
      const key = row.bankAccountId;
      const current = grouped.get(key) ?? { key, account: row.bankAccount ? accountText(row.bankAccount) : key, incoming: 0, outgoing: 0, count: 0, pending: 0 };
      current[row.direction === "IN" ? "incoming" : "outgoing"] += Number(row.amount || 0);
      current.count += 1;
      if (!isReconciled(row.reconciliationStatus)) current.pending += 1;
      grouped.set(key, current);
    });
    return [...grouped.values()];
  }, [rows]);

  const exportCsv = () => {
    downloadCsv(`bao-cao-ngan-hang-${range[0].format("YYYYMMDD")}-${range[1].format("YYYYMMDD")}.csv`, [
      ["Ngày", "Tài khoản", "Chiều", "Số tiền", "Đối tác", "Nội dung", "Trạng thái đối soát"],
      ...rows.map((row: BankTransactionItem) => [
        dayjs(row.txnDate).format("DD/MM/YYYY HH:mm"),
        row.bankAccount ? `${row.bankAccount.bankCode} ${row.bankAccount.accountNo}` : "",
        row.direction === "IN" ? "Thu" : "Chi",
        row.amount,
        row.counterpartyName ?? "",
        row.description,
        RECONCILIATION_STATUS[row.reconciliationStatus ?? "PENDING"]?.label ?? row.reconciliationStatus,
      ]),
    ]);
  };

  const totals: AccountRow = byAccount.reduce(
    (acc, row) => ({ ...acc, incoming: acc.incoming + row.incoming, outgoing: acc.outgoing + row.outgoing, count: acc.count + row.count, pending: acc.pending + row.pending }),
    { key: "total", account: "Tổng cộng", incoming: 0, outgoing: 0, count: 0, pending: 0 },
  );
  const num = (value: number) => <span className="data-grid-num">{formatMoney(value)}</span>;

  const exportButton = <Button size="small" icon={<DownloadOutlined />} onClick={exportCsv} disabled={!rows.length}>Xuất Excel</Button>;
  const Shell = embedded ? React.Fragment : PageShell;

  return (
    <Shell>
      {embedded ? null : (
        <PageHeader
          title="Báo cáo dòng tiền"
          subtitle="Tổng hợp tiền vào, tiền ra theo tài khoản và tình trạng đối soát trong kỳ."
          actions={exportButton}
        />
      )}
      <div className="table-filter-toolbar" style={{ marginBottom: 0 }}>
        <div className="table-filter-toolbar-left">
          <RangePicker
            size="small"
            allowClear={false}
            format="DD/MM/YYYY"
            value={range}
            onChange={(value) => value?.[0] && value?.[1] && setRange([value[0], value[1]])}
            presets={[
              { label: "Tháng này", value: [dayjs().startOf("month"), dayjs().endOf("day")] },
              { label: "Tháng trước", value: [dayjs().subtract(1, "month").startOf("month"), dayjs().subtract(1, "month").endOf("month")] },
              { label: "Quý này", value: [dayjs().startOf("month").subtract(dayjs().month() % 3, "month"), dayjs().endOf("day")] },
              { label: "Năm nay", value: [dayjs().startOf("year"), dayjs().endOf("day")] },
            ]}
          />
          <Select
            size="small"
            allowClear
            placeholder="Tất cả tài khoản"
            value={bankAccountId}
            onChange={setBankAccountId}
            style={{ width: 220 }}
            options={((accountsQuery.data ?? []) as any[]).map((item) => ({ value: item.id, label: `${accountText(item)}${item.accountName ? ` — ${item.accountName}` : ""}` }))}
          />
        </div>
        {embedded ? <div className="table-filter-toolbar-right">{exportButton}</div> : null}
      </div>
      {total > rows.length ? (
        <Alert type="warning" showIcon message={`Kỳ này có ${total} giao dịch, báo cáo đang tính trên ${rows.length} giao dịch mới nhất. Thu hẹp khoảng ngày để số liệu đầy đủ.`} />
      ) : null}
      <BankingKpis
        items={[
          { key: "in", label: "Tổng tiền vào", value: formatMoney(summary.incoming), icon: <ArrowDownOutlined />, color: "#1d7a3a" },
          { key: "out", label: "Tổng tiền ra", value: formatMoney(summary.outgoing), icon: <ArrowUpOutlined />, color: "#c0392b" },
          { key: "net", label: "Dòng tiền thuần", value: <span style={{ color: summary.net < 0 ? "#c0392b" : "#1d7a3a" }}>{formatMoney(summary.net)}</span>, icon: <SwapOutlined />, color: "#3b6fd4" },
          { key: "pending", label: "Chưa đối soát", value: summary.pending, hint: `trên ${rows.length} giao dịch`, icon: <ClockCircleOutlined />, color: "#b7791f", warning: summary.pending > 0 },
        ]}
      />
      <Table<AccountRow>
        className="data-grid"
        size="small"
        rowKey="key"
        loading={query.isLoading}
        dataSource={byAccount}
        pagination={false}
        columns={[
          { title: "Tài khoản", dataIndex: "account" },
          { title: "Số GD", dataIndex: "count", align: "right", width: 90 },
          { title: "Tiền vào", dataIndex: "incoming", align: "right", width: 160, render: num },
          { title: "Tiền ra", dataIndex: "outgoing", align: "right", width: 160, render: num },
          { title: "Thuần", align: "right", width: 160, render: (_value, row) => <span className="data-grid-num" style={{ color: row.incoming - row.outgoing < 0 ? "#c0392b" : undefined }}>{formatMoney(row.incoming - row.outgoing)}</span> },
          { title: "Chưa đối soát", dataIndex: "pending", align: "center", width: 120, render: (value) => <Tag color={value ? "orange" : "green"}>{value}</Tag> },
        ]}
        summary={() =>
          byAccount.length > 1 ? (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}><b>{totals.account}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right"><b>{totals.count}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right"><b>{num(totals.incoming)}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right"><b>{num(totals.outgoing)}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="right"><b>{num(totals.incoming - totals.outgoing)}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="center"><b>{totals.pending}</b></Table.Summary.Cell>
            </Table.Summary.Row>
          ) : null
        }
      />
    </Shell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return <div className="page-shell">{children}</div>;
}
