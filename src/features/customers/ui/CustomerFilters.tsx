// features/customers/ui/CustomerFilters.tsx
import React, { useEffect, useState, memo } from "react";
import { Button, Form, Input, Select, Space } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { CustomerListQuery, CustomerStatus } from "../types";
import { EmployeeSelect } from "../../../shared/ui/EmployeeSelect";
import {
  FilterButton,
  FilterTags,
  FilterToolbar,
} from "../../../shared/ui/TableFilter";
import type { ActiveFilterTag } from "../../../shared/ui/TableFilter";

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

const CUSTOMER_STATUS_OPTIONS: { label: string; value: CustomerStatus }[] = [
  { label: "Đang hoạt động", value: "Active" },
  { label: "Ngừng hoạt động", value: "Inactive" },
  { label: "Danh sách đen", value: "Blacklisted" },
];

/** Ba ô người phụ trách gom chung một chỗ để dựng thẻ lọc và đếm không phải chép ba lần. */
const OWNER_FIELDS = [
  { key: "salesOwnerEmpId", label: "Kinh doanh" },
  { key: "accountingOwnerEmpId", label: "Kế toán" },
  { key: "documentOwnerEmpId", label: "Chứng từ" },
] as const;

/**
 * Ô tìm để ngoài, trạng thái và ba người phụ trách thu vào nút "Bộ lọc" — cùng bố cục
 * với màn Hợp đồng và Lệnh xuất kho. Trước đây năm ô bày phẳng trên một hàng ngang,
 * vừa chiếm chỗ vừa không cho biết đang lọc theo gì sau khi bấm tìm.
 *
 * Thẻ lọc của người phụ trách chỉ ghi tên cột chứ không ghi tên nhân viên: component
 * này chỉ cầm id, tra tên phải gọi thêm API — mà biết "đang lọc theo Kinh doanh" và
 * gỡ được đã đủ dùng.
 */
const CustomerFiltersBase: React.FC<CustomerFiltersProps> = ({
  value,
  onChange,
  onCreate,
  loading,
}) => {
  const [form] = Form.useForm<CustomerFiltersValues>();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    form.setFieldsValue(value);
  }, [value, form]);

  const applyPanel = (values: CustomerFiltersValues) => {
    onChange({ ...value, ...values });
    setOpen(false);
  };

  const resetAll = () => {
    const next: CustomerFiltersValues = {
      keyword: undefined,
      status: undefined,
      salesOwnerEmpId: undefined,
      accountingOwnerEmpId: undefined,
      documentOwnerEmpId: undefined,
    };
    form.setFieldsValue(next);
    onChange(next);
    setOpen(false);
  };

  const clearField = (key: keyof CustomerFiltersValues) => {
    form.setFieldValue(key, undefined);
    onChange({ ...value, [key]: undefined });
  };

  const activeCount =
    Number(Boolean(value.status)) +
    OWNER_FIELDS.filter((f) => Boolean(value[f.key])).length;

  const tags: ActiveFilterTag[] = [
    value.status
      ? {
          key: "status",
          label: `Trạng thái: ${
            CUSTOMER_STATUS_OPTIONS.find((o) => o.value === value.status)?.label ??
            value.status
          }`,
          onClear: () => clearField("status"),
        }
      : null,
    ...OWNER_FIELDS.map((f) =>
      value[f.key]
        ? { key: f.key, label: `${f.label}: đang lọc`, onClear: () => clearField(f.key) }
        : null,
    ),
  ].filter(Boolean) as ActiveFilterTag[];

  const panel = (
    <Form<CustomerFiltersValues>
      form={form}
      layout="vertical"
      size="small"
      style={{ width: 260 }}
      onFinish={applyPanel}
    >
      <Form.Item name="status" label="Trạng thái" style={{ marginBottom: 10 }}>
        <Select allowClear placeholder="Chọn trạng thái" options={CUSTOMER_STATUS_OPTIONS} />
      </Form.Item>
      {OWNER_FIELDS.map((f) => (
        <Form.Item key={f.key} name={f.key} label={f.label} style={{ marginBottom: 10 }}>
          <EmployeeSelect style={{ width: "100%" }} placeholder={`Chọn ${f.label.toLowerCase()}`} />
        </Form.Item>
      ))}
      <Space style={{ width: "100%", justifyContent: "flex-end" }}>
        <Button size="small" onClick={resetAll}>Đặt lại</Button>
        <Button size="small" type="primary" htmlType="submit" loading={loading}>
          Áp dụng
        </Button>
      </Space>
    </Form>
  );

  return (
    <>
      <FilterToolbar
        left={
          <Input.Search
            size="small"
            allowClear
            placeholder="Tìm theo mã, tên, MST..."
            defaultValue={value.keyword}
            style={{ width: 260 }}
            loading={loading}
            onSearch={(keyword) => onChange({ ...value, keyword: keyword.trim() || undefined })}
          />
        }
        right={
          <Space size={6}>
            <FilterButton
              count={activeCount}
              open={open}
              onOpenChange={setOpen}
              content={panel}
            />
            {onCreate && (
              <Button icon={<PlusOutlined />} size="small" onClick={onCreate}>
                Thêm mới
              </Button>
            )}
          </Space>
        }
      />
      <FilterTags items={tags} />
    </>
  );
};

export const CustomerFilters = memo(CustomerFiltersBase);
