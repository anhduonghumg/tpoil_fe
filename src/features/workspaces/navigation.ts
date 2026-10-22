import type { WorkspaceMenuItem } from "./types";

// Only restrict areas that have explicit permissions in the current application.
// Purchase, banking, legal and executive do not yet have separate workspace permissions.
const WORKSPACE_PERMISSIONS: Record<string, string[]> = {
  sales: ["sales.view", "sales.delivery.confirm", "sales.invoice.view", "sales.invoice.issue", "sales.receivable.view", "sales.profitability.view", "sales.credit.manage", "sales.alias.manage"],
  operations: ["operations.view", "operations.road.manage"],
  warehouse: ["operations.view", "operations.warehouse.manage", "sales.delivery.confirm"],
  admin: ["users.view", "system.rbac.admin"],
};

export function canAccessWorkspace(key: string, permissions: ReadonlySet<string>) {
  if (permissions.has("system.rbac.admin")) return true;
  const required = WORKSPACE_PERMISSIONS[key];
  return !required || required.some((permission) => permissions.has(permission));
}

export function getWorkspaceHome(key: string, permissions?: ReadonlySet<string>) {
  if (permissions && !permissions.has("system.rbac.admin")) {
    if (key === "operations" && !permissions.has("operations.view")) return "/operations/vehicle-dispatches";
    if (key === "warehouse" && !permissions.has("operations.view")) return permissions.has("sales.delivery.confirm") ? "/sales/deliveries" : "/operations/daily-stock-reconciliation";
    if (key === "sales" && !permissions.has("sales.view")) {
      if (permissions.has("sales.delivery.confirm")) return "/sales/deliveries";
      if (permissions.has("sales.invoice.view") || permissions.has("sales.invoice.issue")) return "/sales/invoices";
      if (permissions.has("sales.receivable.view")) return "/sales/receivables";
      if (permissions.has("sales.profitability.view")) return "/sales/reports";
      if (permissions.has("sales.credit.manage")) return "/sales/credit";
      if (permissions.has("sales.alias.manage")) return "/sales/aliases";
    }
  }
  if (key === "banking") return "/banking";
  if (key === "operations") return "/operations";
  if (key === "warehouse") return "/operations/warehouse-dashboard";
  return "/dashboard";
}

export function getSelectedMenuKey(items: WorkspaceMenuItem[], pathname: string): string | undefined {
  const keys = items.flatMap((item): string[] =>
    item.children?.length
      ? [getSelectedMenuKey(item.children, pathname)].filter((key): key is string => !!key)
      : item.key.startsWith("/") && (pathname === item.key || pathname.startsWith(item.key + "/"))
        ? [item.key]
        : [],
  );
  return keys.sort((a, b) => b.length - a.length)[0];
}

export function getMenuAncestors(items: WorkspaceMenuItem[], selectedKey: string): string[] {
  for (const item of items) {
    if (item.key === selectedKey) return [];
    if (!item.children?.length) continue;
    const childContains = getSelectedMenuKey(item.children, selectedKey) === selectedKey;
    if (childContains) {
      const ancestors = getMenuAncestors(item.children, selectedKey);
      return item.type === "group" ? ancestors : [item.key, ...ancestors];
    }
  }
  return [];
}
