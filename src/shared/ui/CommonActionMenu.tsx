import React, { useMemo } from "react";
import { Dropdown, Button } from "antd";
import type { MenuProps } from "antd";
import { MoreOutlined } from "@ant-design/icons";
import { useCan } from "../authz/useCan";
import { hasPerm, type Need } from "../authz/authz";

export type ActionKey =
  | "view"
  | "edit"
  | "resetPassword"
  | "assignEmployee"
  | "assignRoles"
  | "delete"
  | "public"
  | "void"
  | "draft";

export type ActionItem = {
  key: ActionKey;
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  need?: Need;
};

export function CommonActionMenu({
  items,
  onAction,
}: {
  items: ActionItem[];
  onAction: (key: ActionKey) => void;
}) {
  const { permissions, ready } = useCan();

  const allowedItems = useMemo(() => {
    if (!ready) return [];
    return items.filter((x) => !x.need || hasPerm({ permissions }, x.need));
  }, [items, permissions, ready]);

  const menuItems: MenuProps["items"] = allowedItems.map((x) => ({
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
      <Button
        size="small"
        icon={<MoreOutlined />}
        disabled={!ready || menuItems.length === 0}
      >
        Chức năng
      </Button>
    </Dropdown>
  );
}
