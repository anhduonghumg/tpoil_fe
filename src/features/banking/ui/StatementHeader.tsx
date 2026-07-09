import { Button, Space } from "antd";
import { ImportOutlined, PlusOutlined } from "@ant-design/icons";

type Props = {
  onOpenImport: () => void;
  onOpenManual: () => void;
  onBulkQuickMatch?: () => void;
  bulkDisabled?: boolean;
  bulkLoading?: boolean;
  selectedCount?: number;
};

export function StatementHeader({
  onOpenImport,
  onOpenManual,
  onBulkQuickMatch,
  bulkDisabled,
  bulkLoading,
  selectedCount = 0,
}: Props) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Space wrap>
        <Button
          size="small"
          icon={<ImportOutlined />}
          onClick={onBulkQuickMatch}
          disabled={bulkDisabled}
          loading={bulkLoading}
        >
          Khớp nhanh {selectedCount > 0 ? `(${selectedCount})` : ""}
        </Button>

        <Button
          size="small"
          icon={<ImportOutlined />}
          type="primary"
          onClick={onOpenImport}
        >
          Import sao kê
        </Button>

        <Button size="small" icon={<PlusOutlined />} onClick={onOpenManual}>
          Thêm giao dịch
        </Button>
      </Space>
    </div>
  );
}
