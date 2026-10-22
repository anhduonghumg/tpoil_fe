import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE } from "../../config/env";
import { NotificationsApi } from "./api";
import type { NotificationKind, NotificationTab } from "./types";

export const notificationKeys = {
  all: ["common-notifications"] as const,
  list: (input: { unreadOnly?: boolean; tab?: NotificationTab; kind?: NotificationKind }) =>
    ["common-notifications", "list", input] as const,
  unreadCount: ["common-notifications", "unread-count"] as const,
  summary: ["common-notifications", "summary"] as const,
  quick: ["common-notifications", "quick"] as const,
  workItems: ["common-notifications", "work-items"] as const,
};

export function useNotifications(input: { unreadOnly?: boolean; tab?: NotificationTab; kind?: NotificationKind } = {}) {
  return useQuery({
    queryKey: notificationKeys.list(input),
    queryFn: () => NotificationsApi.list({ ...input, limit: 40 }),
    refetchInterval: 60_000,
  });
}

export function useNotificationSummary({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: notificationKeys.summary,
    queryFn: NotificationsApi.summary,
    enabled,
    staleTime: 15_000,
    refetchInterval: 60_000,
  });
}

export function useNotificationQuick() {
  return useQuery({
    queryKey: notificationKeys.quick,
    queryFn: NotificationsApi.quick,
    refetchInterval: 60_000,
  });
}

export function useNotificationWorkItems() {
  return useQuery({
    queryKey: notificationKeys.workItems,
    queryFn: () => NotificationsApi.workItems({ limit: 40 }),
    refetchInterval: 60_000,
  });
}

export function useNotificationUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: NotificationsApi.unreadCount,
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: NotificationsApi.markRead,
    onSuccess: () => client.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}

export function useMarkAllNotificationsRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: NotificationsApi.markAllRead,
    onSuccess: () => client.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}

export function useArchiveNotification() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: NotificationsApi.archive,
    onSuccess: () => client.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}

export function useNotificationRealtime(enabled = true) {
  const client = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    const source = new EventSource(
      `${API_BASE || "/api"}/notifications/stream`,
      { withCredentials: true },
    );
    const refresh = () =>
      client.invalidateQueries({ queryKey: notificationKeys.all });

    source.addEventListener("notification", refresh);
    return () => {
      source.removeEventListener("notification", refresh);
      source.close();
    };
  }, [client, enabled]);
}
