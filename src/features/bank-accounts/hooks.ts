import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BankAccountsApi } from "./api";
import type {
  BankAccountListQuery,
  UpsertBankAccountPayload,
  UUID,
} from "./types";
import { notify } from "../../shared/lib/notification";

export const bankAccountKeys = {
  all: ["bankAccounts"] as const,
  list: (query: BankAccountListQuery) =>
    ["bankAccounts", "list", query] as const,
  detail: (id: UUID) => ["bankAccounts", "detail", id] as const,
};

export function useBankAccounts(query: BankAccountListQuery) {
  return useQuery({
    queryKey: bankAccountKeys.list(query),
    queryFn: () => BankAccountsApi.list(query),
  });
}

export function useCreateBankAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertBankAccountPayload) =>
      BankAccountsApi.create(payload),
    onSuccess: () => {
      notify.success("Đã tạo tài khoản ngân hàng");
      qc.invalidateQueries({ queryKey: bankAccountKeys.all });
    },
  });
}

export function useUpdateBankAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: UUID;
      payload: UpsertBankAccountPayload;
    }) => BankAccountsApi.update(id, payload),
    onSuccess: () => {
      notify.success("Đã cập nhật tài khoản ngân hàng");
      qc.invalidateQueries({ queryKey: bankAccountKeys.all });
    },
  });
}
