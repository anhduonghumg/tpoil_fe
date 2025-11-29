// features/customers/ui/AssignContractModal.tsx
import { Modal, Table, Tag, Typography, Input, Space } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo, useState } from "react";
import dayjs from "dayjs";
import type { AssignableContract } from "../types";

const { Text } = Typography;

interface AssignContractModalProps {
  open: boolean;
  customerName?: string;
  contracts: AssignableContract[]; // list HĐ có thể gán
  loading?: boolean;
  multiple?: boolean; // default: true
  onClose: () => void;
  onConfirm: (selectedIds: string[]) => void;
}

function renderStatus(status: string) {
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

function renderRisk(risk: string) {
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

export default function AssignContractModal({
  open,
  customerName,
  contracts,
  loading,
  multiple = true,
  onClose,
  onConfirm,
}: AssignContractModalProps) {
  const [keyword, setKeyword] = useState("");
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const filteredContracts = useMemo(() => {
    if (!keyword) return contracts;
    const kw = keyword.toLowerCase();
    return contracts.filter(
      (c) =>
        c.code.toLowerCase().includes(kw) ||
        c.name.toLowerCase().includes(kw) ||
        (c.contractTypeName?.toLowerCase().includes(kw) ?? false)
    );
  }, [contracts, keyword]);

  const columns: ColumnsType<AssignableContract> = [
    {
      title: "Mã HĐ",
      dataIndex: "code",
      width: 110,
    },
    {
      title: "Tên hợp đồng",
      dataIndex: "name",
      ellipsis: true,
    },
    {
      title: "Loại HĐ",
      dataIndex: "contractTypeName",
      width: 140,
      ellipsis: true,
    },
    {
      title: "Hiệu lực",
      key: "period",
      width: 160,
      render: (_, r) => {
        const s = r.startDate ? dayjs(r.startDate).format("DD/MM/YYYY") : "";
        const e = r.endDate ? dayjs(r.endDate).format("DD/MM/YYYY") : "";
        return (
          <span>
            {s} → {e}
          </span>
        );
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 110,
      render: renderStatus,
    },
    {
      title: "Rủi ro",
      dataIndex: "riskLevel",
      width: 100,
      render: renderRisk,
    },
  ];

  const rowSelection = {
    type: multiple ? ("checkbox" as const) : ("radio" as const),
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
  };

  const handleOk = () => {
    onConfirm(selectedRowKeys as string[]);
    setSelectedRowKeys([]);
  };

  const handleCancel = () => {
    setSelectedRowKeys([]);
    onClose();
  };

  return (
    <Modal
      open={open}
      title={
        <Space direction="vertical" size={0}>
          <Text strong>Gán hợp đồng có sẵn</Text>
          {customerName && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Khách hàng: {customerName}
            </Text>
          )}
        </Space>
      }
      onOk={handleOk}
      onCancel={handleCancel}
      okText="Gán hợp đồng"
      cancelText="Huỷ"
      width={900}
      destroyOnClose
      okButtonProps={{ disabled: selectedRowKeys.length === 0 }}
    >
      <div style={{ marginBottom: 8 }}>
        <Input.Search
          allowClear
          size="small"
          placeholder="Tìm theo mã, tên, loại hợp đồng"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>

      <Table<AssignableContract>
        size="small"
        rowKey="id"
        columns={columns}
        dataSource={filteredContracts}
        loading={loading}
        rowSelection={rowSelection}
        pagination={{
          pageSize: 10,
          size: "small",
        }}
      />
    </Modal>
  );
}
