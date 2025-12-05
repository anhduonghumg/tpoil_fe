import { Modal, Table, Tag, Typography, Button } from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { useUnassignContracts } from "../hooks";
import type { CustomerContractOverviewItem } from "../types";
import { notify } from "../../../shared/lib/notification";

const { Text } = Typography;

interface Props {
  open: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  contractsGroups: any;
}

export default function CustomerContractsModal({
  open,
  onClose,
  customerId,
  customerName,
  contractsGroups,
}: Props) {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const unassignMutation = useUnassignContracts(customerId);

  // gộp tất cả group thành 1 list phẳng
  const rows: CustomerContractOverviewItem[] = useMemo(() => {
    if (!contractsGroups) return [];
    const all = [
      ...(contractsGroups.active ?? []),
      ...(contractsGroups.expired ?? []),
      ...(contractsGroups.upcoming ?? []),
      ...(contractsGroups.cancelled ?? []),
      ...(contractsGroups.terminated ?? []),
    ];
    return all.map((c) => ({ ...c, key: c.id }));
  }, [contractsGroups]);

  const columns = [
    {
      title: "Mã HĐ",
      dataIndex: "code",
      width: 140,
    },
    {
      title: "Tên hợp đồng",
      dataIndex: "name",
      ellipsis: true,
    },
    {
      title: "Hiệu lực",
      key: "dates",
      width: 210,
      render: (row: CustomerContractOverviewItem) =>
        `${dayjs(row.startDate).format("DD/MM/YYYY")} – ${dayjs(
          row.endDate
        ).format("DD/MM/YYYY")}`,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 120,
      render: (status: string) => (
        <Tag
          color={
            status === "Active"
              ? "green"
              : status === "Draft"
              ? "default"
              : "red"
          }
        >
          {status}
        </Tag>
      ),
    },
  ];

  const handleUnassign = () => {
    const ids = selectedRowKeys.map(String);
    if (!ids.length) return;

    unassignMutation.mutate(ids, {
      onSuccess: () => {
        setSelectedRowKeys([]);
        onClose();
      },
    });
  };

  return (
    <Modal
      open={open}
      title={
        <span>
          Hợp đồng của khách hàng: <Text strong>{customerName}</Text>
        </span>
      }
      width={900}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Đóng
        </Button>,
        <Button
          key="remove"
          danger
          type="primary"
          disabled={!selectedRowKeys.length || unassignMutation.isLoading}
          loading={unassignMutation.isLoading}
          onClick={handleUnassign}
        >
          Gỡ khỏi khách hàng
        </Button>,
      ]}
    >
      <Table
        size="small"
        rowKey="id"
        dataSource={rows}
        columns={columns as any}
        pagination={false}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
        locale={{
          emptyText: "Khách hàng hiện chưa có hợp đồng nào.",
        }}
      />
    </Modal>
  );
}
