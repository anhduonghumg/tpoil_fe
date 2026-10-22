import type { AxiosError, AxiosInstance } from "axios";
import { Modal } from "antd";
import { QueryClient } from "@tanstack/react-query";
import { AuthApi } from "../../features/auth/api";
import { clearUserCache, saveUserToCache } from "../../features/auth/session";

let handled = false;

/**
 * Người dùng tự bấm đăng xuất thì cookie phiên bị xóa ngay, nhưng các request đang
 * bay dở (bootstrap, đếm thông báo chưa đọc, auth.me…) vẫn về sau đó với 401
 * SESSION_EXPIRED. Nếu không đánh dấu, họ sẽ thấy hộp thoại "Phiên đã hết hạn" dù
 * chính họ vừa chủ động thoát ra.
 */
let loggingOut = false;

/**
 * Tab này đã thực sự vào được hệ thống chưa (auth.me + bootstrap đều OK).
 * Chưa vào được mà gặp 401 thì chỉ là "chưa đăng nhập" / cookie cũ đã chết từ trước —
 * đưa thẳng về màn login, không bật hộp thoại "hết phiên" gây khó chịu.
 */
let sessionConfirmed = false;

const AUTH_ERROR_CODES = new Set(["SESSION_EXPIRED", "NOT_AUTHENTICATED"]);

const BC =
  typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel("erp-auth")
    : null;

export function beginIntentionalLogout() {
  loggingOut = true;
  sessionConfirmed = false;
}

export function endIntentionalLogout() {
  loggingOut = false;
}

export function markSessionConfirmed() {
  sessionConfirmed = true;
}

/** Đang ở màn đăng nhập thì báo "hết phiên" là thừa — người dùng đã ở đúng chỗ rồi. */
function onLoginScreen() {
  return window.location.pathname.startsWith("/login");
}

function shouldStaySilent() {
  return loggingOut || onLoginScreen();
}

let redirecting = false;

/** Về màn login ngay, nhớ trang đang mở để đăng nhập xong quay lại đúng chỗ. */
function redirectToLogin() {
  if (redirecting) return;
  redirecting = true;
  clearUserCache();
  const { pathname, search } = window.location;
  const current = `${pathname}${search}`;
  const qs =
    current && current !== "/"
      ? `?redirectTo=${encodeURIComponent(current)}`
      : "";
  window.location.replace(`/login${qs}`);
}

async function hardLogout() {
  // Bản thân lời gọi logout này cũng trả 401 vì phiên đã chết — đừng để nó bật lại hộp thoại.
  loggingOut = true;
  try {
    await AuthApi.logout();
  } catch {}
  const qc = new QueryClient();
  qc.clear();
  saveUserToCache(null as any);
  window.location.href = "/login";
}

function showExpiredModal() {
  if (handled || shouldStaySilent()) return;
  handled = true;
  Modal.warning({
    title: "Phiên đã hết hạn",
    content: "Vui lòng đăng nhập lại để tiếp tục.",
    okText: "Đăng nhập lại",
    maskClosable: false,
    onOk: hardLogout,
    afterClose: () => {
      handled = false;
    },
  });
}

export function installSessionExpiredInterceptor(http: AxiosInstance) {
  http.interceptors.response.use(
    (res) => res,
    (error: AxiosError<any>) => {
      const status = error?.response?.status;
      const code = error?.response?.data?.error?.code;
      if (status === 401 && AUTH_ERROR_CODES.has(code) && !shouldStaySilent()) {
        if (sessionConfirmed) {
          BC?.postMessage({ type: "SESSION_EXPIRED" });
          showExpiredModal();
        } else {
          redirectToLogin();
        }
      }
      return Promise.reject(error);
    }
  );

  if (BC) {
    BC.onmessage = (ev) => {
      // Tab chưa vào được hệ thống thì không cần hộp thoại — nó sẽ tự về login khi gọi API.
      if (ev.data?.type === "SESSION_EXPIRED" && sessionConfirmed)
        showExpiredModal();
    };
  }
}
