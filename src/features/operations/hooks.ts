import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { operationsApi, type PageParams } from "./api";

export const operationKeys = {
  all: ["operations"] as const,
  dashboard: ["operations", "dashboard"] as const,
  warehouseDashboard: (warehouseId?: string) =>
    ["operations", "warehouse-dashboard", warehouseId ?? "all"] as const,
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

export function useWarehouseDashboard(warehouseId?: string) {
  return useQuery({
    queryKey: operationKeys.warehouseDashboard(warehouseId),
    queryFn: () => operationsApi.warehouseDashboard(warehouseId),
    // Đổi kho thì giữ số cũ trên màn cho tới khi có số mới, tránh nháy về rỗng.
    placeholderData: (previous) => previous,
    // Kho là màn treo cả ca; tự làm mới để tồn không đứng yên sau mỗi phiếu.
    refetchInterval: 3 * 60 * 1000,
    refetchOnWindowFocus: true,
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
    | "commercialLotInventory"
    | "customerHeldInventory"
    | "expectedInventory"
    | "reservations"
    | "transfers"
    | "vehicles"
    | "drivers"
    | "salesTransportRequests"
    | "transportVehicleSettings"
    | "vehicleFuelLogs"
    | "vehicleMaintenanceExpenses"
    | "vehicleMonthlyFixedCosts"
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
    | "salesTransportRequest"
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
