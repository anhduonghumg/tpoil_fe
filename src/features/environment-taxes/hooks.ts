import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notify } from "../../shared/lib/notification";
import { EnvironmentTaxesApi } from "./api";
import type {
  EnvironmentTaxListQuery,
  UpsertEnvironmentTaxPayload,
} from "./types";

const qk = {
  all: ["environment-taxes"] as const,
  list: (q: EnvironmentTaxListQuery) =>
    ["environment-taxes", "list", q] as const,
};

export function useEnvironmentTaxes(q: EnvironmentTaxListQuery) {
  return useQuery({
    queryKey: qk.list(q),
    queryFn: () => EnvironmentTaxesApi.list(q),
  });
}

export function useCreateEnvironmentTax() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: UpsertEnvironmentTaxPayload) =>
      EnvironmentTaxesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.all });
    },
    onError: (e: any) => notify.error(e?.message || "Tạo phí BVMT thất bại"),
  });
}

export function useUpdateEnvironmentTax() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<UpsertEnvironmentTaxPayload>;
    }) => EnvironmentTaxesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.all });
    },
    onError: (e: any) =>
      notify.error(e?.message || "Cập nhật phí BVMT thất bại"),
  });
}

export function useDeleteEnvironmentTax() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => EnvironmentTaxesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.all });
    },
    onError: (e: any) => notify.error(e?.message || "Xóa phí BVMT thất bại"),
  });
}
