// features/customer-groups/ui/CustomerGroupFilters.tsx
import React from "react";
import { Button, Input, Space } from "antd";
import { PlusCircleFilled, SearchOutlined } from "@ant-design/icons";

export const CustomerGroupFilters: React.FC<{
  draftKeyword: string;
  onDraftKeywordChange: (v: string) => void;
  onSearch: () => void;
  onCreate: () => void;
  loading?: boolean;
}> = ({ draftKeyword, onDraftKeywordChange, onSearch, onCreate, loading }) => {
  return (
    <Space style={{ width: "100%", justifyContent: "space-between" }}>
      <Space>
        <Input
          size="small"
          value={draftKeyword}
          allowClear
          style={{ width: 360 }}
          placeholder="Tìm theo mã hoặc tên..."
          onChange={(e) => onDraftKeywordChange(e.target.value)}
          onPressEnter={onSearch}
        />
        <Button
          icon={<SearchOutlined />}
          size="small"
          type="primary"
          onClick={onSearch}
          loading={loading}
        >
          Tìm kiếm
        </Button>
      </Space>

      <Button
        icon={<PlusCircleFilled />}
        size="small"
        type="primary"
        onClick={onCreate}
      >
        Thêm mới
      </Button>
    </Space>
  );
};
