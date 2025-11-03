import React from "react";
import { Button, Form, message } from "antd";
import { CloseCircleOutlined, SaveOutlined } from "@ant-design/icons";
import CustomerCompactForm from "./CustomerCompactForm";
import { useCreateCustomer, useCustomer, useUpdateCustomer } from "../hooks";
import OverlayForm from "../../users/ui/OverlayForm";

export default function CustomerUpsertOverlay({
  mode,
  id,
  open,
  onClose,
  variant = "modal",
}: {
  mode: "create" | "edit";
  id?: string;
  open: boolean;
  onClose: () => void;
  variant?: "drawer" | "modal";
}) {
  const [form] = Form.useForm();
  const createMu = useCreateCustomer();
  const updateMu = useUpdateCustomer(id || "");
  const detail = useCustomer(id);

  React.useEffect(() => {
    if (!(open && mode === "edit")) return;
    if (!detail.data) return;
    form.setFieldsValue(detail.data);
  }, [open, mode, detail.data]);

  // reset khi đóng
  React.useEffect(() => {
    if (!open) form.resetFields();
  }, [open]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        code: (values.code || "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^A-Za-z0-9]/g, "")
          .toUpperCase(),
      };
      if (mode === "create") await createMu.mutateAsync(payload);
      else await updateMu.mutateAsync(payload);
      message.success(
        mode === "create"
          ? "Tạo khách hàng thành công"
          : "Cập nhật khách hàng thành công"
      );
      onClose();
    } catch {}
  };

  const pending =
    mode === "edit"
      ? detail.isLoading || updateMu.isPending
      : createMu.isPending;

  return (
    <OverlayForm
      title={mode === "create" ? "Thêm khách hàng" : "Sửa khách hàng"}
      open={open}
      onClose={onClose}
      variant={variant}
      size="lg"
      loading={pending}
      okText={mode === "create" ? "Lưu" : "Lưu thay đổi"}
      footerRender={({ submitting }: any) => (
        <div style={{ textAlign: "right" }}>
          <Button
            type="default"
            onClick={onClose}
            style={{ marginRight: 8 }}
            disabled={submitting}
            icon={<CloseCircleOutlined />}
          >
            Hủy
          </Button>
          <Button
            type="primary"
            onClick={handleSubmit}
            loading={submitting}
            icon={<SaveOutlined />}
          >
            {mode === "create" ? "Lưu" : "Lưu thay đổi"}
          </Button>
        </div>
      )}
    >
      {() => <CustomerCompactForm form={form} />}
    </OverlayForm>
  );
}
