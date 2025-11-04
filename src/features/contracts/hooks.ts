import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ContractsApi } from "./api";
import type { ContractListQuery, Contract } from "./types";

export const useContractList = (params: ContractListQuery) =>
  useQuery({
    queryKey: ["contracts", "list", params],
    queryFn: () => ContractsApi.list(params),
  });

export const useContract = (id?: string, enabled: boolean = true) =>
  useQuery({
    queryKey: ["contracts", "detail", id],
    queryFn: () => ContractsApi.detail(id!),
    enabled: !!id && enabled,
  });

export const useCreateContract = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Contract>) => ContractsApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contracts", "list"] }),
  });
};

export const useUpdateContract = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Contract>) =>
      ContractsApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contracts", "list"] });
      qc.invalidateQueries({ queryKey: ["contracts", "detail", id] });
    },
  });
};

export const useDeleteContract = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ContractsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contracts", "list"] }),
  });
};

export const useGenerateContractCode = () =>
  useMutation({
    mutationFn: (customerId: string) => ContractsApi.generateCode(customerId),
  });
