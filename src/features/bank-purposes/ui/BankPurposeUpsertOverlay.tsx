import { useEffect } from "react";
import {
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
} from "antd";
import type {
  BankTransactionPurposeItem,
  UpsertBankTransactionPurposePayload,
} from "../types";
import { useCreateBankPurpose, useUpdateBankPurpose } from "../hooks";

interface Props {
  open: boolean;
  initialValues?: BankTransactionPurposeItem | null;
  onClose: () => void;
}

export function BankPurposeUpsertOverlay({
  open,
  initialValues,
  onClose,
}: Props) {
  const [form] = Form.useForm<UpsertBankTransactionPurposePayload>();
  const createMut = useCreateBankPurpose();
  const updateMut = useUpdateBankPurpose();

  const isEdit = !!initialValues;

  useEffect(() => {
    if (!open) return;

    form.setFieldsValue({
      code: initialValues?.code ?? "",
      name: initialValues?.name ?? "",
      description: initialValues?.description ?? "",
      direction: initialValues?.direction ?? undefined,
      module: initialValues?.module ?? "",
      counterpartyType: initialValues?.counterpartyType ?? undefined,
      affectsDebt: initialValues?.affectsDebt ?? false,
      isSystem: initialValues?.isSystem ?? false,
      isActive: initialValues?.isActive ?? true,
      sortOrder: initialValues?.sortOrder ?? 0,
    });
  }, [open, initialValues, form]);

  async function handleSubmit() {
    const values = await form.validateFields();

    if (isEdit) {
      await updateMut.mutateAsync({
        id: initialValues!.id,
        payload: values,
      });
    } else {
      await createMut.mutateAsync(values);
    }

    onClose();
    form.resetFields();
  }

  return (
    <Drawer
      open={open}
      width={560}
      destroyOnClose
      title={isEdit ? "Sửa mục đích giao dịch" : "Thêm mục đích giao dịch"}
      onClose={onClose}
      extra={
        <Space>
          <Button onClick={onClose}>Đóng</Button>
          <Button
            type="primary"
            loading={createMut.isPending || updateMut.isPending}
            onClick={handleSubmit}
          >
            Lưu
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="code"
          label="Mã"
          rules={[{ required: true, message: "Vui lòng nhập mã" }]}
        >
          <Input
            placeholder="VD: PAY_PURCHASE_ORDER"
            disabled={!!initialValues?.isSystem}
          />
        </Form.Item>

        <Form.Item
          name="name"
          label="Tên mục đích"
          rules={[{ required: true, message: "Vui lòng nhập tên mục đích" }]}
        >
          <Input placeholder="VD: Thanh toán đơn mua" />
        </Form.Item>

        <Form.Item name="description" label="Mô tả">
          <Input.TextArea rows={3} placeholder="Mô tả ngắn..." />
        </Form.Item>

        <Form.Item name="direction" label="Chiều giao dịch">
          <Select
            allowClear
            placeholder="Chọn chiều giao dịch"
            options={[
              { value: "IN", label: "Thu" },
              { value: "OUT", label: "Chi" },
            ]}
          />
        </Form.Item>

        <Form.Item name="module" label="Phân hệ">
          <Input placeholder="VD: PURCHASING / FINANCE / SALES" />
        </Form.Item>

        <Form.Item name="counterpartyType" label="Loại đối tác">
          <Select
            allowClear
            placeholder="Chọn loại đối tác"
            options={[
              { value: "SUPPLIER", label: "Nhà cung cấp" },
              { value: "CUSTOMER", label: "Khách hàng" },
              { value: "INTERNAL", label: "Nội bộ" },
              { value: "OTHER", label: "Khác" },
            ]}
          />
        </Form.Item>

        <Form.Item name="sortOrder" label="Thứ tự">
          <InputNumber style={{ width: "100%" }} min={0} />
        </Form.Item>

        <Form.Item
          name="affectsDebt"
          label="Ảnh hưởng công nợ"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        <Form.Item
          name="isSystem"
          label="Mục đích hệ thống"
          valuePropName="checked"
        >
          <Switch disabled={!!initialValues?.isSystem} />
        </Form.Item>

        <Form.Item
          name="isActive"
          label="Đang hoạt động"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
