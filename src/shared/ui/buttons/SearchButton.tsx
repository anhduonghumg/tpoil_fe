// src/shared/components/buttons/SearchButton.tsx
import { Button, Tooltip } from "antd";
import { SearchOutlined } from "@ant-design/icons";

interface SearchButtonProps {
  onClick: () => void;
  text?: string; // Mặc định: "Tìm kiếm"
  tooltip?: string;
  size?: "small" | "middle" | "large";
}

export default function SearchButton({
  onClick,
  text = "Tìm kiếm",
  tooltip,
  size = "middle",
}: SearchButtonProps) {
  const btn = (
    <Button
      type="default"
      icon={<SearchOutlined />}
      size={size}
      onClick={onClick}
    >
      {text}
    </Button>
  );

  return tooltip ? <Tooltip title={tooltip}>{btn}</Tooltip> : btn;
}
