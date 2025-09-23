import { Button, Space, Popconfirm, Tooltip } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";

interface ActionButtonsProps {
  onEdit?: () => void;
  onDelete?: () => void;
  confirmDelete?: boolean;
  size?: "small" | "middle" | "large";
  editTooltip?: string;
  deleteTooltip?: string;
}

export default function ActionButtons({
  onEdit,
  onDelete,
  confirmDelete = true,
  size = "middle",
  editTooltip = "Sửa",
  deleteTooltip = "Xóa",
}: ActionButtonsProps) {
  return (
    <Space>
      {/* Button Sửa */}
      {onEdit && (
        <Tooltip title={editTooltip}>
          <Button
            type="text"
            icon={<EditOutlined />}
            size={size}
            onClick={onEdit}
          />
        </Tooltip>
      )}

      {/* Button Xóa */}
      {onDelete &&
        (confirmDelete ? (
          <Popconfirm
            title="Xác nhận xóa?"
            okText="Xóa"
            cancelText="Hủy"
            onConfirm={onDelete}
          >
            <Tooltip title={deleteTooltip}>
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                size={size}
              />
            </Tooltip>
          </Popconfirm>
        ) : (
          <Tooltip title={deleteTooltip}>
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              size={size}
              onClick={onDelete}
            />
          </Tooltip>
        ))}
    </Space>
  );
}
