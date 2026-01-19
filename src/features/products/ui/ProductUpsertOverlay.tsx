import React, { useEffect } from "react";
import { Button, Drawer, Form, Input, Modal, Select, Space } from "antd";
import type { Product, ProductUpsertPayload, QtyUom } from "../types";

const UOM_OPTIONS: Array<{ label: string; value: QtyUom }> = [
  { label: "Lít", value: "LITER" },
  { label: "Kg", value: "KG" },
  { label: "Unit", value: "UNIT" },
];

export const ProductUpsertOverlay: React.FC<{
  open: boolean;
  mode: "create" | "edit";
  initial?: Product | null;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: ProductUpsertPayload) => Promise<any>;
}> = ({ open, mode, initial, submitting, onClose, onSubmit }) => {
  const [form] = Form.useForm<ProductUpsertPayload>();

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && initial) {
      form.setFieldsValue({
        code: initial.code || undefined,
        name: initial.name,
        nameMisa: initial.nameMisa,
        uom: initial.uom,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ uom: "LITER" });
    }
  }, [open, mode, initial, form]);

  const handleOk = async () => {
    const v = await form.validateFields();
    await onSubmit({
      code: v.code?.trim() || undefined,
      name: v.name.trim(),
      nameMisa: v.nameMisa.trim(),
      uom: v.uom,
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      title={mode === "create" ? "Thêm sản phẩm" : "Cập nhật sản phẩm"}
      onCancel={onClose}
      onOk={handleOk}
      centered={true}
      okText="Lưu"
      cancelText="Hủy"
      confirmLoading={submitting}
      destroyOnClose
      maskClosable={false}
    >
      <Form form={form} layout="vertical">
        <Form.Item label="Mã (tuỳ chọn)" name="code">
          <Input placeholder="VD: RON95, DO05..." />
        </Form.Item>

        <Form.Item
          label="Tên sản phẩm"
          name="name"
          rules={[{ required: true, message: "Vui lòng nhập tên sản phẩm" }]}
        >
          <Input placeholder="VD: Xăng RON95-III" />
        </Form.Item>

        <Form.Item
          label="Tên sản phẩm theo misa"
          name="nameMisa"
          rules={[
            { required: true, message: "Vui lòng nhập tên sản phẩm theo misa" },
          ]}
        >
          <Input placeholder="VD: Xăng RON95-III" />
        </Form.Item>

        <Form.Item label="Đơn vị tính" name="uom" initialValue="LITER">
          <Select options={UOM_OPTIONS} />
        </Form.Item>
      </Form>
    </Modal>
  );
};
