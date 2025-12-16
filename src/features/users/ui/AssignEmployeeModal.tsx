import React, { useEffect, useState } from "react";
import { Modal, Form } from "antd";
import { useSetUserEmployee, useUserDetailRaw } from "../hooks";
import { EmployeeSelect } from "../../../shared/ui/EmployeeSelect";
import { notify } from "../../../shared/lib/notification";

export function AssignEmployeeModal({
  open,
  userId,
  onClose,
}: {
  open: boolean;
  userId: string;
  onClose: () => void;
}) {
  const [form] = Form.useForm();
  const { data } = useUserDetailRaw(userId);
  const setEmp = useSetUserEmployee();

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue({ employeeId: data?.employee?.id ?? null });
  }, [open, data, form]);

  const onOk = async () => {
    const v = await form.validateFields();
    await setEmp.mutateAsync({ id: userId, employeeId: v.employeeId ?? null });
    notify.success("Đã cập nhật nhân viên");
    onClose();
  };

  return (
    <Modal
      open={open}
      title="Gán nhân viên"
      onCancel={onClose}
      onOk={onOk}
      okText="Lưu"
      confirmLoading={setEmp.isPending}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item name="employeeId" label="Nhân viên">
          <EmployeeSelect placeholder="Chọn nhân viên..." />
        </Form.Item>
      </Form>
    </Modal>
  );
}
