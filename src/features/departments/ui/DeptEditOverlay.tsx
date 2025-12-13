import DepartmentForm from "./DepartmentForm";
import { Form, Skeleton } from "antd";
import { useDeptDetail, useUpdateDept } from "../hooks";
import OverlayForm from "../../employees/ui/OverlayForm";
import { notify } from "../../../shared/lib/notification";

export default function DeptEditOverlay({
  id,
  open,
  onClose,
  variant = "drawer",
  sites,
}: {
  id: string;
  open: boolean;
  onClose: () => void;
  variant?: "drawer" | "modal";
  sites?: { id: string; name: string }[];
}) {
  const detail = useDeptDetail(id);
  const update = useUpdateDept(id);
  const [form] = Form.useForm();

  const onSubmit = async (values: any) => {
    try {
      const result: any = await update.mutateAsync(values);
      // console.log("Update result", result);
      if (!result) {
        notify.error(result?.message || "Cập nhật phòng ban thất bại");
        return;
      }
      notify.success("Cập nhật phòng ban thành công");
      onClose();
    } catch (e: any) {
      if (e.code === "DUPLICATE_CODE") notify.error("Mã phòng ban đã tồn tại");
      else if (e.code === "CYCLE_PARENT")
        notify.error("Không thể chọn cha gây vòng lặp");
      else notify.error("Cập nhật phòng ban thất bại");
    }
  };

  if (!open) return null;

  return (
    <OverlayForm
      title="Sửa phòng ban"
      open={open}
      onClose={onClose}
      variant={variant}
      size="md"
      loading={update.isPending}
      okText="Lưu"
      footerRender={({ submitting }) => (
        <div style={{ textAlign: "right" }}>
          <button
            className="ant-btn"
            onClick={onClose}
            style={{ marginRight: 8 }}
          >
            Hủy
          </button>
          <button
            className="ant-btn ant-btn-primary"
            onClick={() => form.submit()}
            disabled={submitting}
          >
            {submitting ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      )}
    >
      {() =>
        detail.isLoading ? (
          <Skeleton active />
        ) : (
          <DepartmentForm
            form={form}
            data={detail.data}
            onSubmit={onSubmit}
            disabledCode
            selfId={id}
            sites={sites}
            // hideInlineSubmit
          />
        )
      }
    </OverlayForm>
  );
}
