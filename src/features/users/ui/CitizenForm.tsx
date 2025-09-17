// src/features/users/ui/CitizenForm.tsx
import {
  Button,
  Col,
  DatePicker,
  Form,
  FormInstance,
  Input,
  Row,
  Select,
} from "antd";
import dayjs from "dayjs";
import type { User } from "../types";
import { CCCD_12, CMND_9, PASSPORT } from "../validators";

export default function CitizenForm({
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
  const c = data?.citizen;

  const init = {
    type: c?.type,
    number: c?.number,
    issuedDate: c?.issuedDate ? dayjs(c.issuedDate) : undefined,
    issuedPlace: c?.issuedPlace,
    expiryDate: c?.expiryDate ? dayjs(c.expiryDate) : undefined,
    frontImageUrl: c?.frontImageUrl,
    backImageUrl: c?.backImageUrl,
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={init}
      scrollToFirstError={true}
      onFinish={(v) => {
        onSave({
          citizen: {
            type: v.type,
            number: v.number?.trim(),
            issuedDate: v.issuedDate?.format("DD-MM-YYYY"),
            issuedPlace: v.issuedPlace,
            expiryDate: v.expiryDate?.format("DD-MM-YYYY"),
            frontImageUrl: v.frontImageUrl,
            backImageUrl: v.backImageUrl,
          },
        });
      }}
    >
      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}>
          <Form.Item label="Loại giấy tờ" name="type">
            <Select
              allowClear
              options={[
                { value: "CCCD", label: "CCCD" },
                { value: "CMND", label: "CMND" },
                { value: "PASSPORT", label: "Hộ chiếu" },
              ]}
            />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item
            label="Số giấy tờ"
            name="number"
            rules={[
              ({ getFieldValue }) => ({
                validator(_, val: string) {
                  const t = getFieldValue("type");
                  if (!val) return Promise.resolve();
                  if (t === "CCCD" && !CCCD_12.test(val))
                    return Promise.reject(new Error("CCCD phải 12 số"));
                  if (t === "CMND" && !CMND_9.test(val))
                    return Promise.reject(new Error("CMND phải 9 số"));
                  if (t === "PASSPORT" && !PASSPORT.test(val))
                    return Promise.reject(
                      new Error("Số hộ chiếu không hợp lệ")
                    );
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <Input />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item label="Ngày cấp" name="issuedDate">
            <DatePicker style={{ width: "100%" }} format="DD-MM-YYYY" />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item label="Nơi cấp" name="issuedPlace">
            <Input />
          </Form.Item>
        </Col>

        <Col xs={12} md={6}>
          <Form.Item label="Ngày hết hạn" name="expiryDate">
            <DatePicker style={{ width: "100%" }} format="DD-MM-YYYY" />
          </Form.Item>
        </Col>
        <Col xs={24} md={9}>
          <Form.Item label="Ảnh mặt trước (URL)" name="frontImageUrl">
            <Input placeholder="https://..." />
          </Form.Item>
        </Col>
        <Col xs={24} md={9}>
          <Form.Item label="Ảnh mặt sau (URL)" name="backImageUrl">
            <Input placeholder="https://..." />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item>
        {!hideInlineSubmit && (
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Lưu
            </Button>
          </Form.Item>
        )}
      </Form.Item>
    </Form>
  );
}
