import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UsersApi } from "./api";
import type { UsersListParams } from "./types";

export function useUsersList(params: UsersListParams) {
  return useQuery({
    queryKey: ["users", "list", params],
    queryFn: () => UsersApi.list(params).then((r: any) => r.data!.data),
  });
}

export function useUserDetail(userId?: string) {
  return useQuery({
    enabled: !!userId,
    queryKey: ["users", "detail", userId],
    queryFn: async () => {
      const res: any = await UsersApi.detail(userId!);
      return res.data; // theo chuẩn apiCall/axios của bạn
    },
  });
}

// export function useRolesAll() {
//   return useQuery({
//     queryKey: ["users", "roles"],
//     queryFn: () => UsersApi.roles().then((r: any) => r.data),
//     staleTime: 5 * 60 * 1000,
//   });
// }

export function useCreateUser() {
  return useMutation({
    mutationFn: async (payload: any) => {
      const res: any = await UsersApi.create(payload);
      return res.data;
    },
  });
}

export function useUpdateUser() {
  return useMutation({
    mutationFn: async (payload: { id: string } & any) => {
      const { id, ...data } = payload;
      const res: any = await UsersApi.update(id, data);
      return res.data;
    },
  });
}

export function useSetUserRoles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, roleIds }: { id: string; roleIds: string[] }) =>
      UsersApi.setRoles(id, roleIds).then((r: any) => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["users", "list"] });
      qc.invalidateQueries({ queryKey: ["users", "detail", vars.id] });
    },
  });
}

export function useSetUserEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      employeeId,
    }: {
      id: string;
      employeeId: string | null;
    }) => UsersApi.setEmployee(id, employeeId).then((r: any) => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["users", "list"] });
      qc.invalidateQueries({ queryKey: ["users", "detail", vars.id] });
    },
  });
}
