import type { AxiosError, AxiosInstance } from "axios";
import { Modal } from "antd";
import { QueryClient } from "@tanstack/react-query";
import { AuthApi } from "../../features/auth/api";
import { saveUserToCache } from "../../features/auth/session";

let handled = false;
const BC =
  typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel("erp-auth")
    : null;

async function hardLogout() {
  try {
    await AuthApi.logout();
    const qc = new QueryClient();
    qc.clear();
    saveUserToCache(null as any);
    window.location.href = "/login";
  } catch {}
}

function showExpiredModal() {
  if (handled) return;
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
      if (status === 401 && code === "SESSION_EXPIRED") {
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
