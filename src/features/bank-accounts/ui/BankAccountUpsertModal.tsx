import React, { useEffect } from "react";
import { Form, Input, Modal, Select, Switch } from "antd";
import type { BankAccount, UpsertBankAccountPayload } from "../types";

type Props = {
  open: boolean;
  initialValue?: BankAccount | null;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (payload: UpsertBankAccountPayload) => void;
};

export default function BankAccountUpsertModal({
  open,
  initialValue,
  loading,
  onCancel,
  onSubmit,
}: Props) {
  const [form] = Form.useForm<UpsertBankAccountPayload>();

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      bankCode: initialValue?.bankCode ?? "",
      bankName: initialValue?.bankName ?? "",
      accountNo: initialValue?.accountNo ?? "",
      accountName: initialValue?.accountName ?? "",
      currency: initialValue?.currency ?? "VND",
      isActive: initialValue?.isActive ?? true,
    });
  }, [open, initialValue, form]);

  return (
    <Modal
      open={open}
      title={
        initialValue ? "Sửa tài khoản ngân hàng" : "Thêm tài khoản ngân hàng"
      }
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={loading}
      destroyOnHidden
      width={640}
    >
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item
            label="Mã ngân hàng"
            name="bankCode"
            rules={[{ required: true, message: "Nhập mã ngân hàng" }]}
          >
            <Input placeholder="VCB, BIDV, ACB..." />
          </Form.Item>

          <Form.Item label="Tên ngân hàng" name="bankName">
            <Input placeholder="Vietcombank..." />
          </Form.Item>

          <Form.Item
            label="Số tài khoản"
            name="accountNo"
            rules={[{ required: true, message: "Nhập số tài khoản" }]}
          >
            <Input placeholder="Nhập số tài khoản" />
          </Form.Item>

          <Form.Item label="Tên tài khoản" name="accountName">
            <Input placeholder="Nhập tên tài khoản" />
          </Form.Item>

          <Form.Item
            label="Tiền tệ"
            name="currency"
            rules={[{ required: true, message: "Chọn tiền tệ" }]}
          >
            <Select
              options={[
                { label: "VND", value: "VND" },
                { label: "USD", value: "USD" },
              ]}
            />
          </Form.Item>

          <Form.Item
            label="Đang hoạt động"
            name="isActive"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}
