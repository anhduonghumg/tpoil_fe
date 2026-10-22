import { apiCall } from "../../shared/lib/api";
import { ApiResponse } from "../../shared/lib/types";
import type {
  SupplierLocation,
  SupplierLocationListQuery,
  SupplierLocationListResult,
  CreateSupplierLocationPayload,
  UpdateSupplierLocationPayload,
  SupplierOption,
  SupplierOptionsResult,
  BatchUpdateSupplierLocationPayload,
  CreateWarehouseAreaPayload,
  WarehouseArea,
  WarehouseLossRateRow,
  SaveWarehouseLossRateItem,
} from "./types";

export const SupplierLocationsApi = {
  lossRates: () =>
    apiCall<ApiResponse<WarehouseLossRateRow[]>>("supplierLocations.lossRates").then((r) => r.data!.data),

  saveLossRates: (items: SaveWarehouseLossRateItem[]) =>
    apiCall<ApiResponse<WarehouseLossRateRow[]>>("supplierLocations.saveLossRates", { data: { items } }).then(
      (r) => r.data!.data,
    ),

  areas: (isActive?: boolean) =>
    apiCall<ApiResponse<WarehouseArea[]>>("supplierLocations.areas", {
      query: isActive === undefined ? undefined : { isActive: String(isActive) },
    }).then((r) => r.data!.data),

  createArea: (data: CreateWarehouseAreaPayload) =>
    apiCall<ApiResponse<WarehouseArea>>("supplierLocations.createArea", { data })
      .then((r) => r.data!.data),

  list: (query: SupplierLocationListQuery) =>
    apiCall<ApiResponse<SupplierLocationListResult>>("supplierLocations.list", {
      query: {
        ...query,
        isActive:
          query.isActive === undefined ? undefined : String(query.isActive),
      } as any,
    }).then((r) => r.data!.data),

  detail: (id: string) =>
    apiCall<ApiResponse<SupplierLocation>>("supplierLocations.detail", {
      params: { id },
    }).then((r) => r.data!.data),

  create: (data: CreateSupplierLocationPayload) =>
    apiCall<
      ApiResponse<{
        createdCount: number;
        skippedCount: number;
        skippedSupplierIds: string[];
      }>
    >("supplierLocations.create", { data }).then((r) => r.data!.data),

  update: (id: string, data: UpdateSupplierLocationPayload) =>
    apiCall<ApiResponse<SupplierLocation>>("supplierLocations.update", {
      params: { id },
      data,
    }).then((r) => r.data!.data),

  batchUpdate: (id: string, data: BatchUpdateSupplierLocationPayload) =>
    apiCall<ApiResponse<SupplierLocation[]>>("supplierLocations.batchUpdate", {
      params: { id },
      data,
    }).then((r) => (r.data!.data ?? r.data) as any),

  deactivate: (id: string) =>
    apiCall<ApiResponse<SupplierLocation>>("supplierLocations.deactivate", {
      params: { id },
    }).then((r) => r.data!.data),

  activate: (id: string) =>
    apiCall<ApiResponse<SupplierLocation>>("supplierLocations.activate", {
      params: { id },
    }).then((r) => r.data!.data),

  suppliersSelect: (keyword = "") =>
    apiCall<ApiResponse<SupplierOptionsResult>>("customer.select", {
      query: {
        keyword: keyword,
        page: 1,
        pageSize: 100,
        role: "SUPPLIER",
      },
    }).then((r) => r.data!.data ?? { items: [] }),

  /** Kho đối tác có thể do NCC vận hành khi nhập hoặc khách hàng vận hành khi bán. */
  operatorPartiesSelect: async (keyword = "") => {
    const load = (role: "SUPPLIER" | "CUSTOMER") =>
      apiCall<ApiResponse<SupplierOptionsResult>>("customer.select", {
        query: { keyword, page: 1, pageSize: 100, role },
      }).then((r) => r.data!.data ?? { items: [] });

    const [suppliers, customers] = await Promise.all([load("SUPPLIER"), load("CUSTOMER")]);
    const byId = new Map<string, SupplierOption>();
    for (const item of suppliers.items ?? []) {
      byId.set(item.id, { ...item, operatorType: "SUPPLIER" });
    }
    for (const item of customers.items ?? []) {
      const previous = byId.get(item.id);
      byId.set(item.id, {
        ...item,
        operatorType: previous?.operatorType ?? "CUSTOMER",
      });
    }
    return { items: Array.from(byId.values()) };
  },
};
