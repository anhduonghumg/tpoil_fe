// features/contracts/api.ts
import { apiCall } from "../../shared/lib/api";
import type { ApiResponse } from "../../shared/lib/types";
import type {
  Contract,
  ContractListQuery,
  ContractAttachment,
  ContractUpsertPayload,
  ContractExpiryListResult,
  ContractExpiryReportQuery,
  ContractImportRow,
  ContractAppendix,
  UpsertContractAppendixPayload,
  ResolvedContractTerms,
} from "./types";

import type { Paged } from "../../shared/lib/types";

export interface CreateContractAttachmentPayload {
  contractId: string;
  fileName: string;
  fileUrl?: string;
  externalUrl?: string;
  category: string;
}

export interface UpdateContractAttachmentPayload {
  fileName?: string;
  fileUrl?: string;
  externalUrl?: string;
  category?: string;
}

export interface CreateContractAttachmentsPayload {
  contractId: string;
  items: UpdateContractAttachmentPayload[];
}

export const ContractsApi = {
  list: (query: ContractListQuery): Promise<Paged<Contract>> =>
    apiCall<ApiResponse<Paged<Contract>>>("contracts.list", {
      query,
    }).then((r) => r.data!.data!),

  detail: (id: string): Promise<Contract> =>
    apiCall<ApiResponse<Contract>>("contracts.detail", {
      params: { id },
    }).then((r) => r.data!.data!),

  create: (body: ContractUpsertPayload) =>
    apiCall<ApiResponse<Contract>>("contracts.create", {
      data: body,
    }).then((r) => r.data!),

  update: (id: string, body: Partial<ContractUpsertPayload>) =>
    apiCall<ApiResponse<Contract>>("contracts.update", {
      params: { id },
      data: body,
    }).then((r) => r.data!.data),

  delete: (id: string) =>
    apiCall<ApiResponse<boolean>>("contracts.delete", {
      params: { id },
    }).then((r) => r.data!),

  // attachments
  listAttachments: (contractId: string): Promise<ContractAttachment[]> =>
    apiCall<ApiResponse<ContractAttachment[]>>(
      "contractAttachments.byContract",
      {
        params: { contractId },
      }
    ).then((r) => r.data!.data!),

  createAttachment: (body: CreateContractAttachmentPayload) =>
    apiCall<ApiResponse<ContractAttachment>>("contractAttachments.create", {
      data: body,
    }).then((r) => r.data!),

  updateAttachment: (id: string, body: UpdateContractAttachmentPayload) =>
    apiCall<ApiResponse<ContractAttachment>>("contractAttachments.update", {
      params: { id },
      data: body,
    }).then((r) => r.data!),

  deleteAttachment: (id: string) =>
    apiCall<ApiResponse<boolean>>("contractAttachments.delete", {
      params: { id },
    }).then((r) => r.data!),

  // Báo cáo hợp đòng hết hạn
  getContractExpiryReport: (
    params: ContractExpiryReportQuery
  ): Promise<ContractExpiryListResult[]> =>
    apiCall<ApiResponse<ContractExpiryListResult[]>>("contracts.expiryReport", {
      query: params,
    }).then((r) => r.data!.data!),

  exportContractExpiryReport: (
    params: ContractExpiryReportQuery
  ): Promise<Blob> =>
    apiCall<Blob>("contracts.expiryReportExport", {
      query: params,
    }).then((r) => r.data!),

  importFromExcel: (rows: ContractImportRow[]): Promise<void> =>
    apiCall<ApiResponse<void>>("contracts.importExcel", {
      data: {
        rows,
      },
    }).then((r) => r.data!.data!),

  /* ===== Phụ lục hợp đồng ===== */

  listAppendices: (contractId: string): Promise<ContractAppendix[]> =>
    apiCall<ApiResponse<ContractAppendix[]>>("contractAppendices.list", {
      params: { contractId },
    }).then((r) => (r.data?.data ?? r.data ?? []) as ContractAppendix[]),

  /** Điều khoản áp tại một ngày; bỏ trống `at` là hôm nay. */
  termsAt: (contractId: string, at?: string): Promise<ResolvedContractTerms> =>
    apiCall<ApiResponse<ResolvedContractTerms>>("contractAppendices.termsAt", {
      params: { contractId },
      query: at ? { at } : {},
    }).then((r) => (r.data?.data ?? r.data) as ResolvedContractTerms),

  createAppendix: (
    contractId: string,
    data: UpsertContractAppendixPayload,
  ): Promise<ContractAppendix> =>
    apiCall<ApiResponse<ContractAppendix>>("contractAppendices.create", {
      params: { contractId },
      data,
    }).then((r) => (r.data?.data ?? r.data) as ContractAppendix),

  updateAppendix: (
    contractId: string,
    appendixId: string,
    data: UpsertContractAppendixPayload,
  ): Promise<ContractAppendix> =>
    apiCall<ApiResponse<ContractAppendix>>("contractAppendices.update", {
      params: { contractId, appendixId },
      data,
    }).then((r) => (r.data?.data ?? r.data) as ContractAppendix),

  deleteAppendix: (contractId: string, appendixId: string): Promise<void> =>
    apiCall<ApiResponse<void>>("contractAppendices.delete", {
      params: { contractId, appendixId },
    }).then(() => undefined),
};
