// src/features/users/ui/FinanceForm.tsx
import { Button, Col, Form, FormInstance, Input, Row } from "antd";
import type { User } from "../types";
import { PIT_10_13, BANK_ACC } from "../validators";

export default function FinanceForm({
  data,
  onSave,
  form: externalForm,
  hideInlineSubmit = false,
}: {
  data?: User;
  form?: FormInstance;
  hideInlineSubmit?: boolean;
  onSave: (p: Partial<User>) => void;
}) {
  // const [form] = Form.useForm();
  const [internal] = Form.useForm();
  const form = externalForm ?? internal;
  const init = {
    pitCode: data?.tax?.pitCode,
    siNumber: data?.tax?.siNumber,
    hiNumber: data?.tax?.hiNumber,
    bankName: data?.banking?.bankName,
    branch: data?.banking?.branch,
    accountNumber: data?.banking?.accountNumber,
    accountHolder: data?.banking?.accountHolder,
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={init}
      scrollToFirstError={true}
      onFinish={(v) => {
        onSave({
          tax: {
            pitCode: v.pitCode,
            siNumber: v.siNumber,
            hiNumber: v.hiNumber,
          },
          banking: {
            bankName: v.bankName,
            branch: v.branch,
            accountNumber: v.accountNumber,
            accountHolder: v.accountHolder,
          },
        });
      }}
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Form.Item
            label="Mã số thuế cá nhân"
            name="pitCode"
            rules={[{ pattern: PIT_10_13, message: "MST 10 hoặc 13 số" }]}
          >
            <Input />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="Số sổ BHXH" name="siNumber">
            <Input />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="Mã BHYT" name="hiNumber">
            <Input />
          </Form.Item>
        </Col>

        <Col xs={24} md={6}>
          <Form.Item label="Ngân hàng" name="bankName">
            <Input />
          </Form.Item>
        </Col>
        <Col xs={24} md={6}>
          <Form.Item label="Chi nhánh" name="branch">
            <Input />
          </Form.Item>
        </Col>
        <Col xs={24} md={6}>
          <Form.Item
            label="Số tài khoản"
            name="accountNumber"
            rules={[{ pattern: BANK_ACC, message: "8–20 chữ số" }]}
          >
            <Input />
          </Form.Item>
        </Col>
        <Col xs={24} md={6}>
          <Form.Item label="Chủ tài khoản" name="accountHolder">
            <Input />
          </Form.Item>
        </Col>
      </Row>
        {!hideInlineSubmit && (
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Lưu
            </Button>
          </Form.Item>
        )}
    </Form>
  );
}
