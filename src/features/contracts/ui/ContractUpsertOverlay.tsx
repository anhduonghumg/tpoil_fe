import React from "react";
import { Button, Form, message } from "antd";
import { CloseCircleOutlined, SaveOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import ContractFormCompact from "./ContractFormCompact";
import { useContract, useCreateContract, useUpdateContract } from "../hooks";
import OverlayForm from "../../users/ui/OverlayForm";
export default function ContractUpsertOverlay({
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
  const createMu = useCreateContract();
  const updateMu = useUpdateContract(id || "");
  const detail = useContract(id, open && mode === "edit");

  React.useEffect(() => {
    if (!(open && mode === "edit")) return;
    if (!detail.data) return;
    const d: any = (detail.data as any)?.data ?? detail.data;
    if (!d) return;
    form.setFieldsValue({
      ...d,
      startDate: d.startDate ? dayjs(d.startDate) : undefined,
      endDate: d.endDate ? dayjs(d.endDate) : undefined,
    });
  }, [open, mode, detail.data]);

  React.useEffect(() => {
    if (!open) form.resetFields();
  }, [open]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        code: values.code
          ? String(values.code).trim().toUpperCase()
          : undefined,
        startDate: values.startDate
          ? values.startDate.toISOString()
          : undefined,
        endDate: values.endDate ? values.endDate.toISOString() : undefined,
      };
      if (mode === "create") await createMu.mutateAsync(payload);
      else await updateMu.mutateAsync(payload);
      message.success(
        mode === "create"
          ? "Tạo hợp đồng thành công"
          : "Cập nhật hợp đồng thành công"
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
      title={mode === "create" ? "Thêm hợp đồng" : "Sửa hợp đồng"}
      open={open}
      onClose={onClose}
      variant={variant}
      size="lg"
      loading={pending}
      okText={mode === "create" ? "Lưu" : "Lưu thay đổi"}
      footerRender={({ submitting }) => (
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
      {() => <ContractFormCompact form={form} />}
    </OverlayForm>
  );
}
