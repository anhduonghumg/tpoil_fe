import { useMemo } from "react";
import { Alert, Button, Card, Col, Empty, Row, Space, Table, Tag, Typography } from "antd";
import { ArrowRightOutlined, BankOutlined, CheckCircleOutlined, ClockCircleOutlined, WarningOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useCommercialLotPaymentRequests } from "../../commercial-lots/hooks";

const statusLabel: Record<string, { label: string; color: string }> = {
  PENDING_DIRECTOR_APPROVAL: { label: "Chờ duyệt chi", color: "gold" },
  SUBMITTED: { label: "Chờ ngân hàng", color: "blue" },
  BANK_VERIFIED: { label: "Chờ thanh toán", color: "cyan" },
  PARTIALLY_PAID: { label: "Thanh toán một phần", color: "geekblue" },
  BANK_RETURNED: { label: "Bị trả lại", color: "orange" },
};

const formatMoney = (value?: string | number | null) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Number(value ?? 0));

export function BankingDashboardPanel() {
  const navigate = useNavigate();
  const requestsQuery = useCommercialLotPaymentRequests();
  const requests = requestsQuery.data ?? [];
  const summary = useMemo(() => ({
    awaitingApproval: requests.filter((item) => item.status === "PENDING_DIRECTOR_APPROVAL").length,
    awaitingBank: requests.filter((item) => item.status === "SUBMITTED").length,
    readyToPay: requests.filter((item) => ["BANK_VERIFIED", "PARTIALLY_PAID"].includes(item.status)).length,
    returned: requests.filter((item) => ["DIRECTOR_REJECTED", "BANK_RETURNED"].includes(item.status)).length,
  }), [requests]);
  const attentionRows = requests.filter((item) => ["PENDING_DIRECTOR_APPROVAL", "SUBMITTED", "BANK_VERIFIED", "PARTIALLY_PAID", "BANK_RETURNED"].includes(item.status));

  const cards = [
    { label: "Chờ duyệt chi", value: summary.awaitingApproval, icon: <ClockCircleOutlined />, color: "#d48806", to: "/banking/payment-approvals" },
    { label: "Ngân hàng cần kiểm tra", value: summary.awaitingBank, icon: <BankOutlined />, color: "#1677ff", to: "/banking/payments" },
    { label: "Sẵn sàng thanh toán", value: summary.readyToPay, icon: <CheckCircleOutlined />, color: "#08979c", to: "/banking/payments" },
    { label: "Cần mua hàng xử lý lại", value: summary.returned, icon: <WarningOutlined />, color: "#d46b08", to: "/commercial-purchases/lots" },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Row gutter={[12, 12]}>
        {cards.map((item) => (
          <Col xs={24} sm={12} xl={6} key={item.label}>
            <Card size="small" bodyStyle={{ padding: 16 }}>
              <Space direction="vertical" size={6} style={{ width: "100%" }}>
                <Space style={{ justifyContent: "space-between", width: "100%" }}>
                  <Typography.Text type="secondary">{item.label}</Typography.Text>
                  <span style={{ color: item.color }}>{item.icon}</span>
                </Space>
                <Typography.Title level={3} style={{ margin: 0 }}>{item.value}</Typography.Title>
                <Button size="small" type="link" style={{ padding: 0, width: "fit-content" }} onClick={() => navigate(item.to)}>
                  Mở danh sách <ArrowRightOutlined />
                </Button>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      {summary.returned > 0 ? (
        <Alert showIcon type="warning" message={`${summary.returned} đề nghị đã bị trả lại, cần mua hàng cập nhật và gửi lại duyệt.`} />
      ) : null}

      <Table
        rowKey="id"
        size="small"
        loading={requestsQuery.isLoading}
        dataSource={attentionRows}
        pagination={{ pageSize: 10, hideOnSinglePage: true }}
        columns={[
          { title: "Đề nghị", dataIndex: "requestNo" },
          { title: "Đơn hàng", render: (_: unknown, row: any) => row.purchaseOrder.orderNo },
          { title: "NCC", render: (_: unknown, row: any) => row.purchaseOrder.supplier.code },
          { title: "Số tiền", dataIndex: "remainingAmount", align: "right", render: (value: string) => `${formatMoney(value)} đ` },
          { title: "Trạng thái", dataIndex: "status", render: (status: string) => { const meta = statusLabel[status] ?? { label: status, color: "default" }; return <Tag color={meta.color}>{meta.label}</Tag>; } },
          { title: "", width: 88, render: (_: unknown, row: any) => <Button size="small" onClick={() => navigate(row.status === "PENDING_DIRECTOR_APPROVAL" ? "/banking/payment-approvals" : "/banking/payments")}>Xử lý</Button> },
        ]}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có cảnh báo thanh toán" /> }}
      />
    </Space>
  );
}
