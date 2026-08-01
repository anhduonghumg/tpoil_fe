import React, { useMemo } from "react";
import { Button, Select, Tag, Tooltip, Typography } from "antd";
import {
  AlertOutlined,
  BankOutlined,
  BarChartOutlined,
  CalculatorOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  ReloadOutlined,
  RightOutlined,
  ShoppingCartOutlined,
  SolutionOutlined,
  ThunderboltOutlined,
  TruckOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { hasPerm } from "../../../shared/authz/authz";
import { PERMS, type PermCode } from "../../../shared/authz/perms";
import { useAppSession } from "../../../shared/authz/AppSessionProvider";
import OperationsDashboardPage from "../../operations/OperationsDashboardPage";
import { CommercialLotsApi } from "../../commercial-lots/api";
import type { CommercialLotLifecycle } from "../../commercial-lots/types";
import { PurchasesApi } from "../../purchases/api";
import type { PurchaseOrderStatus } from "../../purchases/types";
import { TermPurchaseOrdersApi } from "../../purchase-term/api";
import type { TermOrderStatus } from "../../purchase-term/types";
import { useDepartmentWorkspaceContext } from "../context";
import { getDefaultDashboard } from "../defaults";
import { WORKSPACE_QUERY_KEYS } from "../hooks";
import type {
  DashboardAlert,
  DashboardTask,
  WorkspaceProcessStep,
  WorkspaceReport,
  WorkspaceShortcut,
} from "../types";
import "./professional-dashboard.css";

const METRIC_ICONS = [
  <FileTextOutlined />,
  <ClockCircleOutlined />,
  <WarningOutlined />,
  <BarChartOutlined />,
];

const PURCHASE_STATUS_ROWS = [
  {
    key: "expected",
    label: "Dự kiến",
    hint: "Chưa duyệt",
    statuses: ["DRAFT"],
    lifecycles: ["PENDING_APPROVAL"],
  },
  {
    key: "working",
    label: "Working",
    hint: "Đang xử lý",
    statuses: ["IN_PROGRESS"],
    lifecycles: ["PENDING_INVOICE", "PENDING_PAYMENT", "READY_TO_WITHDRAW", "WITHDRAWING"],
  },
  {
    key: "completed",
    label: "Hoàn thành",
    hint: "Đã chốt hồ sơ",
    statuses: ["COMPLETED"],
    lifecycles: ["COMPLETED"],
  },
] as const;

const PURCHASE_QUICK_LINKS = [
  { label: "Hợp đồng", href: "/contracts", icon: <SolutionOutlined /> },
  { label: "TERM", href: "/purchase-terms", icon: <FileTextOutlined /> },
  { label: "Thương mại", href: "/commercial-purchases/retail", icon: <ShoppingCartOutlined /> },
  { label: "Thanh toán", href: "/banking", icon: <BankOutlined /> },
  { label: "Nhận hàng", href: "/purchase-terms", icon: <TruckOutlined /> },
  { label: "Giá vốn", href: "/purchase-terms", icon: <CalculatorOutlined /> },
] as const;

function canSee(
  item: { need?: string | string[] | null },
  permissions: Set<PermCode>,
) {
  if (!item.need || permissions.has(PERMS.SYSTEM_RBAC_ADMIN)) return true;
  return hasPerm({ permissions }, item.need as PermCode | PermCode[]);
}

function filterVisible<T extends { need?: string | string[] | null }>(
  items: T[] | undefined,
  permissions: Set<PermCode>,
) {
  return (items ?? []).filter((item) => canSee(item, permissions));
}

function todayLabel() {
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());
}

function DashboardHeader() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const workspace = useDepartmentWorkspaceContext();
  const dashboard = workspace?.dashboard;

  if (!workspace || !dashboard) return null;

  return (
    <header className="pro-dashboard-header">
      <div className="pro-dashboard-heading">
        <div className="pro-dashboard-eyebrow">
          <span>Trung tâm điều hành</span>
          <span><CalendarOutlined /> {todayLabel()}</span>
        </div>
        <div className="pro-dashboard-title-row">
          <Typography.Title level={2}>
            Tổng quan {dashboard.title.toLocaleLowerCase("vi-VN")}
          </Typography.Title>
          <Tag>{workspace.currentWorkspace.name}</Tag>
        </div>
        <Typography.Text>{dashboard.description}</Typography.Text>
      </div>

      <div className="pro-dashboard-actions">
        {workspace.workspaces.length > 1 ? (
          <Select
            size="small"
            value={workspace.currentWorkspace.key}
            options={workspace.workspaces.map((item) => ({ value: item.key, label: item.name }))}
            onChange={workspace.setWorkspaceKey}
            popupMatchSelectWidth={false}
          />
        ) : null}
        {(dashboard.quickActions ?? []).slice(0, 2).map((action, index) => (
          <Button
            size="small"
            key={action.key || action.label}
            type={index === 0 ? "primary" : "default"}
            icon={index === 0 ? <ThunderboltOutlined /> : undefined}
            onClick={() => action.href && navigate(action.href)}
          >
            {action.label}
          </Button>
        ))}
        <Tooltip title="Làm mới dữ liệu">
          <Button
            size="small"
            aria-label="Làm mới dữ liệu"
            icon={<ReloadOutlined />}
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: WORKSPACE_QUERY_KEYS.all });
              queryClient.invalidateQueries({ queryKey: ["purchase-dashboard"] });
            }}
          />
        </Tooltip>
      </div>
    </header>
  );
}

function MetricStrip() {
  const workspace = useDepartmentWorkspaceContext();
  const metrics = workspace?.dashboard.metrics ?? [];

  return (
    <section className="pro-metric-strip" aria-label="Chỉ số tổng quan">
      {metrics.map((metric, index) => {
        const hasValue = metric.value !== null && metric.value !== undefined && metric.value !== "-";
        return (
          <article className={`pro-metric pro-metric-${(index % 4) + 1}`} key={metric.key || metric.label}>
            <div className="pro-metric-label">
              <span>{METRIC_ICONS[index % METRIC_ICONS.length]}</span>
              <strong>{metric.label}</strong>
            </div>
            <div className={`pro-metric-value ${hasValue ? "" : "is-empty"}`}>{metric.value ?? "-"}</div>
            <small>{metric.hint || "Chưa có dữ liệu cập nhật"}</small>
          </article>
        );
      })}
    </section>
  );
}

function getTotal(data: unknown) {
  if (!data || typeof data !== "object") return 0;
  const total = (data as { total?: unknown }).total;
  return typeof total === "number" ? total : 0;
}

function fmtCount(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function statusQuery(statuses: readonly string[]) {
  return statuses.length === 1 ? `status=${statuses[0]}` : `statusGroup=working`;
}

function lifecycleQuery(row: (typeof PURCHASE_STATUS_ROWS)[number]) {
  return row.lifecycles.length === 1
    ? `lifecycle=${row.lifecycles[0]}`
    : `lifecycleGroup=${row.key}`;
}

function PurchaseStatusDashboard() {
  const navigate = useNavigate();
  const termQueries = useQueries({
    queries: PURCHASE_STATUS_ROWS.flatMap((row) =>
      row.statuses.map((status) => ({
        queryKey: ["purchase-dashboard", "term", status],
        queryFn: () =>
          TermPurchaseOrdersApi.list({
            status: status as TermOrderStatus,
            page: 1,
            pageSize: 1,
          }),
        staleTime: 30 * 1000,
      })),
    ),
  });
  const commercialRetailQueries = useQueries({
    queries: PURCHASE_STATUS_ROWS.flatMap((row) =>
      row.statuses.map((status) => ({
        queryKey: ["purchase-dashboard", "commercial-retail", status],
        queryFn: () =>
          PurchasesApi.listPO({
            status: status as PurchaseOrderStatus,
            orderType: "SINGLE",
            page: 1,
            limit: 1,
          }),
        staleTime: 30 * 1000,
      })),
    ),
  });
  const commercialLotQueries = useQueries({
    queries: PURCHASE_STATUS_ROWS.flatMap((row) =>
      row.lifecycles.map((lifecycle) => ({
        queryKey: ["purchase-dashboard", "commercial-lot", lifecycle],
        queryFn: () =>
          CommercialLotsApi.list({
            lifecycle: lifecycle as CommercialLotLifecycle,
            page: 1,
            limit: 1,
          }),
        staleTime: 30 * 1000,
      })),
    ),
  });

  let statusQueryIndex = 0;
  let lifecycleQueryIndex = 0;
  const rows = PURCHASE_STATUS_ROWS.map((row) => {
    let termTotal = 0;
    let retailTotal = 0;
    let lotTotal = 0;

    row.statuses.forEach(() => {
      termTotal += getTotal(termQueries[statusQueryIndex]?.data);
      retailTotal += getTotal(commercialRetailQueries[statusQueryIndex]?.data);
      statusQueryIndex += 1;
    });
    row.lifecycles.forEach(() => {
      lotTotal += getTotal(commercialLotQueries[lifecycleQueryIndex]?.data);
      lifecycleQueryIndex += 1;
    });

    return { ...row, termTotal, retailTotal, lotTotal };
  });
  const expectedTotal = rows.find((row) => row.key === "expected")?.termTotal ?? 0;
  const expectedCommercial = rows.find((row) => row.key === "expected")?.retailTotal ?? 0;
  const expectedLot = rows.find((row) => row.key === "expected")?.lotTotal ?? 0;
  const workingTotal = rows.find((row) => row.key === "working")?.termTotal ?? 0;
  const workingCommercial = rows.find((row) => row.key === "working")?.retailTotal ?? 0;
  const workingLot = rows.find((row) => row.key === "working")?.lotTotal ?? 0;
  const completedTotal = rows.find((row) => row.key === "completed")?.termTotal ?? 0;
  const completedCommercial = rows.find((row) => row.key === "completed")?.retailTotal ?? 0;
  const completedLot = rows.find((row) => row.key === "completed")?.lotTotal ?? 0;
  const termTotal = rows.reduce((sum, row) => sum + row.termTotal, 0);
  const retailTotal = rows.reduce((sum, row) => sum + row.retailTotal, 0);
  const lotTotal = rows.reduce((sum, row) => sum + row.lotTotal, 0);
  const commercialTotal = retailTotal + lotTotal;
  const allTotal = termTotal + commercialTotal;
  const activeTotal = expectedTotal + expectedCommercial + expectedLot + workingTotal + workingCommercial + workingLot;
  const doneTotal = completedTotal + completedCommercial + completedLot;
  const completionRate = allTotal ? Math.round((doneTotal / allTotal) * 100) : 0;
  const isLoading =
    termQueries.some((query) => query.isLoading) ||
    commercialRetailQueries.some((query) => query.isLoading) ||
    commercialLotQueries.some((query) => query.isLoading);
  const hasError =
    termQueries.some((query) => query.isError) ||
    commercialRetailQueries.some((query) => query.isError) ||
    commercialLotQueries.some((query) => query.isError);

  return (
    <section className="purchase-dashboard-compact" aria-label="Số lượng đơn mua">
      <div className="purchase-kpi-row">
        <article className="purchase-kpi-card">
          <span>Tổng đơn theo dõi</span>
          <strong>{isLoading ? "..." : fmtCount(allTotal)}</strong>
          <small>{fmtCount(termTotal)} TERM · {fmtCount(retailTotal)} lẻ · {fmtCount(lotTotal)} lô</small>
        </article>
        <article className="purchase-kpi-card accent-blue">
          <span>Đang mở</span>
          <strong>{isLoading ? "..." : fmtCount(activeTotal)}</strong>
          <small>{fmtCount(expectedTotal + expectedCommercial + expectedLot)} dự kiến · {fmtCount(workingTotal + workingCommercial + workingLot)} đang xử lý</small>
        </article>
        <article className="purchase-kpi-card accent-green">
          <span>Hoàn thành</span>
          <strong>{isLoading ? "..." : fmtCount(doneTotal)}</strong>
          <small>{completionRate}% trên tổng đơn hiển thị</small>
        </article>
      </div>

      <div className="purchase-dashboard-grid">
        <div className="purchase-status-panel">
          <div className="purchase-panel-heading">
            <div>
              <strong>Tình trạng đơn mua</strong>
              <span>TERM và thương mại theo tiến độ xử lý</span>
            </div>
            <Tag>{isLoading ? "..." : fmtCount(allTotal)} đơn</Tag>
          </div>
          <div className="purchase-status-table">
            <div className="purchase-status-header purchase-status-head-main">Trạng thái</div>
            <div className="purchase-status-header purchase-status-head-main">TERM</div>
            <div className="purchase-status-header purchase-status-head-commercial">Thương mại</div>
            <div className="purchase-status-subheader">Lô</div>
            <div className="purchase-status-subheader">Lẻ</div>

            {rows.map((row) => (
              <React.Fragment key={row.key}>
                <div className={`purchase-status-label status-${row.key}`}>
                  <strong>{row.label}</strong>
                  <span>{row.hint}</span>
                </div>
                <button
                  type="button"
                  className={`purchase-status-count status-${row.key}`}
                  onClick={() => navigate(`/purchase-terms?${statusQuery(row.statuses)}`)}
                >
                  {isLoading ? "..." : fmtCount(row.termTotal)}
                </button>
                <button
                  type="button"
                  className={`purchase-status-count purchase-status-count-small status-${row.key}`}
                  onClick={() => navigate(`/commercial-purchases/lots?${lifecycleQuery(row)}`)}
                >
                  {isLoading ? "..." : fmtCount(row.lotTotal)}
                </button>
                <button
                  type="button"
                  className={`purchase-status-count purchase-status-count-small status-${row.key}`}
                  onClick={() => navigate(`/commercial-purchases/retail?${statusQuery(row.statuses)}`)}
                >
                  {isLoading ? "..." : fmtCount(row.retailTotal)}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="purchase-side-panel">
          <div className="purchase-workload-card">
            <div className="purchase-panel-heading">
              <div>
                <strong>Khối lượng đang chạy</strong>
                <span>Ưu tiên xử lý trong ngày</span>
              </div>
            </div>
            <div className="purchase-workload-list">
              <button type="button" onClick={() => navigate("/purchase-terms")}>
                <span><ClockCircleOutlined /></span>
                <strong>{fmtCount(workingTotal)} TERM đang xử lý</strong>
                <small>Đã duyệt / xử lý</small>
              </button>
              <button type="button" onClick={() => navigate("/commercial-purchases/retail")}>
                <span><ShoppingCartOutlined /></span>
                <strong>{fmtCount(workingCommercial + workingLot)} thương mại đang xử lý</strong>
                <small>{fmtCount(workingCommercial)} lẻ · {fmtCount(workingLot)} lô</small>
              </button>
              <button type="button" onClick={() => navigate("/banking")}>
                <span><BankOutlined /></span>
                <strong>Theo dõi thanh toán</strong>
                <small>Mở ngân hàng</small>
              </button>
            </div>
          </div>

        </div>
      </div>

      <div className="purchase-quick-card">
        <div className="purchase-quick-inline">
          <div>
            <strong>Lối tắt</strong>
            <span>Truy cập nhanh nghiệp vụ mua hàng</span>
          </div>
          <div className="purchase-quick-grid">
            {PURCHASE_QUICK_LINKS.map((link) => (
              <button type="button" key={link.label} onClick={() => navigate(link.href)}>
                <span>{link.icon}</span>
                <strong>{link.label}</strong>
              </button>
            ))}
          </div>
        </div>
      </div>

      {hasError ? (
        <Typography.Text type="danger" className="purchase-status-error">
          Không tải được một phần số liệu dashboard.
        </Typography.Text>
      ) : null}
    </section>
  );
}

function SectionHeading({ title, subtitle, count }: { title: string; subtitle: string; count?: number }) {
  return (
    <div className="pro-section-heading">
      <div>
        <Typography.Title level={4}>{title}</Typography.Title>
        <Typography.Text>{subtitle}</Typography.Text>
      </div>
      {count !== undefined ? <Tag>{count}</Tag> : null}
    </div>
  );
}

function ProcessPanel({ steps }: { steps: WorkspaceProcessStep[] }) {
  const navigate = useNavigate();

  return (
    <section className="pro-section pro-process-panel">
      <SectionHeading title="Quy trình nghiệp vụ" subtitle="Truy cập theo thứ tự xử lý hồ sơ" count={steps.length} />
      <div className="pro-process-list">
        {steps.map((step, index) => (
          <button
            type="button"
            key={step.key || step.label}
            onClick={() => step.href && navigate(step.href)}
            disabled={!step.href}
          >
            <span className="pro-step-number">{String(index + 1).padStart(2, "0")}</span>
            <span className="pro-step-icon">{step.icon}</span>
            <span className="pro-step-copy">
              <strong>{step.label}</strong>
              {step.description ? <small>{step.description}</small> : null}
            </span>
            {step.href ? <RightOutlined /> : null}
          </button>
        ))}
      </div>
    </section>
  );
}

function AttentionPanel({ tasks, alerts }: { tasks: DashboardTask[]; alerts: DashboardAlert[] }) {
  const navigate = useNavigate();
  const items = [
    ...alerts.map((item) => ({ ...item, kind: "alert" as const })),
    ...tasks.map((item) => ({ ...item, kind: "task" as const })),
  ];

  return (
    <section className="pro-section">
      <SectionHeading title="Cần xử lý" subtitle="Cảnh báo và công việc ưu tiên" count={items.length || undefined} />
      {items.length ? (
        <div className="pro-attention-list">
          {items.slice(0, 6).map((item, index) => {
            const level = item.kind === "alert" ? item.level || "warning" : "info";
            return (
              <button
                type="button"
                className={`level-${level}`}
                key={item.key || `${item.kind}-${index}`}
                onClick={() => item.href && navigate(item.href)}
                disabled={!item.href}
              >
                <span className="pro-attention-icon">
                  {level === "warning" || level === "error" ? <AlertOutlined /> : <CheckCircleOutlined />}
                </span>
                <span>
                  <strong>{item.title}</strong>
                  {item.description ? <small>{item.description}</small> : null}
                </span>
                {item.href ? <RightOutlined /> : null}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="pro-empty-state">
          <CheckCircleOutlined />
          <span>Chưa có dữ liệu cảnh báo hoặc công việc mới.</span>
        </div>
      )}
    </section>
  );
}

function ReportsPanel({ reports }: { reports: WorkspaceReport[] }) {
  const navigate = useNavigate();

  return (
    <section className="pro-section">
      <SectionHeading title="Báo cáo" subtitle="Dữ liệu phục vụ theo dõi và đối chiếu" />
      <div className="pro-report-list">
        {reports.slice(0, 6).map((report, index) => (
          <button
            type="button"
            key={report.key || report.label}
            onClick={() => report.href && navigate(report.href)}
            disabled={!report.href}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <span>
              <strong>{report.label}</strong>
              {report.description ? <small>{report.description}</small> : null}
            </span>
            <RightOutlined />
          </button>
        ))}
      </div>
    </section>
  );
}

function ShortcutsPanel({ shortcuts }: { shortcuts: WorkspaceShortcut[] }) {
  const navigate = useNavigate();

  return (
    <section className="pro-section pro-shortcuts-panel">
      <SectionHeading title="Danh mục thường dùng" subtitle="Dữ liệu nền và cấu hình nghiệp vụ" />
      <div className="pro-shortcut-list">
        {shortcuts.map((shortcut) => (
          <button
            type="button"
            key={shortcut.key || shortcut.label}
            onClick={() => shortcut.href && navigate(shortcut.href)}
            disabled={!shortcut.href}
          >
            <span>{shortcut.icon}</span>
            <strong>{shortcut.label}</strong>
            <RightOutlined />
          </button>
        ))}
      </div>
    </section>
  );
}

export default function ProfessionalDashboard() {
  const workspace = useDepartmentWorkspaceContext();
  const { permissions } = useAppSession();
  const dashboard = workspace?.dashboard ?? getDefaultDashboard("purchase.dashboard");
  const processSteps = useMemo(
    () => filterVisible(dashboard.processSteps, permissions),
    [dashboard.processSteps, permissions],
  );
  const reports = useMemo(
    () => filterVisible(dashboard.reports, permissions),
    [dashboard.reports, permissions],
  );
  const shortcuts = useMemo(
    () => filterVisible(dashboard.shortcuts, permissions),
    [dashboard.shortcuts, permissions],
  );

  if (workspace?.currentWorkspace.key === "operations") return <OperationsDashboardPage />;

  if (workspace?.currentWorkspace.key === "purchase") {
    return (
      <main className="pro-dashboard purchase-dashboard-page">
        <DashboardHeader />
        <PurchaseStatusDashboard />
      </main>
    );
  }

  return (
    <main className="pro-dashboard">
      <DashboardHeader />
      <MetricStrip />
      <div className="pro-dashboard-grid">
        <ProcessPanel steps={processSteps} />
        <div className="pro-dashboard-side">
          <AttentionPanel tasks={dashboard.tasks ?? []} alerts={dashboard.alerts ?? []} />
          <ReportsPanel reports={reports} />
        </div>
      </div>
      <ShortcutsPanel shortcuts={shortcuts} />
    </main>
  );
}
