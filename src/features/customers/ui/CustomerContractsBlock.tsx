// features/customers/ui/CustomerContractsBlock.tsx
import { Button, List, Tag, Typography } from "antd";
import dayjs from "dayjs";

import { CustomerContractOverviewItem } from "../types";

const { Text } = Typography;

interface CustomerContractsBlockProps {
  contracts: CustomerContractOverviewItem[];
  onOpenAssignModal: () => void;
}

function renderContractStatus(status: string) {
  switch (status) {
    case "Draft":
      return <Tag color="default">Nháp</Tag>;
    case "Pending":
      return <Tag color="gold">Chờ duyệt</Tag>;
    case "Active":
      return <Tag color="green">Hiệu lực</Tag>;
    case "Terminated":
      return <Tag color="red">Đã chấm dứt</Tag>;
    case "Cancelled":
      return <Tag color="gray">Đã huỷ</Tag>;
    default:
      return <Tag>{status}</Tag>;
  }
}

function renderRiskTag(risk: string) {
  switch (risk) {
    case "High":
      return <Tag color="red">Rủi ro cao</Tag>;
    case "Medium":
      return <Tag color="orange">Rủi ro TB</Tag>;
    case "Low":
    default:
      return <Tag color="green">Rủi ro thấp</Tag>;
  }
}

export default function CustomerContractsBlock({
  contracts,
  onOpenAssignModal,
}: CustomerContractsBlockProps) {
  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          marginBottom: 4,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Text strong style={{ fontSize: 12 }}>
          Hợp đồng của khách hàng ({contracts.length})
        </Text>

        <Button
          size="small"
          type="link"
          onClick={onOpenAssignModal}
          style={{ paddingRight: 0 }}
        >
          Gán hợp đồng có sẵn
        </Button>
      </div>

      {contracts.length === 0 ? (
        <Text type="secondary" style={{ fontSize: 12 }}>
          Chưa có hợp đồng nào gán cho khách hàng này.
        </Text>
      ) : (
        <List
          size="small"
          dataSource={contracts}
          style={{ marginTop: 4, maxHeight: 260, overflow: "auto" }}
          renderItem={(c) => {
            const start = c.startDate
              ? dayjs(c.startDate).format("DD/MM/YYYY")
              : "";
            const end = c.endDate ? dayjs(c.endDate).format("DD/MM/YYYY") : "";

            return (
              <List.Item style={{ padding: "6px 0" }}>
                <div style={{ width: "100%" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ fontSize: 12 }} strong>
                      {c.code}
                    </Text>
                    {renderContractStatus(c.status)}
                  </div>

                  <div style={{ fontSize: 11, marginTop: 2 }}>
                    <Text type="secondary">{c.name}</Text>
                  </div>

                  <div style={{ fontSize: 11, marginTop: 2 }}>
                    {start && end && (
                      <span>
                        Hiệu lực: {start} → {end}
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: 11, marginTop: 2 }}>
                    {renderRiskTag(c.riskLevel)}
                    {typeof c.paymentTermDays === "number" &&
                      ` • TT ${c.paymentTermDays} ngày`}
                    {c.creditLimitOverride && (
                      <>
                        {" "}
                        • HM riêng:{" "}
                        {Number(c.creditLimitOverride).toLocaleString("vi-VN")}
                      </>
                    )}
                    {c.renewalOfId && <> • Gia hạn từ HĐ trước</>}
                  </div>
                </div>
              </List.Item>
            );
          }}
        />
      )}
    </div>
  );
}
