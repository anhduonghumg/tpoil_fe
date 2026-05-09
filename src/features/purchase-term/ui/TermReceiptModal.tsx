import React, { useEffect } from "react";
import { DatePicker, Form, Input, InputNumber, Modal, Select } from "antd";
import dayjs from "dayjs";
import type {
  CreateTermGoodsReceiptPayload,
  TermPurchaseOrderDetail,
} from "../types";

type FormValues = {
  purchaseOrderLineId: string;
  supplierLocationId?: string;
  productId: string;
  receiptDate: dayjs.Dayjs;
  qty: number;
  tempC?: number;
  density?: number;
  standardQtyV15?: number;
  shippingFee?: number;
  note?: string;
};

type Props = {
  open: boolean;
  data: TermPurchaseOrderDetail;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (payload: CreateTermGoodsReceiptPayload) => void;
};

export function TermReceiptModal({
  open,
  data,
  loading,
  onCancel,
  onSubmit,
}: Props) {
  const [form] = Form.useForm<FormValues>();

  const selectedLineId = Form.useWatch("purchaseOrderLineId", form);

  const selectedLine = data.lines.find((x) => x.id === selectedLineId);

  useEffect(() => {
    if (!open) return;

    const first = data.lines?.[0];

    form.setFieldsValue({
      purchaseOrderLineId: first?.id,
      productId: first?.productId,
      supplierLocationId:
        first?.supplierLocationId || data.supplierLocationId || undefined,
      receiptDate: dayjs(),
      qty: first?.orderedQty,
      standardQtyV15: first?.orderedQty,
      shippingFee: 0,
    });
  }, [open, data, form]);

  useEffect(() => {
    if (!selectedLine) return;

    form.setFieldsValue({
      productId: selectedLine.productId,
      supplierLocationId:
        selectedLine.supplierLocationId || data.supplierLocationId || undefined,
      qty: selectedLine.orderedQty,
      standardQtyV15: selectedLine.orderedQty,
    });
  }, [selectedLineId]);

  const submit = async () => {
    const v = await form.validateFields();

    onSubmit({
      purchaseOrderLineId: v.purchaseOrderLineId,
      productId: v.productId,
      supplierLocationId: v.supplierLocationId,
      receiptDate: v.receiptDate.format("YYYY-MM-DD"),
      qty: Number(v.qty),
      tempC: v.tempC,
      density: v.density,
      standardQtyV15: v.standardQtyV15,
      shippingFee: v.shippingFee,
      note: v.note?.trim() || undefined,
    });
  };

  return (
    <Modal
      open={open}
      title="Tạo phiếu nhận hàng TERM"
      width={760}
      onCancel={onCancel}
      onOk={submit}
      confirmLoading={loading}
      okText="Lưu phiếu"
      cancelText="Hủy"
      destroyOnHidden
    >
      <Form form={form} layout="vertical" size="small">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          <Form.Item
            name="purchaseOrderLineId"
            label="Dòng hàng"
            rules={[{ required: true, message: "Chọn dòng hàng" }]}
          >
            <Select
              options={(data.lines || []).map((x) => ({
                value: x.id,
                label: `${x.productCode ? `${x.productCode} - ` : ""}${
                  x.productName || "Sản phẩm"
                } · ${new Intl.NumberFormat("vi-VN").format(x.orderedQty)} L`,
              }))}
            />
          </Form.Item>

          <Form.Item name="productId" label="Sản phẩm">
            <Select
              disabled
              options={(data.lines || []).map((x) => ({
                value: x.productId,
                label: x.productCode
                  ? `${x.productCode} - ${x.productName}`
                  : x.productName,
              }))}
            />
          </Form.Item>

          <Form.Item name="supplierLocationId" label="Kho nhận">
            <Select
              disabled
              options={(data.lines || [])
                .filter((x) => x.supplierLocationId)
                .map((x) => ({
                  value: x.supplierLocationId!,
                  label: x.supplierLocationName || x.supplierLocationId!,
                }))}
            />
          </Form.Item>

          <Form.Item
            name="receiptDate"
            label="Ngày nhận"
            rules={[{ required: true, message: "Chọn ngày nhận" }]}
          >
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>

          <Form.Item
            name="qty"
            label="Lít thực nhận"
            rules={[{ required: true, message: "Nhập lít thực nhận" }]}
          >
            <InputNumber min={0.001} style={{ width: "100%" }} addonAfter="L" />
          </Form.Item>

          <Form.Item name="standardQtyV15" label="Lít V15">
            <InputNumber min={0} style={{ width: "100%" }} addonAfter="L" />
          </Form.Item>

          <Form.Item name="tempC" label="Nhiệt độ">
            <InputNumber style={{ width: "100%" }} addonAfter="°C" />
          </Form.Item>

          <Form.Item name="density" label="Tỷ trọng">
            <InputNumber style={{ width: "100%" }} addonAfter="kg/L" />
          </Form.Item>

          <Form.Item name="shippingFee" label="Phí vận chuyển">
            <InputNumber min={0} style={{ width: "100%" }} addonAfter="đ" />
          </Form.Item>
        </div>

        <Form.Item name="note" label="Ghi chú">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
