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
};
