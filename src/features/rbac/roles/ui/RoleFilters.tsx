import { Button, Input, Space } from "antd";

export function RoleFilters(props: {
  draftKeyword: string;
  onDraftKeywordChange: (v: string) => void;
  onSearch: () => void;
  onReset: () => void;
  onCreate: () => void;
}) {
  const { draftKeyword, onDraftKeywordChange, onSearch, onReset, onCreate } =
    props;

  return (
    <Space wrap style={{ width: "100%", justifyContent: "space-between" }}>
      <Space wrap>
        <Input
          size="small"
          allowClear
          placeholder="Tìm theo code / tên vai trò"
          value={draftKeyword}
          onChange={(e) => onDraftKeywordChange(e.target.value)}
          onPressEnter={onSearch}
          style={{ width: 320 }}
        />
        <Button size="small" onClick={onSearch}>
          Tìm kiếm
        </Button>
        <Button size="small" onClick={onReset}>
          Reset
        </Button>
      </Space>

      <Button size="small" type="primary" onClick={onCreate}>
        Tạo vai trò
      </Button>
    </Space>
  );
}
