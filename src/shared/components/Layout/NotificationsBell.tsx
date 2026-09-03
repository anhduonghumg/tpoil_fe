import { useState } from "react";
import {
  Badge,
  Button,
  Drawer,
  Empty,
  List,
  Segmented,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import {
  BellOutlined,
  CheckOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationRealtime,
  useNotifications,
  useNotificationUnreadCount,
} from "../../../features/notifications/hooks";
import type {
  CommonNotification,
  NotificationSeverity,
} from "../../../features/notifications/types";
import { useAppSession } from "../../authz/AppSessionProvider";
import "../../../features/notifications/notification-center.css";

const severityColor: Record<NotificationSeverity, string> = {
  INFO: "blue",
  SUCCESS: "green",
  WARNING: "gold",
  ERROR: "red",
};

function relativeTime(value: string) {
  const timestamp = dayjs(value);
  const minutes = dayjs().diff(timestamp, "minute");
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút`;
  const hours = dayjs().diff(timestamp, "hour");
  if (hours < 24) return `${hours} giờ`;
  const days = dayjs().diff(timestamp, "day");
  if (days < 7) return `${days} ngày`;
  return timestamp.format("DD/MM/YYYY");
}

function notificationPath(item: CommonNotification) {
  if (item.action === "REVIEW_PURCHASE_PAYMENT") {
    return "/banking/payment-approvals";
  }
  if (item.action === "PROCESS_PURCHASE_PAYMENT") {
    return "/banking/payments";
  }
  if (item.entityType === "COMMERCIAL_PURCHASE" && item.entityId) {
    return `/commercial-purchases/lots/${item.entityId}`;
  }
  if (item.entityType === "COMMERCIAL_PURCHASE_RETAIL" && item.entityId) {
    return `/purchase-orders/${item.entityId}`;
  }
  if (item.entityType === "SALES_ORDER") {
    return "/commercial-purchases/retail";
  }
  if (item.entityType === "PURCHASE_RECEIPT") {
    return "/operations/inventory-receipts";
  }
  return null;
}

export default function NotificationsBell({
  extraCount = 0,
}: {
  extraCount?: number;
}) {
  const navigate = useNavigate();
  const { ready, bootstrap } = useAppSession();
  const [open, setOpen] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);

  useNotificationRealtime(ready);
  const listQuery = useNotifications(unreadOnly);
  const countQuery = useNotificationUnreadCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const contracts = bootstrap?.data?.notifications?.contracts;
  const expiringCount = contracts?.expiringCount ?? 0;
  const expiredCount = contracts?.expiredCount ?? 0;
  const hasContracts = expiringCount + expiredCount > 0;
  const unreadCount = countQuery.data?.count ?? 0;
  const badgeCount = extraCount + unreadCount + (hasContracts ? 1 : 0);

  const openNotification = (item: CommonNotification) => {
    if (item.status === "UNREAD") markRead.mutate(item.id);
    const path = notificationPath(item);
    if (path) {
      setOpen(false);
      navigate(path);
    }
  };

  const items = listQuery.data?.items ?? [];
  const hasAny = items.length || hasContracts;

  return (
    <>
      <Badge count={badgeCount} size="small" offset={[-2, 3]}>
        <button
          type="button"
          className="notification-bell-button"
          aria-label={`Thông báo${badgeCount ? `, ${badgeCount} chưa đọc` : ""}`}
          onClick={() => setOpen(true)}
        >
          <BellOutlined />
        </button>
      </Badge>

      <Drawer
        title={
          <Space>
            <BellOutlined />
            <span>Trung tâm thông báo</span>
            {unreadCount > 0 && <Tag color="blue">{unreadCount} chưa đọc</Tag>}
          </Space>
        }
        placement="right"
        width={460}
        open={open}
        onClose={() => setOpen(false)}
        extra={
          unreadCount > 0 ? (
            <Button
              type="text"
              icon={<CheckOutlined />}
              loading={markAllRead.isPending}
              onClick={() => markAllRead.mutate()}
            >
              Đọc tất cả
            </Button>
          ) : null
        }
      >
        <div className="notification-center-toolbar">
          <Segmented
            value={unreadOnly ? "unread" : "all"}
            options={[
              { label: "Tất cả", value: "all" },
              { label: "Chưa đọc", value: "unread" },
            ]}
            onChange={(value) => setUnreadOnly(value === "unread")}
          />
          <Typography.Text type="secondary">
            Đồng bộ trên mọi thiết bị
          </Typography.Text>
        </div>

        <Spin spinning={listQuery.isLoading}>
          {hasAny ? (
            <>
              <List
                className="notification-center-list"
                dataSource={items}
                locale={{ emptyText: "Không có thông báo phù hợp" }}
                renderItem={(item) => (
                  <List.Item
                    className={`notification-center-item ${
                      item.status === "UNREAD" ? "is-unread" : ""
                    }`}
                    onClick={() => openNotification(item)}
                  >
                    {item.status === "UNREAD" && (
                      <span className="notification-center-dot" />
                    )}
                    <div style={{ width: "100%" }}>
                      <div className="notification-center-title">
                        <Space size={6} align="start">
                          <Tag
                            color={severityColor[item.severity]}
                            style={{ marginInlineEnd: 0 }}
                          >
                            {item.moduleCode === "purchases"
                              ? "Mua hàng"
                              : item.moduleCode}
                          </Tag>
                          <Typography.Text strong>
                            {item.title}
                          </Typography.Text>
                        </Space>
                        <span className="notification-center-time">
                          {relativeTime(item.occurredAt || item.createdAt)}
                        </span>
                      </div>
                      <Typography.Text className="notification-center-body">
                        {item.body}
                      </Typography.Text>
                    </div>
                  </List.Item>
                )}
              />

              {!unreadOnly && hasContracts && (
                <div
                  className="notification-legacy-card"
                  onClick={() => {
                    setOpen(false);
                    navigate("/contracts/expiry-report");
                  }}
                >
                  <Space align="start">
                    <FileTextOutlined
                      style={{ color: "#1677ff", marginTop: 4 }}
                    />
                    <div>
                      <Typography.Text strong>
                        Cảnh báo thời hạn hợp đồng
                      </Typography.Text>
                      <br />
                      <Typography.Text type="secondary">
                        {expiringCount} sắp hết hạn, {expiredCount} đã quá hạn
                      </Typography.Text>
                    </div>
                  </Space>
                </div>
              )}
            </>
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Không có thông báo"
              style={{ marginTop: 72 }}
            />
          )}
        </Spin>
      </Drawer>
    </>
  );
}
