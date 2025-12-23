import React from "react";
import { Result } from "antd";
import { useCan } from "./useCan";
import type { Need } from "./authz";

export function RouteGuard({
  need,
  children,
}: {
  need: Need;
  children: React.ReactNode;
}) {
  const { ready, can } = useCan();
  if (!ready) return null;

  if (!can(need)) {
    return (
      <Result status="403" title="403" subTitle="Bạn không có quyền truy cập" />
    );
  }

  return <>{children}</>;
}
