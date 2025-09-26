import type { Method } from "axios";
type RouteTuple = readonly [Method, string];

export const ROUTES = {
  auth: {
    login: ["POST", "/auth/login"] as const,
    logout: ["POST", "/auth/logout"] as const,
    me: ["GET", "/auth/me"] as const,
  },
  dashboard: {
    index: ["/dashboard"] as const,
  },
  user: {
    list: ["GET", "/users"] as RouteTuple,
    create: ["POST", "/users"] as RouteTuple,
    detail: ["GET", "/users/:id"] as RouteTuple,
    update: ["PUT", "/users/:id"] as RouteTuple,
    delete: ["DELETE", "/users/:id"] as RouteTuple,

    departments: ["GET", "/users/departments"] as RouteTuple,
    roles: ["GET", "/users/roles"] as RouteTuple,
  },
  department: {
    list: ["GET", "/departments"] as RouteTuple,
    all: ["GET", "/departments/all"] as RouteTuple,
    tree: ["GET", "/departments/tree"] as RouteTuple,
    create: ["POST", "/departments"] as RouteTuple,
    detail: ["GET", "/departments/:id"] as RouteTuple,
    update: ["PATCH", "/departments/:id"] as RouteTuple,
    delete: ["DELETE", "/departments/:id"] as RouteTuple,
    deleteMultiple: ["POST", "/departments/delete-multiple"] as RouteTuple,
    sites: ["GET", "/departments/sites"] as RouteTuple,
  },
};

export function buildPath(
  path: string,
  params?: Record<string, string | number>
) {
  if (!params) return path;
  return path.replace(/:([A-Za-z0-9_]+)/g, (_, k) =>
    encodeURIComponent(String(params[k] ?? ""))
  );
}
