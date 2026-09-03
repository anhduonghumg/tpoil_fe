import type { AxiosError, AxiosInstance } from "axios";
import { Modal } from "antd";
import { QueryClient } from "@tanstack/react-query";
import { AuthApi } from "../../features/auth/api";
import { saveUserToCache } from "../../features/auth/session";

let handled = false;

/**
 * Người dùng tự bấm đăng xuất thì cookie phiên bị xóa ngay, nhưng các request đang
 * bay dở (bootstrap, đếm thông báo chưa đọc, auth.me…) vẫn về sau đó với 401
 * SESSION_EXPIRED. Nếu không đánh dấu, họ sẽ thấy hộp thoại "Phiên đã hết hạn" dù
 * chính họ vừa chủ động thoát ra.
 */
let loggingOut = false;

const BC =
  typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel("erp-auth")
    : null;

export function beginIntentionalLogout() {
  loggingOut = true;
}

export function endIntentionalLogout() {
  loggingOut = false;
}

/** Đang ở màn đăng nhập thì báo "hết phiên" là thừa — người dùng đã ở đúng chỗ rồi. */
function onLoginScreen() {
  return window.location.pathname.startsWith("/login");
}

function shouldStaySilent() {
  return loggingOut || onLoginScreen();
}

async function hardLogout() {
  // Bản thân lời gọi logout này cũng trả 401 vì phiên đã chết — đừng để nó bật lại hộp thoại.
  loggingOut = true;
  try {
    await AuthApi.logout();
    const qc = new QueryClient();
    qc.clear();
    saveUserToCache(null as any);
    window.location.href = "/login";
  } catch {}
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
      if (status === 401 && code === "SESSION_EXPIRED" && !shouldStaySilent()) {
        BC?.postMessage({ type: "SESSION_EXPIRED" });
        showExpiredModal();
      }
      return Promise.reject(error);
    }
  );

  if (BC) {
    BC.onmessage = (ev) => {
      if (ev.data?.type === "SESSION_EXPIRED") showExpiredModal();
    };
  }
}
