import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notify } from "../../shared/lib/notification";
import { PlattsPricesApi } from "./api";
import type { PlattsPriceListQuery, UpsertPlattsQuotePayload } from "./types";

const qk = {
  list: (q: PlattsPriceListQuery) => ["platts-prices", "list", q] as const,
};

export function usePlattsPrices(q: PlattsPriceListQuery) {
  return useQuery({
    queryKey: qk.list(q),
    queryFn: () => PlattsPricesApi.list(q),
  });
}

export function useUpsertPlattsPrice(q: PlattsPriceListQuery) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: UpsertPlattsQuotePayload) =>
      PlattsPricesApi.upsert(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platts-prices"] });
    },
    onError: (e: any) => notify.error(e?.message || "Lưu giá Platts thất bại"),
  });
}

export function useDeletePlattsPrice() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => PlattsPricesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platts-prices"] });
    },
    onError: (e: any) => notify.error(e?.message || "Xóa giá Platts thất bại"),
  });
}
