// features/customer-groups/hooks.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CustomerGroupsApi } from "./api";
import type {
  CustomerGroupListQuery,
  CustomerGroupSelectQuery,
  CreateCustomerGroupDto,
  UpdateCustomerGroupDto,
} from "./types";

export const CUSTOMER_GROUP_QK = {
  list: (q: CustomerGroupListQuery) => ["customerGroups", "list", q] as const,
  detail: (id: string) => ["customerGroups", "detail", id] as const,
  select: (q: CustomerGroupSelectQuery) =>
    ["customerGroups", "select", q] as const,
};

export function useCustomerGroupList(q: CustomerGroupListQuery) {
  return useQuery({
    queryKey: CUSTOMER_GROUP_QK.list(q),
    queryFn: () => CustomerGroupsApi.list(q),
  });
}

export function useCustomerGroupDetail(id?: string) {
  return useQuery({
    queryKey: id
      ? CUSTOMER_GROUP_QK.detail(id)
      : ["customerGroups", "detail", "empty"],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;
      const res = await CustomerGroupsApi.detail(id);
      return res.data;
    },
  });
}

export function useCustomerGroupSelect(q: CustomerGroupSelectQuery) {
  return useQuery({
    queryKey: CUSTOMER_GROUP_QK.select(q),
    queryFn: () => CustomerGroupsApi.select(q),
    staleTime: 30_000,
  });
}

export function useCreateCustomerGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateCustomerGroupDto) => CustomerGroupsApi.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customerGroups"] });
    },
  });
}

export function useUpdateCustomerGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; dto: UpdateCustomerGroupDto }) =>
      CustomerGroupsApi.update(vars.id, vars.dto),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["customerGroups"] });
      qc.invalidateQueries({ queryKey: CUSTOMER_GROUP_QK.detail(vars.id) });
    },
  });
}

export function useDeleteCustomerGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => CustomerGroupsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customerGroups"] });
    },
  });
}
