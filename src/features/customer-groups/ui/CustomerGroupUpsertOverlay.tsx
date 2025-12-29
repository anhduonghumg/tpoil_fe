// features/customer-groups/ui/CustomerGroupUpsertOverlay.tsx
import React, { useEffect } from "react";
import { Button, Drawer, Form, Input, Space } from "antd";
import {
  useCustomerGroupDetail,
  useCreateCustomerGroup,
  useUpdateCustomerGroup,
} from "../hooks";
import type { CustomerGroup } from "../types";
import { notify } from "../../../shared/lib/notification";

type Mode = "create" | "edit";

export const CustomerGroupUpsertOverlay: React.FC<{
  open: boolean;
  mode: Mode;
  id?: string;
  onClose: () => void;
}> = ({ open, mode, id, onClose }) => {
  const [form] = Form.useForm<Pick<CustomerGroup, "code" | "name" | "note">>();

  const detailQuery = useCustomerGroupDetail(mode === "edit" ? id : undefined);
  const createMut = useCreateCustomerGroup();
  const updateMut = useUpdateCustomerGroup();

  const loadingDetail = mode === "edit" && detailQuery.isFetching;
  const saving = createMut.isPending || updateMut.isPending;

  useEffect(() => {
    if (!open) return;

    if (mode === "create") {
      form.resetFields();
      return;
    }

    const d = detailQuery.data;
    if (mode === "edit" && d) {
      form.setFieldsValue({
        code: d.code,
        name: d.name ?? undefined,
        note: d.note ?? undefined,
      });
    }
  }, [open, mode, detailQuery.data, form]);

  const onSubmit = async () => {
    const values = await form.validateFields();
    const payload = {
      code: values.code.trim(),
      name: values.name?.trim() || null,
      note: values.note?.trim() || null,
    };

    if (mode === "create") {
      await createMut.mutateAsync(payload);
      notify.success("Tạo nhóm thành công");
      onClose();
      return;
    }

    if (!id) return;
    await updateMut.mutateAsync({ id, dto: payload });
    notify.success("Cập nhật nhóm thành công");
    onClose();
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      destroyOnClose
      width={520}
      title={
        mode === "create" ? "Thêm nhóm khách hàng" : "Cập nhật nhóm khách hàng"
      }
      footer={
        <Space style={{ width: "100%", justifyContent: "flex-end" }}>
          <Button onClick={onClose}>Đóng</Button>
          <Button type="primary" onClick={onSubmit} loading={saving}>
            Lưu
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="Mã nhóm"
          name="code"
          rules={[
            { required: true, message: "Vui lòng nhập mã nhóm" },
            { max: 50, message: "Tối đa 50 ký tự" },
          ]}
        >
          <Input
            placeholder="VD: GRP-001"
            autoFocus
            disabled={loadingDetail || mode === "edit"}
          />
        </Form.Item>

        <Form.Item
          label="Tên nhóm"
          name="name"
          rules={[{ max: 255, message: "Tối đa 255 ký tự" }]}
        >
          <Input placeholder="VD: Nhóm Công ty A" disabled={loadingDetail} />
        </Form.Item>

        <Form.Item
          label="Ghi chú"
          name="note"
          rules={[{ max: 2000, message: "Tối đa 2000 ký tự" }]}
        >
          <Input.TextArea
            rows={4}
            placeholder="Ghi chú..."
            disabled={loadingDetail}
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
};
