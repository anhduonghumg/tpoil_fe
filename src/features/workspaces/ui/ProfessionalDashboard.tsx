import React, { useMemo } from "react";
import { Button, Select, Tag, Tooltip, Typography } from "antd";
import {
  AlertOutlined,
  BarChartOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  ReloadOutlined,
  RightOutlined,
  ThunderboltOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { hasPerm } from "../../../shared/authz/authz";
import { PERMS, type PermCode } from "../../../shared/authz/perms";
import { useAppSession } from "../../../shared/authz/AppSessionProvider";
import OperationsDashboardPage from "../../operations/OperationsDashboardPage";
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
            onClick={() => queryClient.invalidateQueries({ queryKey: WORKSPACE_QUERY_KEYS.all })}
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
