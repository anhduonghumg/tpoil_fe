import React from "react";
import { Button, Select, Space, Typography } from "antd";
import type { BankAccountOption } from "../types";
import { ImportOutlined } from "@ant-design/icons";

type Props = {
  onOpenImport: () => void;
  onBulkQuickMatch?: () => void;
  bulkDisabled?: boolean;
  bulkLoading?: boolean;
  selectedCount?: number;
};

export function StatementHeader({
  onOpenImport,
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
          // type="primary"
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
      </Space>
    </div>
  );
}
