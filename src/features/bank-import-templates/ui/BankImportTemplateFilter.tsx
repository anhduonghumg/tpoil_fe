import React from "react";
import { Button, Input, Select, Space } from "antd";
import type { BankImportTemplateListQuery } from "../types";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";

type Props = {
  value: BankImportTemplateListQuery;
  draftKeyword: string;
  onDraftKeywordChange: (v: string) => void;
  onSearch: () => void;
  onChange: (patch: Partial<BankImportTemplateListQuery>) => void;
  onCreate: () => void;
};

export default function BankImportTemplateFilter({
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
          placeholder="Tìm theo tên template, bankCode..."
          value={draftKeyword}
          onChange={(e) => onDraftKeywordChange(e.target.value)}
          onPressEnter={onSearch}
          style={{ width: 280 }}
        />

        <Input
          size="small"
          placeholder="Mã ngân hàng"
          value={value.bankCode}
          onChange={(e) => onChange({ bankCode: e.target.value || undefined })}
          style={{ width: 160 }}
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
          icon={<SearchOutlined />}
          size="small"
          type="primary"
          onClick={onSearch}
        >
          Tìm kiếm
        </Button>
      </Space>

      <Button
        style={{ marginLeft: "5px" }}
        icon={<PlusOutlined />}
        size="small"
        type="primary"
        onClick={onCreate}
      >
        Thêm template
      </Button>
    </div>
  );
}
