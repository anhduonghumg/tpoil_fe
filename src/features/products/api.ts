import { apiCall } from "../../shared/lib/api";
import { ApiResponse, Paged } from "../../shared/lib/types";
import type {
  Product,
  ProductListQuery,
  ProductOption,
  ProductUpsertPayload,
} from "./types";

export const ProductsApi = {
  list: (query: ProductListQuery) =>
    apiCall<ApiResponse<Paged<Product>>>("products.list", {
      query,
    }).then((r) => r.data!.data),

  detail: (id: string) =>
    apiCall<ApiResponse<Product>>("products.detail", {
      params: { id },
    }).then((r) => (r.data!.data ?? r.data) as any),

  create: (data: ProductUpsertPayload) =>
    apiCall<ApiResponse<Product>>("products.create", {
      data,
    }).then((r) => (r.data!.data ?? r.data) as any),

  update: (id: string, data: ProductUpsertPayload) =>
    apiCall<ApiResponse<Product>>("products.update", {
      params: { id },
      data,
    }).then((r) => (r.data!.data ?? r.data) as any),

  select: (keyword = "") =>
    apiCall<ApiResponse<ProductOption[]>>("products.select", {
      query: { keyword },
    }).then((r) => r.data!.data ?? []),
};
