import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ContractTypesApi } from "./api";
import type { ContractTypeListQuery, ContractType } from "./types";

export const useContractTypeList = (params: ContractTypeListQuery) =>
  useQuery({
    queryKey: ["contractTypes", "list", params],
    queryFn: () => ContractTypesApi.list(params),
  });

export const useContractType = (id?: string, enabled: boolean = true) =>
  useQuery({
    queryKey: ["contractTypes", "detail", id],
    queryFn: () => ContractTypesApi.detail(id!),
    enabled: !!id && enabled,
  });

export const useContractTypeALl = () => {
  useQuery({
    queryKey: ["contractTypes", "all"],
    queryFn: () => ContractTypesApi.all(),
  });
};

export const useCreateContractType = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<ContractType>) =>
      ContractTypesApi.create(payload),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["contractTypes", "list"] }),
        qc.invalidateQueries({ queryKey: ["lookups", "contractTypes"] }),
      ]);
    },
  });
};

export const useUpdateContractType = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<ContractType>) =>
      ContractTypesApi.update(id, payload),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["contractTypes", "list"] }),
        qc.invalidateQueries({ queryKey: ["contractTypes", "detail", id] }),
        qc.invalidateQueries({ queryKey: ["lookups", "contractTypes"] }),
      ]);
    },
  });
};

export const useDeleteContractType = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ContractTypesApi.delete(id),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["contractTypes", "list"] }),
        qc.invalidateQueries({ queryKey: ["lookups", "contractTypes"] }),
      ]);
    },
  });
};
