import { Badge, Button, Card, Empty, List, Segmented, Space, Spin, Tag, Typography } from "antd";
import { CheckOutlined, InboxOutlined } from "@ant-design/icons";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotificationSummary, useNotifications, useNotificationWorkItems } from "../hooks";
import { notificationPath } from "../notification-navigation";
import type { CommonNotification, NotificationTab } from "../types";
import "../notification-center.css";

const tabs: Array<{ value: "TASKS" | NotificationTab | "ALL"; label: string }> = [
  { value: "TASKS", label: "Cần xử lý" }, { value: "SALES", label: "Bán hàng" },
  { value: "PURCHASES", label: "Mua hàng" }, { value: "OPERATIONS", label: "Kho & vận chuyển" },
  { value: "FINANCE", label: "Tài chính & công nợ" }, { value: "SYSTEM", label: "Hệ thống" }, { value: "ALL", label: "Tất cả" },
];

export default function NotificationsCenterPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<(typeof tabs)[number]["value"]>("TASKS");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const summary = useNotificationSummary();
  const updates = useNotifications({ unreadOnly, ...(tab !== "TASKS" && tab !== "ALL" ? { tab } : {}) });
  const workItems = useNotificationWorkItems();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const items = tab === "TASKS" ? workItems.data?.items ?? [] : updates.data?.items ?? [];
  const count = (value: (typeof tabs)[number]["value"]) => value === "TASKS" ? summary.data?.openWorkItems ?? 0 : value === "ALL" ? summary.data?.unread ?? 0 : summary.data?.tabs[value]?.unread ?? 0;
  const open = (item: CommonNotification) => {
    if (item.status === "UNREAD") markRead.mutate(item.id);
    const path = notificationPath(item);
    if (path) navigate(path);
  };
  return <Card className="notification-center-page" title={<Space><InboxOutlined />Trung tâm thông báo</Space>}>
    <div className="notification-center-page-toolbar">
      {tab === "TASKS" ? <Typography.Text type="secondary">Các việc chưa hoàn tất được giữ tại đây.</Typography.Text> : <Segmented value={unreadOnly ? "unread" : "all"} options={[{ label: "Tất cả", value: "all" }, { label: "Chưa đọc", value: "unread" }]} onChange={(value) => setUnreadOnly(value === "unread")} />}
      <Button type="text" icon={<CheckOutlined />} disabled={!summary.data?.unread} loading={markAllRead.isPending} onClick={() => markAllRead.mutate()}>Đọc tất cả</Button>
    </div>
    <div className="notification-center-tabs">{tabs.map((item) => <Button key={item.value} type={tab === item.value ? "primary" : "text"} onClick={() => setTab(item.value)}><Badge count={count(item.value)} size="small" offset={[7, -2]}>{item.label}</Badge></Button>)}</div>
    <Spin spinning={tab === "TASKS" ? workItems.isLoading : updates.isLoading}>
      {items.length ? <List className="notification-center-list" dataSource={items} renderItem={(item) => <List.Item className={`notification-center-item ${item.status === "UNREAD" ? "is-unread" : ""}`} onClick={() => open(item)}>
        {item.status === "UNREAD" && <span className="notification-center-dot" />}
        <div style={{ width: "100%" }}><div className="notification-center-title"><Space size={6}><Tag color={item.kind === "ACTION" ? "orange" : item.severity === "ERROR" ? "red" : "blue"}>{item.kind === "ACTION" ? "Cần xử lý" : item.tab}</Tag><Typography.Text strong>{item.title}</Typography.Text></Space></div><Typography.Text className="notification-center-body">{item.body}</Typography.Text></div>
      </List.Item>} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có thông báo phù hợp" style={{ marginTop: 72 }} />}
    </Spin>
  </Card>;
}
