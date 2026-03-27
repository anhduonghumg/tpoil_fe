import { apiCall } from "../../shared/lib/api";
import { ApiResponse } from "../../shared/lib/types";
import type {
  BankImportTemplate,
  BankImportTemplateListQuery,
  UpsertBankImportTemplatePayload,
  UUID,
} from "./types";

export const BankImportTemplatesApi = {
  list: (query: BankImportTemplateListQuery = {}) =>
    apiCall<ApiResponse<BankImportTemplate[]>>("bankImportTemplates.list", {
      query,
    }).then((r) => r.data?.data ?? []),

  detail: (id: UUID) =>
    apiCall<ApiResponse<BankImportTemplate>>("bankImportTemplates.detail", {
      params: { id },
    }).then((r) => r.data?.data as BankImportTemplate),

  create: (payload: UpsertBankImportTemplatePayload) =>
    apiCall<ApiResponse<BankImportTemplate>>("bankImportTemplates.create", {
      data: payload,
    }).then((r) => r.data?.data as BankImportTemplate),

  update: (id: UUID, payload: UpsertBankImportTemplatePayload) =>
    apiCall<ApiResponse<BankImportTemplate>>("bankImportTemplates.update", {
      params: { id },
      data: payload,
    }).then((r) => r.data?.data as BankImportTemplate),
};
