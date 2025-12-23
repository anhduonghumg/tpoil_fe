import { hasPerm } from "../../authz/authz";
import { PermCode } from "../../authz/perms";
import { NavItem } from "./MenuConfig";

export function getAuthorizedMenu(
  items: NavItem[],
  userPermissions: Set<PermCode>
): any[] {
  return items.reduce((acc: any[], item: any) => {
    if (item.need && !hasPerm({ permissions: userPermissions }, item.need)) {
      return acc;
    }

    const mappedItem: any = {
      key: item.key,
      icon: item.icon,
      label: item.label,
    };

    if (item.children) {
      const visibleChildren = getAuthorizedMenu(item.children, userPermissions);
      if (visibleChildren.length > 0) {
        mappedItem.children = visibleChildren;
      } else {
        delete mappedItem.children;
      }
    }

    acc.push(mappedItem);
    return acc;
  }, []);
}
