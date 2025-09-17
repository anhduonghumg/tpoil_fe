// src/shared/ui/CommonDrawer.tsx
import { Drawer, Modal } from "antd";
import React, { ReactNode } from "react";
import { DRAWER_MAX_WIDTH, DRAWER_WIDTH_PERCENT } from "./sizes";

export type DrawerSize = keyof typeof DRAWER_WIDTH_PERCENT;

export interface CommonDrawerProps {
  title: string;
  open: boolean;
  onClose: () => void;
  size?: DrawerSize;
  children: ReactNode;
  destroyOnClose?: boolean;
  maskClosable?: boolean;
  extra?: ReactNode;
  loading?: boolean;
  confirmClose?: boolean;
  footer?: ReactNode;
  fullHeight?: boolean;
}

export const CommonDrawer: React.FC<CommonDrawerProps> = ({
  title,
  open,
  onClose,
  size = "md",
  children,
  destroyOnClose = true,
  maskClosable = false,
  extra,
  loading,
  confirmClose = false,
  footer,
  fullHeight = false,
}) => {
  const handleClose = () => {
    if (!confirmClose) return onClose();
    Modal.confirm({
      title: "Xác nhận",
      content: "Bạn có chắc chắn muốn đóng mà không lưu thay đổi?",
      okText: "Đồng ý",
      cancelText: "Hủy",
      onOk: onClose,
    });
  };

  const width = DRAWER_WIDTH_PERCENT[size];
  const maxWidth = DRAWER_MAX_WIDTH[size];

  return (
    <Drawer
      title={title}
      open={open}
      onClose={handleClose}
      width={width}
      styles={{
        body: {
          paddingBottom: 24,
          height: fullHeight ? "calc(100vh - 110px)" : "auto",
          overflowY: "auto",
          maxWidth,
        },
        header: { fontWeight: 600 },
      }}
      maskClosable={maskClosable}
      destroyOnClose={destroyOnClose}
      extra={extra}
      footer={footer}
    >
      <div style={{ opacity: loading ? 0.5 : 1 }}>{children}</div>
    </Drawer>
  );
};

export default CommonDrawer;
