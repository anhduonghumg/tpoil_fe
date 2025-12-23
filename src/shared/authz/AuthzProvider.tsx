// shared/authz/AuthzProvider.tsx
import React, { createContext, useContext, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { PermCode } from "./perms";
import { APP_BOOTSTRAP_QUERY_KEY } from "../../features/app/hooks";

type AuthzValue = {
  ready: boolean;
  permissions: Set<PermCode>;
  raw: PermCode[];
};

const AuthzCtx = createContext<AuthzValue>({
  ready: false,
  permissions: new Set(),
  raw: [],
});

export function AuthzProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const bootstrap: any = qc.getQueryData(APP_BOOTSTRAP_QUERY_KEY);
  const qs = qc.getQueryState(APP_BOOTSTRAP_QUERY_KEY);

  const raw = (bootstrap?.auth?.permissions ?? []) as PermCode[];

  const value = useMemo<AuthzValue>(() => {
    const ready = qs?.status === "success";
    return { ready, raw, permissions: new Set(raw) };
  }, [qs?.status, raw]);

  return <AuthzCtx.Provider value={value}>{children}</AuthzCtx.Provider>;
}

export function useAuthz() {
  return useContext(AuthzCtx);
}
