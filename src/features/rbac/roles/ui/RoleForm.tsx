import { Form, Input } from "antd";

export type RoleFormValues = {
  code: string;
  name: string;
  desc?: string;
};

export function RoleForm(props: { form: any; mode: "create" | "edit" }) {
  const { form, mode } = props;

  return (
    <Form form={form} layout="vertical">
      <Form.Item
        label="Code"
        name="code"
        rules={[
          { required: true, message: "Nhập code" },
          { pattern: /^[a-z0-9._-]+$/, message: "Chỉ cho phép a-z 0-9 . _ -" },
        ]}
      >
        <Input disabled={mode === "edit"} placeholder="vd: sales, accounting" />
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
  );
}
