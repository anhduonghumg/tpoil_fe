import { Navigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import SplashScreen from "./SplashScreen";
import { AuthApi } from "../features/auth/api";
import { clearUserCache, loadUserFromCache } from "../features/auth/session";
import { loadLastRoute } from "../shared/lib/lastRoute";

/**
 * Chặn màn đăng nhập với người đang còn phiên: gõ thẳng /login sẽ quay lại màn hình
 * đang làm dở chứ không bắt đăng nhập lại.
 *
 * Cache người dùng ở localStorage chỉ nói "lần trước có đăng nhập", không chứng minh
 * cookie phiên còn sống. Nên phải hỏi lại server một nhịp; nếu phiên đã chết thì xóa
 * cache và hiện form đăng nhập như bình thường. Nếu tin cache mà chuyển hướng ngay,
 * PrivateShell sẽ đá ngược về /login và thành vòng lặp.
 */
export default function RequireAnonymous({
  children,
}: {
  children: React.ReactNode;
}) {
  const location = useLocation();

  // Vừa bị PrivateShell đá ra đây thì đứng yên, đừng chuyển hướng ngược lại.
  const bouncedHere = Boolean((location.state as any)?.from);
  const cached = loadUserFromCache();
  const shouldVerify = !bouncedHere && Boolean(cached);

  const sessionQuery = useQuery({
    queryKey: ["auth", "me", "login-page-check"],
    queryFn: AuthApi.me,
    enabled: shouldVerify,
    retry: false,
    gcTime: 0,
    staleTime: 0,
  });

  if (!shouldVerify) return <>{children}</>;

  if (sessionQuery.isPending) return <SplashScreen />;

  if (sessionQuery.isError) {
    clearUserCache();
    return <>{children}</>;
  }

  const redirectTo =
    new URLSearchParams(location.search).get("redirectTo") || loadLastRoute();

  return <Navigate to={redirectTo} replace />;
}
