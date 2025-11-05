import { apiCall } from "../../shared/lib/api";
import type { ApiResponse } from "../../shared/lib/types";
import type { Contract, ContractListQuery, Paged } from "./types";

export const ContractsApi = {
  list: (query: ContractListQuery) =>
    apiCall<ApiResponse<Paged<Contract>>>("contract.list", { query }).then(
      (r) => r.data!
    ),
  detail: (id: string) =>
    apiCall<ApiResponse<Contract>>("contract.detail", { params: { id } }).then(
      (r) => r.data!
    ),
  create: (body: Partial<Contract>) =>
    apiCall<ApiResponse<Contract>>("contract.create", { data: body }).then(
      (r) => r.data!
    ),
  update: (id: string, body: Partial<Contract>) =>
    apiCall<ApiResponse<Contract>>("contract.update", {
      params: { id },
      data: body,
    }).then((r) => r.data!),
  delete: (id: string) =>
    apiCall<ApiResponse<boolean>>("contract.delete", { params: { id } }).then(
      (r) => r.data!
    ),
  deleteMultiple: (ids: string[]) =>
    apiCall<ApiResponse<number>>("contract.deleteMultiple", {
      data: { ids },
    }).then((r) => r.data!),
  generateCode: (customerId: string) =>
    apiCall<ApiResponse<{ code: string }>>("contract.generateCode", {
      data: { customerId },
    }).then((r) => r.data!),
};
