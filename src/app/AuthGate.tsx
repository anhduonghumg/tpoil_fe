import { useEffect, useRef, useState } from "react";
import SplashScreen from "./SplashScreen";
import { useNavigate, useLocation } from "react-router-dom";
import { useMe } from "../features/auth/hooks";

type Props = {
  children: React.ReactNode;
  loginPath?: string;
  minSplashMs?: number;
};

export default function AuthGate({
  children,
  loginPath = "/login",
  minSplashMs = 400,
}: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: user, isLoading, isError } = useMe();

  const mountedAt = useRef(Date.now());
  const [allowRender, setAllowRender] = useState(false);
  useEffect(() => {
    const minLeft = Math.max(0, minSplashMs - (Date.now() - mountedAt.current));
    const t = setTimeout(() => setAllowRender(true), minLeft);
    return () => clearTimeout(t);
  }, [minSplashMs]);

  if (!allowRender || isLoading) return <SplashScreen />;

  if ((!user || isError) && location.pathname !== loginPath) {
    navigate(loginPath, { replace: true, state: { from: location.pathname } });
    return <SplashScreen />;
  }

  return <>{children}</>;
}
