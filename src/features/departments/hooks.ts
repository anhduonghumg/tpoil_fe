import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DepartmentsApi } from "./api";
import type { DeptListQuery, Department } from "./types";

export const useDeptList = (params: DeptListQuery) =>
  useQuery({
    queryKey: ["departments", "list", params],
    queryFn: () => DepartmentsApi.list(params).then((r) => r.data!),
  });

export const useAllDepts = () =>
  useQuery({
    queryKey: ["departments", "all"],
    queryFn: () => DepartmentsApi.all().then((r) => r.data!),
  });

export const useDeptTree = () =>
  useQuery({
    queryKey: ["departments", "tree"],
    queryFn: () => DepartmentsApi.tree().then((r) => r.data!),
  });

export const useDeptDetail = (id?: string) =>
  useQuery({
    queryKey: ["departments", "detail", id],
    queryFn: () => DepartmentsApi.detail(id!).then((r) => r.data!),
    enabled: !!id,
  });

export const useCreateDept = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: Partial<Department>) => DepartmentsApi.create(p),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["departments", "list"] });
      qc.invalidateQueries({ queryKey: ["departments", "tree"] });
    },
    onError: (error: any) => {
      return Promise.reject(error);
    },
  });
};

export const useUpdateDept = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: Partial<Department>) =>
      DepartmentsApi.update(id, p).then((r) => r.data!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departments", "list"] });
      qc.invalidateQueries({ queryKey: ["departments", "tree"] });
      qc.invalidateQueries({ queryKey: ["departments", "detail", id] });
    },
  });
};

export const useSoftDeleteDept = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; byUserId?: string }) =>
      DepartmentsApi.remove(args.id, args.byUserId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departments", "list"] });
      qc.invalidateQueries({ queryKey: ["departments", "tree"] });
    },
  });
};

export const useSiteList = () =>
  useQuery({
    queryKey: ["departments", "sites"],
    queryFn: () => DepartmentsApi.sites().then((r) => r.data!),
  });
