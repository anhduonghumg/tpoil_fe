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
import { apiCall } from "../../shared/lib/api";
import { notify } from "../../shared/lib/notification";

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

export function useBankAccountsOptions() {
  return useQuery({
    queryKey: ["bankAccounts", "options"],
    queryFn: () =>
      apiCall<any>("bankAccounts.list").then((r) => r.data?.data ?? []),
  });
}

export function useBankTemplatesOptions(bankCode?: string) {
  return useQuery({
    queryKey: ["bankTemplates", bankCode],
    queryFn: () =>
      apiCall<any>("banking.templates", {
        query: { bankCode },
      }).then((r) => r.data?.data ?? []),
    enabled: !!bankCode,
  });
}

export function useBulkQuickMatchBankTransactions() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const results: {
        successIds: string[];
        skipped: Array<{ id: string; reason: string }>;
        failed: Array<{ id: string; reason: string }>;
      } = {
        successIds: [],
        skipped: [],
        failed: [],
      };

      for (const id of ids) {
        try {
          const res = await BankingApi.getSuggestions(id);

          const payload = res?.data ?? res;
          const txn = payload?.transaction;
          const suggestions = payload?.suggestions ?? [];

          // console.log("bulk quick match payload", { id, payload });

          if (!txn) {
            results.skipped.push({ id, reason: "Không có dữ liệu giao dịch" });
            continue;
          }

          if (txn.direction !== "OUT") {
            results.skipped.push({ id, reason: "Chỉ hỗ trợ giao dịch chi" });
            continue;
          }

          const txnRemain = Number(txn.remainingAmount ?? txn.amount ?? 0);

          if (txnRemain <= 0) {
            results.skipped.push({
              id,
              reason: "Giao dịch không còn số tiền để phân bổ",
            });
            continue;
          }

          if (!suggestions.length) {
            results.skipped.push({ id, reason: "Không có gợi ý phù hợp" });
            continue;
          }

          const best = [...suggestions].sort((a, b) => {
            if (a.matchedBy !== b.matchedBy) {
              return a.matchedBy === "DOCUMENT_CODE" ? -1 : 1;
            }
            return b.score - a.score;
          })[0];

          // console.log("bulk quick match best", { id, txn, best });

          if (!best) {
            results.skipped.push({
              id,
              reason: "Không tìm được gợi ý tốt nhất",
            });
            continue;
          }

          // hiện tại chỉ auto confirm khi có settlement thật
          if (!best.settlementId) {
            results.skipped.push({
              id,
              reason: "Gợi ý chưa có settlement để xác nhận tự động",
            });
            continue;
          }

          const settlementRemain = Number(best.remainingAmount || 0);
          const suggested = Number(best.suggestedAllocatedAmount || 0);

          const allocatedAmount =
            suggested > 0
              ? Math.min(suggested, txnRemain, settlementRemain)
              : Math.min(txnRemain, settlementRemain);

          const isSafe =
            best.score >= 80 &&
            allocatedAmount > 0 &&
            best.matchedBy === "DOCUMENT_CODE";

          if (!isSafe) {
            results.skipped.push({
              id,
              reason: `Bỏ qua do chưa đủ độ tin cậy (matchedBy=${best.matchedBy}, score=${best.score})`,
            });
            continue;
          }

          // console.log("CONFIRM", {
          //   id,
          //   settlementId: best.settlementId,
          //   allocatedAmount,
          //   score: best.score,
          // });

          await BankingApi.confirmTransaction(id, {
            allocations: [
              {
                settlementId: best.settlementId,
                allocatedAmount,
                score: best.score,
                isAuto: true,
                sortOrder: 0,
              },
            ],
          });

          results.successIds.push(id);
        } catch (e: any) {
          // console.error("bulk quick match failed", { id, error: e });
          results.failed.push({
            id,
            reason: e?.message || "Bulk match thất bại",
          });
        }
      }

      return results;
    },

    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: bankingKeys.all });

      const ok = res.successIds.length;
      const skipped = res.skipped.length;
      const failed = res.failed.length;

      if (ok > 0) {
        notify.success(`Đã khớp nhanh ${ok} giao dịch`);
      }
      if (skipped > 0) {
        notify.warning(`Bỏ qua ${skipped} giao dịch chưa đủ điều kiện`);
      }
      if (failed > 0) {
        notify.error(`Có ${failed} giao dịch khớp thất bại`);
      }

      console.log("bulk quick match result", res);
    },
  });
}

export function useDeleteBankTransaction() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => BankingApi.deleteTransaction(id),
    onSuccess: () => {
      notify.success("Xóa giao dịch thành công");
      qc.invalidateQueries({ queryKey: ["banking"] });
    },
  });
}

export function useDeleteMultipleBankTransactions() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => BankingApi.deleteMultipleTransactions(ids),
    onSuccess: (res) => {
      notify.success(`Đã xóa ${res.count} giao dịch`);
      qc.invalidateQueries({ queryKey: ["banking"] });
    },
  });
}
