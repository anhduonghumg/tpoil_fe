// src/features/users/ui/FinanceForm.tsx
import { Button, Col, Form, FormInstance, Input, Row, Select } from "antd";
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
      <Row gutter={[16, 16]} style={{rowGap: 0}}>
        <Col xs={24} md={8}>
          <Form.Item
            label="Mã số thuế cá nhân"
            name="pitCode"
            rules={[{ pattern: PIT_10_13, message: "MST 10 hoặc 13 số" }]}
          >
            <Input placeholder="VD: 0345678910" />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="Số sổ BHXH" name="siNumber">
            <Input placeholder="VD: 092345"/>
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="Mã BHYT" name="hiNumber">
            <Input placeholder="VD: 3680002930"/>
          </Form.Item>
        </Col>

        <Col xs={24} md={6}>
          <Form.Item label="Ngân hàng" name="bankName">
            <Select
                placeholder="Chọn ngân hàng"
                allowClear
                options={[
                  { value: "Vietcombank", label: "Vietcombank" },
                  { value: "VPBank", label: "VPBank" },
                  { value: "Techcombank", label: "Techcombank" },
                  { value: "MBBANK", label: "MBBANK" },
                  { value: "VietinBank", label: "VietinBank" },
                  { value: "Agribank", label: "Agribank" },
                  { value: "ACB", label: "ACB" },
                  { value: "TPBank", label: "TPBank" },
                  { value: "BIDV", label: "BIDV" },
                ]}
              />
          </Form.Item>
        </Col>
        <Col xs={24} md={6}>
          <Form.Item label="Chi nhánh" name="branch">
            <Input placeholder="VD: Thanh Hóa" />
          </Form.Item>
        </Col>
        <Col xs={24} md={6}>
          <Form.Item
            label="Số tài khoản"
            name="accountNumber"
            rules={[{ pattern: BANK_ACC, message: "8–20 chữ số" }]}
          >
            <Input placeholder="VD: 092345689" />
          </Form.Item>
        </Col>
        <Col xs={24} md={6}>
          <Form.Item label="Chủ tài khoản" name="accountHolder">
            <Input placeholder="VD: Nguyễn Văn A" />
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
