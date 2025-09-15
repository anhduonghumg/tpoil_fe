import { message } from "antd";

export const toast = {
  success: (msg: string) =>
    message.open({ type: "success", content: msg, style: { fontWeight: 500 } }),
  error: (msg: string) =>
    message.open({ type: "error", content: msg, style: { fontWeight: 500 } }),
  info: (msg: string) =>
    message.open({ type: "info", content: msg, style: { fontWeight: 500 } }),
  warning: (msg: string) =>
    message.open({ type: "warning", content: msg, style: { fontWeight: 500 } }),
};
