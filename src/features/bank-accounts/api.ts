import { apiCall } from "../../shared/lib/api";
import { ApiResponse } from "../../shared/lib/types";
import type {
  BankAccount,
  BankAccountListQuery,
  UpsertBankAccountPayload,
  UUID,
} from "./types";

export const BankAccountsApi = {
  list: (query: BankAccountListQuery = {}) =>
    apiCall<ApiResponse<BankAccount[]>>("bankAccounts.list", {
      query,
    }).then((r) => r.data?.data ?? []),

  detail: (id: UUID) =>
    apiCall<ApiResponse<BankAccount>>("bankAccounts.detail", {
      params: { id },
    }).then((r) => r.data?.data as BankAccount),

  create: (payload: UpsertBankAccountPayload) =>
    apiCall<ApiResponse<BankAccount>>("bankAccounts.create", {
      data: payload,
    }).then((r) => r.data?.data as BankAccount),

  update: (id: UUID, payload: UpsertBankAccountPayload) =>
    apiCall<ApiResponse<BankAccount>>("bankAccounts.update", {
      params: { id },
      data: payload,
    }).then((r) => r.data?.data as BankAccount),
};
