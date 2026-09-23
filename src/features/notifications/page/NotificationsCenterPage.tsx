import { Badge, Button, Empty, Segmented, Space, Spin, Tabs, Tag, Tooltip, Typography } from "antd";
import { CheckOutlined } from "@ant-design/icons";
import { useState } from "react";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationSummary,
  useNotifications,
  useNotificationWorkItems,
} from "../hooks";
import { notificationPath } from "../notification-navigation";
import type { CommonNotification, NotificationTab } from "../types";
import "../notification-center.css";

type CenterTab = "TASKS" | NotificationTab | "ALL";

const tabs: Array<{ value: CenterTab; label: string }> = [
  { value: "TASKS", label: "Cần xử lý" },
  { value: "SALES", label: "Bán hàng" },
  { value: "PURCHASES", label: "Mua hàng" },
  { value: "OPERATIONS", label: "Kho & vận chuyển" },
  { value: "FINANCE", label: "Tài chính & công nợ" },
  { value: "SYSTEM", label: "Hệ thống" },
  { value: "ALL", label: "Tất cả" },
];

/* Nhãn phân hệ trên từng thông báo. Trước đây thẻ in thẳng mã ("SALES", "SYSTEM"). */
const TAB_LABELS: Record<string, string> = {
  SALES: "Bán hàng",
  PURCHASES: "Mua hàng",
  OPERATIONS: "Kho & vận chuyển",
  FINANCE: "Tài chính",
  SYSTEM: "Hệ thống",
  GENERAL: "Chung",
};

/** Thời gian kiểu hộp thư: mới thì "5 phút trước", cũ thì ghi ngày giờ. */
function timeText(value: string) {
  const at = dayjs(value);
  const minutes = dayjs().diff(at, "minute");
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  if (at.isSame(dayjs(), "day")) return `${dayjs().diff(at, "hour")} giờ trước`;
  if (at.isSame(dayjs().subtract(1, "day"), "day")) return `Hôm qua ${at.format("HH:mm")}`;
  return at.format(at.isSame(dayjs(), "year") ? "DD/MM HH:mm" : "DD/MM/YYYY HH:mm");
}

/**
 * Trung tâm thông báo.
 *
 * Bố cục gọn theo kiểu hộp thư: tiêu đề và nút "Đọc tất cả" chung một hàng, dải tab kèm bộ
 * lọc Tất cả/Chưa đọc chung một hàng, mỗi thông báo một dòng — tiêu đề, nội dung rút gọn,
 * thời gian dồn phải. Trước đây là Card + ba dải chồng nhau và mỗi thông báo cao gần 80px.
 */
export default function NotificationsCenterPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<CenterTab>("TASKS");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const summary = useNotificationSummary();
  const updates = useNotifications({
    unreadOnly,
    ...(tab !== "TASKS" && tab !== "ALL" ? { tab } : {}),
  });
  const workItems = useNotificationWorkItems();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const isTasks = tab === "TASKS";
  const items = isTasks ? workItems.data?.items ?? [] : updates.data?.items ?? [];
  const loading = isTasks ? workItems.isLoading : updates.isLoading;

  const count = (value: CenterTab) =>
    value === "TASKS"
      ? summary.data?.openWorkItems ?? 0
      : value === "ALL"
        ? summary.data?.unread ?? 0
        : summary.data?.tabs[value]?.unread ?? 0;

  const open = (item: CommonNotification) => {
    if (item.status === "UNREAD") markRead.mutate(item.id);
    const path = notificationPath(item);
    if (path) navigate(path);
  };

  return (
    <div className="notification-center-page">
      <Tabs
        className="notification-center-tabs"
        size="small"
        activeKey={tab}
        onChange={(key) => setTab(key as CenterTab)}
        items={tabs.map((item) => ({
          key: item.value,
          label: (
            <Space size={6}>
              {item.label}
              {count(item.value) ? (
                <Badge count={count(item.value)} size="small" color={item.value === "TASKS" ? "#fa8c16" : undefined} />
              ) : null}
            </Space>
          ),
        }))}
        tabBarExtraContent={{
          // Không còn hàng tiêu đề riêng: mọi thao tác dồn lên cùng hàng với dải tab.
          right: (
            <Space size={8}>
              {/* "Cần xử lý" là danh sách việc còn mở, không có khái niệm đã đọc/chưa đọc. */}
              {isTasks ? null : (
                <Segmented
                  size="small"
                  value={unreadOnly ? "unread" : "all"}
                  options={[
                    { label: "Tất cả", value: "all" },
                    { label: "Chưa đọc", value: "unread" },
                  ]}
                  onChange={(value) => setUnreadOnly(value === "unread")}
                />
              )}
              <Button
                size="small"
                type="text"
                icon={<CheckOutlined />}
                disabled={!summary.data?.unread}
                loading={markAllRead.isPending}
                onClick={() => markAllRead.mutate()}
              >
                Đọc tất cả
              </Button>
            </Space>
          ),
        }}
      />

      <Spin spinning={loading}>
        {items.length ? (
          <div className="notification-center-list" role="list">
            {items.map((item) => {
              const unread = item.status === "UNREAD";
              const isAction = item.kind === "ACTION";
              return (
                <div
                  key={item.id}
                  role="listitem"
                  tabIndex={0}
                  className={`notification-center-row${unread ? " is-unread" : ""}`}
                  onClick={() => open(item)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") open(item);
                  }}
                >
                  <span className="notification-center-dot" aria-label={unread ? "Chưa đọc" : undefined} />
                  <Tag
                    className="notification-center-tag"
                    color={isAction ? "orange" : item.severity === "ERROR" ? "red" : "blue"}
                  >
                    {isAction ? "Cần xử lý" : TAB_LABELS[item.tab] ?? item.tab}
                  </Tag>
                  <div className="notification-center-text">
                    <span className="notification-center-title">{item.title}</span>
                    {item.body ? (
                      <Tooltip title={item.body} placement="topLeft" mouseEnterDelay={0.6}>
                        <span className="notification-center-body">{item.body}</span>
                      </Tooltip>
                    ) : null}
                  </div>
                  <Tooltip title={dayjs(item.occurredAt).format("DD/MM/YYYY HH:mm")}>
                    <span className="notification-center-time">{timeText(item.occurredAt)}</span>
                  </Tooltip>
                </div>
              );
            })}
          </div>
        ) : (
          <Empty
            className="notification-center-empty"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={isTasks ? "Không còn việc nào cần xử lý" : "Không có thông báo phù hợp"}
          />
        )}
      </Spin>
    </div>
  );
}
