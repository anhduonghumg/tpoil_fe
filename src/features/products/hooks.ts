import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ProductsApi } from "./api";
import type { ProductListQuery, ProductUpsertPayload } from "./types";
import { notify } from "../../shared/lib/notification";

const qk = {
  list: (q: ProductListQuery) => ["products", "list", q] as const,
  select: (keyword: string) => ["products", "select", keyword] as const,
};

export function useProductList(q: ProductListQuery) {
  return useQuery({
    queryKey: qk.list(q),
    queryFn: () => ProductsApi.list(q),
  });
}

export function useProductSelect(keyword: string) {
  return useQuery({
    queryKey: qk.select(keyword),
    queryFn: () => ProductsApi.select(keyword),
    enabled: keyword !== null,
    staleTime: 5 * 60_000,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ProductUpsertPayload) => ProductsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: any) => notify.error(e?.message || "Tạo sản phẩm thất bại"),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; data: ProductUpsertPayload }) =>
      ProductsApi.update(vars.id, vars.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: any) =>
      notify.error(e?.message || "Cập nhật sản phẩm thất bại"),
  });
}
