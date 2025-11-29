// features/customers/hooks.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CustomersApi } from "./api";
import type { Customer, CustomerListQuery, CustomerOverview } from "./types";

export const useCustomerList = (params: CustomerListQuery) =>
  useQuery({
    queryKey: ["customers", "list", params],
    queryFn: () => CustomersApi.list(params),
  });

export const useCustomerDetail = (id?: string) =>
  useQuery({
    queryKey: ["customers", "detail", id],
    queryFn: () => CustomersApi.detail(id!),
    enabled: !!id,
  });

export const useCustomerOverview = (id?: string) =>
  useQuery<CustomerOverview>({
    queryKey: ["customers", "overview", id],
    queryFn: async () => {
      const res = await CustomersApi.overview(id!);
      return (res as any).data ?? res;
    },
    enabled: !!id,
  });

export const useCreateCustomer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: Partial<Customer>) => CustomersApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers", "list"] });
    },
  });
};

export const useUpdateCustomer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: Partial<Customer> & { id: string }) =>
      CustomersApi.update(d.id, d),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["customers", "list"] });
      qc.invalidateQueries({ queryKey: ["customers", "detail", vars.id] });
      qc.invalidateQueries({ queryKey: ["customers", "overview", vars.id] });
    },
  });
};

export const useDeleteCustomer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => CustomersApi.delete(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["customers", "list"] });
      qc.invalidateQueries({ queryKey: ["customers", "detail", id] });
      qc.invalidateQueries({ queryKey: ["customers", "overview", id] });
    },
  });
};

export const useGenerateCustomerCode = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => CustomersApi.generateCode(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers", "generateCode"] });
    },
  });
};

export const useCustomerContracts = (customerId: string) =>
  useQuery({
    queryKey: ["customers", "contracts", customerId],
    queryFn: () => CustomersApi.contracts(customerId),
    enabled: !!customerId,
  });

export const useAssignContracts = (customerId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contractIds: string[]) =>
      CustomersApi.assignContracts(customerId, contractIds),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["customers", "contracts", customerId],
      });
    },
  });
};

export const useUnassignContract = (customerId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contractId: string) =>
      CustomersApi.unassignContract(customerId, contractId),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["customers", "contracts", customerId],
      });
    },
  });
};
