import React from "react";
import {
  Card,
  Descriptions,
  Skeleton,
  Space,
  Tag,
  Typography,
  Divider,
  Flex,
} from "antd";
import type { CustomerOverview, Customer } from "../types";

const { Title, Text } = Typography;

interface Props {
  data?: CustomerOverview;
  loading?: boolean;
  customerId: string | null;
}

const statusTag = (status: Customer["status"]) => {
  switch (status) {
    case "Active":
      return <Tag color="green">Đang hoạt động</Tag>;
    case "Inactive":
      return <Tag>Ngừng</Tag>;
    case "Blacklisted":
      return <Tag color="red">Blacklist</Tag>;
    default:
      return <Tag>{status}</Tag>;
  }
};

export const CustomerOverviewPanel: React.FC<Props> = ({
  data,
  loading,
  customerId,
}) => {
  if (!customerId) {
    return (
      <div style={{ textAlign: "center", paddingTop: 80, color: "#999" }}>
        Chọn một khách hàng để xem chi tiết
      </div>
    );
  }

  if (loading && !data) {
    return <Skeleton active />;
  }

  if (!data) {
    return (
      <div style={{ textAlign: "center", paddingTop: 80, color: "#999" }}>
        Không tải được dữ liệu khách hàng
      </div>
    );
  }

  const { customer, debtSummary, inventorySummary } = data;

  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      <div>
        <Title level={5} style={{ margin: 3 }}>
          {customer.name}
        </Title>
        <div style={{ display: "flex", gap: 10 }}>
          <Text type="secondary">Mã KH: {customer.code}</Text>
          <div>
            {customer.roles?.map((r) => (
              <Tag key={r}>
                {r === "Agent"
                  ? "Đại lý"
                  : r === "Retail"
                  ? "Bán lẻ"
                  : r === "Wholesale"
                  ? "Bán buôn"
                  : "Khác"}
              </Tag>
            ))}
            {statusTag(customer.status)}
          </div>
        </div>
      </div>

      <Card size="small" title="Thông tin liên hệ">
      <Descriptions column={1} size="small">
        <Descriptions.Item label="SĐT">
          {customer.contactPhone || "-"}
        </Descriptions.Item>
        <Descriptions.Item label="Email">
          {customer.contactEmail || "-"}
        </Descriptions.Item>
        <Descriptions.Item label="Mã số thuế">
          {customer.taxCode || "-"}
        </Descriptions.Item>
        <Descriptions.Item label="Địa chỉ xuất HĐ">
          {customer.billingAddress || "-"}
        </Descriptions.Item>
        <Descriptions.Item label="Địa chỉ giao hàng">
          {customer.shippingAddress || "-"}
        </Descriptions.Item>
      </Descriptions>
      </Card>

      {debtSummary && (
        <Card size="small" title="Công nợ tổng quan">
          <Descriptions column={1} size="small">
            <Descriptions.Item label="Tổng phải thu">
              {debtSummary.totalReceivable.toLocaleString("vi-VN")} ₫
            </Descriptions.Item>
            <Descriptions.Item label="Quá hạn">
              {debtSummary.overdue.toLocaleString("vi-VN")} ₫
            </Descriptions.Item>
            <Descriptions.Item label="Cập nhật">
              {debtSummary.lastUpdated}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      {inventorySummary && (
        <Card size="small" title="Tồn hàng">
          <Descriptions column={1} size="small">
            <Descriptions.Item label="Tổng số lượng">
              {inventorySummary.totalStock.toLocaleString("vi-VN")}
            </Descriptions.Item>
            <Descriptions.Item label="Tổng giá trị">
              {inventorySummary.totalValue.toLocaleString("vi-VN")} ₫
            </Descriptions.Item>
            <Descriptions.Item label="Cập nhật">
              {inventorySummary.lastUpdated}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      <Divider style={{ margin: "8px 0 0" }} />
    </Space>
  );
};
