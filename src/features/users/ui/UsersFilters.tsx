import React from "react";
import { Input, Space, Button } from "antd";

export interface UsersFilterValue {
  draftKeyword?: string;
  keyword?: string;
}

interface Props {
  value: UsersFilterValue;
  onChange: (v: UsersFilterValue) => void;
  onSearch: () => void;
}

export const UsersFilters: React.FC<Props> = ({
  value,
  onChange,
  onSearch,
}) => {
  return (
    <Space>
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
  );
};
