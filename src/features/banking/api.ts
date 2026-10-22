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
  CreateManualBankTransactionPayload,
  MatchSuggestionResponse,
  Paged,
  PreviewBankImportPayload,
  TermPaymentBatch,
  TermPaymentPendingRequest,
  GeneralPaymentRequest,
  GeneralPaymentReconciliationQueueItem,
  GeneralPaymentReconciliation,
  BankTransactionRecognition,
  PaymentPlanRequest,
  SavePaymentPlanPayload,
} from "./types";

const unwrap = (r: any) => r.data?.data ?? r.data;

export const BankingApi = {
  listPaymentPlanRequests: () =>
    apiCall<PaymentPlanRequest[]>("paymentPlans.list").then((r) => (unwrap(r) ?? []) as PaymentPlanRequest[]),

  savePaymentPlan: (requestId: string, data: SavePaymentPlanPayload) =>
    apiCall<PaymentPlanRequest>("paymentPlans.save", { params: { requestId }, data }).then(unwrap),

  paymentPlanAction: (
    requestId: string,
    action: "submit" | "approve" | "reject" | "revise" | "return",
    data: { note?: string; reason?: string } = {},
  ) => apiCall<PaymentPlanRequest>(`paymentPlans.${action}`, { params: { requestId }, data }).then(unwrap),

  /* Giải ngân về tài khoản công ty: gắn dòng tiền vào trên sao kê với đợt giải ngân. */
  linkPlanDisbursement: (lineId: string, bankTransactionId: string) =>
    apiCall<PaymentPlanRequest>("paymentPlans.linkDisbursement", { params: { lineId }, data: { bankTransactionId } }).then(unwrap),

  unlinkPlanDisbursement: (lineId: string) =>
    apiCall<PaymentPlanRequest>("paymentPlans.unlinkDisbursement", { params: { lineId } }).then(unwrap),

  listGeneralPaymentRequests: () =>
    apiCall<GeneralPaymentRequest[]>("generalPaymentRequests.list").then(
      (r) => (r.data as any)?.data ?? r.data ?? [],
    ),

  createGeneralPaymentRequest: (data: Record<string, unknown>) =>
    apiCall<GeneralPaymentRequest>("generalPaymentRequests.create", { data }).then(
      (r) => (r.data as any)?.data ?? r.data,
    ),

  generalPaymentRequestAction: (
    id: string,
    action: "approve" | "reject" | "bankVerify" | "bankReturn" | "resubmit",
    data: Record<string, unknown> = {},
  ) =>
    apiCall<GeneralPaymentRequest>(`generalPaymentRequests.${action}`, {
      params: { id },
      data,
    }).then((r) => (r.data as any)?.data ?? r.data),

  recordGeneralPayment: (id: string, data: Record<string, unknown>) =>
    apiCall<GeneralPaymentRequest>("generalPaymentRequests.recordPayment", {
      params: { id },
      data,
    }).then((r) => (r.data as any)?.data ?? r.data),

  getGeneralPaymentReconciliationQueue: () =>
    apiCall<GeneralPaymentReconciliationQueueItem[]>("generalPaymentRequests.reconciliationQueue").then(
      (r) => (r.data as any)?.data ?? r.data ?? [],
    ),

  reconcileGeneralPayment: (bankTransactionId: string, paymentId: string) =>
    apiCall("generalPaymentRequests.reconcile", {
      params: { bankTransactionId },
      data: { paymentId },
    }).then((r) => (r.data as any)?.data ?? r.data),

  getRecentGeneralPaymentReconciliations: () =>
    apiCall<GeneralPaymentReconciliation[]>("generalPaymentRequests.recentReconciliations").then(
      (r) => (r.data as any)?.data ?? r.data ?? [],
    ),

  reverseGeneralPaymentReconciliation: (reconciliationId: string, reason: string) =>
    apiCall("generalPaymentRequests.reverseReconciliation", {
      params: { reconciliationId },
      data: { reason },
    }).then((r) => (r.data as any)?.data ?? r.data),

  listTransactions: (query: BankTransactionListQuery) =>
    apiCall<ApiResponse<Paged<BankTransactionItem>>>("banking.transactions", {
      query,
    }).then((r) => (r.data?.data ?? r.data) as Paged<BankTransactionItem>),

  createManualTransaction: (data: CreateManualBankTransactionPayload) =>
    apiCall<BankTransactionItem>("banking.createManualTransaction", {
      data,
    }).then((r) => (r.data as any)?.data ?? r.data),

  getTransactionDetail: (id: string) =>
    apiCall<BankTransactionItem>("banking.transactionDetail", {
      params: { id },
    }).then((r) => r.data! ?? (r.data as any)),

  getSuggestions: (id: string) =>
    apiCall<MatchSuggestionResponse>("banking.transactionSuggestions", {
      params: { id },
    }).then((r) => r.data! ?? (r.data as any)),

  confirmTransaction: (id: string, body: any) =>
    apiCall<any>("banking.confirmTransaction", {
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
    return (res.data as any)?.data ?? res.data!;
  },

  recognizeTransactions: (ids: string[]) => {
    // `refetch()` can still execute a disabled TanStack Query. Keep the API
    // boundary safe so an empty work queue never sends an invalid batch.
    if (!ids.length) return Promise.resolve([] as BankTransactionRecognition[]);
    return apiCall<BankTransactionRecognition[]>("banking.recognizeTransactions", {
      data: { ids },
    }).then((r) => ((r.data as any)?.data ?? r.data ?? []) as BankTransactionRecognition[]);
  },

  ignoreTransactions: (payload: { ids: string[]; counterpartyType: "INTERNAL" | "OTHER"; reason?: string }) =>
    apiCall<{ ignoredIds: string[]; skippedIds: string[] }>("banking.ignoreTransactions", {
      data: payload,
    }).then((r) => ((r.data as any)?.data ?? r.data) as { ignoredIds: string[]; skippedIds: string[] }),

  restoreTransaction: (id: string) =>
    apiCall("banking.restoreTransaction", { params: { id }, data: {} }).then((r) => (r.data as any)?.data ?? r.data),

  reconcileCommercial: (id: string, data: { paymentId: string; amountVnd?: number; note?: string }) =>
    apiCall("banking.reconcileCommercial", { params: { id }, data }).then((r) => (r.data as any)?.data ?? r.data),

  recordCommercialFromStatement: (id: string, data: { paymentRequestId: string; note?: string }) =>
    apiCall("banking.recordCommercialFromStatement", { params: { id }, data }).then((r) => (r.data as any)?.data ?? r.data),

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
      (r) => (r.data as any)?.data ?? r.data ?? [],
    ),

  listTermPaymentBatches: (query?: Record<string, unknown>) =>
    apiCall<{ items: TermPaymentBatch[]; total: number; page: number; pageSize: number }>(
      "banking.termPaymentBatches",
      { query },
    ).then((r) => (r.data as any)?.data ?? r.data),

  createTermPaymentBatch: (data: {
    paymentRequestIds?: string[];
    planLineIds?: string[];
    bankAccountId?: string;
    batchDate?: string;
    note?: string;
  }) =>
    apiCall<TermPaymentBatch>("banking.createTermPaymentBatch", { data }).then(
      (r) => (r.data as any)?.data ?? r.data,
    ),

  getTermPaymentBatchDetail: (id: string) =>
    apiCall<TermPaymentBatch>("banking.termPaymentBatchDetail", {
      params: { id },
    }).then((r) => (r.data as any)?.data ?? r.data),

  sendTermPaymentBatch: (id: string) =>
    apiCall<TermPaymentBatch>("banking.sendTermPaymentBatch", {
      params: { id },
    }).then((r) => (r.data as any)?.data ?? r.data),

  uploadTermPaymentBatchFile: (id: string, data: FormData) =>
    apiCall<any>("banking.uploadTermPaymentBatchFile", {
      params: { id },
      data,
    }).then((r) => r.data?.data ?? r.data),

  matchTermPaymentBatchItem: (
    id: string,
    itemId: string,
    data: { bankTransactionId: string; paidAmountVnd?: number; status?: string; note?: string },
  ) =>
    apiCall<any>("banking.matchTermPaymentBatchItem", {
      params: { id, itemId },
      data,
    }).then((r) => r.data?.data ?? r.data),

  confirmTermPaymentBatchItemPaid: (id: string, itemId: string) =>
    apiCall<any>("banking.confirmTermPaymentBatchItemPaid", {
      params: { id, itemId },
    }).then((r) => r.data?.data ?? r.data),
};
