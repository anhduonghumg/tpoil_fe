// features/customers/ui/CustomerFilters.tsx
import React, { useEffect } from "react";
import { Button, Form, Grid, Input, Select, Space } from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import type { CustomerListQuery, CustomerStatus, CustomerType } from "../types";

export interface CustomerFiltersValues
  extends Pick<CustomerListQuery, "keyword" | "type" | "status"> {}

interface CustomerFiltersProps {
  value: CustomerFiltersValues;
  onChange: (next: CustomerFiltersValues) => void; // chỉ gọi khi bấm Tìm kiếm / Xóa lọc
  onCreate?: () => void;
  loading?: boolean;
}

const { useBreakpoint } = Grid;

const CUSTOMER_TYPE_OPTIONS: { label: string; value: CustomerType }[] = [
  { label: "B2B", value: "B2B" },
  { label: "B2C", value: "B2C" },
  { label: "Nhà phân phối", value: "Distributor" },
  { label: "Khác", value: "Other" },
];

const CUSTOMER_STATUS_OPTIONS: { label: string; value: CustomerStatus }[] = [
  { label: "Đang hoạt động", value: "Active" },
  { label: "Ngừng hoạt động", value: "Inactive" },
  { label: "Danh sách đen", value: "Blacklisted" },
];

export const CustomerFilters: React.FC<CustomerFiltersProps> = ({
  value,
  onChange,
  onCreate,
  loading,
}) => {
  const [form] = Form.useForm<CustomerFiltersValues>();
  const screens = useBreakpoint();
  const isMobile = !screens.lg;

  useEffect(() => {
    form.setFieldsValue(value);
  }, [value, form]);

  const handleSearch = (values: CustomerFiltersValues) => {
    onChange(values);
  };

  const handleReset = () => {
    const next: CustomerFiltersValues = {
      keyword: undefined,
      type: undefined,
      status: undefined,
    };
    form.setFieldsValue(next);
    onChange(next);
  };

  return (
    <div
      style={{
        padding: "8px 12px",
        borderBottom: "1px solid #f0f0f0",
        background: "#fff",
      }}
    >
      <Form<CustomerFiltersValues>
        form={form}
        layout={isMobile ? "vertical" : "inline"}
        autoComplete="off"
        onFinish={handleSearch}
      >
        <Space
          direction={isMobile ? "vertical" : "horizontal"}
          style={{ width: "100%", justifyContent: "space-between" }}
          size={isMobile ? 6 : 10}
        >
          <Space
            direction={isMobile ? "vertical" : "horizontal"}
            wrap
            style={{ flex: 1, minWidth: 0 }}
            size={isMobile ? 6 : 8}
          >
            <Form.Item
              name="keyword"
              style={{ marginBottom: 0, flex: 1, minWidth: 200 }}
            >
              <Input
                size="small"
                allowClear
                placeholder="Tìm theo mã, tên, MST, SĐT..."
                // onPressEnter={() => form.submit()}
              />
            </Form.Item>

            <Form.Item name="type" style={{ marginBottom: 0, minWidth: 160 }}>
              <Select
                size="small"
                allowClear
                placeholder="Loại khách hàng"
                options={CUSTOMER_TYPE_OPTIONS}
              />
            </Form.Item>

            <Form.Item name="status" style={{ marginBottom: 0, minWidth: 140 }}>
              <Select
                size="small"
                allowClear
                placeholder="Trạng thái"
                options={CUSTOMER_STATUS_OPTIONS}
              />
            </Form.Item>
            <Button
              icon={<SearchOutlined />}
              type="primary"
              htmlType="submit"
              size="small"
              loading={loading}
            >
              Tìm kiếm
            </Button>
          </Space>

          <Space direction="horizontal" size={6} style={{ flexShrink: 0 }}>
            <Button
              icon={<ReloadOutlined />}
              size="small"
              onClick={handleReset}
              disabled={loading}
            >
              Xóa lọc
            </Button>
            {onCreate && (
              <Button
                icon={<PlusOutlined />}
                size="small"
                type="default"
                onClick={onCreate}
              >
                Thêm mới
              </Button>
            )}
          </Space>
        </Space>
      </Form>
    </div>
  );
};
