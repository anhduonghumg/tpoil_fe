// features/price-bulletins/ui/PriceBulletinsFilters.tsx
import React, { useEffect, useState } from "react";
import { Button, Dropdown, Input, Select } from "antd";
import type { PriceBulletinStatus } from "../types";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";

export const PriceBulletinsFilters: React.FC<{
  defaultKeyword?: string;
  defaultStatus?: PriceBulletinStatus;
  loading?: boolean;
  onSearch: (q: { keyword?: string; status?: PriceBulletinStatus }) => void;
  onCreate: () => void;
  onCreatePdf: () => void;
}> = ({
  defaultKeyword,
  defaultStatus,
  loading,
  onSearch,
  onCreate,
  onCreatePdf,
}) => {
  const [draftKeyword, setDraftKeyword] = useState(defaultKeyword ?? "");
  const [status, setStatus] = useState<PriceBulletinStatus | undefined>(
    defaultStatus
  );

  useEffect(() => setDraftKeyword(defaultKeyword ?? ""), [defaultKeyword]);
  useEffect(() => setStatus(defaultStatus), [defaultStatus]);

  const doSearch = () =>
    onSearch({ keyword: draftKeyword?.trim() || undefined, status });

  const actionMenuItems = [
    { key: "create", label: "Thêm mới" },
    { key: "import", label: "Thêm từ pdf" },
  ];

  const handleActionClick = ({ key }: { key: string }) => {
    if (key === "create") {
      onCreate();
    } else if (key === "import") {
      onCreatePdf();
      // setImportOpen(true);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        alignItems: "center",
        marginBottom: 12,
      }}
    >
      <Input
        size="small"
        placeholder="Tìm theo từ khóa....."
        value={draftKeyword}
        onChange={(e) => setDraftKeyword(e.target.value)}
        onPressEnter={doSearch}
        allowClear
      />
      <Select
        size="small"
        style={{ width: 180 }}
        allowClear
        placeholder="Trạng thái"
        value={status}
        onChange={(v) => setStatus(v)}
        options={[
          { value: "DRAFT", label: "Nháp" },
          { value: "PUBLISHED", label: "Phát hành" },
          { value: "VOID", label: "Hết hiệu lực" },
        ]}
      />

      <Button
        size="small"
        loading={loading}
        onClick={doSearch}
        icon={<SearchOutlined />}
      >
        Tìm kiếm
      </Button>

      <Dropdown
        menu={{ items: actionMenuItems, onClick: handleActionClick }}
        trigger={["click"]}
      >
        <Button
          size="small"
          type="primary"
          icon={<PlusOutlined />}
          style={{ marginTop: 5 }}
        >
          Thêm mới
        </Button>
      </Dropdown>
    </div>
  );
};
