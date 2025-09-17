import {notification } from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";

/**
 * Icon mặc định cho từng loại thông báo
 */
const ICONS = {
  success: <CheckCircleOutlined style={{ color: "#10b981" }} />,
  error: <CloseCircleOutlined style={{ color: "#ef4444" }} />,
  info: <InfoCircleOutlined style={{ color: "#0ea5e9" }} />,
  warning: <ExclamationCircleOutlined style={{ color: "#f59e0b" }} />,
};

type NotiPlacement = "topLeft" | "topRight" | "bottomLeft" | "bottomRight";

interface NotifyOptions {
  title?: string;
  description?: string;
  placement?: NotiPlacement;
  duration?: number;
}

/**
 * Notification API chuẩn hoá
 */
export const notify = {
  success: (message: string, opts: NotifyOptions = {}) =>
    notification.open({
      message: opts.title || "Thành công",
      description: message,
      icon: ICONS.success,
      placement: opts.placement || "topRight",
      duration: opts.duration ?? 3,
      style: { borderLeft: "4px solid #10b981" },
    }),
  error: (message: string, opts: NotifyOptions = {}) =>
    notification.open({
      message: opts.title || "Lỗi",
      description: message,
      icon: ICONS.error,
      placement: opts.placement || "topRight",
      duration: opts.duration ?? 4,
      style: { borderLeft: "4px solid #ef4444" },
    }),
  info: (message: string, opts: NotifyOptions = {}) =>
    notification.open({
      message: opts.title || "Thông tin",
      description: message,
      icon: ICONS.info,
      placement: opts.placement || "topRight",
      duration: opts.duration ?? 3,
      style: { borderLeft: "4px solid #0ea5e9" },
    }),
  warning: (message: string, opts: NotifyOptions = {}) =>
    notification.open({
      message: opts.title || "Cảnh báo",
      description: message,
      icon: ICONS.warning,
      placement: opts.placement || "topRight",
      duration: opts.duration ?? 4,
      style: { borderLeft: "4px solid #f59e0b" },
    }),
};
