import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UsersApi } from "./api";
import type { User } from "./types";

export const useUsers = (filters: any) =>
  useQuery({
    queryKey: ["employees", "list", filters],
    queryFn: () => UsersApi.list(filters),
    // keepPreviousData: true,
  });

export function useUserDetail(id?: string, enabled = true) {
  return useQuery({
    queryKey: ["employees", "detail", id],
    queryFn: () => UsersApi.detail(id!),
    enabled: !!id && enabled,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<User>) => UsersApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees", "list"] });
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<User> }) =>
      UsersApi.update(id, payload),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ["employees", "list"] });
      qc.invalidateQueries({ queryKey: ["employees", "detail", vars.id] });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => UsersApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees", "list"] }),
  });
}

export function useDeleteManyUsers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => UsersApi.deleteMany(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees", "list"] }),
  });
}

export const useDepartments = () =>
  useQuery({
    queryKey: ["meta", "departments"],
    queryFn: UsersApi.departments,
  });

export const useRoles = () =>
  useQuery({ queryKey: ["meta", "roles"], queryFn: UsersApi.roles });

export const useLeaders = () =>
  useQuery({
    queryKey: ["employees", "roles"],
    queryFn: UsersApi.roles,
  });

export const useBirthday = (month: number) =>
  useQuery({
    queryKey: ["employees", "birthdays", month],
    queryFn: () => UsersApi.birthdays(month),
    staleTime: 1000 * 60 * 60 * 24,
    gcTime: 1000 * 60 * 60 * 24,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
