import { Modal, Form } from "antd";
import { EmployeeSelect } from "../../../shared/ui/EmployeeSelect";
import { useSetUserEmployee, useUserDetail } from "../hooks";
import { useEffect } from "react";
import { notify } from "../../../shared/lib/notification";

export function AssignEmployeeModal({ open, userId, onClose }: any) {
  const [form] = Form.useForm();
  const { data: detailRes } = useUserDetail(userId);
  const detail = detailRes;
  const setEmpMut = useSetUserEmployee();

  useEffect(() => {
    if (!open) {
      form.resetFields();
      return;
    }
    form.resetFields();
    form.setFieldsValue({
      employeeId: detail?.employee?.id ?? null,
    });
  }, [open, detail, form]);

  const onOk = async () => {
    const v = await form.validateFields();
    await setEmpMut.mutateAsync({
      id: userId,
      employeeId: v.employeeId ?? null,
    });
    notify.success("Đã cập nhật nhân viên");
    onClose();
  };

  return (
    <Modal
      open={open}
      title="Gán nhân viên"
      onCancel={onClose}
      onOk={onOk}
      confirmLoading={setEmpMut.isPending}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item name="employeeId" label="Nhân viên">
          <EmployeeSelect placeholder="Tìm nhân viên..." />
        </Form.Item>
      </Form>
    </Modal>
  );
}
