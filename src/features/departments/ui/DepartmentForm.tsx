import { Form, Input, Select, TreeSelect, FormInstance } from "antd";
import type { Department, DeptType } from "../types";
import { DEPT_CODE } from "../types";
import { useDeptTree } from "../hooks";
import { useMemo } from "react";

const TYPE_OPTS = [
  { label: "Ban giám đốc", value: "board" },
  { label: "Phòng", value: "office" },
  { label: "Bộ phận", value: "group" },
  { label: "Điểm vận hành", value: "branch" },
] as const;

export default function DepartmentForm({
  data,
  form: external,
  hideInlineSubmit = true,
  onSubmit,
  disabledCode = false,
  selfId,
  sites,
}: {
  data?: Partial<Department>;
  form?: FormInstance;
  hideInlineSubmit?: boolean;
  onSubmit: (payload: Partial<Department>) => void;
  disabledCode?: boolean;
  selfId?: string;
  sites?: { id: string; name: string }[];
}) {
  const [internal] = Form.useForm();
  const form = external ?? internal;
  const { data: treeData } = useDeptTree();

  // console.log("Site list", site);
  const tree = useMemo(() => {
    const map = (nodes: any[]): any[] =>
      nodes?.map((n) => ({
        title: `${n.name} (${n.code})${n.deletedAt ? " [Deleted]" : ""}`,
        value: n.id,
        disabled: !!selfId && n.id === selfId,
        selectable: true,
        children: n.children ? map(n.children) : undefined,
      })) ?? [];
    return map(treeData ?? []);
  }, [treeData, selfId]);

  const init = {
    code: data?.code,
    name: data?.name,
    type: data?.type ?? "branch",
    parentId: data?.parentId ?? undefined,
    siteId: data?.siteId ?? undefined,
    costCenter: data?.costCenter ?? undefined,
  };

  return (
    <Form
      layout="vertical"
      form={form}
      initialValues={init}
      scrollToFirstError
      onFinish={(v) => {
        const payload: Partial<Department> = {
          code: v.code?.trim(),
          name: v.name?.trim(),
          type: v.type as DeptType,
          parentId: v.parentId || null,
          siteId: v.siteId || null,
          costCenter: v.costCenter?.trim() || null,
        };
        onSubmit(payload);
      }}
    >
      <Form.Item
        label="Mã phòng ban"
        name="code"
        rules={[
          { required: true, message: "Bắt buộc" },
          { pattern: DEPT_CODE, message: "2–32 ký tự; A-Z a-z 0-9 . _ -" },
        ]}
      >
        <Input
          disabled={disabledCode}
          placeholder="VD: HN.SALES"
          maxLength={32}
          allowClear
        />
      </Form.Item>

      <Form.Item
        label="Tên phòng ban"
        name="name"
        rules={[
          { required: true, message: "Bắt buộc" },
          { min: 2, max: 128, message: "2–128 ký tự" },
        ]}
      >
        <Input placeholder="VD: Sales Hà Nội" allowClear />
      </Form.Item>

      <Form.Item label="Loại" name="type" rules={[{ required: true }]}>
        <Select options={TYPE_OPTS as any} />
      </Form.Item>

      <Form.Item label="Thuộc phòng ban" name="parentId">
        <TreeSelect
          allowClear
          showSearch
          treeData={tree}
          treeLine
          treeDefaultExpandAll={false}
          placeholder="Chọn phòng ban cha (tuỳ chọn)"
          filterTreeNode={(input, node) =>
            (node?.title as string).toLowerCase().includes(input.toLowerCase())
          }
        />
      </Form.Item>

      <Form.Item label="Địa điểm" name="siteId">
        <Select
          allowClear
          showSearch
          placeholder="Chọn địa điểm"
          options={sites?.map((s) => ({ label: s.name, value: s.id })) || []}
          filterOption={(input, opt) =>
            (opt?.label as string).toLowerCase().includes(input.toLowerCase())
          }
        />
      </Form.Item>

      <Form.Item label="Cost Center" name="costCenter">
        <Input placeholder="VD: CC-001" allowClear />
      </Form.Item>

      {!hideInlineSubmit && (
        <Form.Item style={{ marginTop: 8 }}>
          <button type="submit" className="ant-btn ant-btn-primary">
            Lưu
          </button>
        </Form.Item>
      )}
    </Form>
  );
}
