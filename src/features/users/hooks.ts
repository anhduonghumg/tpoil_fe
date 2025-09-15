import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UsersApi } from "./api";
import type { User } from "./types";

export const useUsers = (filters: any) =>
  useQuery({
    queryKey: ["users", "list", filters],
    queryFn: () => UsersApi.list(filters),
    // keepPreviousData: true,
  });

export const useUserDetail = (id?: string) =>
  useQuery({
    queryKey: ["users", "detail", id],
    queryFn: () => UsersApi.detail(id!),
    enabled: !!id,
  });

export const useUpsertUser = (id?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<User>) =>
      id ? UsersApi.update(id, data) : UsersApi.create(data),
    onSuccess: (u: User) => {
      qc.invalidateQueries({ queryKey: ["users", "list"] });
      qc.setQueryData(["users", "detail", u.id], u);
    },
  });
};

export const useDeleteUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => UsersApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users", "list"] }),
  });
};

export const useDepartments = () =>
  useQuery({
    queryKey: ["meta", "departments"],
    queryFn: UsersApi.departments,
  });

export const useRoles = () =>
  useQuery({ queryKey: ["meta", "roles"], queryFn: UsersApi.roles });
