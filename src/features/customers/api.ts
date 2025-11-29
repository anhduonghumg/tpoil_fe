// features/customers/api.ts
import { apiCall } from "../../shared/lib/api";
import { ApiResponse, Paged } from "../../shared/lib/types";
import type { Customer, CustomerListQuery, CustomerOverview } from "./types";

export const CustomersApi = {
  list: (query: CustomerListQuery) =>
    apiCall<ApiResponse<Paged<Customer>>>("customer.list", { query }).then(
      (r) => r.data!.data
    ),

  detail: (id: string) =>
    apiCall<ApiResponse<Customer>>("customer.detail", { params: { id } }).then(
      (r) => r.data!
    ),

  overview: (id: string) =>
    apiCall<ApiResponse<CustomerOverview>>("customer.overview", {
      params: { id },
    }).then((r) => r.data!),

  create: (data: Partial<Customer>) =>
    apiCall<ApiResponse<Customer>>("customer.create", { data }).then(
      (r) => r.data!
    ),

  update: (id: string, data: Partial<Customer>) =>
    apiCall<ApiResponse<Customer>>("customer.update", {
      params: { id },
      data,
    }).then((r) => r.data!),

  delete: (id: string) =>
    apiCall<ApiResponse<null>>("customer.delete", { params: { id } }).then(
      (r) => r.data!
    ),
  generateCode: () =>
    apiCall<ApiResponse<{ customerId: string }>>(
      "customer.generateCode",
      {}
    ).then((r) => r.data!.data),

  contracts: (customerId: string) =>
    apiCall<ApiResponse<Contract[]>>("customer.contracts", {
      params: { id: customerId },
    }).then((r) => r.data),

  assignContracts: (customerId: string, contractIds: string[]) =>
    apiCall<ApiResponse<any>>("customer.assignContracts", {
      id: customerId,
      data: { contractIds },
    }).then((r) => r.data),

  unassignContract: (customerId: string, contractId: string) =>
    apiCall<ApiResponse<any>>("customer.unassignContract", {
      id: customerId,
      params: { contractId },
    }).then((r) => r.data),
};
