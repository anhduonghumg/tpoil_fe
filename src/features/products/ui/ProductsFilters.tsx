import React, { useEffect, useState } from "react";
import { Button, Input, Space } from "antd";
import {
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";

export const ProductsFilters: React.FC<{
  defaultKeyword?: string;
  loading?: boolean;
  onSearch: (keyword?: string) => void;
  onCreate: () => void;
}> = ({ defaultKeyword, loading, onSearch, onCreate }) => {
  const [draftKeyword, setDraftKeyword] = useState(defaultKeyword || "");

  useEffect(() => {
    setDraftKeyword(defaultKeyword || "");
  }, [defaultKeyword]);

  const doSearch = () => onSearch(draftKeyword.trim() || undefined);
  const clear = () => {
    setDraftKeyword("");
    onSearch(undefined);
  };

  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}
    >
      <Space size={8} style={{ flex: 1 }}>
        <Input
          size="small"
          style={{ width: 380 }}
          value={draftKeyword}
          onChange={(e) => setDraftKeyword(e.target.value)}
          placeholder="Tìm theo mã hoặc tên"
          allowClear
          onPressEnter={doSearch}
        />
        <Button icon={<DeleteOutlined />} danger size="small" onClick={clear}>
          Xóa lọc
        </Button>
        <Button
          icon={<SearchOutlined />}
          size="small"
          type="primary"
          onClick={doSearch}
          loading={loading}
        >
          Tìm kiếm
        </Button>
      </Space>

      <Button
        size="small"
        icon={<PlusOutlined />}
        type="primary"
        onClick={onCreate}
      >
        Thêm
      </Button>
    </div>
  );
};
