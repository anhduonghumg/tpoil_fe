import { Modal, Form } from "antd";
import { RoleSelect } from "../../../shared/ui/RoleSelect";
import { useSetUserRoles, useUserDetail } from "../hooks";
import { useEffect } from "react";
import { notify } from "../../../shared/lib/notification";

export function AssignRolesModal({ open, userId, onClose }: any) {
  const [form] = Form.useForm();
  const { data: detailRes } = useUserDetail(userId);
  const detail = detailRes;

  const setRolesMut = useSetUserRoles();

  useEffect(() => {
    if (!open) {
      form.resetFields();
      return;
    }
    form.resetFields();
    form.setFieldsValue({
      roleIds: (detail?.rolesGlobal ?? []).map((r: any) => r.id),
    });
  }, [open, detail, form]);

  const onOk = async () => {
    const v = await form.validateFields();
    // console.log("v", v);
    // console.log("id", userId);
    await setRolesMut.mutateAsync({ id: userId, roleIds: v.roleIds ?? [] });
    notify.success("Đã cập nhật quyền");
    onClose();
  };

  return (
    <Modal
      open={open}
      title="Gán quyền"
      onCancel={onClose}
      onOk={onOk}
      confirmLoading={setRolesMut.isPending}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item name="roleIds" label="Quyền (global)">
          <RoleSelect mode="multiple" placeholder="Chọn quyền..." />
        </Form.Item>
      </Form>
    </Modal>
  );
}
