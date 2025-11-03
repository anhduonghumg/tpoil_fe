import React from "react";
import { Button, Form, Input, Select, Space, Tooltip } from "antd";
import {
  ReloadOutlined,
  SearchOutlined,
  DownloadOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import type {
  CustListQuery,
  CustomerRole,
  CustomerStatus,
  CustomerType,
} from "../types";

export function CustomerToolbar({
  value,
  onChange,
  onExport,
}: {
  value: CustListQuery;
  onChange: (v: CustListQuery) => void;
  onExport?: () => void;
}) {
  const [form] = Form.useForm<CustListQuery>();
  React.useEffect(() => {
    form.setFieldsValue(value);
  }, [value]);

  const submit = (vals?: Partial<CustListQuery>) => {
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
          placeholder="Tìm mã / tên / MST"
          prefix={<SearchOutlined />}
          style={{ width: 260 }}
          onPressEnter={() => submit()}
        />
      </Form.Item>
      <Form.Item name="type">
        <Select
          size="small"
          allowClear
          placeholder="Loại hình"
          style={{ width: 160 }}
          options={[
            { label: "B2B", value: "B2B" as CustomerType },
            { label: "B2C", value: "B2C" as CustomerType },
            { label: "Nhà phân phối", value: "Distributor" as CustomerType },
            { label: "Khác", value: "Other" as CustomerType },
          ]}
          suffixIcon={<FilterOutlined />}
        />
      </Form.Item>
      <Form.Item name="role">
        <Select
          size="small"
          allowClear
          placeholder="Vai trò"
          style={{ width: 160 }}
          options={[
            { label: "Đại lý", value: "Agent" as CustomerRole },
            { label: "Bán lẻ", value: "Retail" as CustomerRole },
            { label: "Bán buôn", value: "Wholesale" as CustomerRole },
            { label: "Khác", value: "Other" as CustomerRole },
          ]}
          suffixIcon={<FilterOutlined />}
        />
      </Form.Item>
      <Form.Item name="status">
        <Select
          size="small"
          allowClear
          placeholder="Trạng thái"
          style={{ width: 160 }}
          options={[
            { label: "Đang hoạt động", value: "Active" as CustomerStatus },
            { label: "Ngừng hoạt động", value: "Inactive" as CustomerStatus },
            { label: "Đã bị chặn", value: "Blacklisted" as CustomerStatus },
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
        <Tooltip title="Xuất CSV">
          <Button size="small" icon={<DownloadOutlined />} onClick={onExport} />
        </Tooltip>
      </Space.Compact>
    </Form>
  );
}
