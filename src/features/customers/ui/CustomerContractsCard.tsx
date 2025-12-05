import { Card, Table, Tag, Popconfirm, Typography } from "antd";
import dayjs from "dayjs";
import { useCustomerContracts, useUnassignContract } from "../hooks";

const { Text } = Typography;

interface Props {
  customerId: string;
  onOpenAssignModal: () => void;
}

export function CustomerContractsCard({
  customerId,
  onOpenAssignModal,
}: Props) {
  const { data: contracts, isLoading } = useCustomerContracts(customerId);
  const unassignMutation = useUnassignContract(customerId);

  const columns = [
    {
      title: "Mã HĐ",
      dataIndex: "code",
      width: 90,
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: "Tên hợp đồng",
      dataIndex: "name",
      ellipsis: true,
    },
    {
      title: "Hiệu lực",
      key: "period",
      render: (row: any) =>
        `${dayjs(row.startDate).format("DD/MM/YYYY")} → ${dayjs(
          row.endDate
        ).format("DD/MM/YYYY")}`,
      width: 210,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 110,
      render: (status: string) =>
        status === "Active" ? (
          <Tag color="green">Active</Tag>
        ) : (
          <Tag color="red">{status}</Tag>
        ),
    },
    {
      title: "",
      key: "actions",
      width: 70,
      align: "center" as const,
      render: (row: any) => (
        <Popconfirm
          title="Gỡ hợp đồng khỏi khách hàng?"
          onConfirm={() => unassignMutation.mutate(row.id)}
        >
          <a style={{ color: "red" }}>Gỡ</a>
        </Popconfirm>
      ),
    },
  ];

  const count = contracts?.length ?? 0;

  return (
    <Card
      title={
        <>
          Hợp đồng của khách hàng{" "}
          <Text type="secondary">( {count} hợp đồng )</Text>
        </>
      }
      extra={
        <a onClick={onOpenAssignModal} style={{ fontWeight: 500 }}>
          Gán hợp đồng có sẵn
        </a>
      }
      size="small"
    >
      <Table
        rowKey="id"
        size="small"
        loading={isLoading}
        dataSource={contracts ?? []}
        columns={columns as any}
        pagination={false}
        locale={{ emptyText: "Chưa có hợp đồng nào gán cho khách này." }}
      />
    </Card>
  );
}
