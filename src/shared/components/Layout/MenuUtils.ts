import { hasPerm } from "../../authz/authz";
import { PERMS, PermCode } from "../../authz/perms";
import { NavItem } from "./MenuConfig";

export function getAuthorizedMenu(
  items: NavItem[],
  userPermissions: Set<PermCode>
) {
  return items.reduce<any[]>((acc, item) => {
    const isAdmin = userPermissions.has(PERMS.SYSTEM_RBAC_ADMIN);
    if (
      !isAdmin &&
      item.need &&
      !hasPerm({ permissions: userPermissions }, item.need as PermCode | PermCode[])
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

    // Tiêu đề mục phải giữ nguyên type, nếu không AntD dựng nó thành item bấm được.
    if (item.type) {
      mappedItem.type = item.type;
    }

    if (visibleChildren && visibleChildren.length > 0) {
      mappedItem.children = visibleChildren;
    }

    acc.push(mappedItem);
    return acc;
  }, []);
}
