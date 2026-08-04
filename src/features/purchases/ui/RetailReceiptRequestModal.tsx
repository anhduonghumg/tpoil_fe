import { useEffect } from "react";
import { DatePicker, Form, Input, InputNumber, Modal, Select, Typography } from "antd";
import dayjs from "dayjs";
import { notify } from "../../../shared/lib/notification";
import { useCreateGoodsReceipt } from "../hooks";
import type { RetailPurchaseDetail } from "../retail-detail.types";

/** Purchasing asks the warehouse to take the goods in; stock only moves once they confirm. */
export function RetailReceiptRequestModal({
  open,
  order,
  onClose,
}: {
  open: boolean;
  order: RetailPurchaseDetail;
  onClose: () => void;
}) {
  const [form] = Form.useForm();
  const createMutation = useCreateGoodsReceipt();

  useEffect(() => {
    if (!open) return;
    const firstLine = order.lines[0];
    form.setFieldsValue({
      purchaseOrderLineId: firstLine?.id,
      receiptNo: `${order.orderNo}-NK${String(order.receipts.length + 1).padStart(2, "0")}`,
      receiptDate: dayjs(),
      qty: firstLine ? Number(firstLine.orderedQty) : undefined,
    });
  }, [open, order, form]);

  const submit = async () => {
    const values = await form.validateFields();
    try {
      await createMutation.mutateAsync({
        purchaseOrderId: order.id,
        purchaseOrderLineId: values.purchaseOrderLineId,
        receiptNo: String(values.receiptNo || "").trim(),
        receiptDate: values.receiptDate.toISOString(),
        qty: Number(values.qty || 0),
      });
      notify.success("Đã gửi đề nghị nhập hàng sang kho");
      onClose();
    } catch {
      notify.error("Không gửi được đề nghị nhập hàng");
    }
  };

  return (
    <Modal
      open={open}
      title="Đề nghị nhập hàng"
      okText="Gửi đề nghị sang kho"
      cancelText="Hủy"
      onCancel={onClose}
      onOk={submit}
      confirmLoading={createMutation.isPending}
      destroyOnClose
    >
      <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
        Kho sẽ xác nhận trên màn Nhập kho mua hàng. Tồn kho chỉ tăng sau khi kho xác nhận.
      </Typography.Paragraph>
      <Form form={form} layout="vertical" size="small">
        <Form.Item
          name="purchaseOrderLineId"
          label="Dòng hàng"
          rules={[{ required: true, message: "Chọn dòng hàng" }]}
        >
          <Select
            options={order.lines.map((line) => ({
              value: line.id,
              label: `${line.product?.code ?? ""} - ${line.product?.name ?? ""}`,
            }))}
            onChange={(lineId) => {
              const line = order.lines.find((item) => item.id === lineId);
              if (line) form.setFieldValue("qty", Number(line.orderedQty));
            }}
          />
        </Form.Item>
        <Form.Item
          name="receiptNo"
          label="Số phiếu"
          rules={[{ required: true, message: "Nhập số phiếu" }]}
        >
          <Input placeholder="Số phiếu nhập kho" />
        </Form.Item>
        <Form.Item
          name="receiptDate"
          label="Ngày nhập"
          rules={[{ required: true, message: "Chọn ngày nhập" }]}
        >
          <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item
          name="qty"
          label="Số lượng"
          rules={[{ required: true, type: "number", min: 0.001, message: "Nhập số lượng" }]}
        >
          <InputNumber min={0.001} precision={3} controls={false} style={{ width: "100%" }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
