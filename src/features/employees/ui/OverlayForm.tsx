import React from "react";
import { Button, Form } from "antd";
import type { FormInstance } from "antd";
import CommonModal from "../../../shared/ui/CommonModal";
import CommonDrawer from "../../../shared/ui/CommonDrawer";

type Variant = "modal" | "drawer";
type Size = "sm" | "md" | "lg" | "xl" | "xtra";

export interface OverlayFormProps {
  title: string;
  open: boolean;
  onClose: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  confirmClose?: boolean;
  fullHeight?: boolean;
  children: (ctx: { form: FormInstance }) => React.ReactNode;
  footerRender?: (ctx: {
    submitting: boolean;
    submit: () => void;
    close: () => void;
  }) => React.ReactNode;
  okText?: string;
  cancelText?: string;
}

export default function OverlayForm({
  title,
  open,
  onClose,
  variant = "drawer",
  size = "lg",
  loading,
  confirmClose = true,
  fullHeight = true,
  children,
  footerRender,
  okText = "Lưu",
  cancelText = "Hủy",
}: OverlayFormProps) {
  const [form] = Form.useForm();

  const submit = () => form.submit();
  const close = onClose;

  if (variant === "modal") {
    return (
      <CommonModal
        title={title}
        open={open}
        onCancel={close}
        onOk={submit}
        loading={!!loading}
        size={size === "xl" ? "lg" : size}
        footer={
          footerRender
            ? footerRender({ submitting: !!loading, submit, close })
            : undefined
        }
        okText={okText}
        cancelText={cancelText}
      >
        {children({ form })}
      </CommonModal>
    );
  }

  return (
    <CommonDrawer
      title={title}
      open={open}
      onClose={close}
      confirmClose={confirmClose}
      fullHeight={fullHeight}
      loading={!!loading}
      footer={
        footerRender ? (
          footerRender({ submitting: !!loading, submit, close })
        ) : (
          <div style={{ textAlign: "right" }}>
            <Button onClick={close} style={{ marginRight: 8 }}>
              {cancelText}
            </Button>
            <Button type="primary" onClick={submit} loading={!!loading}>
              {okText}
            </Button>
          </div>
        )
      }
    >
      {children({ form })}
    </CommonDrawer>
  );
}
