import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE } from "../../config/env";
import { NotificationsApi } from "./api";

export const notificationKeys = {
  all: ["common-notifications"] as const,
  list: (unreadOnly: boolean) =>
    ["common-notifications", "list", unreadOnly] as const,
  unreadCount: ["common-notifications", "unread-count"] as const,
};

export function useNotifications(unreadOnly = false) {
  return useQuery({
    queryKey: notificationKeys.list(unreadOnly),
    queryFn: () => NotificationsApi.list({ unreadOnly, limit: 40 }),
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

