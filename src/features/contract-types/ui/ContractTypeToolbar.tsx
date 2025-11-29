import React from "react";
import { Button, Form, Input, Select, Space, Tooltip } from "antd";
import {
  ReloadOutlined,
  SearchOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import type { ContractTypeListQuery } from "../types";

export function ContractTypeToolbar({
  value,
  onChange,
}: {
  value: ContractTypeListQuery;
  onChange: (v: ContractTypeListQuery) => void;
}) {
  const [form] = Form.useForm<ContractTypeListQuery>();
  React.useEffect(() => {
    form.setFieldsValue(value);
  }, [value]);

  const submit = (vals?: Partial<ContractTypeListQuery>) => {
    const v = vals ?? form.getFieldsValue();
    onChange({ ...value, ...v, page: 1 });
  };

  const reset = () => {
    form.resetFields();
    onChange({ page: 1, pageSize: value.pageSize });
  };

  return (
    <Form form={form} layout="inline" onFinish={submit} style={{ rowGap: 8 }}>
      <Form.Item name="keyword">
        <Input
          size="small"
          allowClear
          placeholder="Tìm mã / tên loại HĐ"
          prefix={<SearchOutlined />}
          style={{ width: 260 }}
          onPressEnter={() => submit()}
        />
      </Form.Item>
      <Form.Item name="isActive">
        <Select
          size="small"
          allowClear
          placeholder="Trạng thái"
          style={{ width: 160 }}
          options={[
            { label: "Tất cả", value: null },
            { label: "Đang dùng", value: true },
            { label: "Ngừng", value: false },
          ]}
          suffixIcon={<FilterOutlined />}
        />
      </Form.Item>
      <Space.Compact>
        <Tooltip title="Tìm kiếm">
          <Button
            size="small"
            type="primary"
            htmlType="submit"
            icon={<SearchOutlined />}
          >
            Tìm
          </Button>
        </Tooltip>
        <Tooltip title="Làm mới">
          <Button size="small" icon={<ReloadOutlined />} onClick={reset} />
        </Tooltip>
      </Space.Compact>
    </Form>
  );
}
