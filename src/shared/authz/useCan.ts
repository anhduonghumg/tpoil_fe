// shared/authz/useCan.ts
import { useAppSession } from "./AppSessionProvider";
import { hasPerm, type Need } from "./authz";

export function useCan() {
  const { ready, permissions, permList } = useAppSession();
  return {
    ready,
    raw: permList,
    permissions,
    can: (need: Need) => ready && hasPerm({ permissions }, need),
  };
}
