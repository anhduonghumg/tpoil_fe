import React, { useMemo } from "react";
import { Button, Select, Tag, Tooltip, Typography } from "antd";
import {
  AlertOutlined,
  CalendarOutlined,
  ContainerOutlined,
  DatabaseOutlined,
  FileProtectOutlined,
  FileTextOutlined,
  ReloadOutlined,
  RightOutlined,
  RocketOutlined,
  SwapOutlined,
  TruckOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useDepartmentWorkspaceContext } from "../workspaces/context";
import { useOperationsDashboard } from "./hooks";
import "./operations-dashboard.css";

const numberValue = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const numberLabel = (value: unknown) => numberValue(value).toLocaleString("vi-VN");

const todayLabel = () =>
  new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());

type Signal = {
  label: string;
  value: number;
  href: string;
  tone?: "normal" | "warning" | "danger";
};

function SignalList({ signals }: { signals: Signal[] }) {
  const navigate = useNavigate();
  return (
    <div className="ops-signal-list">
      {signals.map((signal) => (
        <button type="button" key={signal.label} onClick={() => navigate(signal.href)}>
          <span>{signal.label}</span>
          <strong className={`tone-${signal.tone || "normal"}`}>{numberLabel(signal.value)}</strong>
          <RightOutlined />
        </button>
      ))}
    </div>
  );
}

export default function OperationsDashboardPage() {
  const navigate = useNavigate();
  const workspace = useDepartmentWorkspaceContext();
  const { data, isLoading, isFetching, refetch } = useOperationsDashboard();
  const ship = data?.shipCharter ?? {};
  const road = data?.roadTransport ?? {};
  const warehouse = data?.warehouse ?? {};

  const shipRisks =
    numberValue(ship.missingInsurance) +
    numberValue(ship.missingInspection) +
    numberValue(ship.missingAgent) +
    numberValue(ship.missingAppendixFiles);
  const delayed = numberValue(road.delayedTrips);
  const expiringDocuments =
    numberValue(road.expiringInspections) +
    numberValue(road.expiringVehicleInsurance) +
    numberValue(road.expiringLicenses);
  const activeWork =
    numberValue(ship.waitingCharters) +
    numberValue(road.runningTrips) +
    numberValue(warehouse.transfersInTransit);

  const priorities = useMemo(
    () => [
      { label: "Đơn thuê tàu chờ xác nhận", value: numberValue(ship.waitingCharters), href: "/operations/charter-orders", tone: "warning" as const },
      { label: "Hồ sơ tàu cần bổ sung", value: shipRisks, href: "/operations/vessel-documents", tone: "danger" as const },
      { label: "Chuyến xe trễ kế hoạch", value: delayed, href: "/operations/vehicle-dispatches", tone: "danger" as const },
      { label: "Hồ sơ xe/lái xe sắp hết hạn", value: expiringDocuments, href: "/operations/vehicle-documents", tone: "warning" as const },
      { label: "Sai lệch đối chiếu kho", value: numberValue(warehouse.reconciliationVariance), href: "/operations/inventory-accounting", tone: "danger" as const },
    ].filter((item) => item.value > 0),
    [ship.waitingCharters, shipRisks, delayed, expiringDocuments, warehouse.reconciliationVariance],
  );

  const summary = [
    { label: "Công việc đang xử lý", value: activeWork, hint: "Tàu, xe và chuyển kho", icon: <RocketOutlined />, tone: "blue" },
    { label: "Cảnh báo hồ sơ tàu", value: shipRisks, hint: "Bảo hiểm, giám định, đại lý", icon: <FileProtectOutlined />, tone: shipRisks ? "red" : "green" },
    { label: "Chuyến xe đang chạy", value: road.runningTrips, hint: `${numberLabel(road.todayTrips)} chuyến trong ngày`, icon: <TruckOutlined />, tone: "green" },
    { label: "Tồn kho có thể bán", value: warehouse.sellableQty, hint: `${numberLabel(warehouse.reservedQty)} đang giữ`, icon: <DatabaseOutlined />, tone: "violet" },
  ];

  const shipSignals: Signal[] = [
    { label: "Đơn TERM mới", value: numberValue(ship.termCharterNew), href: "/operations/charter-orders" },
    { label: "Chờ xác nhận", value: numberValue(ship.waitingCharters), href: "/operations/charter-orders", tone: "warning" },
    { label: "Sắp đến laycan", value: numberValue(ship.laycanSoon), href: "/operations/charter-orders", tone: "warning" },
    { label: "Thiếu bảo hiểm", value: numberValue(ship.missingInsurance), href: "/operations/vessel-documents", tone: "danger" },
  ];

  const roadSignals: Signal[] = [
    { label: "Chuyến hôm nay", value: numberValue(road.todayTrips), href: "/operations/vehicle-dispatches" },
    { label: "Đang vận chuyển", value: numberValue(road.runningTrips), href: "/operations/vehicle-dispatches" },
    { label: "Chờ bốc / giao hàng", value: numberValue(road.waitingLoading) + numberValue(road.waitingDelivery), href: "/operations/vehicle-dispatches", tone: "warning" },
    { label: "Chuyến trễ", value: delayed, href: "/operations/vehicle-dispatches", tone: "danger" },
  ];

  const inventoryTotal = Math.max(
    numberValue(warehouse.availableQty),
    numberValue(warehouse.reservedQty),
    numberValue(warehouse.sellableQty),
    numberValue(warehouse.inTransitQty),
    1,
  );
  const inventoryRows = [
    { label: "Khả dụng", value: numberValue(warehouse.availableQty), color: "#2b6cb0" },
    { label: "Đã giữ", value: numberValue(warehouse.reservedQty), color: "#d58b20" },
    { label: "Có thể bán", value: numberValue(warehouse.sellableQty), color: "#17866b" },
    { label: "Đang vận chuyển", value: numberValue(warehouse.inTransitQty), color: "#7654a8" },
  ];

  return (
    <main className={`ops-command-dashboard ${isLoading ? "is-loading" : ""}`}>
      <header className="ops-command-header">
        <div>
          <div className="ops-command-eyebrow">
            <span>Trung tâm điều hành</span>
            <span><CalendarOutlined /> {todayLabel()}</span>
          </div>
          <div className="ops-command-title-row">
            <Typography.Title level={2}>Dashboard vận hành</Typography.Title>
            <Tag>Vận hành</Tag>
          </div>
          <Typography.Text>Theo dõi tập trung thuê tàu, điều xe và luân chuyển tồn kho.</Typography.Text>
        </div>
        <div className="ops-command-actions">
          {workspace && workspace.workspaces.length > 1 ? (
            <Select
              size="small"
              value={workspace.currentWorkspace.key}
              options={workspace.workspaces.map((item) => ({ value: item.key, label: item.name }))}
              onChange={(key) => { workspace.setWorkspaceKey(key); navigate("/dashboard"); }}
              popupMatchSelectWidth={false}
            />
          ) : null}
          <Button size="small" type="primary" icon={<ContainerOutlined />} onClick={() => navigate("/operations/charter-orders/create")}>Tạo đơn thuê tàu</Button>
          <Button size="small" icon={<TruckOutlined />} onClick={() => navigate("/operations/vehicle-dispatches/create")}>Tạo đơn điều xe</Button>
          <Tooltip title="Làm mới dữ liệu">
            <Button size="small" aria-label="Làm mới dữ liệu" icon={<ReloadOutlined spin={isFetching} />} onClick={() => refetch()} />
          </Tooltip>
        </div>
      </header>

      <section className="ops-summary-strip" aria-label="Chỉ số vận hành">
        {summary.map((item) => (
          <article className={`ops-summary-item tone-${item.tone}`} key={item.label}>
            <span className="ops-summary-icon">{item.icon}</span>
            <div>
              <small>{item.label}</small>
              <strong>{numberLabel(item.value)}</strong>
              <span>{item.hint}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="ops-priority-section">
        <div className="ops-section-heading">
          <div>
            <Typography.Title level={4}>Ưu tiên hôm nay</Typography.Title>
            <Typography.Text>Các đầu việc cần kiểm tra trước</Typography.Text>
          </div>
          {priorities.length ? <Tag color="red">{priorities.length} cảnh báo</Tag> : <Tag color="green">Không có cảnh báo</Tag>}
        </div>
        {priorities.length ? (
          <div className="ops-priority-list">
            {priorities.map((item) => (
              <button type="button" key={item.label} onClick={() => navigate(item.href)}>
                <AlertOutlined />
                <span>{item.label}</span>
                <strong>{numberLabel(item.value)}</strong>
                <RightOutlined />
              </button>
            ))}
          </div>
        ) : (
          <div className="ops-priority-empty"><FileTextOutlined /><span>Chưa phát sinh cảnh báo cần xử lý.</span></div>
        )}
      </section>

      <div className="ops-domain-grid">
        <section className="ops-domain-section domain-ship">
          <div className="ops-domain-header">
            <span><ContainerOutlined /></span>
            <div><Typography.Title level={4}>Thuê tàu & bảo hiểm</Typography.Title><Typography.Text>Đơn thuê và tính đầy đủ hồ sơ</Typography.Text></div>
            <Button size="small" type="text" icon={<RightOutlined />} aria-label="Mở thuê tàu" onClick={() => navigate("/operations/charter-orders")} />
          </div>
          <SignalList signals={shipSignals} />
          <div className="ops-domain-actions">
            <Button size="small" onClick={() => navigate("/operations/vessels")}>Danh mục tàu</Button>
            <Button size="small" icon={<FileProtectOutlined />} onClick={() => navigate("/operations/vessel-documents")}>Hồ sơ tàu</Button>
          </div>
        </section>

        <section className="ops-domain-section domain-road">
          <div className="ops-domain-header">
            <span><TruckOutlined /></span>
            <div><Typography.Title level={4}>Điều vận đường bộ</Typography.Title><Typography.Text>Chuyến xe và tình trạng phương tiện</Typography.Text></div>
            <Button size="small" type="text" icon={<RightOutlined />} aria-label="Mở điều xe" onClick={() => navigate("/operations/vehicle-dispatches")} />
          </div>
          <SignalList signals={roadSignals} />
          <div className="ops-domain-actions">
            <Button size="small" onClick={() => navigate("/operations/vehicles")}>Danh mục xe</Button>
            <Button size="small" icon={<FileTextOutlined />} onClick={() => navigate("/operations/vehicle-documents")}>Hồ sơ xe</Button>
          </div>
        </section>

        <section className="ops-domain-section domain-stock">
          <div className="ops-domain-header">
            <span><DatabaseOutlined /></span>
            <div><Typography.Title level={4}>Tồn kho & luân chuyển</Typography.Title><Typography.Text>Khả dụng, giữ hàng và hàng đang đi</Typography.Text></div>
            <Button size="small" type="text" icon={<RightOutlined />} aria-label="Mở tồn kho" onClick={() => navigate("/operations/inventory-availability")} />
          </div>
          <div className="ops-inventory-list">
            {inventoryRows.map((item) => (
              <div key={item.label}>
                <div><span>{item.label}</span><strong>{numberLabel(item.value)}</strong></div>
                <span className="ops-inventory-track"><span style={{ width: `${Math.max((item.value / inventoryTotal) * 100, item.value ? 3 : 0)}%`, background: item.color }} /></span>
              </div>
            ))}
          </div>
          <div className="ops-domain-actions">
            <Button size="small" onClick={() => navigate("/operations/inventory-accounting")}>Đối chiếu kho</Button>
            <Button size="small" icon={<SwapOutlined />} onClick={() => navigate("/operations/warehouse-transfers")}>Chuyển kho</Button>
          </div>
        </section>
      </div>
    </main>
  );
}
