import React from "react";
import { Button, Form, Input, Select, Space } from "antd";
import type { CustListQuery, CustomerRole, CustomerStatus } from "../types";

export function CustomerFilters({
  value,
  onChange,
}: {
  value: CustListQuery;
  onChange: (v: CustListQuery) => void;
}) {
  const [form] = Form.useForm<CustListQuery>();
  React.useEffect(() => {
    form.setFieldsValue(value);
  }, [value]);

  return (
    <Form
      form={form}
      layout="inline"
      onFinish={(v) => onChange({ ...value, ...v, page: 1 })}
    >
      <Form.Item name="keyword">
        <Input placeholder="Tìm mã/tên/MST" allowClear />
      </Form.Item>
      <Form.Item name="status">
        <Select
          placeholder="Trạng thái"
          allowClear
          options={[
            { label: "Active", value: "Active" as CustomerStatus },
            { label: "Inactive", value: "Inactive" as CustomerStatus },
            { label: "Blacklisted", value: "Blacklisted" as CustomerStatus },
          ]}
        />
      </Form.Item>
      <Form.Item name="role">
        <Select
          placeholder="Vai trò"
          allowClear
          options={[
            { label: "Agent", value: "Agent" as CustomerRole },
            { label: "Retail", value: "Retail" as CustomerRole },
            { label: "Wholesale", value: "Wholesale" as CustomerRole },
            { label: "Other", value: "Other" as CustomerRole },
          ]}
        />
      </Form.Item>
      <Space>
        <Button type="primary" htmlType="submit">
          Lọc
        </Button>
        <Button
          onClick={() => {
            form.resetFields();
            onChange({ page: 1, pageSize: value.pageSize });
          }}
        >
          Xoá lọc
        </Button>
      </Space>
    </Form>
  );
}
