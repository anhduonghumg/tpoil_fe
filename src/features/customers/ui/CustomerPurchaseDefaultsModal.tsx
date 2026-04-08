import React, { useEffect } from "react";
import { Form, Input, Modal, Typography } from "antd";
import {
  useCustomerPurchaseDefaults,
  useUpdateCustomerPurchaseDefaults,
} from "../hooks";
import { notify } from "../../../shared/lib/notification";

type Props = {
  open: boolean;
  customerId?: string;
  customerName?: string;
  onClose: () => void;
};

type FormValues = {
  defaultPurchaseContractNo?: string;
  defaultDeliveryLocation?: string;
};

export default function CustomerPurchaseDefaultsModal({
  open,
  customerId,
  customerName,
  onClose,
}: Props) {
  const [form] = Form.useForm<FormValues>();

  const { data, isLoading, isFetching } = useCustomerPurchaseDefaults(
    open ? customerId : undefined,
  );

  const updateMutation = useUpdateCustomerPurchaseDefaults(customerId);

  useEffect(() => {
    if (!open) {
      form.resetFields();
      return;
    }

    form.setFieldsValue({
      defaultPurchaseContractNo: data?.defaultPurchaseContractNo ?? "",
      defaultDeliveryLocation: data?.defaultDeliveryLocation ?? "",
    });
  }, [open, data, form]);

  const handleSubmit = async () => {
    const values = await form.validateFields();

    await updateMutation.mutateAsync({
      defaultPurchaseContractNo:
        values.defaultPurchaseContractNo?.trim() || undefined,
      defaultDeliveryLocation:
        values.defaultDeliveryLocation?.trim() || undefined,
    });

    notify.success("Đã lưu cấu hình mua hàng");
    onClose();
  };

  return (
    <Modal
      title="Cấu hình mua hàng mặc định"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      okText="Lưu"
      cancelText="Hủy"
      confirmLoading={updateMutation.isPending}
      destroyOnHidden
      width={720}
    >
      <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
        {customerName
          ? `Thiết lập mặc định cho ${customerName}. Thông tin này sẽ tự động đổ xuống đơn mua khi chọn nhà cung cấp.`
          : "Thông tin này sẽ tự động đổ xuống đơn mua khi chọn nhà cung cấp."}
      </Typography.Paragraph>

      <Form<FormValues>
        form={form}
        layout="vertical"
        disabled={isLoading || isFetching}
      >
        <Form.Item
          label="Số hợp đồng mặc định"
          name="defaultPurchaseContractNo"
          rules={[{ max: 100, message: "Tối đa 100 ký tự" }]}
        >
          <Input placeholder="VD: HDMB-2026-001" maxLength={100} allowClear />
        </Form.Item>

        <Form.Item
          label="Địa điểm giao nhận mặc định"
          name="defaultDeliveryLocation"
          rules={[{ max: 255, message: "Tối đa 255 ký tự" }]}
        >
          <Input.TextArea
            placeholder="VD: Kho tổng Nhà Bè"
            autoSize={{ minRows: 2, maxRows: 4 }}
            maxLength={255}
            allowClear
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
