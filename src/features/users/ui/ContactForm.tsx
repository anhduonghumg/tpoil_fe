import { Button, Col, Form, FormInstance, Input, Row } from "antd";
import type { User } from "../types";
import { PHONE_VN } from "../validators";
import AddressCascaderSimple from "../../../shared/components/Address/AddressCascaderSimple";

export default function ContactForm({
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
  const [internal] = Form.useForm();
  const form = externalForm ?? internal;
  const init = {
    email: data?.email,
    personalEmail: data?.personalEmail,
    phone: data?.phone,

    // địa chỉ
    ap_province: data?.addressPermanent?.province,
    ap_district: data?.addressPermanent?.district,
    ap_ward: data?.addressPermanent?.ward,
    ap_street: data?.addressPermanent?.street,

    ec_name: data?.emergency?.name,
    ec_relation: data?.emergency?.relation,
    ec_phone: data?.emergency?.phone,
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={init}
      scrollToFirstError={true}
      onFinish={(v) => {
        const [province, district, ward] = v.ap_codes || [];
        onSave({
          email: v.email,
          personalEmail: v.personalEmail,
          phone: v.phone,
          // addressPermanent: {
          //   province: v.ap_province,
          //   district: v.ap_district,
          //   ward: v.ap_ward,
          //   street: v.ap_street,
          // },
          addressPermanent: {
            province,
            district,
            ward,
            street: v.ap_street,
          },
          emergency:
            v.ec_name || v.ec_phone
              ? { name: v.ec_name, relation: v.ec_relation, phone: v.ec_phone }
              : undefined,
        });
      }}
    >
      <Row gutter={[8, 8]}>
        <Col xs={24} md={8}>
          <Form.Item
            label="Email (công ty/cá nhân)"
            name="email"
            style={{ marginBottom: 0 }}
            rules={[
              { required: true, type: "email", message: "Email không hợp lệ" },
            ]}
          >
            <Input placeholder="VD: admin@tpoil.com" />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item
            label="Email cá nhân"
            name="personalEmail"
            style={{ marginBottom: 0 }}
            rules={[{ type: "email", message: "Email không hợp lệ" }]}
          >
            <Input placeholder="VD: admin@gmail.com" />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item
            label="Số điện thoại"
            name="phone"
            style={{ marginBottom: 0 }}
            rules={[
              {
                required: true,
                pattern: PHONE_VN,
                message: "SĐT không hợp lệ",
              },
            ]}
          >
            <Input placeholder="VD: 09875611111" />
          </Form.Item>
        </Col>

        <Col
          span={24}
          style={{ marginTop: "5px", borderBottom: "1px solid #d9d9d9" }}
        >
          <span style={{ fontSize: 14, fontWeight: "500" }}>
            Địa chỉ thường trú
          </span>
        </Col>
        <Col xs={24} md={16}>
          <Form.Item
            label="Tỉnh/Quận/Phường"
            name="ap_codes"
            style={{ marginBottom: 0 }}
            rules={[{ required: true, message: "Vui lòng chọn đủ 3 cấp" }]}
          >
            <AddressCascaderSimple />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item
            label="Số nhà/Đường"
            name="ap_street"
            style={{ marginBottom: 0 }}
          >
            <Input placeholder="VD: 12 Nguyễn Trãi" />
          </Form.Item>
        </Col>
        {/* <Col xs={12} md={6}>
          <Form.Item
            label="Số nhà/Đường"
            name="ap_street"
            style={{ marginBottom: 0 }}
          >
            <Input />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item
            label="Phường/Xã"
            name="ap_ward"
            style={{ marginBottom: 0 }}
          >
            <Input />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item
            label="Quận/Huyện"
            name="ap_district"
            style={{ marginBottom: 0 }}
          >
            <Input placeholder="" />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item
            label="Tỉnh/TP"
            name="ap_province"
            style={{ marginBottom: 0 }}
          >
            <Input />
          </Form.Item>
        </Col> */}
        <Col
          span={24}
          style={{ marginTop: "5px", borderBottom: "1px solid #d9d9d9" }}
        >
          <span style={{ fontSize: 14, fontWeight: "500" }}>
            Liên hệ khẩn cấp
          </span>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="Họ tên" name="ec_name" style={{ marginBottom: 0 }}>
            <Input placeholder="VD: Nguyễn Thị A..." />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item
            label="Quan hệ"
            name="ec_relation"
            style={{ marginBottom: 0 }}
          >
            <Input placeholder="VD: Chị gái" />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item
            label="SĐT"
            name="ec_phone"
            style={{ marginBottom: 0 }}
            rules={[{ pattern: PHONE_VN, message: "SĐT không hợp lệ" }]}
          >
            <Input placeholder="VD: 09712288999" />
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
