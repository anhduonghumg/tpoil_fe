import React from "react";
import {
  Button,
  Col,
  ConfigProvider,
  Divider,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Tooltip,
} from "antd";
import {
  InfoCircleOutlined,
  ThunderboltOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import type { FormInstance } from "antd";
import type { CustomerRole, CustomerType } from "../types";
import { notify } from "../../../shared/lib/notification";
import { normalizeCode } from "../../../shared/lib/helper";
import { useGenerateCustomerCode } from "../hooks";
import EmployeeSelect from "../../../shared/ui/EmployeeSelect";
import TextArea from "antd/es/input/TextArea";

const ROLE_OPTIONS: { label: string; value: CustomerRole }[] = [
  { label: "Đại lý", value: "Agent" },
  { label: "Bán lẻ", value: "Retail" },
  { label: "Bán buôn", value: "Wholesale" },
  { label: "Khác", value: "Other" },
];
const TYPE_OPTIONS: { label: string; value: CustomerType }[] = [
  { label: "B2B", value: "B2B" },
  { label: "B2C", value: "B2C" },
  { label: "Nhà phân phối", value: "Distributor" },
  { label: "Khác", value: "Other" },
];

const VIETQR_TAX_ENDPOINT = "https://api.vietqr.io/v2/business/{taxCode}";

async function vietqrFetchByTax(taxCode: string) {
  const url = VIETQR_TAX_ENDPOINT.replace(
    "{taxCode}",
    encodeURIComponent(taxCode)
  );
  if (!url) throw new Error("Chưa cấu hình VietQR endpoint trên FE");
  const res = await fetch(url);
  if (!res.ok) throw new Error("VietQR trả về lỗi");
  return res.json() as Promise<{
    data?: { name?: string; address?: string };
    code: string;
    desc?: string;
  }>;
}

interface CustomerCompactFormProps {
  form: FormInstance;
  onFinish?: (values: any) => void;
}

export default function CustomerCompactForm({
  form,
  onFinish,
}: CustomerCompactFormProps) {
  const gen = useGenerateCustomerCode();

  const handleGenerateCode = async () => {
    try {
      const code: any = await gen.mutateAsync();
      // console.log("code:", code);
      form.setFieldsValue({ code: code?.code });
      notify.success("Đã tạo mã tự động");
    } catch (e: any) {
      notify.error(e?.message || "Lỗi tạo mã");
    }
  };

  const handleReadTax = async () => {
    const taxCode = form.getFieldValue("taxCode");
    if (!taxCode) return notify.warning("Nhập mã số thuế trước");
    try {
      const json = await vietqrFetchByTax(taxCode);
      if (json?.code == "00") {
        const name = json?.data?.name;
        const address = json?.data?.address;
        if (name) form.setFieldsValue({ name });
        if (address) form.setFieldsValue({ billingAddress: address });

        form.setFieldsValue({ taxVerified: true, taxSource: "Other" });
        notify.success("Đã đọc thông tin từ MST (VietQR)");
      } else {
        notify.warning(json?.desc || "Không lấy được thông tin từ MST");
      }
    } catch (e: any) {
      notify.error(e?.message || "Không đọc được MST");
    }
  };

  return (
    <ConfigProvider
      theme={{
        token: { fontSize: 13, lineHeight: 1.3, borderRadius: 8 },
        components: {
          Form: { itemMarginBottom: 8 },
          Input: { controlHeight: 32 },
          Select: { controlHeight: 32, controlHeightLG: 36 },
          InputNumber: { controlHeight: 32 },
          Button: { controlHeight: 32 },
          Divider: { marginLG: 12, marginSM: 8 },
        },
      }}
    >
      <Form
        form={form}
        layout="vertical"
        className="form-compact"
        initialValues={{ roles: ["Retail"], type: "B2B" }}
        onFinish={onFinish}
      >
        <Divider style={{ borderColor: "#ddedbb" }} orientation="center">
          Thông tin định danh
        </Divider>
        <Row gutter={[12, 8]}>
          <Col xs={24} md={12} lg={8}>
            <Form.Item
              name="code"
              rules={[{ required: true, message: "Nhập mã khách hàng" }]}
              label={
                <Space>
                  Mã khách hàng{" "}
                  <Tooltip title="In hoa, viết liền, không dấu. Có thể để trống để hệ thống tạo.">
                    <InfoCircleOutlined />
                  </Tooltip>
                </Space>
              }
            >
              <Input
                size="small"
                placeholder="VD: KH2025-0001-TPOIL"
                onBlur={(e) =>
                  form.setFieldsValue({ code: normalizeCode(e.target.value) })
                }
                suffix={
                  <Button
                    size="small"
                    icon={<ThunderboltOutlined />}
                    onClick={handleGenerateCode}
                  >
                    Tạo
                  </Button>
                }
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12} lg={8}>
            <Form.Item
              name="taxCode"
              label="Mã số thuế"
              rules={[{ required: true, message: "Nhập mã số thuế" }]}
            >
              <Input
                size="small"
                placeholder="Nhập MST"
                suffix={
                  <Button
                    size="small"
                    icon={<SearchOutlined />}
                    onClick={handleReadTax}
                  >
                    Đọc MST
                  </Button>
                }
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={24} lg={8}>
            <Form.Item
              name="name"
              label="Tên khách hàng"
              rules={[{ required: true, message: "Nhập tên khách hàng" }]}
            >
              <Input placeholder="Tên đối tác/khách hàng" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={[12, 8]}>
          <Col xs={24} md={12}>
            <Form.Item name="billingAddress" label="Địa chỉ xuất HĐ">
              <Input.TextArea
                placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
                autoSize={{ minRows: 2, maxRows: 4 }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="shippingAddress" label="Địa chỉ giao hàng">
              <Input.TextArea
                placeholder="Nếu khác địa chỉ xuất HĐ"
                autoSize={{ minRows: 2, maxRows: 4 }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ borderColor: "#ddedbb" }} orientation="center">
          Liên hệ
        </Divider>
        <Row gutter={[12, 8]}>
          <Col xs={24} md={8}>
            <Form.Item
              name="contactEmail"
              label="Email"
              rules={[{ type: "email", message: "Email không hợp lệ" }]}
            >
              <Input size="small" placeholder="name@company.com" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name="contactPhone"
              label="Điện thoại"
              rules={[
                {
                  pattern: /^0\d{9}$/,
                  message: "Số điện thoại không hợp lệ",
                },
              ]}
            >
              <Input size="small" placeholder="0967699999" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="roles" label="Vai trò">
              <Select
                size="small"
                mode="multiple"
                options={ROLE_OPTIONS}
                allowClear
                placeholder="Chọn 1 hoặc nhiều"
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ borderColor: "#ddedbb" }} orientation="center">
          Phân loại & Tín dụng
        </Divider>
        <Row gutter={[12, 8]}>
          <Col xs={24} md={8}>
            <Form.Item name="type" label="Loại hình">
              <Select
                size="small"
                options={TYPE_OPTIONS}
                placeholder="B2B / B2C / Distributor"
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="creditLimit" label="Hạn mức (VND)">
              <InputNumber
                size="small"
                style={{ width: "100%" }}
                min={0}
                step={100000}
                placeholder="VD: 500.000.000"
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name="paymentTermDays"
              label={
                <Space>
                  Điều khoản (ngày){" "}
                  <Tooltip title="Số ngày từ ngày xuất HĐ đến hạn thanh toán.">
                    <InfoCircleOutlined />
                  </Tooltip>
                </Space>
              }
            >
              <InputNumber
                size="small"
                style={{ width: "100%" }}
                min={0}
                placeholder="VD: 15 / 30 / 45"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={[12, 8]}>
          <Col span={24}>
            <Form.Item name="taxVerified" hidden valuePropName="checked">
              <input type="checkbox" />
            </Form.Item>
            <Form.Item name="taxSource" hidden>
              <input />
            </Form.Item>
          </Col>
        </Row>
        <Divider style={{ borderColor: "#ddedbb" }} orientation="center">
          Phụ trách & Quản lý
        </Divider>
        <Row gutter={12}>
          <Col span={8}>
            <Form.Item label="Kinh doanh" name="salesOwnerEmpId">
              <EmployeeSelect placeholder="Chọn nhân viên kinh doanh" />
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item label="Kế toán" name="accountingOwnerEmpId">
              <EmployeeSelect placeholder="Chọn nhân viên kế toán" />
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item label="Pháp chế" name="legalOwnerEmpId">
              <EmployeeSelect placeholder="Chọn nhân viên pháp lý" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={24}>
            <Form.Item label="Ghi chú" name="note">
              <TextArea rows={3} autoSize={{ minRows: 3, maxRows: 5 }} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </ConfigProvider>
  );
}
