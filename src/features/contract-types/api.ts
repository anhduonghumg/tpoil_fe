import { apiCall } from "../../shared/lib/api";
import type { ApiResponse } from "../../shared/lib/types";
import type {
  ContractType,
  ContractTypeListQuery,
  Paged,
  selectContractype,
} from "./types";

export const ContractTypesApi = {
  list: (query: ContractTypeListQuery) =>
    apiCall<ApiResponse<Paged<ContractType>>>("contractTypes.list", {
      query,
    }).then((r) => r.data!.data),

  detail: (id: string) =>
    apiCall<ApiResponse<ContractType>>("contractTypes.detail", {
      params: { id },
    }).then((r) => r.data!.data),

  create: (body: Partial<ContractType>) =>
    apiCall<ApiResponse<ContractType>>("contractTypes.create", {
      data: body,
    }).then((r) => r.data!),

  update: (id: string, body: Partial<ContractType>) =>
    apiCall<ApiResponse<ContractType>>("contractTypes.update", {
      params: { id },
      data: body,
    }).then((r) => r.data!),

  delete: (id: string) =>
    apiCall<ApiResponse<boolean>>("contractTypes.delete", {
      params: { id },
    }).then((r) => r.data!),

  deleteMultiple: (ids: string[]) =>
    apiCall<ApiResponse<number>>("contractTypes.deleteMultiple", {
      data: { ids },
    }).then((r) => r.data!),

  all: () =>
    apiCall<ApiResponse<selectContractype>>("contractTypes.all").then(
      (r) => r.data!.data
    ),
};
