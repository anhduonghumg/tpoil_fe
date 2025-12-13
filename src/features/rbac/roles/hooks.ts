// src/features/rbac/roles/hooks.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { rbacRolesApi } from "./api";
import type {
  RoleCreateInput,
  RoleDetail,
  RolesListQuery,
  RoleUpdateInput,
} from "./types";

const qk = {
  roles: ["rbac", "roles"] as const,
  roleDetail: (id: string) => ["rbac", "roles", "detail", id] as const,
};

export function useRolesList(query: RolesListQuery) {
  return useQuery({
    queryKey: ["rbac", "roles", "list", query],
    queryFn: () => rbacRolesApi.getRoles(query),
  });
}

export const useRoleDetail = (id?: string) => {
  return useQuery<RoleDetail>({
    queryKey: id ? qk.roleDetail(id) : ["rbac", "roles", "detail", "empty"],
    queryFn: () => {
      if (!id) throw new Error("Missing role id");
      return rbacRolesApi.getRoleDetail(id);
    },
    enabled: !!id,
  });
};

export const useUpdateRolePermissions = (roleId: string | undefined) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (permissionIds: string[]) => {
      if (!roleId) throw new Error("Missing role id");
      return rbacRolesApi.updateRolePermissions(roleId, permissionIds);
    },
    onSuccess: async () => {
      if (!roleId) return;
      await Promise.all([
        qc.invalidateQueries({ queryKey: qk.roleDetail(roleId) }),
        qc.invalidateQueries({ queryKey: qk.roles }),
      ]);
    },
  });
};

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: RoleCreateInput) => rbacRolesApi.createRole(data),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["rbac", "roles", "list"] });
    },
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; data: RoleUpdateInput }) =>
      rbacRolesApi.updateRole(args.id, args.data),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["rbac", "roles", "list"] });
    },
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rbacRolesApi.deleteRole(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["rbac", "roles", "list"] });
    },
  });
}
