import React from "react";
import { Dropdown, Button } from "antd";
import type { MenuProps } from "antd";
import { MoreOutlined } from "@ant-design/icons";

export type ActionKey =
  | "view"
  | "edit"
  | "resetPassword"
  | "assignEmployee"
  | "assignRoles"
  | "delete";

export type ActionItem = {
  key: ActionKey;
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
};

export function CommonActionMenu({
  items,
  onAction,
}: {
  items: ActionItem[];
  onAction: (key: ActionKey) => void;
}) {
  const menuItems: MenuProps["items"] = items.map((x) => ({
    key: x.key,
    label: x.label,
    icon: x.icon,
    danger: x.danger,
    disabled: x.disabled,
  }));

  return (
    <Dropdown
      trigger={["click"]}
      menu={{
        items: menuItems,
        onClick: (info) => onAction(info.key as ActionKey),
      }}
    >
      <Button size="small" icon={<MoreOutlined />}>
        Chức năng
      </Button>
    </Dropdown>
  );
}
