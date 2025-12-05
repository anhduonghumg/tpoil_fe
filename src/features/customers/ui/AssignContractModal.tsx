import { Modal, Table, Tag, Typography, Button, Input, Space } from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useAttachableContracts, useAssignContracts } from "../hooks";
import type { AttachableContractBrief } from "../types";

const { Text } = Typography;
const { Search } = Input;

interface Props {
  open: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
}

export default function AssignContractsModal({
  open,
  onClose,
  customerId,
  customerName,
}: Props) {
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const { data, isLoading } = useAttachableContracts(
    customerId,
    keyword,
    page,
    pageSize
  );

  const assignMutation = useAssignContracts(customerId);

  useEffect(() => {
    if (!open) {
      setSelectedRowKeys([]);
      setKeyword("");
      setPage(1);
    }
  }, [open]);

  const rows = (data?.items ?? []).map((c) => ({ ...c, key: c.id }));
  const total = data?.total ?? 0;

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
      render: (row: AttachableContractBrief) =>
        `${dayjs(row.startDate).format("DD/MM/YYYY")} – ${dayjs(
          row.endDate
        ).format("DD/MM/YYYY")}`,
    },
    {
      title: "Rủi ro",
      dataIndex: "riskLevel",
      width: 110,
      render: (risk: string) => {
        const color =
          risk === "High" ? "red" : risk === "Medium" ? "orange" : "green";
        return <Tag color={color}>{risk}</Tag>;
      },
    },
  ];

  const handleAssign = () => {
    const ids = selectedRowKeys.map(String);
    if (!ids.length) return;

    assignMutation.mutate(ids, {
      onSuccess: () => {
        setSelectedRowKeys([]);
        // Sidebar + attachable list được refresh trong hook
        onClose();
      },
    });
  };

  return (
    <Modal
      open={open}
      title={
        <span>
          Gán hợp đồng cho khách hàng: <Text strong>{customerName}</Text>
        </span>
      }
      width={900}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Hủy
        </Button>,
        <Button
          key="assign"
          type="primary"
          // disabled={!selectedRowKeys.length || assignMutation.isLoading}
          // loading={assignMutation.isLoading}
          onClick={handleAssign}
        >
          Gán hợp đồng
        </Button>,
      ]}
    >
      <Space direction="vertical" style={{ width: "100%", marginBottom: 8 }}>
        <Search
          placeholder="Tìm theo mã, tên, loại hợp đồng..."
          allowClear
          onSearch={(value) => {
            setKeyword(value.trim());
            setPage(1);
          }}
        />
      </Space>

      <Table
        size="small"
        rowKey="id"
        dataSource={rows}
        columns={columns as any}
        loading={isLoading}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
        pagination={{
          current: page,
          pageSize,
          total,
          onChange: (p) => setPage(p),
          showSizeChanger: false,
        }}
        locale={{
          emptyText:
            "Không có hợp đồng nào chưa gán cho khách hàng hoặc không khớp từ khóa.",
        }}
      />
    </Modal>
  );
}
