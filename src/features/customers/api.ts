// features/customers/api.ts
import { apiCall } from "../../shared/lib/api";
import { ApiResponse, Paged } from "../../shared/lib/types";
import { Contract } from "../contracts/types";
import type {
  AssignContractsResult,
  AttachableContractBrief,
  Customer,
  CustomerContractBrief,
  CustomerListQuery,
  CustomerOverview,
} from "./types";

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

  /** Lấy danh sách HĐ đã gán cho 1 khách (sidebar) */
  getCustomerContracts(customerId: string): Promise<CustomerContractBrief[]> {
    return apiCall<ApiResponse<CustomerContractBrief[]>>(
      "contracts.byCustomer",
      { params: { customerId } }
    ).then((r) => r.data.data ?? []);
  },

  /** Lấy danh sách HĐ có thể gán cho khách (modal) */
  getAttachableContracts(opts: {
    customerId: string;
    keyword?: string;
    page?: number;
    pageSize?: number;
  }): Promise<Paged<AttachableContractBrief>> {
    return apiCall<ApiResponse<Paged<AttachableContractBrief>>>(
      "contracts.attachable",
      {
        query: {
          customerId: opts.customerId,
          keyword: opts.keyword ?? "",
          page: opts.page ?? 1,
          pageSize: opts.pageSize ?? 10,
        },
      }
    ).then((r) => r.data!.data as Paged<AttachableContractBrief>);
  },

  /** Gán nhiều HĐ cho 1 khách */
  assignContracts(
    customerId: string,
    contractIds: string[]
  ): Promise<AssignContractsResult> {
    return apiCall<ApiResponse<AssignContractsResult>>(
      "customer.assignContracts",
      {
        params: { id: customerId },
        data: { contractIds },
      }
    ).then((r) => r.data!.data as AssignContractsResult);
  },

  /** Gỡ gán 1 HĐ khỏi 1 khách */
  unassignContracts(
    customerId: string,
    contractIds: string[]
  ): Promise<AssignContractsResult> {
    return apiCall<ApiResponse<AssignContractsResult>>(
      "customer.unassignContract",
      {
        params: { id: customerId },
        data: { contractIds },
      }
    ).then((r) => r.data!.data as AssignContractsResult);
  },
};
