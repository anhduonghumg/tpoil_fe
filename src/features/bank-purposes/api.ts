import { apiCall } from "../../shared/lib/api";
import { Paged } from "../../shared/lib/types";
import type {
  BankTransactionPurposeItem,
  BankTransactionPurposeListQuery,
  UpsertBankTransactionPurposePayload,
} from "./types";

type ApiResponse<T> = { data?: T };

export const BankPurposesApi = {
  list: (query: BankTransactionPurposeListQuery) =>
    apiCall<ApiResponse<Paged<BankTransactionPurposeItem>>>(
      "bankPurposes.list",
      {
        query,
      },
    ).then((r) => r.data?.data ?? (r.data as any)),

  all: () =>
    apiCall<ApiResponse<BankTransactionPurposeItem[]>>("bankPurposes.all").then(
      (r) => r.data?.data ?? (r.data as any),
    ),

  detail: (id: string) =>
    apiCall<ApiResponse<BankTransactionPurposeItem>>("bankPurposes.detail", {
      params: { id },
    }).then((r) => r.data?.data ?? (r.data as any)),

  create: (body: UpsertBankTransactionPurposePayload) =>
    apiCall<ApiResponse<BankTransactionPurposeItem>>("bankPurposes.create", {
      data: body,
    }).then((r) => r.data?.data ?? (r.data as any)),

  update: (id: string, body: Partial<UpsertBankTransactionPurposePayload>) =>
    apiCall<ApiResponse<BankTransactionPurposeItem>>("bankPurposes.update", {
      params: { id },
      data: body,
    }).then((r) => r.data?.data ?? (r.data as any)),

  remove: (id: string) =>
    apiCall<ApiResponse<{ success: boolean }>>("bankPurposes.delete", {
      params: { id },
    }).then((r) => r.data?.data ?? (r.data as any)),
};
