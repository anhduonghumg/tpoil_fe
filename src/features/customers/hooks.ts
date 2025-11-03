import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CustListQuery, Customer } from "./types";
import { CustomersApi } from "./api";

export const useCustList = (params: CustListQuery) =>
  useQuery({
    queryKey: ["customers", "list", params],
    queryFn: () => CustomersApi.list(params),
  });

export const useCustomer = (id?: string) =>
  useQuery({
    queryKey: ["customers", "detail", id],
    queryFn: () => CustomersApi.detail(id!),
    enabled: !!id,
  });

export const useCreateCustomer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Customer>) => CustomersApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers", "list"] }),
  });
};

export const useUpdateCustomer = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Customer>) =>
      CustomersApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers", "list"] });
      qc.invalidateQueries({ queryKey: ["customers", "detail", id] });
    },
  });
};

export const useDeleteCustomer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => CustomersApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers", "list"] }),
  });
};

export const useGenerateCustomerCode = (id?: string) =>
  useMutation({ mutationFn: () => CustomersApi.generateCode(id) });
