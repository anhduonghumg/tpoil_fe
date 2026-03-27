import React from "react";
import { Button, Input, Select, Space } from "antd";
import type { BankAccountListQuery } from "../types";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";

type Props = {
  value: BankAccountListQuery;
  draftKeyword: string;
  onDraftKeywordChange: (v: string) => void;
  onSearch: () => void;
  onChange: (patch: Partial<BankAccountListQuery>) => void;
  onCreate: () => void;
};

export default function BankAccountFilter({
  value,
  draftKeyword,
  onDraftKeywordChange,
  onSearch,
  onChange,
  onCreate,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <Space wrap>
        <Input
          size="small"
          allowClear
          placeholder="Tìm theo STK, tên TK, ngân hàng..."
          value={draftKeyword}
          onChange={(e) => onDraftKeywordChange(e.target.value)}
          onPressEnter={onSearch}
          style={{ width: 280 }}
        />
        <Select
          size="small"
          style={{ width: 160 }}
          placeholder="Trạng thái"
          value={
            value.isActive === undefined
              ? "ALL"
              : value.isActive
              ? "ACTIVE"
              : "INACTIVE"
          }
          onChange={(v) =>
            onChange({
              isActive: v === "ALL" ? undefined : v === "ACTIVE" ? true : false,
            })
          }
          options={[
            { label: "Tất cả", value: "ALL" },
            { label: "Đang dùng", value: "ACTIVE" },
            { label: "Ngưng dùng", value: "INACTIVE" },
          ]}
        />
        <Button
          size="small"
          icon={<SearchOutlined />}
          type="primary"
          onClick={onSearch}
        >
          Tìm kiếm
        </Button>
      </Space>

      <Button
        style={{ marginLeft: "4px"}}
        size="small"
        icon={<PlusOutlined />}
        type="primary"
        onClick={onCreate}
      >
        Thêm tài khoản
      </Button>
    </div>
  );
}
