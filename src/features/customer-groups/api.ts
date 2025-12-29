// features/customer-groups/api.ts
import { apiCall } from "../../shared/lib/api";
import { ApiResponse, Paged } from "../../shared/lib/types";
import type {
  CustomerGroup,
  CustomerGroupListQuery,
  CustomerGroupSelectQuery,
  CreateCustomerGroupDto,
  UpdateCustomerGroupDto,
} from "./types";

export const CustomerGroupsApi = {
  list: (query: CustomerGroupListQuery) =>
    apiCall<ApiResponse<Paged<CustomerGroup>>>("customerGroups.list", {
      query,
    }).then((r) => r.data!.data),

  select: (query: CustomerGroupSelectQuery) =>
    apiCall<ApiResponse<CustomerGroup[]>>("customerGroups.select", {
      query,
    }).then((r) => r.data!.data),

  detail: (id: string) =>
    apiCall<ApiResponse<CustomerGroup>>("customerGroups.detail", {
      params: { id },
    }).then((r) => r.data!),

  create: (data: CreateCustomerGroupDto) =>
    apiCall<ApiResponse<CustomerGroup>>("customerGroups.create", { data }).then(
      (r) => r.data!
    ),

  update: (id: string, data: UpdateCustomerGroupDto) =>
    apiCall<ApiResponse<CustomerGroup>>("customerGroups.update", {
      params: { id },
      data,
    }).then((r) => r.data!),

  delete: (id: string) =>
    apiCall<ApiResponse<CustomerGroup>>("customerGroups.delete", {
      params: { id },
    }).then((r) => r.data!),
};
