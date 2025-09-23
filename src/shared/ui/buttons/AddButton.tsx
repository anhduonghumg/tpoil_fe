// src/shared/components/buttons/AddButton.tsx
import { Button, Tooltip } from "antd";
import { PlusOutlined } from "@ant-design/icons";

interface AddButtonProps {
  onClick: () => void;
  text?: string;
  tooltip?: string;
  size?: "small" | "middle" | "large";
}

export default function AddButton({
  onClick,
  text = "Thêm mới",
  tooltip,
  size = "middle",
}: AddButtonProps) {
  const btn = (
    <Button
      type="primary"
      icon={<PlusOutlined />}
      size={size}
      onClick={onClick}
    >
      {text}
    </Button>
  );

  return tooltip ? <Tooltip title={tooltip}>{btn}</Tooltip> : btn;
}
