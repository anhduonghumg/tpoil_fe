// src/features/users/ui/PersonalForm.tsx
import { Button, Col, DatePicker, Form, Input, Row, Select } from "antd";
import dayjs from "dayjs";
import type { User } from "../types";

export default function PersonalForm({
  data,
  onSave,
}: {
  data?: User;
  onSave: (p: Partial<User>) => void;
}) {
  const [form] = Form.useForm();

  const init = {
    name: data?.name,
    gender: data?.gender,
    dob: data?.dob ? dayjs(data.dob) : undefined,
    nationality: data?.nationality || "Việt Nam",
    maritalStatus: data?.maritalStatus,
    avatarUrl: data?.avatarUrl,
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={init}
      onFinish={(vals) => {
        onSave({
          name: vals.name?.trim(),
          gender: vals.gender,
          dob: vals.dob?.format("YYYY-MM-DD"),
          nationality: vals.nationality,
          maritalStatus: vals.maritalStatus,
          avatarUrl: vals.avatarUrl,
        });
      }}
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Form.Item
            label="Họ và tên"
            name="name"
            rules={[{ required: true, message: "Bắt buộc" }]}
          >
            <Input maxLength={128} showCount />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item label="Giới tính" name="gender">
            <Select
              allowClear
              options={[
                { value: "male", label: "Nam" },
                { value: "female", label: "Nữ" },
                { value: "other", label: "Khác" },
              ]}
            />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item
            label="Ngày sinh"
            name="dob"
            rules={[{ required: true, message: "Bắt buộc" }]}
          >
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>
        </Col>

        <Col xs={12} md={6}>
          <Form.Item label="Quốc tịch" name="nationality">
            <Input />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item label="Hôn nhân" name="maritalStatus">
            <Select
              allowClear
              options={[
                { value: "single", label: "Độc thân" },
                { value: "married", label: "Kết hôn" },
                { value: "divorced", label: "Ly hôn" },
                { value: "widowed", label: "Góa" },
              ]}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item label="Ảnh đại diện (URL)" name="avatarUrl">
            <Input placeholder="https://..." />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item>
        <Button type="primary" htmlType="submit">
          Lưu
        </Button>
      </Form.Item>
    </Form>
  );
}
