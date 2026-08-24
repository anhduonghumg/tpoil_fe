import React from "react";
import { Badge, Button, Popover, Tag, Tooltip } from "antd";
import { FilterOutlined, ReloadOutlined } from "@ant-design/icons";
import "./table-filter.css";

/**
 * Bộ lọc thu vào một nút, sổ ra khi cần — cùng kiểu với màn thuê tàu, để bảng
 * không mất chỗ cho những ô lọc hầu như không ai đụng tới.
 */
export const FilterButton: React.FC<{
  /** Số điều kiện đang bật; > 0 thì nút có chấm báo. */
  count: number;
  open: boolean;
  onOpenChange: (value: boolean) => void;
  content: React.ReactNode;
}> = ({ count, open, onOpenChange, content }) => (
  <Popover
    trigger="click"
    placement="bottomRight"
    open={open}
    onOpenChange={onOpenChange}
    content={content}
  >
    <Badge dot={count > 0} offset={[-2, 2]}>
      <Button size="small" icon={<FilterOutlined />}>
        Bộ lọc{count > 0 ? ` (${count})` : ""}
      </Button>
    </Badge>
  </Popover>
);

export const RefreshButton: React.FC<{ loading?: boolean; onClick: () => void }> = ({
  loading,
  onClick,
}) => (
  <Tooltip title="Làm mới">
    <Button size="small" aria-label="Làm mới" icon={<ReloadOutlined spin={loading} />} onClick={onClick} />
  </Tooltip>
);

export type ActiveFilterTag = {
  key: string;
  label: string;
  onClear: () => void;
};

/** Điều kiện đang bật hiện thành thẻ gỡ được, để không ai lọc nhầm mà không biết. */
export const FilterTags: React.FC<{ items: ActiveFilterTag[] }> = ({ items }) => (
  <div className="table-filter-tags">
    {items.map((item) => (
      <Tag key={item.key} closable onClose={item.onClear}>
        {item.label}
      </Tag>
    ))}
  </div>
);

export const FilterToolbar: React.FC<{
  left?: React.ReactNode;
  right?: React.ReactNode;
}> = ({ left, right }) => (
  <div className="table-filter-toolbar">
    <div className="table-filter-toolbar-left">{left}</div>
    <div className="table-filter-toolbar-right">{right}</div>
  </div>
);
