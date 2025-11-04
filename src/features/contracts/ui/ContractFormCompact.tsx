import React from "react";
import {
  Button,
  Col,
  ConfigProvider,
  DatePicker,
  Divider,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Tag,
  Tooltip,
} from "antd";
import { InfoCircleOutlined, ThunderboltOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { ContractType, ContractStatus, RiskLevel } from "../types";
import { useGenerateContractCode } from "../hooks";
import { ContractCustomerSelect } from "./ContractCustomerSelect";

const TYPE_OPTIONS: { label: string; value: ContractType }[] = [
  { label: "HĐ Khung", value: "FRAME" },
  { label: "HĐ Mua bán", value: "SALE" },
  { label: "HĐ Dịch vụ", value: "SERVICE" },
  { label: "Khác", value: "OTHER" },
];

const STATUS_OPTIONS: { label: string; value: ContractStatus }[] = [
  { label: "Nháp", value: "Draft" },
  { label: "Hiệu lực", value: "Active" },
  { label: "Tạm dừng", value: "Suspended" },
  { label: "Hết hạn", value: "Expired" },
  { label: "Thanh lý", value: "Terminated" },
];

const RISK_OPTIONS: { label: string; value: RiskLevel }[] = [
  { label: "Thấp", value: "Low" },
  { label: "Trung bình", value: "Medium" },
  { label: "Cao", value: "High" },
  { label: "Rất cao", value: "Critical" },
];

function normalizeCode(v?: string) {
  return (v || "").trim().toUpperCase();
}

export default function ContractFormCompact({ form }: { form: any }) {
  const genCode = useGenerateContractCode();

  const handleGenerateCode = async () => {
    const customerId = form.getFieldValue("customerId");
    if (!customerId) return;
    const { code } = await genCode.mutateAsync(customerId);
    form.setFieldsValue({ code });
  };

  const startDate = Form.useWatch("startDate", form);
  const endDate = Form.useWatch("endDate", form);

  const days = React.useMemo(() => {
    if (!startDate || !endDate) return undefined;
    const s = dayjs(startDate);
    const e = dayjs(endDate);
    if (!s.isValid() || !e.isValid()) return undefined;
    return e.diff(s, "day") + 1;
  }, [startDate, endDate]);

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
          DatePicker: { controlHeight: 32 },
          Divider: { marginLG: 12, marginSM: 8 },
        },
      }}
    >
      <Form form={form} layout="vertical" className="form-compact">
        <Divider orientation="left">Thông tin chung</Divider>
        <Row gutter={[12, 8]}>
          <Col xs={24} md={12} lg={10}>
            <Form.Item
              name="customerId"
              label="Khách hàng"
              rules={[{ required: true, message: "Chọn khách hàng" }]}
            >
              <ContractCustomerSelect placeholder="Chọn khách hàng" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12} lg={8}>
            <Form.Item
              name="code"
              label={
                <Space>
                  Số hợp đồng
                  <Tooltip title="Nếu để trống, hệ thống sẽ sinh tự động theo khách hàng.">
                    <InfoCircleOutlined />
                  </Tooltip>
                </Space>
              }
            >
              <Input
                placeholder="VD: HDMB-2025-001"
                onBlur={(e) =>
                  form.setFieldsValue({ code: normalizeCode(e.target.value) })
                }
                suffix={
                  <Button
                    size="small"
                    icon={<ThunderboltOutlined />}
                    onClick={handleGenerateCode}
                  >
                    Tạo mã
                  </Button>
                }
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12} lg={6}>
            <Form.Item
              name="type"
              label="Loại hợp đồng"
              rules={[{ required: true, message: "Chọn loại" }]}
            >
              <Select options={TYPE_OPTIONS} placeholder="Loại" />
            </Form.Item>
          </Col>
        </Row>

        {/* Thời hạn & trạng thái */}
        <Divider orientation="left">Thời hạn & Trạng thái</Divider>
        <Row gutter={[12, 8]}>
          <Col xs={24} md={8}>
            <Form.Item
              name="startDate"
              label="Ngày hiệu lực"
              rules={[{ required: true, message: "Chọn ngày" }]}
            >
              <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name="endDate"
              label="Ngày hết hiệu lực"
              rules={[{ required: true, message: "Chọn ngày" }]}
            >
              <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Thời lượng">
              <Tag>{days ? `${days} ngày` : "—"}</Tag>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={[12, 8]}>
          <Col xs={24} md={8}>
            <Form.Item name="status" label="Trạng thái">
              <Select options={STATUS_OPTIONS} placeholder="Trạng thái" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name="paymentTermDays"
              label={
                <Space>
                  Điều khoản thanh toán (ngày)
                  <Tooltip title="Số ngày từ ngày xuất HĐ đến hạn thanh toán.">
                    <InfoCircleOutlined />
                  </Tooltip>
                </Space>
              }
            >
              <InputNumber
                style={{ width: "100%" }}
                min={0}
                placeholder="VD: 15 / 30 / 45"
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name="creditLimitOverride"
              label={
                <Space>
                  Hạn mức theo HĐ (VND)
                  <Tooltip title="Nếu để trống, dùng hạn mức mặc định của khách hàng.">
                    <InfoCircleOutlined />
                  </Tooltip>
                </Space>
              }
            >
              <InputNumber
                style={{ width: "100%" }}
                min={0}
                step={1000000}
                placeholder="VD: 1.000.000.000"
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Rủi ro */}
        <Divider orientation="left">Rủi ro & Phạm vi</Divider>
        <Row gutter={[12, 8]}>
          <Col xs={24} md={8}>
            <Form.Item name="riskLevel" label="Mức rủi ro">
              <Select options={RISK_OPTIONS} placeholder="Chọn mức" />
            </Form.Item>
          </Col>
          <Col xs={24} md={16}>
            <Form.Item
              name={["sla", "note"]}
              label="Ghi chú SLA / phạm vi giao hàng"
            >
              <Input.TextArea
                autoSize={{ minRows: 2, maxRows: 4 }}
                placeholder="Mô tả tóm tắt SLA, phạm vi giao hàng, điều khoản đặc biệt..."
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </ConfigProvider>
  );
}
