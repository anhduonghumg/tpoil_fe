import type React from "react";
import { hasPerm, type Need } from "./authz";
import type { PermCode } from "./perms";

export type ActionItem = {
  key: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  need?: Need;
  danger?: boolean;
  disabled?: boolean;
};

export function filterActions(actions: ActionItem[], perms: Set<PermCode>) {
  return actions.filter(
    (a) => !a.need || hasPerm({ permissions: perms }, a.need)
  );
}
