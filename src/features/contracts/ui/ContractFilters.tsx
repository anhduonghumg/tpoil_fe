// features/contracts/ui/ContractFilters.tsx
import React from "react";
import { Button, Form, Input, Select, DatePicker, Space } from "antd";
import dayjs, { Dayjs } from "dayjs";
import type { ContractListQuery } from "../types";
import { CustomerSelect } from "../../../shared/ui/CustomerSelect";

const { RangePicker } = DatePicker;

interface ContractFiltersProps {
  value: ContractListQuery;
  onChange: (next: Omit<ContractListQuery, "page" | "pageSize">) => void;
  onCreate?: () => void; // <-- thêm props này để bấm + Thêm mới
}

export const ContractFilters: React.FC<ContractFiltersProps> = ({
  value,
  onChange,
  onCreate,
}) => {
  const [form] = Form.useForm();

  const handleSubmit = (vals: any) => {
    const startRange = vals.startRange as
      | [Dayjs | null, Dayjs | null]
      | undefined;

    const startFrom = startRange?.[0]
      ? startRange[0]!.format("YYYY-MM-DD")
      : undefined;
    const startTo = startRange?.[1]
      ? startRange[1]!.format("YYYY-MM-DD")
      : undefined;

    onChange({
      keyword: vals.keyword || undefined,
      customerId: vals.customerId || undefined,
      status: vals.status || undefined,
      riskLevel: vals.riskLevel || undefined,
      startFrom,
      startTo,
      endFrom: undefined,
      endTo: undefined,
    });
  };

  const handleReset = () => {
    form.resetFields();
    onChange({
      keyword: undefined,
      customerId: undefined,
      status: undefined,
      riskLevel: undefined,
      startFrom: undefined,
      startTo: undefined,
      endFrom: undefined,
      endTo: undefined,
    });
  };

  return (
    <Form
      form={form}
      layout="inline"
      onFinish={handleSubmit}
      initialValues={{
        keyword: value.keyword,
        customerId: value.customerId,
        status: value.status,
        riskLevel: value.riskLevel,
        startRange:
          value.startFrom || value.startTo
            ? [
                value.startFrom ? dayjs(value.startFrom) : null,
                value.startTo ? dayjs(value.startTo) : null,
              ]
            : undefined,
      }}
      className="compact-filter-bar"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 4,
        marginBottom: 0,
      }}
    >
      {/* LEFT: + Thêm mới + filter */}
      <Space
        wrap
        size={4} // giảm khoảng cách giữa các ô
        style={{ flex: 1, minWidth: 0 }}
      >
        {onCreate && (
          <Form.Item>
            <Button size="small" type="primary" onClick={onCreate}>
              + Thêm mới
            </Button>
          </Form.Item>
        )}

        <Form.Item name="keyword">
          <Input
            size="small"
            allowClear
            placeholder="Tìm theo mã, tên, KH..."
            style={{ width: 240, maxWidth: "100%" }}
          />
        </Form.Item>

        <Form.Item name="customerId">
          <CustomerSelect
            allowClear
            placeholder="Khách hàng"
            style={{ width: 200, maxWidth: "100%" }}
          />
        </Form.Item>

        <Form.Item name="status">
          <Select
            size="small"
            allowClear
            placeholder="Trạng thái"
            style={{ width: 130 }}
          >
            <Select.Option value="Draft">Nháp</Select.Option>
            <Select.Option value="Pending">Chờ duyệt</Select.Option>
            <Select.Option value="Active">Đang hiệu lực</Select.Option>
            <Select.Option value="Terminated">Đã chấm dứt</Select.Option>
            <Select.Option value="Cancelled">Đã hủy</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item name="riskLevel">
          <Select
            size="small"
            allowClear
            placeholder="Rủi ro"
            style={{ width: 110 }}
          >
            <Select.Option value="Low">Thấp</Select.Option>
            <Select.Option value="Medium">Trung bình</Select.Option>
            <Select.Option value="High">Cao</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item name="startRange">
          <RangePicker
            size="small"
            allowEmpty={[true, true]}
            placeholder={["Từ ngày", "Đến ngày"]}
            format="DD/MM/YYYY"
            style={{ width: 210 }} // thu nhỏ để đủ chỗ cho nút
          />
        </Form.Item>
        <Button size="small" htmlType="button" onClick={handleReset}>
          Xóa lọc
        </Button>
        <Button size="small" type="primary" htmlType="submit">
          Tìm kiếm
        </Button>
      </Space>
      {/* RIGHT: nút hành động */}
      {/* <Space size={4} style={{ flexShrink: 0 }}></Space> */}
    </Form>
  );
};

export default ContractFilters;
