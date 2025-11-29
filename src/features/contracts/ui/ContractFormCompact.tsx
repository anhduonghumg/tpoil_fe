// features/contracts/ui/ContractCompactForm.tsx
import React from "react";
import {
  Col,
  DatePicker,
  Divider,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
} from "antd";
import type { FormInstance } from "antd";
import type { Dayjs } from "dayjs";
import type { ContractStatus, RiskLevel } from "../types";
import { CustomerSelect } from "../../../shared/ui/CustomerSelect";
import ContractTypeSelect from "../../../shared/ui/ContractTypeSelect";

const { TextArea } = Input;

export type ContractFormMode = "create" | "edit";

export interface ContractFormValues {
  customerId?: string | null;
  contractTypeId: string;

  code: string;
  name: string;

  startDate: Dayjs;
  endDate: Dayjs;

  status: ContractStatus;
  paymentTermDays?: number | null;
  creditLimitOverride?: number | null;

  riskLevel: RiskLevel;
  sla?: any | null;
  deliveryScope?: any | null;

  renewalOfId?: string | null;
  approvalRequestId?: string | null;
}

interface ContractCompactFormProps {
  form: FormInstance<ContractFormValues>;
  onFinish: (values: ContractFormValues) => void;
}

export const ContractCompactForm: React.FC<ContractCompactFormProps> = ({
  form,
  onFinish,
}) => {
  return (
    <Form<ContractFormValues>
      form={form}
      layout="vertical"
      size="small"
      onFinish={onFinish}
      className="compact-form"
    >
      <Divider orientation="center" orientationMargin="0" plain>
        Thông tin hợp đồng
      </Divider>

      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Form.Item
            label="Mã hợp đồng"
            name="code"
            rules={[{ required: true, message: "Vui lòng nhập mã hợp đồng" }]}
          >
            <Input  size="small" placeholder="VD: HD2025-0001" />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item
            label="Loại hợp đồng"
            name="contractTypeId"
            rules={[{ required: true, message: "Vui lòng chọn loại hợp đồng" }]}
          >
            <ContractTypeSelect placeholder="Chọn loại hợp đồng" />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item
            label="Trạng thái"
            name="status"
            rules={[{ required: true, message: "Vui lòng chọn trạng thái" }]}
          >
            <Select  size="small" placeholder="Chọn trạng thái">
              <Select.Option value="Draft">Nháp</Select.Option>
              <Select.Option value="Pending">Đang chờ</Select.Option>
              <Select.Option value="Active">Hiệu lực</Select.Option>
              <Select.Option value="Terminated">Kết thúc</Select.Option>
              <Select.Option value="Cancelled">Hủy</Select.Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Form.Item label="Khách hàng" name="customerId">
            <CustomerSelect placeholder="Chọn khách hàng" />
          </Form.Item>
        </Col>

        <Col xs={24} md={16}>
          <Form.Item
            label="Tên hợp đồng"
            name="name"
            rules={[{ required: true, message: "Vui lòng nhập tên hợp đồng" }]}
          >
            <Input  size="small" placeholder="Tên hiển thị trên hợp đồng" />
          </Form.Item>
        </Col>
      </Row>

      <Divider orientation="center" orientationMargin="0" plain>
        Hiệu lực & thanh toán
      </Divider>

      <Row gutter={16}>
        <Col xs={24} md={6}>
          <Form.Item
            label="Ngày bắt đầu"
            name="startDate"
            rules={[{ required: true, message: "Chọn ngày bắt đầu" }]}
          >
            <DatePicker  size="small" style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>
        </Col>
        <Col xs={24} md={6}>
          <Form.Item
            label="Ngày kết thúc"
            name="endDate"
            rules={[{ required: true, message: "Chọn ngày kết thúc" }]}
          >
            <DatePicker  size="small" style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>
        </Col>
        <Col xs={24} md={6}>
          <Form.Item label="Điều khoản (ngày)" name="paymentTermDays">
            <InputNumber  size="small" min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Col>
        <Col xs={24} md={6}>
          <Form.Item label="Hạn mức override" name="creditLimitOverride">
            <InputNumber  size="small" min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Col>
      </Row>

      <Divider orientation="center" orientationMargin="0" plain>
        Rủi ro & phạm vi giao dịch
      </Divider>

      <Row gutter={16}>
        <Col xs={24} md={6}>
          <Form.Item
            label="Mức độ rủi ro"
            name="riskLevel"
            rules={[{ required: true, message: "Chọn mức độ rủi ro" }]}
          >
            <Select size="small" placeholder="Chọn rủi ro">
              <Select.Option value="Low">Thấp</Select.Option>
              <Select.Option value="Medium">Trung bình</Select.Option>
              <Select.Option value="High">Cao</Select.Option>
            </Select>
          </Form.Item>
        </Col>
        <Col xs={24} md={9}>
          <Form.Item label="Gia hạn từ HĐ" name="renewalOfId">
            <Select size="small" allowClear showSearch placeholder="Chọn HĐ gốc (nếu có)" />
          </Form.Item>
        </Col>
        <Col xs={24} md={9}>
          <Form.Item label="Yêu cầu phê duyệt" name="approvalRequestId">
            <Input size="small" placeholder="Mã req phê duyệt (nếu có)" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item label="SLA" name="sla">
            <TextArea rows={3} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item label="Phạm vi giao dịch" name="deliveryScope">
            <TextArea rows={3} />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );
};
