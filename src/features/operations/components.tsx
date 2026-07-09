import React from "react";
import {
  Card,
  Col,
  Row,
  Select,
  Space,
  Statistic,
  Tag,
  Typography,
  Upload,
  Button,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { uploadFile } from "../../shared/api/uploads";

export const StatusBadge: React.FC<{ status?: string }> = ({ status }) => {
  const color =
    status === "COMPLETED" || status === "CLOSED" || status === "CONFIRMED"
      ? "green"
      : status === "CANCELLED" || status === "VOID"
      ? "red"
      : status === "IN_TRANSIT" || status === "IN_PROGRESS"
      ? "blue"
      : "gold";
  return <Tag color={color}>{status || "-"}</Tag>;
};

export const OperationsDashboardCard: React.FC<{
  title: string;
  values: Array<{ label: string; value: React.ReactNode }>;
}> = ({ title, values }) => (
  <Card title={title} style={{ height: "100%" }}>
    <Row gutter={[12, 16]}>
      {values.map((item) => (
        <Col xs={12} lg={8} key={item.label}>
          <Statistic title={item.label} value={item.value as any} />
        </Col>
      ))}
    </Row>
  </Card>
);

export const OperationModuleCard: React.FC<{
  title: string;
  description: string;
  onClick?: () => void;
}> = ({ title, description, onClick }) => (
  <Card hoverable onClick={onClick}>
    <Typography.Title level={4}>{title}</Typography.Title>
    <Typography.Text type="secondary">{description}</Typography.Text>
  </Card>
);

export const FileUploadField: React.FC<{
  value?: string;
  onChange?: (value?: string) => void;
  folder?: string;
}> = ({ value, onChange, folder = "operations" }) => (
  <Space direction="vertical">
    <Upload
      maxCount={1}
      showUploadList={false}
      customRequest={async ({ file, onSuccess, onError }) => {
        try {
          const blob = file as File;
          const url = await uploadFile(blob, folder, blob.name);
          onChange?.(url);
          onSuccess?.({ url });
        } catch (error) {
          onError?.(error as Error);
        }
      }}
    >
      <Button icon={<UploadOutlined />}>Tải file lên</Button>
    </Upload>
    {value ? (
      <Typography.Link href={value} target="_blank">
        Xem file đã tải
      </Typography.Link>
    ) : null}
  </Space>
);

type SimpleSelectProps = {
  value?: string;
  onChange?: (value?: string) => void;
  options?: Array<{ id: string; name?: string; code?: string; label?: string }>;
  placeholder?: string;
};

const SimpleSelect: React.FC<SimpleSelectProps> = ({
  value,
  onChange,
  options = [],
  placeholder,
}) => (
  <Select
    allowClear
    showSearch
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    optionFilterProp="label"
    options={options.map((x) => ({
      value: x.id,
      label: x.label || [x.code, x.name].filter(Boolean).join(" - "),
    }))}
  />
);

export const PartnerSelect = SimpleSelect;
export const VesselSelect = SimpleSelect;
export const WarehouseSelect = SimpleSelect;
export const ProductSelect = SimpleSelect;
export const VehicleSelect = SimpleSelect;
export const DriverSelect = SimpleSelect;
