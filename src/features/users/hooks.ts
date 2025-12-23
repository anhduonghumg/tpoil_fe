import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UsersApi } from "./api";
import { ApiResponse } from "../../shared/lib/types";

export function useUsersList(params: {
  page: number;
  pageSize: number;
  keyword?: string;
}) {
  return useQuery({
    queryKey: ["users", "list", params],
    queryFn: async () => {
      const res = await UsersApi.list(params);
      return (res.data as ApiResponse<any>).data;
    },
    staleTime: 30_000,
  });
}

export function useUserDetail(userId?: string) {
  return useQuery({
    enabled: !!userId,
    queryKey: ["users", "detail", userId],
    queryFn: async () => {
      const res = await UsersApi.detail(userId!);
      return (res.data as ApiResponse<any>).data;
    },
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const res: any = await UsersApi.create(payload);
      return res.data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["users", "list"] });
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string } & any) => {
      const { id, ...data } = payload;
      const res: any = await UsersApi.update(id, data);
      return res.data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["users", "list"] });
      await qc.invalidateQueries({ queryKey: ["users", "detail"] });
    },
  });
}

export function useSetUserRoles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; roleIds: string[] }) => {
      const res = await UsersApi.setRoles(p.id, p.roleIds);
      return (res.data as ApiResponse<any>).data;
    },
    onSuccess: async (res, vars) => {
      await qc.invalidateQueries({ queryKey: ["users", "list"], exact: false });
      await qc.invalidateQueries({ queryKey: ["users", "detail", vars.id] });
      await qc.refetchQueries({ queryKey: ["users", "detail", vars.id] });
    },
  });
}

export function useSetUserEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; employeeId: string | null }) => {
      const res = await UsersApi.setEmployee(p.id, p.employeeId);
      return (res.data as ApiResponse<any>).data;
    },
    onSuccess: async (_res, vars) => {
      await qc.invalidateQueries({ queryKey: ["users", "list"], exact: false });
      await qc.invalidateQueries({ queryKey: ["users", "detail", vars.id] });
      await qc.refetchQueries({ queryKey: ["users", "detail", vars.id] });
    },
  });
}

export function useResetUserPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; password: string }) => {
      const res = await UsersApi.resetPassword(p.id, p.password);
      return (res.data as ApiResponse<any>).data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["users", "list"] });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await UsersApi.delete(id);
      return (res.data as ApiResponse<any>).data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["users", "list"] });
    },
  });
}
