import { Button, List, Tag, Typography, Popconfirm } from "antd";
import dayjs from "dayjs";
import type { CustomerContractOverviewItem } from "../types";
import { useUnassignContract } from "../hooks";

const { Text } = Typography;

interface Props {
  contracts: CustomerContractOverviewItem[];
  customerId: string;
  onOpenAssignModal: () => void;
}

export default function CustomerContractsBlock({
  contracts,
  customerId,
  onOpenAssignModal,
}: Props) {
  const unassignMutation = useUnassignContract(customerId);
  const count = contracts.length;

  return (
    <div style={{ marginTop: 16 }}>
      <div
        style={{
          marginBottom: 8,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Text strong>Hợp đồng của khách hàng</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          ({count} hợp đồng)
        </Text>
      </div>

      <Button
        type="link"
        size="small"
        style={{ paddingLeft: 0, marginBottom: 8 }}
        onClick={onOpenAssignModal}
      >
        + Gán hợp đồng có sẵn
      </Button>

      {count === 0 ? (
        <Text type="secondary" style={{ fontSize: 12 }}>
          Chưa có hợp đồng nào được gán.
        </Text>
      ) : (
        <List
          size="small"
          dataSource={contracts}
          renderItem={(item) => (
            <List.Item
              style={{ padding: "4px 0" }}
              actions={[
                <Popconfirm
                  key="unassign"
                  title="Gỡ hợp đồng khỏi khách hàng?"
                  onConfirm={() => unassignMutation.mutate(item.id)}
                >
                  <a style={{ fontSize: 12, color: "#f97373" }}>Gỡ</a>
                </Popconfirm>,
              ]}
            >
              <div style={{ width: "100%" }}>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <Text strong style={{ fontSize: 13 }}>
                    {item.code}
                  </Text>
                  <Tag
                    color={
                      item.status === "Active"
                        ? "green"
                        : item.status === "Draft"
                        ? "default"
                        : "red"
                    }
                    style={{ marginLeft: 8 }}
                  >
                    {item.status}
                  </Tag>
                </div>
                <div style={{ fontSize: 12 }}>
                  <Text>{item.name}</Text>
                </div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                  Hiệu lực: {dayjs(item.startDate).format("DD/MM/YYYY")} –{" "}
                  {dayjs(item.endDate).format("DD/MM/YYYY")}
                </div>
              </div>
            </List.Item>
          )}
        />
      )}
    </div>
  );
}
