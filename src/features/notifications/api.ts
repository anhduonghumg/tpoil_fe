import { apiCall } from "../../shared/lib/api";
import type { CommonNotification, NotificationListResult } from "./types";

const unwrap = <T,>(response: any) =>
  (response.data?.data ?? response.data) as T;

export const NotificationsApi = {
  list: (query?: {
    unreadOnly?: boolean;
    cursor?: string;
    limit?: number;
  }) =>
    apiCall("notifications.list", { query }).then(unwrap<NotificationListResult>),

  unreadCount: () =>
    apiCall("notifications.unreadCount").then(unwrap<{ count: number }>),

  markRead: (id: string) =>
    apiCall("notifications.markRead", { params: { id }, data: {} }).then(
      unwrap<{ ok: boolean }>,
    ),

  markAllRead: () =>
    apiCall("notifications.markAllRead", { data: {} }).then(
      unwrap<{ updated: number }>,
    ),

  preferences: () =>
    apiCall("notifications.preferences").then(unwrap<any[]>),

  updatePreference: (data: {
    category: string;
    inAppEnabled?: boolean;
    pushEnabled?: boolean;
    emailEnabled?: boolean;
    muteUntil?: string | null;
  }) =>
    apiCall("notifications.updatePreference", { data }).then(unwrap<any>),

  registerDevice: (data: {
    deviceId: string;
    platform: "WEB" | "IOS" | "ANDROID";
    pushProvider?: "FCM" | "APNS";
    pushToken?: string;
    appVersion?: string;
    locale?: string;
  }) =>
    apiCall("notifications.registerDevice", { data }).then(unwrap<any>),

  disableDevice: (deviceId: string) =>
    apiCall("notifications.disableDevice", {
      params: { deviceId },
    }).then(unwrap<any>),
};

export type { CommonNotification };

