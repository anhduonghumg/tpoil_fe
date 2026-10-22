import React from "react";
import { Badge } from "antd";

type MenuEntry = {
  key: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  type?: string;
  children?: MenuEntry[];
};

export function getMenuTaskCount(item: MenuEntry, counts: Record<string, number>): number {
  if (item.children?.length) return item.children.reduce((sum, child) => sum + getMenuTaskCount(child, counts), 0);
  const count = counts[item.key];
  return Number.isSafeInteger(count) && count > 0 ? count : 0;
}

// Decorate only the already-authorized menu. Hidden children never contribute
// to a parent badge, and missing counts are not presented as zero work.
export function withMenuTaskCounts(items: MenuEntry[], counts: Record<string, number> = {}, collapsed = false): MenuEntry[] {
  return items.map((item) => {
    const count = getMenuTaskCount(item, counts);
    const children = item.children ? withMenuTaskCounts(item.children, counts, collapsed) : undefined;
    if (item.type === "group") return { ...item, children };
    const title = typeof item.label === "string" ? item.label : "";
    const description = title + (count ? ", " + count + " việc được giao đang chờ xử lý" : "");
    return {
      ...item,
      children,
      title: description,
      icon: collapsed && count && item.icon ? <Badge dot className="app-menu-task-dot">{item.icon}</Badge> : item.icon,
      label: <span className="app-menu-task-label" title={description}>
        <span className="app-menu-task-text">{item.label}</span>
        {count > 0 && <span className="app-menu-task-count" aria-label={count + " việc được giao đang chờ xử lý"}>
          <Badge count={count} overflowCount={99} size="small" />
        </span>}
      </span>,
    } as MenuEntry;
  });
}
