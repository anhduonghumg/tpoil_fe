import React from "react";
import { Button, Form } from "antd";
import { CloseCircleOutlined, SaveOutlined } from "@ant-design/icons";
import ContractTypeFormCompact from "./ContractTypeFormCompact";
import {
  useContractType,
  useCreateContractType,
  useUpdateContractType,
} from "../hooks";
import { notify } from "../../../shared/lib/notification";
import OverlayForm from "../../employees/ui/OverlayForm";

type Mode = "create" | "edit";

export default function ContractTypeUpsertOverlay({
  mode,
  id,
  open,
  onClose,
  variant = "modal",
}: {
  mode: Mode;
  id?: string;
  open: boolean;
  onClose: () => void;
  variant?: "drawer" | "modal";
}) {
  const [form] = Form.useForm();
  const createMu = useCreateContractType();
  const updateMu = useUpdateContractType(id || "");
  const detail = useContractType(id, open && mode === "edit");

  React.useEffect(() => {
    if (!(open && mode === "edit")) return;
    if (!detail.data) return;
    const d: any = (detail.data as any)?.data ?? detail.data;
    if (!d) return;
    form.setFieldsValue(d);
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
      };
      if (mode === "create") await createMu.mutateAsync(payload);
      else await updateMu.mutateAsync(payload);
      notify.success(
        mode === "create"
          ? "Tạo loại hợp đồng thành công"
          : "Cập nhật loại hợp đồng thành công"
      );
      onClose();
    } catch {
      // bỏ qua
    }
  };

  const pending =
    mode === "edit"
      ? detail.isLoading || updateMu.isPending
      : createMu.isPending;

  return (
    <OverlayForm
      title={mode === "create" ? "Thêm loại hợp đồng" : "Sửa loại hợp đồng"}
      open={open}
      onClose={onClose}
      variant={variant}
      size="md"
      loading={pending}
      okText={mode === "create" ? "Lưu" : "Lưu thay đổi"}
      footerRender={({ submitting }) => (
        <div style={{ textAlign: "right" }}>
          <Button
            size="small"
            type="default"
            onClick={onClose}
            style={{ marginRight: 8 }}
            disabled={submitting}
            icon={<CloseCircleOutlined />}
          >
            Hủy
          </Button>
          <Button
            size="small"
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
      {() => <ContractTypeFormCompact form={form} />}
    </OverlayForm>
  );
}
