// features/supplier-locations/ui/SupplierLocationUpsertModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Form, Input, Modal, Switch, Checkbox, Divider, Tooltip } from "antd";
import type {
  CreateSupplierLocationPayload,
  SupplierLocation,
  SupplierOption,
  UpdateSupplierLocationPayload,
} from "../types";
import { SupplierLocationsApi } from "../api";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  initial?: SupplierLocation | null;
  onCancel: () => void;
  onCreate: (data: CreateSupplierLocationPayload) => Promise<void> | void;
  onUpdate: (args: {
    id: string;
    supplierCustomerIds: string[];
    data: UpdateSupplierLocationPayload;
  }) => Promise<void> | void;

  saving?: boolean;
};

const useDebounced = (value: string, ms = 300) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
};

const CheckboxNccPicker: React.FC<{
  fieldName: string;
}> = ({ fieldName }) => {
  const form = Form.useFormInstance();
  const selected: string[] = Form.useWatch(fieldName, form) || [];

  const [keyword, setKeyword] = useState("");
  const debounced = useDebounced(keyword, 300);

  const [options, setOptions] = useState<SupplierOption[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = async (kw: string) => {
    setLoading(true);
    try {
      const data = await SupplierLocationsApi.suppliersSelect(kw);
      setOptions(data.items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch("");
  }, []);

  useEffect(() => {
    fetch(debounced.trim());
  }, [debounced]);

  const visibleIds = useMemo(() => options.map((x) => x.id), [options]);

  const selectAllVisible = () => {
    const next = Array.from(new Set([...selected, ...visibleIds]));
    form.setFieldValue(fieldName, next);
  };

  const unselectAllVisible = () => {
    const visibleSet = new Set(visibleIds);
    const next = selected.filter((id) => !visibleSet.has(id));
    form.setFieldValue(fieldName, next);
  };

  return (
    <div>
      <div
        style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}
      >
        <a onClick={selectAllVisible}>Chọn tất cả</a>
        <Divider type="vertical" />
        <a onClick={unselectAllVisible}>Bỏ chọn</a>
        <span style={{ marginLeft: "auto", color: "#666" }}>
          Đã chọn: {selected.length}
        </span>
      </div>

      <div
        style={{
          marginTop: 8,
          border: "1px solid #f0f0f0",
          borderRadius: 10,
          padding: 12,
          maxHeight: 360,
          overflow: "auto",
          opacity: loading ? 0.85 : 1,
        }}
      >
        <Checkbox.Group
          style={{ width: "100%" }}
          value={selected}
          onChange={(vals) => form.setFieldValue(fieldName, vals)}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            {options.map((x) => {
              const code = (x.code || "").trim();
              const label = code || x.name;

              return (
                <Checkbox
                  key={x.id}
                  value={x.id}
                  style={{ marginInlineStart: 0 }}
                >
                  <Tooltip title={x.name} placement="topLeft">
                    <span
                      style={{
                        display: "inline-block",
                        maxWidth: "100%",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {label}
                    </span>
                  </Tooltip>
                </Checkbox>
              );
            })}
          </div>
        </Checkbox.Group>

        {!loading && options.length === 0 ? (
          <div style={{ color: "#999", marginTop: 8 }}>
            Không có NCC phù hợp.
          </div>
        ) : null}
      </div>
    </div>
  );
};

export const SupplierLocationUpsertModal: React.FC<Props> = ({
  open,
  mode,
  initial,
  onCancel,
  onCreate,
  onUpdate,
  saving,
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && initial) {
      form.setFieldsValue({
        supplierCustomerIds: initial.supplierCustomerId
          ? [initial.supplierCustomerId]
          : [],
        code: initial.code,
        name: initial.name,
        nameInvoice: initial.nameInvoice,
        // address: initial.address ?? "",
        // tankCode: initial.tankCode ?? "",
        // tankName: initial.tankName ?? "",
        isActive: initial.isActive,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        isActive: true,
        supplierCustomerIds: [],
      });
    }
  }, [open, mode, initial, form]);

  const onOk = async () => {
    const v = await form.validateFields();

    if (mode === "create") {
      const payload: CreateSupplierLocationPayload = {
        code: v.code.trim(),
        name: v.name.trim(),
        nameInvoice: v.nameInvoice?.trim(),
        address: v.address?.trim() || undefined,
        tankCode: v.tankCode?.trim() || undefined,
        tankName: v.tankName?.trim() || undefined,
        isActive: !!v.isActive,
        supplierCustomerIds: v.supplierCustomerIds,
      };
      await onCreate(payload);
      return;
    }

    if (!initial) return;

    const supplierCustomerIds: string[] = v.supplierCustomerIds || [];
    const payload: UpdateSupplierLocationPayload = {
      name: v.name?.trim(),
      nameInvoice: v.nameInvoice?.trim() || undefined,
      address: v.address?.trim() || undefined,
      tankCode: v.tankCode?.trim() || undefined,
      tankName: v.tankName?.trim() || undefined,
      isActive: !!v.isActive,
    };

    await onUpdate({
      id: initial.id,
      supplierCustomerIds,
      data: payload,
    });
  };

  return (
    <Modal
      open={open}
      title={mode === "create" ? "Thêm kho" : "Cập nhật kho"}
      onCancel={onCancel}
      onOk={onOk}
      confirmLoading={saving}
      okText="Lưu"
      destroyOnClose
      maskClosable={false}
      width={980}
      style={{ top: 24, maxHeight: "100vh", overflow: "auto" }}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="Mã kho"
          name="code"
          rules={[{ required: true, message: "Nhập mã kho" }]}
        >
          <Input placeholder="VD: K1" disabled={mode === "edit"} />
        </Form.Item>

        <Form.Item
          label="Tên kho"
          name="name"
          rules={[{ required: true, message: "Nhập tên kho" }]}
        >
          <Input placeholder="VD: Kho Ninh Bình" />
        </Form.Item>

        <Form.Item
          label="Tên kho theo hóa đơn"
          name="nameInvoice"
          rules={[{ required: true, message: "Nhập tên kho theo hóa đơn" }]}
        >
          <Input placeholder="VD: KHO NINH BINH" />
        </Form.Item>

        {/* <Form.Item label="Địa chỉ" name="address">
          <Input placeholder="(Không bắt buộc)" />
        </Form.Item>

        <Form.Item label="Tank code" name="tankCode">
          <Input placeholder="(Không bắt buộc)" />
        </Form.Item>

        <Form.Item label="Tank name" name="tankName">
          <Input placeholder="(Không bắt buộc)" />
        </Form.Item> */}

        <Form.Item
          label="Đang hoạt động"
          name="isActive"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        <Form.Item label="Áp dụng cho NCC" required>
          <Form.Item
            name="supplierCustomerIds"
            noStyle
            rules={[{ required: true, message: "Chọn ít nhất 1 NCC" }]}
          >
            <CheckboxNccPicker fieldName="supplierCustomerIds" />
          </Form.Item>
        </Form.Item>
      </Form>
    </Modal>
  );
};
