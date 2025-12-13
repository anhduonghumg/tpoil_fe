import React from "react";
import type { FormInstance } from "antd";
import { Form, Input, Switch, Tabs, Descriptions } from "antd";
import { EmployeeSelect } from "../../../shared/ui/EmployeeSelect";
import { RoleSelect } from "../../../shared/ui/RoleSelect";

type Props = {
  form: FormInstance;
  mode: "create" | "edit";
  onFinish: (values: any) => void;
};

export default function UserCompactForm({ form, mode, onFinish }: Props) {
  const isEdit = mode === "edit";

  return (
    <Form form={form} layout="vertical" onFinish={onFinish}>
      <Form.Item
        label="Username"
        name="username"
        rules={[{ required: true, message: "Nhập username" }]}
      >
        <Input size="middle" disabled={isEdit} />
      </Form.Item>

      <Form.Item
        label="Email"
        name="email"
        rules={[
          { required: true, message: "Nhập email" },
          { type: "email", message: "Email không hợp lệ" },
        ]}
      >
        <Input size="middle" />
      </Form.Item>

      <Form.Item label="Tên" name="name">
        <Input size="middle" />
      </Form.Item>

      <Form.Item label="Kích hoạt" name="isActive" valuePropName="checked">
        <Switch />
      </Form.Item>

      <Form.Item label="Gán nhân viên" name="employeeId">
        <EmployeeSelect placeholder="Tìm nhân viên..." />
      </Form.Item>

      <Form.Item label="Quyền (global)" name="roleIds">
        <RoleSelect mode="multiple" placeholder="Chọn quyền..." />
      </Form.Item>
    </Form>
  );
}
