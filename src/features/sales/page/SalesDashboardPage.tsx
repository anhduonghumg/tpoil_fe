import { useMemo, useState } from "react";
import { Button, Select, Tag, Tooltip, Typography } from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  AuditOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  DatabaseOutlined,
  DollarOutlined,
  ExclamationCircleOutlined,
  FileSyncOutlined,
  FileTextOutlined,
  MinusOutlined,
  ReloadOutlined,
  RightOutlined,
  RiseOutlined,
  ThunderboltOutlined,
  TruckOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useDepartmentWorkspaceContext } from "../../workspaces/context";
import { useSalesDashboard } from "../hooks";
import { ORDER_STATUS_LABELS } from "../ui/labels";
import type { SalesDashboard, SalesOrderStatus } from "../types";
import "../sales-dashboard.css";

/* ------------------------------------------------------------------ */
/* Định dạng                                                           */
/* ------------------------------------------------------------------ */

const intFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });

const count = (value: number | undefined) => intFormat.format(value ?? 0);

/** Tiền tỷ đọc bằng mắt nhanh hơn 12 chữ số, nên rút gọn ở chỗ trưng bày. */
function compactMoney(value: number | undefined) {
  const amount = Number(value ?? 0);
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) return `${oneDecimal.format(amount / 1_000_000_000)} tỷ`;
  if (abs >= 1_000_000) return `${oneDecimal.format(amount / 1_000_000)} tr`;
  return intFormat.format(amount);
}

const fullMoney = (value: number | undefined) => `${intFormat.format(Number(value ?? 0))} đ`;

const dayLabel = (iso: string) => {
  const [, month, day] = iso.split("-");
  return `${day}/${month}`;
};

const todayLabel = () =>
  new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());

/* ------------------------------------------------------------------ */
/* Ô chỉ số                                                            */
/* ------------------------------------------------------------------ */

function Delta({ current, previous }: { current: number; previous: number }) {
  if (!previous) {
    return (
      <span className="sd-delta is-flat">
        <MinusOutlined /> chưa có kỳ trước
      </span>
    );
  }
  const ratio = ((current - previous) / Math.abs(previous)) * 100;
  const rounded = Math.round(ratio);
  if (rounded === 0) {
    return (
      <span className="sd-delta is-flat">
        <MinusOutlined /> đi ngang
      </span>
    );
  }
  return (
    <span className={`sd-delta ${rounded > 0 ? "is-up" : "is-down"}`}>
      {rounded > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
      {Math.abs(rounded)}%
    </span>
  );
}

/** Sparkline 30 điểm: hình dáng xu hướng, không phải để đọc giá trị. */
function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const max = Math.max(...points, 1);
  const width = 100;
  const height = 22;
  const step = width / (points.length - 1);
  const path = points
    .map((value, index) => {
      const x = index * step;
      const y = height - (value / max) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg
      className="sd-kpi-spark"
      viewBox={`0 0 ${width} ${height}`}
      height={height}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d={path} className="sd-chart-line" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Biểu đồ doanh thu 30 ngày                                           */
/* ------------------------------------------------------------------ */

type TrendPoint = { date: string; revenue: number };

function RevenueTrendChart({ data }: { data: TrendPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const width = 760;
  const height = 190;
  const padding = { top: 16, right: 16, bottom: 22, left: 16 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const max = Math.max(...data.map((point) => point.revenue), 1);
  const step = data.length > 1 ? plotW / (data.length - 1) : 0;
  const xOf = (index: number) => padding.left + index * step;
  const yOf = (value: number) => padding.top + plotH - (value / max) * plotH;

  const line = data
    .map((point, index) => `${index === 0 ? "M" : "L"}${xOf(index)},${yOf(point.revenue)}`)
    .join(" ");
  const area = data.length
    ? `${line} L${xOf(data.length - 1)},${padding.top + plotH} L${xOf(0)},${
        padding.top + plotH
      } Z`
    : "";

  const last = data[data.length - 1];
  const peakIndex = data.reduce(
    (best, point, index) => (point.revenue > data[best].revenue ? index : best),
    0,
  );
  const active = hover != null ? data[hover] : null;

  if (showTable) {
    return (
      <>
        <table className="sd-mini-table">
          <thead>
            <tr>
              <th>Ngày</th>
              <th>Doanh thu (đ)</th>
            </tr>
          </thead>
          <tbody>
            {data.map((point) => (
              <tr key={point.date}>
                <td>{dayLabel(point.date)}</td>
                <td>{intFormat.format(point.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Button
          type="link"
          size="small"
          className="sd-table-toggle"
          onClick={() => setShowTable(false)}
        >
          Xem biểu đồ
        </Button>
      </>
    );
  }

  return (
    <div className="sd-chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Doanh thu theo ngày, cao nhất ${fullMoney(max)}`}
        onMouseLeave={() => setHover(null)}
      >
        {[0, 0.5, 1].map((ratio) => (
          <line
            key={ratio}
            className="sd-chart-grid"
            x1={padding.left}
            x2={width - padding.right}
            y1={padding.top + plotH * ratio}
            y2={padding.top + plotH * ratio}
          />
        ))}
        <line
          className="sd-chart-baseline"
          x1={padding.left}
          x2={width - padding.right}
          y1={padding.top + plotH}
          y2={padding.top + plotH}
        />

        <path d={area} className="sd-chart-area" />
        <path d={line} className="sd-chart-line" />

        {active ? (
          <line
            className="sd-chart-cursor"
            x1={xOf(hover!)}
            x2={xOf(hover!)}
            y1={padding.top}
            y2={padding.top + plotH}
          />
        ) : null}

        {/* Đỉnh và điểm cuối được gắn nhãn trực tiếp; các điểm khác đọc bằng tooltip. */}
        {data.length ? (
          <circle
            className="sd-chart-dot"
            cx={xOf(data.length - 1)}
            cy={yOf(last.revenue)}
            r={4}
          />
        ) : null}
        {active ? (
          <circle className="sd-chart-dot" cx={xOf(hover!)} cy={yOf(active.revenue)} r={4} />
        ) : null}

        <text className="sd-chart-tick" x={padding.left} y={height - 6}>
          {data.length ? dayLabel(data[0].date) : ""}
        </text>
        {/* Nhãn đỉnh chỉ vẽ khi đủ xa hai đầu, nếu không nó chồng lên nhãn ngày đầu/cuối. */}
        {data.length > 6 && peakIndex > 3 && peakIndex < data.length - 4 ? (
          <text
            className="sd-chart-tick"
            x={xOf(peakIndex)}
            y={height - 6}
            textAnchor="middle"
          >
            {dayLabel(data[peakIndex].date)}
          </text>
        ) : null}
        <text
          className="sd-chart-tick is-end"
          x={width - padding.right}
          y={height - 6}
          textAnchor="end"
        >
          {data.length ? dayLabel(last.date) : ""}
        </text>

        {data.map((point, index) => (
          <rect
            key={point.date}
            className="sd-chart-hit"
            x={xOf(index) - Math.max(step / 2, 12)}
            y={0}
            width={Math.max(step, 24)}
            height={height}
            onMouseEnter={() => setHover(index)}
          />
        ))}
      </svg>

      {active ? (
        <div
          className="sd-tooltip"
          style={{
            // Kẹp trong 8%..92% để hộp không tràn ra ngoài mép thẻ ở hai đầu biểu đồ.
            left: `${Math.min(Math.max((xOf(hover!) / width) * 100, 8), 92).toFixed(2)}%`,
            top: `${((yOf(active.revenue) / height) * 100 - 6).toFixed(2)}%`,
          }}
        >
          <small>Ngày {dayLabel(active.date)}</small>
          <strong>{fullMoney(active.revenue)}</strong>
        </div>
      ) : null}

      <Button
        type="link"
        size="small"
        className="sd-table-toggle"
        onClick={() => setShowTable(true)}
      >
        Xem dạng bảng
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Danh sách thanh ngang                                               */
/* ------------------------------------------------------------------ */

type BarRow = {
  key: string;
  name: string;
  value: number;
  display: string;
  hint?: string;
  href?: string;
};

function BarList({ rows, emptyText }: { rows: BarRow[]; emptyText: string }) {
  const navigate = useNavigate();
  const max = Math.max(...rows.map((row) => row.value), 1);

  if (!rows.length) {
    return <div className="sd-empty-note">{emptyText}</div>;
  }

  return (
    <div className="sd-bar-list">
      {rows.map((row) => (
        <button
          type="button"
          key={row.key}
          className="sd-bar-row"
          disabled={!row.href}
          onClick={() => row.href && navigate(row.href)}
        >
          <span className="sd-bar-head">
            <span className="sd-bar-name">{row.name}</span>
            <span className="sd-bar-value">
              {row.display}
              {row.hint ? <small>{row.hint}</small> : null}
            </span>
          </span>
          <span className="sd-bar-track">
            <span
              className="sd-bar-fill"
              style={{ width: `${Math.max((row.value / max) * 100, row.value ? 3 : 0)}%` }}
            />
          </span>
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Trang                                                               */
/* ------------------------------------------------------------------ */

const PIPELINE_ORDER: SalesOrderStatus[] = [
  "PENDING_REVIEW",
  "CONFIRMED",
  "AWAITING_STOCK",
  "PARTIALLY_RESERVED",
  "RESERVED",
  "WAREHOUSE_PROCESSING",
  "PARTIALLY_DELIVERED",
  "DELIVERED",
  "AWAITING_RECONCILIATION",
  "AWAITING_INVOICE",
];

const EMPTY: SalesDashboard = {
  period: { today: "", monthStart: "", month: 0, year: 0 },
  revenue: {
    month: 0,
    monthInvoices: 0,
    prevMonth: 0,
    prevMonthInvoices: 0,
    today: 0,
    todayInvoices: 0,
    bookedMonth: 0,
    qtyMonth: 0,
    qtyPrevMonth: 0,
    trend: [],
  },
  pipeline: { byStatus: {}, openOrders: 0, ordersCreatedMonth: 0 },
  actions: {
    approvalsPending: 0,
    ordersPendingReview: 0,
    withdrawalsNeedSource: 0,
    withdrawalsPendingReview: 0,
    deliveriesReady: 0,
    deliveriesReturned: 0,
    invoicesDraft: 0,
    invoicesPendingIssue: 0,
    invoicesFailed: 0,
    reconciliationOpen: 0,
  },
  receivables: {
    outstanding: 0,
    outstandingCount: 0,
    overdue: 0,
    overdueCount: 0,
    dueSoon: 0,
    dueSoonCount: 0,
    topDebtors: [],
  },
  topCustomers: [],
  topProducts: [],
  inventory: { sellable: 0, reserved: 0, onHand: 0, items: [] },
};

export default function SalesDashboardPage() {
  const navigate = useNavigate();
  const workspace = useDepartmentWorkspaceContext();
  const { data, isLoading, isFetching, refetch } = useSalesDashboard();
  const dashboard = data ?? EMPTY;
  const { revenue, pipeline, actions, receivables, inventory } = dashboard;

  const priorities = useMemo(
    () =>
      [
        {
          key: "approvals",
          label: "Đơn chờ bạn duyệt",
          value: actions.approvalsPending,
          href: "/sales/approvals",
          tone: "warning" as const,
          icon: <AuditOutlined />,
        },
        {
          key: "need-source",
          label: "Yêu cầu rút chưa có lô nguồn",
          value: actions.withdrawalsNeedSource,
          href: "/sales/withdrawals",
          tone: "critical" as const,
          icon: <ExclamationCircleOutlined />,
        },
        {
          key: "invoice-failed",
          label: "Hóa đơn phát hành lỗi",
          value: actions.invoicesFailed,
          href: "/sales/invoices",
          tone: "critical" as const,
          icon: <WarningOutlined />,
        },
        {
          key: "delivery-returned",
          label: "Phiếu xuất kho trả về",
          value: actions.deliveriesReturned,
          href: "/sales/deliveries",
          tone: "critical" as const,
          icon: <TruckOutlined />,
        },
        {
          key: "withdrawal-review",
          label: "Yêu cầu rút chờ duyệt",
          value: actions.withdrawalsPendingReview,
          href: "/sales/withdrawals",
          tone: "warning" as const,
          icon: <AuditOutlined />,
        },
        {
          key: "delivery-ready",
          label: "Phiếu xuất chờ kho xử lý",
          value: actions.deliveriesReady,
          href: "/sales/deliveries",
          tone: "normal" as const,
          icon: <TruckOutlined />,
        },
        {
          key: "invoice-pending",
          label: "Hóa đơn chờ phát hành",
          value: actions.invoicesPendingIssue + actions.invoicesDraft,
          href: "/sales/invoices",
          tone: "normal" as const,
          icon: <FileTextOutlined />,
        },
        {
          key: "reconciliation",
          label: "Đối soát còn mở",
          value: actions.reconciliationOpen,
          href: "/sales/orders",
          tone: "warning" as const,
          icon: <FileSyncOutlined />,
        },
      ].filter((item) => item.value > 0),
    [actions],
  );

  const pipelineRows = useMemo<BarRow[]>(
    () =>
      PIPELINE_ORDER.map((status) => ({
        key: status,
        name: ORDER_STATUS_LABELS[status] ?? status,
        value: pipeline.byStatus[status] ?? 0,
        display: count(pipeline.byStatus[status]),
        href: "/sales/orders",
      })).filter((row) => row.value > 0),
    [pipeline.byStatus],
  );

  const customerRows = useMemo<BarRow[]>(
    () =>
      dashboard.topCustomers.map((row) => ({
        key: row.customerPartyId,
        name: row.name,
        value: row.revenue,
        display: compactMoney(row.revenue),
        hint: `${count(row.invoices)} HĐ`,
      })),
    [dashboard.topCustomers],
  );

  const productRows = useMemo<BarRow[]>(
    () =>
      dashboard.topProducts.map((row) => ({
        key: row.productId,
        name: row.name,
        value: row.revenue,
        display: compactMoney(row.revenue),
        hint: `${count(row.qty)} lít`,
      })),
    [dashboard.topProducts],
  );

  const debtorRows = useMemo<BarRow[]>(
    () =>
      receivables.topDebtors.map((row) => ({
        key: row.customerPartyId,
        name: row.name,
        value: row.outstanding,
        display: compactMoney(row.outstanding),
        href: "/sales/receivables",
      })),
    [receivables.topDebtors],
  );

  const inTerm = Math.max(receivables.outstanding - receivables.overdue - receivables.dueSoon, 0);
  const debtTotal = Math.max(receivables.outstanding, 1);
  const debtSegments = [
    {
      key: "overdue",
      label: "Quá hạn",
      value: receivables.overdue,
      color: "var(--status-critical)",
      hint: `${count(receivables.overdueCount)} khoản`,
    },
    {
      key: "due-soon",
      label: "Đến hạn trong 7 ngày",
      value: receivables.dueSoon,
      color: "var(--status-warning)",
      hint: `${count(receivables.dueSoonCount)} khoản`,
    },
    {
      key: "in-term",
      label: "Còn trong hạn",
      value: inTerm,
      color: "var(--series-1)",
      hint: "",
    },
  ];

  return (
    <main className={`sales-dashboard ${isLoading ? "is-loading" : ""}`}>
      <header className="sd-header">
        <div>
          <div className="sd-eyebrow">
            <span>Trung tâm bán hàng</span>
            <span>
              <CalendarOutlined /> {todayLabel()}
            </span>
          </div>
          <div className="sd-title-row">
            <Typography.Title level={2}>Tổng quan bán hàng</Typography.Title>
            <Tag>Bán hàng</Tag>
          </div>
          <Typography.Text>
            Doanh số, việc đang tắc và tiền về — theo dõi trên một màn hình.
          </Typography.Text>
        </div>
        <div className="sd-actions">
          {workspace && workspace.workspaces.length > 1 ? (
            <Select
              size="small"
              value={workspace.currentWorkspace.key}
              options={workspace.workspaces.map((item) => ({
                value: item.key,
                label: item.name,
              }))}
              onChange={(key) => {
                workspace.setWorkspaceKey(key);
                navigate("/dashboard");
              }}
              popupMatchSelectWidth={false}
            />
          ) : null}
          <Button
            size="small"
            type="primary"
            icon={<ThunderboltOutlined />}
            onClick={() => navigate("/sales/orders")}
          >
            Nhập đơn nhanh
          </Button>
          <Button size="small" icon={<AuditOutlined />} onClick={() => navigate("/sales/approvals")}>
            Duyệt đơn
          </Button>
          <Tooltip title="Làm mới dữ liệu">
            <Button
              size="small"
              aria-label="Làm mới dữ liệu"
              icon={<ReloadOutlined spin={isFetching} />}
              onClick={() => refetch()}
            />
          </Tooltip>
        </div>
      </header>

      <section className="sd-kpi-strip" aria-label="Chỉ số bán hàng tháng này">
        <article className="sd-kpi">
          <span className="sd-kpi-label">
            <DollarOutlined /> Doanh thu tháng {dashboard.period.month || ""}
          </span>
          <span className="sd-kpi-value">{compactMoney(revenue.month)}</span>
          <Sparkline points={revenue.trend.map((point) => point.revenue)} />
          <span className="sd-kpi-foot">
            <Delta current={revenue.month} previous={revenue.prevMonth} />
            so với tháng trước
          </span>
        </article>

        <article className="sd-kpi">
          <span className="sd-kpi-label">
            <TruckOutlined /> Sản lượng đã giao
          </span>
          <span className="sd-kpi-value">
            {count(revenue.qtyMonth)}
            <span className="sd-kpi-unit">lít</span>
          </span>
          <span className="sd-kpi-foot">
            <Delta current={revenue.qtyMonth} previous={revenue.qtyPrevMonth} />
            phiếu xuất đã ghi sổ trong tháng
          </span>
        </article>

        <article className="sd-kpi">
          <span className="sd-kpi-label">
            <RiseOutlined /> Giá trị đơn đặt trong tháng
          </span>
          <span className="sd-kpi-value">{compactMoney(revenue.bookedMonth)}</span>
          <span className="sd-kpi-foot">
            {count(pipeline.ordersCreatedMonth)} đơn · {count(pipeline.openOrders)} đơn đang chạy
          </span>
        </article>

        <article className="sd-kpi">
          <span className="sd-kpi-label">
            <FileTextOutlined /> Công nợ phải thu
          </span>
          <span className="sd-kpi-value">{compactMoney(receivables.outstanding)}</span>
          <span className="sd-kpi-foot">
            {receivables.overdue > 0 ? (
              <span className="sd-delta is-down">
                <WarningOutlined /> {compactMoney(receivables.overdue)} quá hạn
              </span>
            ) : (
              <span className="sd-delta is-up">
                <CheckCircleOutlined /> không có nợ quá hạn
              </span>
            )}
          </span>
        </article>
      </section>

      <section className="sd-card">
        <div className="sd-card-head">
          <div>
            <Typography.Title level={4}>Cần xử lý</Typography.Title>
            <Typography.Text className="sd-card-sub">
              Đầu việc đang chặn dòng chảy đơn hàng
            </Typography.Text>
          </div>
          {priorities.length ? (
            <Tag color="red">{priorities.length} nhóm việc</Tag>
          ) : (
            <Tag color="green">Thông suốt</Tag>
          )}
        </div>
        <div className="sd-card-body">
          {priorities.length ? (
            <div className="sd-action-list">
              {priorities.map((item) => (
                <button
                  type="button"
                  key={item.key}
                  className={`tone-${item.tone}`}
                  onClick={() => navigate(item.href)}
                >
                  <span className="sd-action-icon">{item.icon}</span>
                  <span>{item.label}</span>
                  <strong>{count(item.value)}</strong>
                  <RightOutlined />
                </button>
              ))}
            </div>
          ) : (
            <div className="sd-empty-note">
              <CheckCircleOutlined />
              Không có việc nào đang tắc. Đơn hàng đang chạy đúng luồng.
            </div>
          )}
        </div>
      </section>

      <div className="sd-grid cols-2">
        <section className="sd-card">
          <div className="sd-card-head">
            <div>
              <Typography.Title level={4}>Doanh thu 30 ngày</Typography.Title>
              <Typography.Text className="sd-card-sub">
                Theo ngày hóa đơn đã phát hành
              </Typography.Text>
            </div>
            <Typography.Text className="sd-card-sub">
              Hôm nay {compactMoney(revenue.today)} · {count(revenue.todayInvoices)} HĐ
            </Typography.Text>
          </div>
          <div className="sd-card-body">
            {revenue.trend.length > 1 ? (
              <RevenueTrendChart data={revenue.trend} />
            ) : (
              <div className="sd-empty-note">
                <FileTextOutlined />
                Chưa đủ hóa đơn đã phát hành để vẽ xu hướng.
              </div>
            )}
          </div>
        </section>

        <section className="sd-card">
          <div className="sd-card-head">
            <div>
              <Typography.Title level={4}>Công nợ phải thu</Typography.Title>
              <Typography.Text className="sd-card-sub">
                {count(receivables.outstandingCount)} khoản còn mở
              </Typography.Text>
            </div>
            <Button
              size="small"
              type="text"
              icon={<RightOutlined />}
              aria-label="Mở công nợ phải thu"
              onClick={() => navigate("/sales/receivables")}
            />
          </div>
          <div className="sd-card-body">
            <div className="sd-debt-figure">
              <div className="sd-debt-total">{fullMoney(receivables.outstanding)}</div>
              <div className="sd-debt-caption">Tổng dư nợ khách hàng</div>
            </div>

            <div className="sd-debt-bar" role="presentation">
              {debtSegments
                .filter((segment) => segment.value > 0)
                .map((segment) => (
                  <i
                    key={segment.key}
                    style={{
                      width: `${(segment.value / debtTotal) * 100}%`,
                      background: segment.color,
                    }}
                  />
                ))}
            </div>

            <div className="sd-debt-legend">
              {debtSegments.map((segment) => (
                <div key={segment.key}>
                  <span className="sd-swatch" style={{ background: segment.color }} />
                  <span>
                    {segment.label}
                    {segment.hint ? ` · ${segment.hint}` : ""}
                  </span>
                  <strong>{compactMoney(segment.value)}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="sd-grid cols-3">
        <section className="sd-card">
          <div className="sd-card-head">
            <div>
              <Typography.Title level={4}>Đơn đang chạy</Typography.Title>
              <Typography.Text className="sd-card-sub">
                {count(pipeline.openOrders)} đơn chưa đóng
              </Typography.Text>
            </div>
            <Button
              size="small"
              type="text"
              icon={<RightOutlined />}
              aria-label="Mở danh sách đơn bán"
              onClick={() => navigate("/sales/orders")}
            />
          </div>
          <div className="sd-card-body">
            <BarList rows={pipelineRows} emptyText="Không còn đơn nào đang chạy." />
          </div>
        </section>

        <section className="sd-card">
          <div className="sd-card-head">
            <div>
              <Typography.Title level={4}>Khách hàng dẫn đầu</Typography.Title>
              <Typography.Text className="sd-card-sub">Doanh thu tháng này</Typography.Text>
            </div>
          </div>
          <div className="sd-card-body">
            <BarList rows={customerRows} emptyText="Tháng này chưa phát hành hóa đơn nào." />
          </div>
        </section>

        <section className="sd-card">
          <div className="sd-card-head">
            <div>
              <Typography.Title level={4}>Nợ nhiều nhất</Typography.Title>
              <Typography.Text className="sd-card-sub">Dư nợ còn mở theo khách</Typography.Text>
            </div>
          </div>
          <div className="sd-card-body">
            <BarList rows={debtorRows} emptyText="Không còn khoản phải thu nào." />
          </div>
        </section>
      </div>

      <div className="sd-grid cols-2">
        <section className="sd-card">
          <div className="sd-card-head">
            <div>
              <Typography.Title level={4}>Mặt hàng bán chạy</Typography.Title>
              <Typography.Text className="sd-card-sub">
                Theo doanh thu hóa đơn tháng này
              </Typography.Text>
            </div>
          </div>
          <div className="sd-card-body">
            <BarList rows={productRows} emptyText="Tháng này chưa có mặt hàng nào xuất hóa đơn." />
          </div>
        </section>

        <section className="sd-card">
          <div className="sd-card-head">
            <div>
              <Typography.Title level={4}>Tồn kho bán được</Typography.Title>
              <Typography.Text className="sd-card-sub">
                Hàng của công ty, đã trừ phần giữ cho đơn khác
              </Typography.Text>
            </div>
          </div>
          <div className="sd-card-body">
            {inventory.items.length ? (
              <>
                <div className="sd-debt-figure">
                  <div className="sd-debt-total">
                    {count(inventory.sellable)}
                    <span className="sd-kpi-unit">lít có thể bán</span>
                  </div>
                  <div className="sd-debt-caption">
                    Trên tổng {count(inventory.onHand)} lít đang nằm kho
                  </div>
                </div>

                <div className="sd-stock-list">
                  {inventory.items.map((item) => {
                    const total = Math.max(item.onHand, 1);
                    return (
                      <div className="sd-stock-row" key={item.productId}>
                        <div className="sd-bar-head">
                          <span className="sd-bar-name">{item.name}</span>
                          <span className="sd-bar-value">
                            {count(item.sellable)}
                            <small>/ {count(item.onHand)} lít</small>
                          </span>
                        </div>
                        <div className="sd-stock-bar">
                          <i
                            className="is-sellable"
                            style={{ width: `${(item.sellable / total) * 100}%` }}
                          />
                          {item.reserved > 0 ? (
                            <i
                              className="is-reserved"
                              style={{ width: `${(item.reserved / total) * 100}%` }}
                            />
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="sd-debt-legend sd-stock-legend">
                  <div>
                    <span className="sd-swatch is-sellable" />
                    <span>Có thể bán</span>
                    <strong>{count(inventory.sellable)}</strong>
                  </div>
                  <div>
                    <span className="sd-swatch is-reserved" />
                    <span>Đang giữ cho đơn khác</span>
                    <strong>{count(inventory.reserved)}</strong>
                  </div>
                </div>
              </>
            ) : (
              <div className="sd-empty-note">
                <DatabaseOutlined />
                Chưa có tồn kho nào của công ty.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
