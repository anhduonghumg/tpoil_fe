import React, { useEffect } from "react";
import { Form, Input, InputNumber, Modal, Switch } from "antd";
import type {
  BankImportTemplate,
  UpsertBankImportTemplatePayload,
} from "../types";

type Props = {
  open: boolean;
  initialValue?: BankImportTemplate | null;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (payload: UpsertBankImportTemplatePayload) => void;
};

function safeParseJson(text?: string): Record<string, any> | null {
  if (!text?.trim()) return null;
  return JSON.parse(text);
}

export default function BankImportTemplateUpsertModal({
  open,
  initialValue,
  loading,
  onCancel,
  onSubmit,
}: Props) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      bankCode: initialValue?.bankCode ?? "",
      name: initialValue?.name ?? "",
      version: initialValue?.version ?? 1,
      columnMapText: JSON.stringify(
        initialValue?.columnMap ?? {
          txnDate: "Ngày giao dịch",
          description: "Nội dung",
          debit: "Chi",
          credit: "Thu",
          externalRef: "Số tham chiếu",
          counterpartyName: "Đối tác",
          counterpartyAcc: "STK đối tác",
        },
        null,
        2,
      ),
      normalizeRuleText: JSON.stringify(
        initialValue?.normalizeRule ?? {},
        null,
        2,
      ),
      isActive: initialValue?.isActive ?? true,
    });
  }, [open, initialValue, form]);

  const handleFinish = (values: any) => {
    const payload: UpsertBankImportTemplatePayload = {
      bankCode: values.bankCode,
      name: values.name,
      version: values.version,
      columnMap: safeParseJson(values.columnMapText) ?? {},
      normalizeRule: safeParseJson(values.normalizeRuleText),
      isActive: !!values.isActive,
    };
    onSubmit(payload);
  };

  return (
    <Modal
      open={open}
      title={initialValue ? "Sửa template import" : "Thêm template import"}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={loading}
      destroyOnHidden
      width={760}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        onFinishFailed={() => undefined}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item
            label="Mã ngân hàng"
            name="bankCode"
            rules={[{ required: true, message: "Nhập mã ngân hàng" }]}
          >
            <Input placeholder="VCB, BIDV, ACB..." />
          </Form.Item>

          <Form.Item
            label="Tên template"
            name="name"
            rules={[{ required: true, message: "Nhập tên template" }]}
          >
            <Input placeholder="VCB XLSX mặc định..." />
          </Form.Item>

          <Form.Item
            label="Version"
            name="version"
            rules={[{ required: true, message: "Nhập version" }]}
          >
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            label="Đang hoạt động"
            name="isActive"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </div>

        <Form.Item
          label="columnMap (JSON)"
          name="columnMapText"
          rules={[
            { required: true, message: "Nhập columnMap" },
            {
              validator(_, value) {
                try {
                  JSON.parse(value);
                  return Promise.resolve();
                } catch {
                  return Promise.reject(
                    new Error("columnMap không phải JSON hợp lệ"),
                  );
                }
              },
            },
          ]}
        >
          <Input.TextArea rows={10} spellCheck={false} />
        </Form.Item>

        <Form.Item
          label="normalizeRule (JSON)"
          name="normalizeRuleText"
          rules={[
            {
              validator(_, value) {
                if (!value?.trim()) return Promise.resolve();
                try {
                  JSON.parse(value);
                  return Promise.resolve();
                } catch {
                  return Promise.reject(
                    new Error("normalizeRule không phải JSON hợp lệ"),
                  );
                }
              },
            },
          ]}
        >
          <Input.TextArea rows={8} spellCheck={false} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
