import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BankingApi } from "./api";
import type {
  BankTransactionItem,
  BankTransactionListQuery,
  CommitBankImportPayload,
  ConfirmBankTransactionPayload,
  Paged,
  PreviewBankImportPayload,
} from "./types";

export const bankingKeys = {
  all: ["banking"] as const,
  transactions: (query: BankTransactionListQuery) =>
    ["banking", "transactions", query] as const,
  transactionDetail: (id?: string) =>
    ["banking", "transaction-detail", id] as const,
  suggestions: (id?: string) =>
    ["banking", "transaction-suggestions", id] as const,
  templates: (bankCode?: string) =>
    ["banking", "templates", bankCode || "all"] as const,
  importDetail: (id?: string) => ["banking", "import-detail", id] as const,
};

export function useBankTransactions(query: BankTransactionListQuery) {
  return useQuery<BankTransactionItem[]>({
    queryKey: bankingKeys.transactions(query),
    queryFn: () => BankingApi.listTransactions(query),
  });
}

export function useBankTransactionDetail(id?: string, enabled = true) {
  return useQuery({
    queryKey: bankingKeys.transactionDetail(id),
    queryFn: () => BankingApi.getTransactionDetail(id!),
    enabled: !!id && enabled,
  });
}

export function useBankTransactionSuggestions(id?: string, enabled = true) {
  return useQuery({
    queryKey: bankingKeys.suggestions(id),
    queryFn: () => BankingApi.getSuggestions(id!),
    enabled: !!id && enabled,
  });
}

export function useBankTemplates(bankCode?: string) {
  return useQuery({
    queryKey: bankingKeys.templates(bankCode),
    queryFn: () => BankingApi.listTemplates(bankCode),
  });
}

export function useImportDetail(id?: string, enabled = true) {
  return useQuery({
    queryKey: bankingKeys.importDetail(id),
    queryFn: () => BankingApi.getImportDetail(id!),
    enabled: !!id && enabled,
  });
}

export function usePreviewBankImport() {
  return useMutation({
    mutationFn: (payload: PreviewBankImportPayload) =>
      BankingApi.previewImport(payload),
  });
}

export function useCommitBankImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CommitBankImportPayload) =>
      BankingApi.commitImport(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["banking", "transactions"] });
    },
  });
}

export function useConfirmBankTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: ConfirmBankTransactionPayload;
    }) => BankingApi.confirmTransaction(id, body),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["banking", "transactions"] });
      qc.invalidateQueries({
        queryKey: bankingKeys.transactionDetail(vars.id),
      });
      qc.invalidateQueries({
        queryKey: bankingKeys.suggestions(vars.id),
      });
    },
  });
}
