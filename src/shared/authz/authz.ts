import type { PermCode } from "./perms";

export type Need = PermCode | PermCode[] | ((ctx: AuthzContext) => boolean);

export type AuthzContext = {
  permissions: Set<PermCode>;
};

export function hasPerm(ctx: AuthzContext, need: Need): boolean {
  if (typeof need === "function") return need(ctx);
  const req = Array.isArray(need) ? need : [need];
  for (const p of req) {
    if (!ctx.permissions.has(p)) return false;
  }
  return true;
}
