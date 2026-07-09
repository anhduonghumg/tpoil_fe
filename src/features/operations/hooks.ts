import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { operationsApi, type PageParams } from "./api";

export const operationKeys = {
  all: ["operations"] as const,
  dashboard: ["operations", "dashboard"] as const,
  list: (resource: string, params?: PageParams) =>
    ["operations", resource, params] as const,
  detail: (resource: string, id?: string) =>
    ["operations", resource, id] as const,
};

export function useOperationsDashboard() {
  return useQuery({
    queryKey: operationKeys.dashboard,
    queryFn: operationsApi.dashboard,
  });
}

export function useOperationList(
  resource:
    | "vessels"
    | "charterContracts"
    | "charterAppendices"
    | "charterOrders"
    | "freightRates"
    | "storageContracts"
    | "availability"
    | "matrix"
    | "expectedInventory"
    | "reservations"
    | "transfers"
    | "vehicles"
    | "drivers"
    | "dispatches",
  params?: PageParams
) {
  return useQuery({
    queryKey: operationKeys.list(resource, params),
    queryFn: () => (operationsApi[resource] as any)(params),
    placeholderData: (previous) => previous,
  });
}

export function useOperationDetail(
  resource:
    | "vessel"
    | "charterContract"
    | "charterOrder"
    | "storageContract"
    | "transfer"
    | "vehicle"
    | "driver"
    | "dispatch",
  id?: string
) {
  return useQuery({
    queryKey: operationKeys.detail(resource, id),
    queryFn: () => (operationsApi[resource] as any)(id),
    enabled: Boolean(id),
  });
}

export function useOperationMutation<T = any>(
  mutationFn: (variables: T) => Promise<unknown>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: operationKeys.all });
    },
  });
}
