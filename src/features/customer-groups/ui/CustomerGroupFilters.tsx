// features/customer-groups/ui/CustomerGroupFilters.tsx
import React from "react";
import { Button, Input, Space } from "antd";
import { PlusCircleFilled, SearchOutlined } from "@ant-design/icons";
import { FilterToolbar } from "../../../shared/ui/TableFilter";

/**
 * Một ô tìm và một nút thêm mới — không có điều kiện nào để thu vào nút "Bộ lọc".
 * Chỉ đổi khung ngoài sang FilterToolbar dùng chung: tìm kiếm bên trái, tác vụ dồn phải.
 */
export const CustomerGroupFilters: React.FC<{
  draftKeyword: string;
  onDraftKeywordChange: (v: string) => void;
  onSearch: () => void;
  onCreate: () => void;
  loading?: boolean;
}> = ({ draftKeyword, onDraftKeywordChange, onSearch, onCreate, loading }) => {
  return (
    <FilterToolbar
      left={
        <Space size={6}>
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
      }
      right={
        <Button
          icon={<PlusCircleFilled />}
          size="small"
          type="primary"
          onClick={onCreate}
        >
          Thêm mới
        </Button>
      }
    />
  );
};
