import { useState } from "react";
import { Badge, Button, Drawer, Empty, List, Space, Spin, Tag, Typography } from "antd";
import { BellOutlined, CheckOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotificationQuick, useNotificationRealtime, useNotificationUnreadCount } from "../../../features/notifications/hooks";
import { notificationPath } from "../../../features/notifications/notification-navigation";
import type { CommonNotification, NotificationSeverity } from "../../../features/notifications/types";
import { useAppSession } from "../../authz/AppSessionProvider";
import "../../../features/notifications/notification-center.css";

const severityColor: Record<NotificationSeverity, string> = { INFO: "blue", SUCCESS: "green", WARNING: "gold", ERROR: "red" };

export default function NotificationsBell({ extraCount = 0 }: { extraCount?: number }) {
  const navigate = useNavigate();
  const { ready, bootstrap } = useAppSession();
  const [open, setOpen] = useState(false);
  useNotificationRealtime(ready);
  const quick = useNotificationQuick();
  const count = useNotificationUnreadCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const contracts = bootstrap?.data?.notifications?.contracts;
  const hasContracts = (contracts?.expiringCount ?? 0) + (contracts?.expiredCount ?? 0) > 0;
  const unread = count.data?.count ?? 0;
  const badgeCount = extraCount + unread + (hasContracts ? 1 : 0);
  const items = [...(quick.data?.tasks ?? []), ...(quick.data?.updates ?? [])];
  const openItem = (item: CommonNotification) => {
    if (item.status === "UNREAD") markRead.mutate(item.id);
    const path = notificationPath(item);
    if (path) { setOpen(false); navigate(path); }
  };
  return <>
    <Badge count={badgeCount} size="small" offset={[-2, 3]}><button type="button" className="notification-bell-button" aria-label={`Thông báo${badgeCount ? `, ${badgeCount} chưa đọc` : ""}`} onClick={() => setOpen(true)}><BellOutlined /></button></Badge>
    <Drawer title={<Space><BellOutlined /><span>Thông báo</span>{unread > 0 && <Tag color="blue">{unread} chưa đọc</Tag>}</Space>} placement="right" width={460} open={open} onClose={() => setOpen(false)} extra={unread > 0 ? <Button type="text" icon={<CheckOutlined />} loading={markAllRead.isPending} onClick={() => markAllRead.mutate()}>Đọc tất cả</Button> : null}>
      <div className="notification-center-toolbar"><Typography.Text type="secondary">3 việc cần xử lý và 2 cập nhật mới nhất</Typography.Text><Button type="link" onClick={() => { setOpen(false); navigate("/notifications"); }}>Xem tất cả</Button></div>
      <Spin spinning={quick.isLoading}>{items.length ? <List className="notification-center-list" dataSource={items} renderItem={(item) => <List.Item className={`notification-center-item ${item.status === "UNREAD" ? "is-unread" : ""}`} onClick={() => openItem(item)}>
        {item.status === "UNREAD" && <span className="notification-center-dot" />}
        <div style={{ width: "100%" }}><div className="notification-center-title"><Space size={6}><Tag color={item.kind === "ACTION" ? "orange" : severityColor[item.severity]}>{item.kind === "ACTION" ? "Cần xử lý" : item.tab}</Tag><Typography.Text strong>{item.title}</Typography.Text></Space></div><Typography.Text className="notification-center-body">{item.body}</Typography.Text></div>
      </List.Item>} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có thông báo mới" style={{ marginTop: 72 }} />}</Spin>
    </Drawer>
  </>;
}
