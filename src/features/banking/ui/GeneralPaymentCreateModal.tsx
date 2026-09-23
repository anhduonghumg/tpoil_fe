import { useEffect } from "react";
import { Col, DatePicker, Form, Input, InputNumber, Modal, Row, Select } from "antd";
import dayjs from "dayjs";
import { useCreateGeneralPaymentRequest } from "../hooks";
import { formatMoney } from "../lib/format";
import { notify } from "../../../shared/lib/notification";
import "../banking.css";

export const GENERAL_CATEGORY_META: Record<string, { label: string; color: string }> = {
  INTERNAL_EXPENSE: { label: "Chi phí nội bộ", color: "blue" },
  FIXED_ASSET: { label: "Tài sản / CCDC", color: "purple" },
  TAX_AND_FEE: { label: "Thuế, phí", color: "orange" },
  ADVANCE: { label: "Tạm ứng", color: "cyan" },
  OTHER: { label: "Chi khác", color: "default" },
};

export const GENERAL_CATEGORY_OPTIONS = Object.entries(GENERAL_CATEGORY_META).map(([value, meta]) => ({
  value,
  label: meta.label,
}));

/** Lập hồ sơ chi ngoài mua hàng; dùng chung cho màn Tổng quan và Chi tiền. */
export function GeneralPaymentCreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form] = Form.useForm();
  const createMutation = useCreateGeneralPaymentRequest();

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue({ requestDate: dayjs(), category: "INTERNAL_EXPENSE" });
  }, [open, form]);

  const submit = async (values: any) => {
    await createMutation.mutateAsync({
      ...values,
      requestDate: values.requestDate.format("YYYY-MM-DD"),
      paymentDeadline: values.paymentDeadline?.format("YYYY-MM-DD"),
    });
    onClose();
    notify.success("Đã tạo hồ sơ chi và chuyển chờ phê duyệt");
  };

  return (
    <Modal
      className="banking-modal"
      open={open}
      title="Tạo hồ sơ chi ngoài mua hàng"
      okText="Gửi phê duyệt"
      cancelText="Đóng"
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={createMutation.isPending}
      destroyOnHidden
      width={680}
    >
      <Form className="banking-form" form={form} layout="vertical" onFinish={submit}>
        <Row gutter={10}>
          <Col span={10}>
            <Form.Item name="category" label="Loại chi" rules={[{ required: true }]}>
              <Select options={GENERAL_CATEGORY_OPTIONS} />
            </Form.Item>
          </Col>
          <Col span={7}>
            <Form.Item name="requestDate" label="Ngày đề nghị" rules={[{ required: true }]}>
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={7}>
            <Form.Item name="paymentDeadline" label="Hạn thanh toán">
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={16}>
            <Form.Item name="beneficiaryName" label="Đơn vị / người thụ hưởng" rules={[{ required: true, message: "Nhập bên thụ hưởng" }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="beneficiaryTaxCode" label="Mã số thuế">
              <Input />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="content" label="Nội dung chi" rules={[{ required: true, message: "Nhập nội dung chi" }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item name="amountVnd" label="Số tiền (VND)" rules={[{ required: true, message: "Nhập số tiền" }]}>
              <InputNumber<number>
                min={0.01}
                precision={0}
                style={{ width: "100%" }}
                formatter={(value) => formatMoney(value)}
                parser={(value) => Number(String(value || "").replace(/[^\d.-]/g, ""))}
              />
            </Form.Item>
          </Col>
          <Col span={7}>
            <Form.Item name="invoiceNo" label="Số hóa đơn">
              <Input />
            </Form.Item>
          </Col>
          <Col span={7}>
            <Form.Item name="referenceNo" label="Số chứng từ gốc">
              <Input />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="beneficiaryBankName" label="Ngân hàng thụ hưởng">
              <Input />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="beneficiaryAccountNo" label="Số tài khoản">
              <Input />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="beneficiaryAccountName" label="Chủ tài khoản">
              <Input />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="note" label="Ghi chú">
              <Input.TextArea autoSize={{ minRows: 2, maxRows: 3 }} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
