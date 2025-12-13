import { Modal } from "antd";
import React, { ReactNode } from "react";
import { MODAL_WIDTH_PERCENT, MODAL_MAX_WIDTH } from "./sizes";

export type ModalSize = keyof typeof MODAL_WIDTH_PERCENT;

export interface CommonModalProps {
  title: string;
  open: boolean;
  onCancel: () => void;
  onOk?: () => void;
  okText?: string;
  cancelText?: string;
  children: ReactNode;
  size?: ModalSize;
  loading?: boolean;
  centered?: boolean;
  destroyOnClose?: boolean;
  maskClosable?: boolean;
  footer?: ReactNode | null;
}

export const CommonModal: React.FC<CommonModalProps> = ({
  title,
  open,
  onCancel,
  onOk,
  okText = "Lưu",
  cancelText = "Hủy",
  children,
  size = "md",
  loading,
  centered = true,
  destroyOnClose = true,
  maskClosable = false,
  footer,
}) => {
  const width = MODAL_WIDTH_PERCENT[size];
  const maxWidth = MODAL_MAX_WIDTH[size];

  return (
    <Modal
      className="small-scrollbar-modal"
      title={title}
      open={open}
      onCancel={onCancel}
      onOk={onOk}
      okText={okText}
      cancelText={cancelText}
      confirmLoading={loading}
      centered={centered}
      destroyOnClose={destroyOnClose}
      maskClosable={maskClosable}
      width={width}
      style={{ maxWidth }}
      footer={footer}
      styles={{
        header: { fontWeight: 600 },
        body: { maxHeight: "70vh", overflowY: "auto", overflowX: "hidden" },
      }}
    >
      {children}
    </Modal>
  );
};

export default CommonModal;
