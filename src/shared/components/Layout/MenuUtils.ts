import { hasPerm } from "../../authz/authz";
import { PermCode } from "../../authz/perms";
import { NavItem } from "./MenuConfig";

export function getAuthorizedMenu(
  items: NavItem[],
  userPermissions: Set<PermCode>
) {
  return items.reduce<any[]>((acc, item) => {
    if (
      item.need &&
      !hasPerm({ permissions: userPermissions }, item.need as PermCode)
    ) {
      return acc;
    }

    const visibleChildren = item.children
      ? getAuthorizedMenu(item.children, userPermissions)
      : undefined;

    if (item.children && (!visibleChildren || visibleChildren.length === 0)) {
      return acc;
    }

    const mappedItem: any = {
      key: item.key,
      icon: item.icon,
      label: item.label,
    };

    if (visibleChildren && visibleChildren.length > 0) {
      mappedItem.children = visibleChildren;
    }

    acc.push(mappedItem);
    return acc;
  }, []);
}
