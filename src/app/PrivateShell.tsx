// app/PrivateShell.tsx
import React, { useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  AppSessionProvider,
  useAppSession,
} from "../shared/authz/AppSessionProvider";
import { saveLastRoute } from "../shared/lib/lastRoute";

function Inner() {
  const nav = useNavigate();
  const loc = useLocation();
  const { loading, me } = useAppSession();

  useEffect(() => {
    if (!loading && !me) {
      nav("/login", { replace: true, state: { from: loc.pathname } });
    }
  }, [loading, me, nav, loc.pathname]);

  // Ghi lại màn đang đứng để nếu người dùng gõ /login lúc còn phiên thì quay lại đây.
  useEffect(() => {
    if (me) saveLastRoute(`${loc.pathname}${loc.search}`);
  }, [me, loc.pathname, loc.search]);

  if (loading) return null;
  if (!me) return null;

  return <Outlet />;
}

export function PrivateShell() {
  return (
    <AppSessionProvider>
      <Inner />
    </AppSessionProvider>
  );
}
