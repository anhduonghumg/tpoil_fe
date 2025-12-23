import React from "react";
import { useCan } from "./useCan";
import type { Need } from "./authz";

export function PermissionGate({
  need,
  children,
  fallback = null,
}: {
  need: Need;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { ready, can } = useCan();
  if (!ready) return fallback;
  return can(need) ? <>{children}</> : <>{fallback}</>;
}
