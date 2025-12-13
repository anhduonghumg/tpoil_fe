// src/features/users/ui/UserCreateForm.tsx
import {
  Button,
  Col,
  DatePicker,
  Form,
  Input,
  Row,
  Select,
  FormInstance,
} from "antd";
import dayjs from "dayjs";
import { PHONE_VN } from "../validators";

export type CreateUserInput = {
  name: string;
  email: string;
  phone: string;
  status?: "active" | "probation" | "inactive" | "quit";
  joinedAt: string;
  dob?: string;
  departmentName?: string;
  title?: string;
};

export default function UserCreateForm({
  onSubmit,
  loading,
  form: externalForm,
}: {
  onSubmit: (payload: CreateUserInput) => void;
  loading?: boolean;
  form?: FormInstance;
}) {
  const [internalForm] = Form.useForm<CreateUserInput>();
  const form = externalForm ?? internalForm;

  return (
    <Form
      layout="vertical"
      form={form}
      onFinish={(v) =>
        onSubmit({
          ...v,
          name: v.name?.trim(),
          status: v.status ?? "active",
          joinedAt: (v as any).joinedAt?.format?.("DD-MM-YYYY") ?? v.joinedAt,
          dob: (v as any).dob?.format?.("DD-MM-YYYY"),
        })
      }
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
        <Col xs={24} md={12}>
          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, type: "email" }]}
          >
            <Input />
          </Form.Item>
        </Col>
        <Col xs={12} md={8}>
          <Form.Item
            label="Số điện thoại"
            name="phone"
            rules={[
              {
                required: true,
                pattern: PHONE_VN,
                message: "SĐT không hợp lệ",
              },
            ]}
          >
            <Input />
          </Form.Item>
        </Col>
        <Col xs={12} md={8}>
          <Form.Item label="Trạng thái" name="status" initialValue="active">
            <Select
              options={[
                { value: "active", label: "Đang làm" },
                { value: "probation", label: "Thử việc" },
                { value: "inactive", label: "Tạm dừng" },
                { value: "quit", label: "Nghỉ việc" },
              ]}
            />
          </Form.Item>
        </Col>
        <Col xs={12} md={8}>
          <Form.Item
            label="Ngày bắt đầu"
            name="joinedAt"
            rules={[{ required: true }]}
          >
            <DatePicker style={{ width: "100%" }} format="DD-MM-YYYY" />
          </Form.Item>
        </Col>
        <Col xs={12} md={8}>
          <Form.Item label="Ngày sinh" name="dob">
            <DatePicker style={{ width: "100%" }} format="DD-MM-YYYY" />
          </Form.Item>
        </Col>
        <Col xs={12} md={8}>
          <Form.Item label="Phòng ban" name="departmentName">
            <Input placeholder="VD: Sales..." />
          </Form.Item>
        </Col>
        <Col xs={12} md={8}>
          <Form.Item label="Chức danh" name="title">
            <Input placeholder="VD: Trưởng phòng..." />
          </Form.Item>
        </Col>
      </Row>

      {/* Với Drawer có footer riêng, nút này có thể ẩn đi nếu muốn */}
      <Form.Item style={{ marginBottom: 0 }}>
        <Button type="primary" htmlType="submit" loading={loading}>
          Tạo mới
        </Button>
      </Form.Item>
    </Form>
  );
}
