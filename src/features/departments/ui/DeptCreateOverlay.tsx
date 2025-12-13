// src/features/departments/ui/DeptCreateOverlay.tsx
import { Form } from "antd";
import DepartmentForm from "./DepartmentForm";
import { useCreateDept } from "../hooks";
import OverlayForm from "../../employees/ui/OverlayForm";
import { notify } from "../../../shared/lib/notification";

export default function DeptCreateOverlay({
  open,
  onClose,
  variant = "drawer",
  sites,
}: {
  open: boolean;
  onClose: () => void;
  variant?: "drawer" | "modal";
  sites?: { id: string; name: string }[];
}) {
  const create = useCreateDept();
  const [form] = Form.useForm();

  const onSubmit = async (values: any) => {
    try {
      const result: any = await create.mutateAsync(values);
      // console.log("Update result", result);
      if (result.success) {
        notify.success("Tạo phòng ban thành công");
        form.resetFields();
        onClose();
      } else {
        notify.error(result?.message || "Tạo phòng ban thất bại");
      }
    } catch (e: any) {
      if (e.code === "DUPLICATE_CODE") notify.error("Mã phòng ban đã tồn tại");
      else notify.error("Tạo phòng ban thất bại");
    }
  };

  if (!open) return null;

  return (
    <OverlayForm
      title="Thêm phòng ban"
      open={open}
      onClose={() => {
        form.resetFields();
        onClose();
      }}
      variant={variant}
      size="md"
      loading={create.isPending}
      okText="Tạo"
      footerRender={({ submitting, close }) => (
        <div style={{ textAlign: "right" }}>
          <button
            className="ant-btn"
            onClick={close}
            style={{ marginRight: 8 }}
          >
            Hủy
          </button>
          <button
            className="ant-btn ant-btn-primary"
            onClick={() => form.submit()}
            disabled={submitting}
          >
            {submitting ? "Đang lưu..." : "Tạo"}
          </button>
        </div>
      )}
    >
      {() => (
        <DepartmentForm
          form={form}
          hideInlineSubmit
          onSubmit={onSubmit}
          sites={sites}
        />
      )}
    </OverlayForm>
  );
}
