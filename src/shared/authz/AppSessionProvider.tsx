// shared/authz/AppSessionProvider.tsx
import React, { createContext, useContext, useEffect, useMemo } from "react";

import type { PermCode } from "./perms";
import { useMe } from "../../features/auth/hooks";
import { useAppBootstrap } from "../../features/app/hooks";
import { markSessionConfirmed } from "../lib/sessionExpired";

type CtxValue = {
  loading: boolean;
  ready: boolean;
  me: any | null;
  bootstrap: any | null;
  permissions: Set<PermCode>;
  permList: PermCode[];
};

const Ctx = createContext<CtxValue>({
  loading: true,
  ready: false,
  me: null,
  bootstrap: null,
  permissions: new Set(),
  permList: [],
});

function pickPerms(bootstrap: any): PermCode[] {
  return (
    bootstrap?.data?.auth?.permissions ??
    bootstrap?.auth?.permissions ??
    bootstrap?.data?.data?.auth?.permissions ??
    []
  );
}

export function AppSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const meQ = useMe();
  const bootQ = useAppBootstrap({ enabled: !!meQ.data });

  const loading = meQ.isLoading || bootQ.isLoading;
  const me = meQ.data ?? null;
  const bootstrap = bootQ.data ?? null;
  // console.log("AppSessionProvider bootstrap:", bootstrap);

  const permList = useMemo(() => pickPerms(bootstrap), [bootstrap]);
  const permissions = useMemo(() => new Set(permList), [permList]);

  const ready = !!me && !!bootstrap && !loading;

  // Từ đây mới coi là "đang trong phiên": 401 về sau mới đáng báo "Phiên đã hết hạn".
  useEffect(() => {
    if (ready) markSessionConfirmed();
  }, [ready]);

  const value = useMemo(
    () => ({ loading, ready, me, bootstrap, permissions, permList }),
    [loading, ready, me, bootstrap, permissions, permList]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppSession() {
  return useContext(Ctx);
}
