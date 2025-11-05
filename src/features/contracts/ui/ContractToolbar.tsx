import React from "react";
import { Button, DatePicker, Form, Input, Select, Space, Tooltip } from "antd";
import {
  ReloadOutlined,
  SearchOutlined,
  DownloadOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import type { ContractListQuery, ContractStatus, ContractType } from "../types";
import { ContractCustomerSelect } from "./ContractCustomerSelect";

const { RangePicker } = DatePicker;

export function ContractToolbar({
  value,
  onChange,
  onExport,
}: {
  value: ContractListQuery;
  onChange: (v: ContractListQuery) => void;
  onExport?: () => void;
}) {
  const [form] = Form.useForm<ContractListQuery>();
  React.useEffect(() => {
    form.setFieldsValue(value);
  }, [value]);

  const submit = (vals?: Partial<ContractListQuery>) => {
    const v = vals ?? form.getFieldsValue();
    const range = (v as any).dateRange as any;
    const next: ContractListQuery = {
      ...value,
      ...v,
      startFrom: range?.[0]?.startOf("day").toISOString(),
      startTo: range?.[1]?.endOf("day").toISOString(),
      page: 1,
    };
    delete (next as any).dateRange;
    onChange(next);
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
          placeholder="Tìm số HĐ / khách hàng"
          prefix={<SearchOutlined />}
          style={{ width: 260 }}
          onPressEnter={() => submit()}
        />
      </Form.Item>
      <Form.Item name="customerId">
        <ContractCustomerSelect
          allowClear
          placeholder="Khách hàng"
          style={{ width: 220 }}
        />
      </Form.Item>
      <Form.Item name="type">
        <Select
          size="small"
          allowClear
          placeholder="Loại HĐ"
          style={{ width: 160 }}
          options={[
            { label: "HĐ Khung", value: "FRAME" as ContractType },
            { label: "HĐ Mua bán", value: "SALE" as ContractType },
            { label: "HĐ Dịch vụ", value: "SERVICE" as ContractType },
            { label: "Khác", value: "OTHER" as ContractType },
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
            { label: "Nháp", value: "Draft" as ContractStatus },
            { label: "Hiệu lực", value: "Active" as ContractStatus },
            { label: "Tạm dừng", value: "Suspended" as ContractStatus },
            { label: "Hết hạn", value: "Expired" as ContractStatus },
            { label: "Thanh lý", value: "Terminated" as ContractStatus },
          ]}
          suffixIcon={<FilterOutlined />}
        />
      </Form.Item>
      <Form.Item name="dateRange">
        <RangePicker size="small" style={{ width: 260 }} format="DD/MM/YYYY" />
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
        <Tooltip title="Xuất dữ liệu">
          <Button size="small" icon={<DownloadOutlined />} onClick={onExport} />
        </Tooltip>
      </Space.Compact>
    </Form>
  );
}
