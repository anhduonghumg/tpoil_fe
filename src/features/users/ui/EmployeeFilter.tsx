// src/features/users/ui/EmployeeFilter.tsx
import { Form, Input, Select, Button, Space } from "antd";
import { SearchOutlined, ReloadOutlined } from "@ant-design/icons";

export type EmployeesFilterValues = {
  q?: string;
  deptId?: string;
  status?: "active" | "probation" | "inactive" | "quit";
};

export default function EmployeesFilters({
  loadingDepts,
  deptOptions,
  initial,
  onSearch,
  onReset,
}: {
  loadingDepts?: boolean;
  deptOptions: Array<{ value: string; label: string }>;
  initial?: EmployeesFilterValues;
  onSearch: (vals: EmployeesFilterValues) => void;
  onReset?: () => void;
}) {
  const [form] = Form.useForm<EmployeesFilterValues>();

  const handleReset = () => {
    form.resetFields();
    onReset?.();
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
        width: "100%",
      }}
    >
      <Form
        form={form}
        layout="inline"
        initialValues={initial}
        onFinish={(vals) => onSearch(vals)}
        style={{ display: "flex", flexWrap: "wrap", gap: 12, margin: 0 }}
      >
        <Form.Item name="q" style={{ margin: 0 }}>
          <Input
            placeholder="Tìm theo tên/mã"
            allowClear
            size="small"
            style={{ width: 260 }}
            onPressEnter={() => form.submit()}
          />
        </Form.Item>

        <Form.Item name="deptId" style={{ margin: 0 }}>
          <Select
            size="small"
            allowClear
            placeholder="Chọn phòng ban"
            loading={loadingDepts}
            options={deptOptions}
            style={{ width: 160 }}
          />
        </Form.Item>

        <Form.Item name="status" style={{ margin: 0 }}>
          <Select
            size="small"
            allowClear
            placeholder="Chọn trạng thái"
            options={[
              { value: "active", label: "Đang làm" },
              { value: "probation", label: "Thử việc" },
              { value: "inactive", label: "Tạm dừng" },
              { value: "quit", label: "Nghỉ việc" },
            ]}
            style={{ width: 160 }}
          />
        </Form.Item>

        <Space wrap style={{ margin: 0 }}>
          <Button
            icon={<SearchOutlined />}
            htmlType="submit"
            size="small"
            style={{ borderRadius: 6 }}
          >
            Tìm kiếm
          </Button>
          <Button
            icon={<ReloadOutlined />}
            size="small"
            onClick={handleReset}
            style={{ borderRadius: 6 }}
          >
            Xóa lọc
          </Button>
        </Space>
      </Form>

      {/* Slot để đặt nút "Thêm mới" từ màn cha */}
    </div>
  );
}
