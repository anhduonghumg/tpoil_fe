import React from "react";
import {
  Col,
  ConfigProvider,
  Form,
  Input,
  InputNumber,
  Row,
  Switch,
  Tooltip,
} from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";

function normalizeCode(v?: string) {
  return (v || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();
}

export default function ContractTypeFormCompact({ form }: { form: any }) {
  return (
    <ConfigProvider
      theme={{
        token: { fontSize: 13, lineHeight: 1.3, borderRadius: 8 },
        components: {
          Form: { itemMarginBottom: 8 },
          Input: { controlHeight: 32 },
          InputNumber: { controlHeight: 32 },
          Button: { controlHeight: 32 },
        },
      }}
    >
      <Form form={form} layout="vertical" className="form-compact">
        <Row gutter={[12, 8]}>
          <Col xs={24} md={8}>
            <Form.Item
              name="code"
              label={
                <>
                  Mã loại HĐ&nbsp;
                  <Tooltip title="Mã duy nhất, viết hoa, không dấu.">
                    <InfoCircleOutlined />
                  </Tooltip>
                </>
              }
              rules={[{ required: true, message: "Nhập mã loại HĐ" }]}
            >
              <Input
                placeholder="VD: FRAME, SALE..."
                onBlur={(e) =>
                  form.setFieldsValue({
                    code: normalizeCode(e.target.value),
                  })
                }
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name="name"
              label="Tên loại HĐ"
              rules={[{ required: true, message: "Nhập tên loại HĐ" }]}
            >
              <Input placeholder="VD: Hợp đồng khung" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="sortOrder" label="Thứ tự hiển thị">
              <InputNumber
                min={0}
                style={{ width: "100%" }}
                placeholder="VD: 1, 2, 3..."
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={[12, 8]}>
          <Col xs={24} md={16}>
            <Form.Item name="description" label="Mô tả">
              <Input.TextArea
                autoSize={{ minRows: 2, maxRows: 4 }}
                placeholder="Ghi chú chính sách áp dụng, phạm vi sử dụng..."
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name="isActive"
              label="Trạng thái"
              valuePropName="checked"
              initialValue={true}
            >
              <Switch checkedChildren="Đang dùng" unCheckedChildren="Ngừng" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </ConfigProvider>
  );
}
