import { apiCall } from "../../shared/lib/api";
import type {
  BankImportDetail,
  BankImportPreviewResponse,
  BankImportTemplateOption,
  BankTransactionItem,
  BankTransactionListQuery,
  CommitBankImportPayload,
  ConfirmBankTransactionPayload,
  MatchSuggestionResponse,
  Paged,
  PreviewBankImportPayload,
} from "./types";

export const BankingApi = {
  listTransactions: (query: BankTransactionListQuery) =>
    apiCall<Paged<BankTransactionItem>>("banking.transactions", {
      query,
    }).then((r) => r.data!.data ?? (r.data as any)),

  getTransactionDetail: (id: string) =>
    apiCall<BankTransactionItem>("banking.transactionDetail", {
      params: { id },
    }).then((r) => r.data! ?? (r.data as any)),

  getSuggestions: (id: string) =>
    apiCall<MatchSuggestionResponse>("banking.transactionSuggestions", {
      params: { id },
    }).then((r) => r.data! ?? (r.data as any)),

  confirmTransaction: (id: string, body: ConfirmBankTransactionPayload) =>
    apiCall<BankTransactionItem>("banking.confirmTransaction", {
      params: { id },
      data: body,
    }).then((r) => r.data! ?? (r.data as any)),

  listTemplates: (bankCode?: string) =>
    apiCall<BankImportTemplateOption[]>("banking.templates", {
      query: bankCode ? { bankCode } : {},
    }).then((r) => r.data! ?? (r.data as any)),

  getImportDetail: (id: string) =>
    apiCall<BankImportDetail>("banking.importDetail", {
      params: { id },
    }).then((r) => r.data! ?? (r.data as any)),

  previewImport: async (payload: PreviewBankImportPayload) => {
    const form = new FormData();
    form.append("file", payload.file);
    form.append("bankAccountId", payload.bankAccountId);
    if (payload.templateId) form.append("templateId", payload.templateId);

    const res = await apiCall<BankImportPreviewResponse>(
      "banking.importPreview",
      {
        data: form,
      },
    );
    return res.data! ?? (res.data as any);
  },

  commitImport: (body: CommitBankImportPayload) =>
    apiCall<BankImportDetail>("banking.importCommit", {
      data: body,
    }).then((r) => r.data! ?? (r.data as any)),
};
