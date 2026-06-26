import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notify } from "../../shared/lib/notification";
import { VcbRatesApi } from "./api";
import type {
  FetchVcbFxRatePayload,
  UpsertVcbFxRatePayload,
  VcbFxRateListQuery,
} from "./types";

const qk = {
  all: ["vcb-rates"] as const,
  list: (q: VcbFxRateListQuery) => ["vcb-rates", "list", q] as const,
};

export function useVcbRates(q: VcbFxRateListQuery) {
  return useQuery({
    queryKey: qk.list(q),
    queryFn: () => VcbRatesApi.list(q),
  });
}

export function useUpsertVcbRate() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: UpsertVcbFxRatePayload) => VcbRatesApi.upsert(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.all });
    },
    onError: (e: any) => notify.error(e?.message || "Lưu tỷ giá VCB thất bại"),
  });
}

export function useFetchVcbRateFromVcb() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: FetchVcbFxRatePayload) => VcbRatesApi.fetchFromVcb(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.all });
    },
    onError: (e: any) =>
      notify.error(e?.message || "Lấy tỷ giá từ VCB thất bại"),
  });
}

export function useDeleteVcbRate() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => VcbRatesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.all });
    },
    onError: (e: any) => notify.error(e?.message || "Xóa tỷ giá VCB thất bại"),
  });
}
