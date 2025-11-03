import { apiCall } from "../../shared/lib/api";
import { ApiResponse } from "../../shared/lib/types";
import type { Customer, CustListQuery, Paged } from "./types";

export const CustomersApi = {
  list: (query: CustListQuery) =>
    apiCall<ApiResponse<Paged<Customer>>>("customer.list", { query }).then(
      (r) => r.data!.data
    ),
  detail: (id: string) =>
    apiCall<ApiResponse<Customer>>("customer.detail", { params: { id } }).then(
      (r) => r.data!.data
    ),
  create: (body: Partial<Customer>) =>
    apiCall<ApiResponse<Customer>>("customer.create", { data: body }).then(
      (r) => r.data!
    ),
  update: (id: string, body: Partial<Customer>) =>
    apiCall<ApiResponse<Customer>>("customer.update", {
      params: { id },
      data: body,
    }).then((r) => r.data!),
  delete: (id: string) =>
    apiCall<ApiResponse<boolean>>("customer.delete", { params: { id } }).then(
      (r) => r.data!
    ),
  deleteMultiple: (ids: string[]) =>
    apiCall<ApiResponse<number>>("customer.deleteMultiple", {
      data: { ids },
    }).then((r) => r.data!),
  generateCode: (id?: string) =>
    id
      ? apiCall<ApiResponse<{ code: string }>>("customer.generateCodeForId", {
          params: { id },
        }).then((r) => r.data!)
      : apiCall<ApiResponse<{ code: string }>>(
          "customer.generateCode",
          {}
        ).then((r) => r.data!),
};
