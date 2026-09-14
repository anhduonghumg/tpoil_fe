import { Button, Form, Input, Select, Space } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useSiteList } from "../hooks";
import AddButton from "../../../shared/ui/buttons/AddButton";
import {
  FilterButton,
  FilterTags,
  FilterToolbar,
} from "../../../shared/ui/TableFilter";
import type { ActiveFilterTag } from "../../../shared/ui/TableFilter";

type Value = {
  q?: string;
  type?: string;
  siteId?: string;
};

type Props = {
  value?: Value;
  siteValue?: ReturnType<typeof useSiteList>;
  onApply?: (v: Value | undefined) => void;
  onAdd?: () => void;
};

const TYPE_OPTIONS = [
  { label: "Ban giám đốc", value: "board" },
  { label: "Phòng", value: "office" },
  { label: "Bộ phận", value: "group" },
  { label: "Điểm vận hành", value: "branch" },
];

/**
 * Ô tìm để ngoài, hai bộ lọc còn lại thu vào nút "Bộ lọc" — cùng bố cục với màn
 * Hợp đồng và Lệnh xuất kho. Điều kiện đang bật hiện thành thẻ gỡ được, để không ai
 * lọc rồi quên mất là mình đang lọc.
 */
export default function DepartmentFilters({
  value,
  siteValue,
  onApply,
  onAdd,
}: Props) {
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);

  // Hook phải gọi vô điều kiện; trước đây `siteValue || useSiteList()` chỉ gọi khi
  // prop rỗng, nên thứ tự hook đổi giữa các lần render. React-query tự gộp nên gọi
  // thừa không phát sinh request.
  const fallbackSite = useSiteList();
  const site = siteValue ?? fallbackSite;

  useEffect(() => {
    form.setFieldsValue({ type: value?.type, siteId: value?.siteId });
  }, [form, value?.type, value?.siteId]);

  const siteOptions = useMemo(
    () =>
      Array.isArray(site.data)
        ? site.data.map((s) => ({ label: s.name, value: s.id }))
        : [],
    [site.data],
  );

  const applyPanel = async () => {
    const v = await form.validateFields();
    onApply?.({
      q: value?.q,
      type: v.type || undefined,
      siteId: v.siteId || undefined,
    });
    setOpen(false);
  };

  const resetAll = () => {
    form.resetFields();
    onApply?.(undefined);
    setOpen(false);
  };

  const activeCount =
    Number(Boolean(value?.type)) + Number(Boolean(value?.siteId));

  const tags: ActiveFilterTag[] = [
    value?.type
      ? {
          key: "type",
          label: `Loại: ${TYPE_OPTIONS.find((o) => o.value === value.type)?.label ?? value.type}`,
          onClear: () => {
            form.setFieldValue("type", undefined);
            onApply?.({ ...value, type: undefined });
          },
        }
      : null,
    value?.siteId
      ? {
          key: "site",
          label: `Địa điểm: ${siteOptions.find((o) => o.value === value.siteId)?.label ?? value.siteId}`,
          onClear: () => {
            form.setFieldValue("siteId", undefined);
            onApply?.({ ...value, siteId: undefined });
          },
        }
      : null,
  ].filter(Boolean) as ActiveFilterTag[];

  const panel = (
    <Form
      form={form}
      layout="vertical"
      size="small"
      style={{ width: 260 }}
      onFinish={applyPanel}
    >
      <Form.Item name="type" label="Loại" style={{ marginBottom: 10 }}>
        <Select allowClear placeholder="Chọn loại" options={TYPE_OPTIONS} />
      </Form.Item>
      <Form.Item name="siteId" label="Địa điểm" style={{ marginBottom: 10 }}>
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="Chọn địa điểm"
          options={siteOptions}
        />
      </Form.Item>
      <Space style={{ width: "100%", justifyContent: "flex-end" }}>
        <Button size="small" onClick={resetAll}>Đặt lại</Button>
        <Button size="small" type="primary" htmlType="submit">Áp dụng</Button>
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
            placeholder="Tìm theo tên/mã"
            defaultValue={value?.q}
            style={{ width: 240 }}
            onSearch={(q) => onApply?.({ ...value, q: q.trim() || undefined })}
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
            <AddButton size="small" onClick={onAdd ?? (() => {})} />
          </Space>
        }
      />
      <FilterTags items={tags} />
    </>
  );
}
