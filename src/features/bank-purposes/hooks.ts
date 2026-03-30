import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BankPurposesApi } from "./api";
import type {
  BankTransactionPurposeListQuery,
  UpsertBankTransactionPurposePayload,
} from "./types";
import { notify } from "../../shared/lib/notification";

export const bankPurposeKeys = {
  all: ["bank-purposes"] as const,
  list: (params: BankTransactionPurposeListQuery) =>
    ["bank-purposes", "list", params] as const,
  detail: (id: string) => ["bank-purposes", "detail", id] as const,
  options: ["bank-purposes", "options"] as const,
};

export function useBankPurposeList(params: BankTransactionPurposeListQuery) {
  return useQuery({
    queryKey: bankPurposeKeys.list(params),
    queryFn: () => BankPurposesApi.list(params),
  });
}

export function useAllBankPurposes() {
  return useQuery({
    queryKey: bankPurposeKeys.options,
    queryFn: () => BankPurposesApi.all(),
  });
}

export function useCreateBankPurpose() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpsertBankTransactionPurposePayload) =>
      BankPurposesApi.create(payload),
    onSuccess: () => {
      notify.success("Tạo mục đích giao dịch thành công");
      qc.invalidateQueries({ queryKey: bankPurposeKeys.all });
    },
  });
}

export function useUpdateBankPurpose() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<UpsertBankTransactionPurposePayload>;
    }) => BankPurposesApi.update(id, payload),
    onSuccess: (_, vars) => {
      notify.success("Cập nhật mục đích giao dịch thành công");
      qc.invalidateQueries({ queryKey: bankPurposeKeys.all });
      qc.invalidateQueries({ queryKey: bankPurposeKeys.detail(vars.id) });
    },
  });
}

export function useDeleteBankPurpose() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => BankPurposesApi.remove(id),
    onSuccess: () => {
      notify.success("Xóa mục đích giao dịch thành công");
      qc.invalidateQueries({ queryKey: bankPurposeKeys.all });
    },
  });
}
