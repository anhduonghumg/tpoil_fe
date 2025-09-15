import { Modal } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import React from "react";

export const confirmDialog = {
  delete: (title: string, content: string, onOk: () => void) =>
    Modal.confirm({
      title,
      icon: <ExclamationCircleOutlined style={{ color: "#f59e0b" }} />,
      content,
      okText: "Xoá",
      cancelText: "Huỷ",
      okButtonProps: { danger: true },
      centered: true,
      onOk,
    }),
  confirm: (title: string, content: string, onOk: () => void) =>
    Modal.confirm({
      title,
      icon: <ExclamationCircleOutlined style={{ color: "#0ea5e9" }} />,
      content,
      okText: "Đồng ý",
      cancelText: "Huỷ",
      centered: true,
      onOk,
    }),
};
