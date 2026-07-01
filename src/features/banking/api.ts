import { apiCall } from "../../shared/lib/api";
import { ApiResponse } from "../../shared/lib/types";
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
  TermPaymentBatch,
  TermPaymentPendingRequest,
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

  confirmTransaction: (id: string, body: any) =>
    apiCall("banking.confirmTransaction", {
      params: { id },
      data: body,
    }).then((r) => r.data?.data ?? r.data),

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

  deleteTransaction: (id: string) =>
    apiCall<ApiResponse<{ success: boolean }>>("banking.deleteTransaction", {
      params: { id },
    }).then((r) => r.data!.data ?? (r.data as any)),

  deleteMultipleTransactions: (ids: string[]) =>
    apiCall<ApiResponse<{ success: boolean; count: number }>>(
      "banking.deleteMultipleTransactions",
      {
        data: { ids },
      },
    ).then((r) => r.data!.data ?? (r.data as any)),

  listTermPaymentPendingRequests: () =>
    apiCall<TermPaymentPendingRequest[]>("banking.termPaymentPendingRequests").then(
      (r) => r.data! ?? (r.data as any),
    ),

  listTermPaymentBatches: (query?: Record<string, unknown>) =>
    apiCall<{ items: TermPaymentBatch[]; total: number; page: number; pageSize: number }>(
      "banking.termPaymentBatches",
      { query },
    ).then((r) => r.data! ?? (r.data as any)),

  createTermPaymentBatch: (data: {
    paymentRequestIds: string[];
    bankAccountId?: string;
    batchDate?: string;
    note?: string;
  }) =>
    apiCall<TermPaymentBatch>("banking.createTermPaymentBatch", { data }).then(
      (r) => r.data! ?? (r.data as any),
    ),

  getTermPaymentBatchDetail: (id: string) =>
    apiCall<TermPaymentBatch>("banking.termPaymentBatchDetail", {
      params: { id },
    }).then((r) => r.data! ?? (r.data as any)),

  sendTermPaymentBatch: (id: string) =>
    apiCall<TermPaymentBatch>("banking.sendTermPaymentBatch", {
      params: { id },
    }).then((r) => r.data! ?? (r.data as any)),

  uploadTermPaymentBatchFile: (id: string, data: FormData) =>
    apiCall("banking.uploadTermPaymentBatchFile", {
      params: { id },
      data,
    }).then((r) => r.data?.data ?? r.data),

  matchTermPaymentBatchItem: (
    id: string,
    itemId: string,
    data: { bankTransactionId: string; paidAmountVnd?: number; status?: string; note?: string },
  ) =>
    apiCall("banking.matchTermPaymentBatchItem", {
      params: { id, itemId },
      data,
    }).then((r) => r.data?.data ?? r.data),
};
