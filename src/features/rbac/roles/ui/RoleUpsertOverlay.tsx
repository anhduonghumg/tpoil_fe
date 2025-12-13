import { Form, Input } from "antd";
import { useEffect, useMemo } from "react";
import type { RoleCreateInput, RoleSummary, RoleUpdateInput } from "../types";
import { useCreateRole, useUpdateRole } from "../hooks";
import { notify } from "../../../../shared/lib/notification";
import CommonModal from "../../../../shared/ui/CommonModal";

type RoleUpsertFormValues = {
  code: string;
  name: string;
  desc?: string;
};

export function RoleUpsertOverlay(props: {
  open: boolean;
  mode: "create" | "edit";
  role?: RoleSummary | null; // edit thì truyền role
  onClose: () => void;
  onDone?: () => void;
}) {
  const { open, mode, role, onClose, onDone } = props;

  const [form] = Form.useForm<RoleUpsertFormValues>();
  const createMut = useCreateRole();
  const updateMut = useUpdateRole();

  const loading = createMut.isPending || updateMut.isPending;

  const title = useMemo(() => {
    return mode === "create" ? "Tạo vai trò" : "Cập nhật vai trò";
  }, [mode]);

  useEffect(() => {
    if (!open) return;

    if (mode === "create") {
      form.setFieldsValue({ code: "", name: "", desc: "" });
      return;
    }

    // edit
    if (role) {
      form.setFieldsValue({
        code: role.code,
        name: role.name,
        desc: role.desc ?? "",
      });
    }
  }, [open, mode, role, form]);

  const handleSubmit = async (values: RoleUpsertFormValues) => {
    try {
      if (mode === "create") {
        const payload: RoleCreateInput = {
          code: values.code?.trim(),
          name: values.name?.trim(),
          desc: values.desc?.trim() || undefined,
        };
        await createMut.mutateAsync(payload);
        notify.success("Đã tạo role");
        form.resetFields();
        onDone?.();
        return;
      }

      // edit
      if (!role?.id) return;

      const payload: RoleUpdateInput = {
        name: values.name?.trim(),
        desc: values.desc?.trim() || undefined,
      };
      await updateMut.mutateAsync({ id: role.id, data: payload });
      notify.success("Đã cập nhật role");
      onDone?.();
    } catch (e: any) {
      notify.error(e?.message || "Thao tác thất bại");
    }
  };

  return (
    <CommonModal
      title={title}
      open={open}
      onCancel={() => {
        if (loading) return;
        onClose();
      }}
      onOk={() => form.submit()}
      okText={mode === "create" ? "Tạo" : "Lưu"}
      cancelText="Đóng"
      loading={loading}
      size="md"
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          label="Code"
          name="code"
          rules={[
            { required: true, message: "Nhập code" },
            {
              pattern: /^[a-z0-9._-]+$/,
              message: "Chỉ cho phép a-z 0-9 . _ -",
            },
          ]}
        >
          <Input
            disabled={mode === "edit"}
            placeholder="vd: sales, accounting, system-admin"
          />
        </Form.Item>

        <Form.Item
          label="Tên vai trò"
          name="name"
          rules={[{ required: true, message: "Nhập tên vai trò" }]}
        >
          <Input placeholder="vd: Kinh doanh" />
        </Form.Item>

        <Form.Item label="Mô tả" name="desc">
          <Input.TextArea rows={3} placeholder="Tuỳ chọn" />
        </Form.Item>
      </Form>
    </CommonModal>
  );
}
