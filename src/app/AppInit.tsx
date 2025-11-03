import { useEffect, useState } from "react";
import SplashScreen from "./SplashScreen";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { loadUserFromCache } from "../features/auth/session";

export default function AppInit() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const start = performance.now();
    loadUserFromCache();
    const delay = 500 - (performance.now() - start);
    const t = setTimeout(() => setReady(true), Math.max(delay, 0));
    return () => clearTimeout(t);
  }, []);

  if (!ready) return <SplashScreen />;
  return <RouterProvider router={router} />;
}
