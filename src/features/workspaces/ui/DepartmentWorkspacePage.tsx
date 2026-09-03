import React, { useMemo } from "react";
import {
  Button,
  Card,
  Col,
  Empty,
  Row,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import {
  ArrowRightOutlined,
  ReloadOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { hasPerm } from "../../../shared/authz/authz";
import { PERMS, type PermCode } from "../../../shared/authz/perms";
import { useAppSession } from "../../../shared/authz/AppSessionProvider";
import { useDepartmentWorkspaceContext } from "../context";
import { getDefaultDashboard } from "../defaults";
import { WORKSPACE_QUERY_KEYS } from "../hooks";
import type {
  DashboardQuickAction,
  WorkspaceProcessStep,
  WorkspaceReport,
  WorkspaceShortcut,
} from "../types";
import "./workspace.css";
import OperationsDashboardPage from "../../operations/OperationsDashboardPage";
import SalesDashboardPage from "../../sales/page/SalesDashboardPage";

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

export function WorkspaceSwitcher() {
  const workspace = useDepartmentWorkspaceContext();
  if (!workspace || workspace.workspaces.length <= 1) return null;

  return (
    <Select
      className="workspace-header-switcher"
      value={workspace.currentWorkspace.key}
      options={workspace.workspaces.map((item) => ({
        value: item.key,
        label: item.name,
      }))}
      onChange={workspace.setWorkspaceKey}
      popupMatchSelectWidth={false}
    />
  );
}

export function WorkspaceHeader({
  title,
  description,
  quickActions,
}: {
  title: string;
  description?: string | null;
  quickActions: DashboardQuickAction[];
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const workspace = useDepartmentWorkspaceContext();

  return (
    <div className="workspace-header">
      <div className="workspace-title-block">
        <Space align="center" wrap>
          <Typography.Title level={2} className="workspace-title">
            {title}
          </Typography.Title>
          {workspace?.currentWorkspace.name ? (
            <Tag color="green">{workspace.currentWorkspace.name}</Tag>
          ) : null}
        </Space>
        {description ? (
          <Typography.Text className="workspace-description">
            {description}
          </Typography.Text>
        ) : null}
      </div>

      <Space wrap className="workspace-header-actions">
        <WorkspaceSwitcher />
        {quickActions.slice(0, 2).map((action) => (
          <Button
            key={action.key || action.label}
            type="primary"
            onClick={() => action.href && navigate(action.href)}
          >
            {action.label}
          </Button>
        ))}
        <Button
          icon={<ReloadOutlined />}
          onClick={() =>
            queryClient.invalidateQueries({
              queryKey: WORKSPACE_QUERY_KEYS.all,
            })
          }
        >
          Tải lại
        </Button>
      </Space>
    </div>
  );
}

export function WorkspaceKpiCards({
  metrics,
}: {
  metrics: { key?: string; label: string; value: string | number | null; hint?: string | null }[];
}) {
  return (
    <Row gutter={[12, 12]}>
      {metrics.map((metric, index) => (
        <Col key={metric.key || metric.label || index} xs={24} sm={12} xl={6}>
          <Card className="workspace-kpi-card" bordered={false}>
            <Typography.Text className="workspace-kpi-label">
              {metric.label}
            </Typography.Text>
            <Typography.Title level={3} className="workspace-kpi-value">
              {metric.value ?? "-"}
            </Typography.Title>
            <Typography.Text className="workspace-kpi-hint">
              {metric.hint || "Chờ dữ liệu"}
            </Typography.Text>
          </Card>
        </Col>
      ))}
    </Row>
  );
}

export function ProcessStepCard({
  step,
  index,
  isLast,
}: {
  step: WorkspaceProcessStep;
  index: number;
  isLast: boolean;
}) {
  const navigate = useNavigate();
  const clickable = !!step.href;

  return (
    <button
      type="button"
      className={`process-step ${clickable ? "is-clickable" : ""}`}
      onClick={() => step.href && navigate(step.href)}
      disabled={!clickable}
    >
      <span className="process-step-index">{index + 1}</span>
      <span className="process-step-icon">{step.icon}</span>
      <span className="process-step-label">{step.label}</span>
      {!isLast ? <ArrowRightOutlined className="process-step-arrow" /> : null}
    </button>
  );
}

export function ProcessFlowCard({ steps }: { steps: WorkspaceProcessStep[] }) {
  return (
    <Card
      className="workspace-section-card process-flow-card"
      bordered={false}
      title="Quy trình nghiệp vụ"
    >
      {steps.length ? (
        <div className="process-flow">
          {steps.map((step, index) => (
            <ProcessStepCard
              key={step.key || step.label}
              step={step}
              index={index}
              isLast={index === steps.length - 1}
            />
          ))}
        </div>
      ) : (
        <Empty description="Chưa có quy trình" />
      )}
    </Card>
  );
}

export function ReportListCard({ reports }: { reports: WorkspaceReport[] }) {
  const navigate = useNavigate();

  return (
    <Card
      className="workspace-section-card"
      bordered={false}
      title="Báo cáo liên quan"
      extra={
        reports.length ? (
          <Button type="link" onClick={() => reports[0].href && navigate(reports[0].href)}>
            Tất cả báo cáo
          </Button>
        ) : null
      }
    >
      {reports.length ? (
        <div className="workspace-report-list">
          {reports.map((report) => (
            <button
              type="button"
              key={report.key || report.label}
              className="workspace-report-item"
              onClick={() => report.href && navigate(report.href)}
              disabled={!report.href}
            >
              <span>
                <Typography.Text strong>{report.label}</Typography.Text>
                {report.description ? (
                  <Typography.Text type="secondary">
                    {report.description}
                  </Typography.Text>
                ) : null}
              </span>
              <RightOutlined />
            </button>
          ))}
        </div>
      ) : (
        <Empty description="Chưa có báo cáo" />
      )}
    </Card>
  );
}

export function ShortcutGrid({ shortcuts }: { shortcuts: WorkspaceShortcut[] }) {
  const navigate = useNavigate();

  return (
    <Card
      className="workspace-section-card"
      bordered={false}
      title="Danh mục & cấu hình nhanh"
    >
      {shortcuts.length ? (
        <div className="workspace-shortcut-grid">
          {shortcuts.map((shortcut) => (
            <button
              type="button"
              key={shortcut.key || shortcut.label}
              className="workspace-shortcut"
              onClick={() => shortcut.href && navigate(shortcut.href)}
              disabled={!shortcut.href}
            >
              <span className="workspace-shortcut-icon">{shortcut.icon}</span>
              <span>{shortcut.label}</span>
            </button>
          ))}
        </div>
      ) : (
        <Empty description="Chưa có shortcut" />
      )}
    </Card>
  );
}

export default function DepartmentWorkspacePage() {
  const workspace = useDepartmentWorkspaceContext();
  const { permissions } = useAppSession();
  const dashboard =
    workspace?.dashboard ??
    getDefaultDashboard("purchase.dashboard", workspace?.currentWorkspace.name);

  const visibleProcessSteps = useMemo(
    () => filterVisible(dashboard.processSteps, permissions),
    [dashboard.processSteps, permissions],
  );
  const visibleReports = useMemo(
    () => filterVisible(dashboard.reports, permissions),
    [dashboard.reports, permissions],
  );
  const visibleShortcuts = useMemo(
    () => filterVisible(dashboard.shortcuts, permissions),
    [dashboard.shortcuts, permissions],
  );

  if (workspace?.currentWorkspace.key === "operations") {
    return <OperationsDashboardPage />;
  }

  if (workspace?.currentWorkspace.key === "sales") {
    return <SalesDashboardPage />;
  }

  return (
    <Space direction="vertical" size={16} className="department-workspace-page">
      <WorkspaceHeader
        title={dashboard.title}
        description={dashboard.description}
        quickActions={dashboard.quickActions ?? []}
      />

      <WorkspaceKpiCards metrics={dashboard.metrics ?? []} />

      <Row gutter={[16, 16]} align="stretch">
        <Col xs={24} xl={16}>
          <ProcessFlowCard steps={visibleProcessSteps} />
        </Col>
        <Col xs={24} xl={8}>
          <ReportListCard reports={visibleReports} />
        </Col>
      </Row>

      <ShortcutGrid shortcuts={visibleShortcuts} />
    </Space>
  );
}
