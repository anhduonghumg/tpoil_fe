import React from "react";
import type { FormInstance } from "antd";
import { Form, Input, Switch, Row, Col, Typography } from "antd";
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
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      requiredMark={false}
    >
      <Row gutter={[12, 8]}>
        <Col xs={24} md={12}>
          <Form.Item
            label="Username"
            name="username"
            rules={[{ required: true, message: "Nhập username" }]}
          >
            <Input size="small" disabled={isEdit} placeholder="vd: duongnt" />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Nhập email" },
              { type: "email", message: "Email không hợp lệ" },
            ]}
          >
            <Input size="small" placeholder="vd: duong@company.com" />
          </Form.Item>
        </Col>

        {/* Password: create bắt buộc, edit là passwordNew optional */}
        {!isEdit ? (
          <Col xs={24} md={12}>
            <Form.Item
              label="Mật khẩu"
              name="password"
              rules={[
                { required: true, message: "Nhập mật khẩu" },
                { min: 6, message: "Tối thiểu 6 ký tự" },
              ]}
            >
              <Input.Password size="small" placeholder="******" />
            </Form.Item>
          </Col>
        ) : (
          <Col xs={24} md={12}>
            <Form.Item
              label="Mật khẩu mới"
              name="passwordNew"
              rules={[{ min: 6, message: "Tối thiểu 6 ký tự" }]}
              extra={
                <Typography.Text type="secondary">
                  Để trống nếu không đổi
                </Typography.Text>
              }
            >
              <Input.Password size="small" placeholder="******" />
            </Form.Item>
          </Col>
        )}

        <Col xs={24} md={12}>
          <Form.Item label="Tên" name="name">
            <Input size="small" placeholder="vd: Dương Nguyễn" />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item label="Gán nhân viên" name="employeeId">
            <EmployeeSelect placeholder="Tìm nhân viên..." />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item label="Quyền (global)" name="roleIds">
            <RoleSelect mode="multiple" placeholder="Chọn quyền..." />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item
            label="Kích hoạt"
            name="isActive"
            valuePropName="checked"
            style={{ marginBottom: 0 }}
          >
            <Switch />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );
}
