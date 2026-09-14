import { Button, Input, Space } from "antd";
import { FilterToolbar } from "../../../../shared/ui/TableFilter";

/**
 * Một ô tìm, không có điều kiện nào để thu vào nút "Bộ lọc". Chỉ đổi khung ngoài sang
 * FilterToolbar dùng chung cho khớp bố cục các màn danh sách khác.
 */
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
    <FilterToolbar
      left={
        <Space size={6} wrap>
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
            Đặt lại
          </Button>
        </Space>
      }
      right={
        <Button size="small" type="primary" onClick={onCreate}>
          Tạo vai trò
        </Button>
      }
    />
  );
}
