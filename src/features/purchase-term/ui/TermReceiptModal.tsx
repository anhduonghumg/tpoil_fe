import React, { useEffect, useState } from "react";
import { Button, DatePicker, Form, Input, InputNumber, message, Modal, Select, Space, Upload } from "antd";
import dayjs from "dayjs";
import { TermPurchaseOrdersApi } from "../api";
import type {
  CreateTermGoodsReceiptPayload,
  TermPurchaseOrderDetail,
} from "../types";

type FormValues = {
  purchaseOrderLineId: string;
  supplierLocationId?: string;
  productId: string;
  receiptDate: dayjs.Dayjs;
  billQty: number;
  tankQty: number;
  temporaryWithdrawQty: number;
  billToTankLossQty: number;
  receiptDocumentTemplate?: "TEMPLATE_1" | "TEMPLATE_2";
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
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [reading, setReading] = useState(false);

  const selectedLineId = Form.useWatch("purchaseOrderLineId", form);
  const selectedTemplate = Form.useWatch("receiptDocumentTemplate", form);
  const selectedLine = data.lines.find((x) => x.id === selectedLineId);

  const setDefaultQuantities = (qty?: number | null) => {
    const value = Number(qty || 0);
    form.setFieldsValue({
      billQty: value,
      tankQty: value,
      temporaryWithdrawQty: value,
      billToTankLossQty: 0,
    });
  };

  useEffect(() => {
    if (!open) return;

    const first = data.lines?.[0];

    form.setFieldsValue({
      purchaseOrderLineId: first?.id,
      productId: first?.productId,
      supplierLocationId:
        first?.supplierLocationId || data.supplierLocationId || undefined,
      receiptDate: dayjs(),
      receiptDocumentTemplate: "TEMPLATE_1",
      note: undefined,
    });
    setSourceFile(null);
    setDefaultQuantities(first?.orderedQty);
  }, [open, data, form]);

  useEffect(() => {
    if (!selectedLine) return;

    form.setFieldsValue({
      productId: selectedLine.productId,
      supplierLocationId:
        selectedLine.supplierLocationId || data.supplierLocationId || undefined,
    });
    setDefaultQuantities(selectedLine.orderedQty);
  }, [selectedLineId]);

  const syncLoss = (_: Partial<FormValues>, values: FormValues) => {
    if (_.billQty === undefined && _.tankQty === undefined) return;
    const billQty = Number(values.billQty || 0);
    const tankQty = Number(values.tankQty || 0);
    form.setFieldValue("billToTankLossQty", Math.max(billQty - tankQty, 0));
  };

  const readDocument = async () => {
    if (!sourceFile) {
      message.warning("Chọn file chứng từ trước.");
      return;
    }
    if (!selectedTemplate) {
      message.warning("Chọn mẫu chứng từ trước.");
      return;
    }

    setReading(true);
    try {
      const result = await TermPurchaseOrdersApi.importReceiptDocument(data.id, sourceFile, selectedTemplate);
      const fields = result?.fields || {};
      form.setFieldsValue({
        billQty: fields.billQty ?? form.getFieldValue("billQty"),
        tankQty: fields.tankQty ?? form.getFieldValue("tankQty"),
        temporaryWithdrawQty: fields.temporaryWithdrawQty ?? form.getFieldValue("temporaryWithdrawQty"),
        billToTankLossQty: fields.billToTankLossQty ?? form.getFieldValue("billToTankLossQty"),
      });
      if (result?.warnings?.length) {
        message.warning(result.warnings.join("; "));
      } else {
        message.success("Đã đọc chứng từ giao nhận.");
      }
    } catch (error: any) {
      message.error(error?.message || "Không đọc được chứng từ.");
    } finally {
      setReading(false);
    }
  };

  const submit = async () => {
    const v = await form.validateFields();

    onSubmit({
      purchaseOrderLineId: v.purchaseOrderLineId,
      productId: v.productId,
      supplierLocationId: v.supplierLocationId,
      receiptDate: v.receiptDate.format("YYYY-MM-DD"),
      qty: Number(v.tankQty),
      standardQtyV15: Number(v.temporaryWithdrawQty),
      billQty: Number(v.billQty),
      tankQty: Number(v.tankQty),
      temporaryWithdrawQty: Number(v.temporaryWithdrawQty),
      billToTankLossQty: Number(v.billToTankLossQty || 0),
      receiptDocumentTemplate: v.receiptDocumentTemplate,
      sourceFile: sourceFile || undefined,
      note: v.note?.trim() || undefined,
    });
  };

  return (
    <Modal
      open={open}
      title="Tạo phiếu giao nhận TERM"
      width={760}
      onCancel={onCancel}
      onOk={submit}
      confirmLoading={loading}
      okText="Lưu phiếu"
      cancelText="Hủy"
      destroyOnHidden
    >
      <Form form={form} layout="vertical" size="small" onValuesChange={syncLoss}>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, marginBottom: 10, background: "#f8fafc" }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Đọc từ chứng từ</div>
          <div style={{ display: "grid", gridTemplateColumns: "220px minmax(0, 1fr) 110px", gap: 8, alignItems: "end" }}>
            <Form.Item name="receiptDocumentTemplate" label="Mẫu chứng từ" style={{ marginBottom: 0 }}>
              <Select
                options={[
                  { value: "TEMPLATE_1", label: "Mẫu 1 - Phiếu xuất kho" },
                  { value: "TEMPLATE_2", label: "Mẫu 2 - Biên bản giao nhận" },
                ]}
              />
            </Form.Item>
            <Form.Item label="File ảnh/PDF" style={{ marginBottom: 0 }}>
              <Upload
                accept="image/*,.pdf"
                maxCount={1}
                beforeUpload={(file) => {
                  setSourceFile(file);
                  return false;
                }}
                onRemove={() => {
                  setSourceFile(null);
                }}
              >
                <Button block>{sourceFile ? sourceFile.name : "Chọn file"}</Button>
              </Upload>
            </Form.Item>
            <Button loading={reading} onClick={readDocument}>
              Đọc
            </Button>
          </div>
        </div>

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
            label="Ngày giao nhận"
            rules={[{ required: true, message: "Chọn ngày giao nhận" }]}
          >
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>

          <Form.Item
            name="billQty"
            label="Số lượng hàng trên bill"
            rules={[{ required: true, message: "Nhập số lượng hàng trên bill" }]}
          >
            <InputNumber min={0} style={{ width: "100%" }} addonAfter="L" />
          </Form.Item>

          <Form.Item
            name="tankQty"
            label="Số lượng hàng lên bồn kho"
            rules={[{ required: true, message: "Nhập số lượng hàng lên bồn kho" }]}
          >
            <InputNumber min={0.001} style={{ width: "100%" }} addonAfter="L" />
          </Form.Item>

          <Form.Item
            name="temporaryWithdrawQty"
            label="Số lượng hàng được rút tạm tính"
            rules={[{ required: true, message: "Nhập số lượng được rút tạm tính" }]}
          >
            <InputNumber min={0} style={{ width: "100%" }} addonAfter="L" />
          </Form.Item>

          <Form.Item
            name="billToTankLossQty"
            label="Hao hụt bill về bồn"
            rules={[{ required: true, message: "Nhập hao hụt bill về bồn" }]}
          >
            <InputNumber min={0} style={{ width: "100%" }} addonAfter="L" />
          </Form.Item>
        </div>

        <Form.Item name="note" label="Ghi chú">
          <Input.TextArea rows={2} />
        </Form.Item>
        {sourceFile ? (
          <Space size={6} style={{ fontSize: 12, color: "#64748b" }}>
            <span>File sẽ lưu kèm phiếu:</span>
            <b>{sourceFile.name}</b>
          </Space>
        ) : null}
      </Form>
    </Modal>
  );
}
