import type { PermCode } from "./perms";

export type Need = PermCode | PermCode[] | ((ctx: AuthzContext) => boolean);

export type AuthzContext = {
  permissions: Set<PermCode>;
};

/**
 * Quản trị hệ thống đi qua mọi cửa — giống hệt PermissionsGuard ở backend. Thiếu chỗ này
 * thì admin bị FE giấu nút trong khi backend vẫn cho gọi, và mỗi lần thêm quyền mới là
 * một lần admin tưởng chức năng bị hỏng.
 */
const SYSTEM_ADMIN: PermCode = "system.rbac.admin";

export function hasPerm(ctx: AuthzContext, need: Need): boolean {
  if (ctx.permissions.has(SYSTEM_ADMIN)) return true;
  if (typeof need === "function") return need(ctx);
  const req = Array.isArray(need) ? need : [need];
  for (const p of req) {
    if (!ctx.permissions.has(p)) return false;
  }
  return true;
}
