import React from "react";
import { Input, Space, Button } from "antd";
import { FilterToolbar } from "../../../shared/ui/TableFilter";

export interface UsersFilterValue {
  draftKeyword?: string;
  keyword?: string;
}

interface Props {
  value: UsersFilterValue;
  onChange: (v: UsersFilterValue) => void;
  onSearch: () => void;
}

/**
 * Chỉ có một ô tìm nên không có gì để thu vào nút "Bộ lọc"; cái cần đồng bộ ở đây là
 * khung ngoài — dùng chung FilterToolbar để hàng công cụ nằm đúng chỗ như mọi màn khác.
 */
export const UsersFilters: React.FC<Props> = ({ value, onChange, onSearch }) => {
  return (
    <FilterToolbar
      left={
        <Space size={6}>
          <Input
            size="small"
            placeholder="Tìm username / email / tên"
            value={value.draftKeyword}
            allowClear
            onChange={(e) => onChange({ ...value, draftKeyword: e.target.value })}
            onPressEnter={onSearch}
            style={{ width: 260 }}
          />
          <Button size="small" type="primary" onClick={onSearch}>
            Tìm kiếm
          </Button>
        </Space>
      }
    />
  );
};
