// features/customers/ui/CustomerFilters.tsx
import React, { useEffect, memo } from "react"; // 1. Import memo
import { Button, Form, Grid, Input, Select, Space } from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import type { CustomerListQuery, CustomerStatus, CustomerType } from "../types";
import { EmployeeSelect } from "../../../shared/ui/EmployeeSelect";

export interface CustomerFiltersValues
  extends Pick<
    CustomerListQuery,
    | "keyword"
    | "status"
    | "salesOwnerEmpId"
    | "accountingOwnerEmpId"
    | "documentOwnerEmpId"
  > {}

interface CustomerFiltersProps {
  value: CustomerFiltersValues;
  onChange: (next: CustomerFiltersValues) => void;
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

const CustomerFiltersBase: React.FC<CustomerFiltersProps> = ({
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
      status: undefined,
      salesOwnerEmpId: undefined,
      accountingOwnerEmpId: undefined,
      documentOwnerEmpId: undefined,
    };
    form.setFieldsValue(next);
    onChange(next);
  };

  return (
    <div
      style={{
        padding: "12px 16px", // Tăng padding một chút để thoáng hơn
        borderBottom: "1px solid #f0f0f0",
        background: "#fff",
      }}
    >
      <Form<CustomerFiltersValues>
        form={form}
        layout="inline"
        onFinish={handleSearch}
        style={{ gap: "8px" }}
      >
        {/* Nhóm Inputs */}
        <Form.Item name="keyword" style={{ marginBottom: 0, marginRight: 0 }}>
          <Input
            style={{ width: 180 }}
            size="small"
            allowClear
            placeholder="Tìm theo mã, tên, MST..."
          />
        </Form.Item>

        <Form.Item name="status" style={{ marginBottom: 0, marginRight: 0 }}>
          <Select
            style={{ width: 130 }}
            size="small"
            allowClear
            placeholder="Trạng thái"
            options={CUSTOMER_STATUS_OPTIONS}
          />
        </Form.Item>

        <Form.Item
          name="salesOwnerEmpId"
          style={{ marginBottom: 0, marginRight: 0 }}
        >
          <EmployeeSelect style={{ width: 160 }} placeholder="Kinh doanh" />
        </Form.Item>

        <Form.Item
          name="accountingOwnerEmpId"
          style={{ marginBottom: 0, marginRight: 0 }}
        >
          <EmployeeSelect style={{ width: 160 }} placeholder="Kế toán" />
        </Form.Item>

        <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
          <Button
            icon={<SearchOutlined />}
            type="primary"
            htmlType="submit"
            size="small"
            loading={loading}
            style={{ borderRadius: "4px" }}
          >
            Tìm kiếm
          </Button>

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
              onClick={onCreate}
              style={{ marginLeft: "4px" }}
            >
              Thêm mới
            </Button>
          )}
        </div>
      </Form>
    </div>
  );
};

export const CustomerFilters = memo(CustomerFiltersBase);
