import { Button, Form, Input, Select, Space } from "antd";
import { useEffect } from "react";
import { useSiteList } from "../hooks";
import SearchButton from "../../../shared/ui/buttons/SearchButton";
import AddButton from "../../../shared/ui/buttons/AddButton";

type Props = {
  value?: {
    q?: string;
    type?: string;
    siteId?: string;
  };
  siteValue?: ReturnType<typeof useSiteList>;
  onApply?: (v: Props["value"]) => void;
  onAdd?: () => void;
};

export default function DepartmentFilters({
  value,
  siteValue,
  onApply,
  onAdd,
}: Props) {
  const [form] = Form.useForm();

  const site = siteValue || useSiteList();

  useEffect(() => {
    form.setFieldsValue({
      q: value?.q,
      type: value?.type,
      siteId: value?.siteId,
    });
  }, [value]);

  const onSubmit = async () => {
    const v = await form.validateFields();
    onApply?.({
      q: v.q?.trim() || undefined,
      type: v.type || undefined,
      siteId: v.siteId || undefined,
    });
  };

  const reset = () => {
    form.resetFields();
    onApply?.(undefined);
  };

  return (
    <Form form={form} layout="inline" onFinish={onSubmit}>
      <Form.Item name="q">
        <Input
          size="small"
          placeholder="Tìm theo tên/mã"
          allowClear
          style={{ width: 240 }}
        />
      </Form.Item>

      <Form.Item name="type">
        <Select
          size="small"
          allowClear
          placeholder="Loại"
          style={{ width: 160 }}
          options={[
            { label: "Ban giám đốc", value: "board" },
            { label: "Phòng", value: "office" },
            { label: "Bộ phận", value: "group" },
            { label: "Điểm vận hành", value: "branch" },
          ]}
        />
      </Form.Item>

      <Form.Item name="siteId">
        {/* <Input placeholder="Site ID" allowClear style={{ width: 140 }} /> */}
        <Select
          size="small"
          allowClear
          placeholder="Địa điểm"
          style={{ width: 200 }}
          options={
            Array.isArray(site.data)
              ? site.data.map((s) => ({
                  label: s.name,
                  value: s.id,
                }))
              : []
          }
        />
      </Form.Item>
      <Space>
        <SearchButton size="small" onClick={onSubmit} />
        <Button size="small" onClick={reset}>
          Xóa lọc
        </Button>
        <AddButton size="small" onClick={onAdd ?? (() => {})} />
      </Space>
    </Form>
  );
}
