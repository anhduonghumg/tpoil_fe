// features/customers/hooks.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CustomersApi } from "./api";
import type {
  AssignContractsResult,
  AttachableContractBrief,
  Customer,
  CustomerAddress,
  CustomerContractBrief,
  CustomerGroupOption,
  CustomerListQuery,
  CustomerOverview,
  Paged,
} from "./types";
import { message } from "antd";

export const useCustomerList = (params: CustomerListQuery) =>
  useQuery({
    queryKey: ["customers", "list", params],
    queryFn: () => CustomersApi.list(params),
  });

export const useCustomerDetail = (id?: string) =>
  useQuery({
    queryKey: ["customers", "detail", id],
    queryFn: () => CustomersApi.detail(id!),
    enabled: !!id,
  });

export const useCustomerOverview = (id?: string) =>
  useQuery<CustomerOverview>({
    queryKey: ["customers", "overview", id],
    queryFn: async () => {
      const res = await CustomersApi.overview(id!);
      return (res as any).data ?? res;
    },
    enabled: !!id,
  });

export const useCreateCustomer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: Partial<Customer>) => CustomersApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers", "list"] });
    },
  });
};

export const useUpdateCustomer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: Partial<Customer> & { id: string }) =>
      CustomersApi.update(d.id, d),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["customers", "list"] });
      qc.invalidateQueries({ queryKey: ["customers", "detail", vars.id] });
      qc.invalidateQueries({ queryKey: ["customers", "overview", vars.id] });
    },
  });
};

export const useDeleteCustomer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => CustomersApi.delete(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["customers", "list"] });
      qc.invalidateQueries({ queryKey: ["customers", "detail", id] });
      qc.invalidateQueries({ queryKey: ["customers", "overview", id] });
    },
  });
};

export const useGenerateCustomerCode = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => CustomersApi.generateCode(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers", "generateCode"] });
    },
  });
};

export function useCustomerContracts(customerId: string | null) {
  return useQuery<CustomerContractBrief[]>({
    queryKey: ["customers", customerId, "contracts"],
    enabled: !!customerId,
    queryFn: () => CustomersApi.getCustomerContracts(customerId!),
  });
}

export function useAttachableContracts(
  customerId: string | null,
  keyword: string,
  page: number,
  pageSize: number
) {
  return useQuery<Paged<AttachableContractBrief>>({
    queryKey: ["contracts", "attachable", customerId, keyword, page, pageSize],
    enabled: !!customerId,
    queryFn: () =>
      CustomersApi.getAttachableContracts({
        customerId: customerId!,
        keyword,
        page,
        pageSize,
      }),
  });
}

export function useAssignContracts(customerId: string | null) {
  const qc = useQueryClient();

  return useMutation<AssignContractsResult, Error, string[]>({
    mutationKey: ["customers", "assignContracts", customerId],
    mutationFn: (contractIds) => {
      if (!customerId) {
        return Promise.reject(new Error("Missing customerId"));
      }
      return CustomersApi.assignContracts(customerId, contractIds);
    },
    onSuccess: (res) => {
      const ok = res.assigned.length;
      const fail = res.failed.length;

      if (ok > 0) {
        message.success(`Đã gán ${ok} hợp đồng cho khách hàng.`);
      }
      if (fail > 0) {
        message.error(
          `Không gán được ${fail} hợp đồng. Vui lòng kiểm tra lại.`
        );
      }

      qc.invalidateQueries({ queryKey: ["customers", "overview", customerId] });
      qc.invalidateQueries({ queryKey: ["contracts", "attachable"] });
    },
    onError: () => {
      message.error("Không gán được hợp đồng. Vui lòng thử lại.");
    },
  });
}

export function useUnassignContracts(customerId: string | null) {
  const qc = useQueryClient();

  return useMutation<AssignContractsResult, Error, string[]>({
    mutationKey: ["customers", "unassignContracts", customerId],
    mutationFn: (contractIds) => {
      if (!customerId) {
        return Promise.reject(new Error("Missing customerId"));
      }
      return CustomersApi.unassignContracts(customerId, contractIds);
    },
    onSuccess: (res) => {
      const ok = res.assigned.length;
      const fail = res.failed.length;

      if (ok > 0) {
        message.success(`Đã gỡ ${ok} hợp đồng khỏi khách hàng.`);
      }
      if (fail > 0) {
        message.error(`Không gỡ được ${fail} hợp đồng. Vui lòng kiểm tra lại.`);
      }

      qc.invalidateQueries({ queryKey: ["customers", "overview", customerId] });
      qc.invalidateQueries({ queryKey: ["contracts", "attachable"] });
    },
    onError: () => {
      message.error("Không gỡ được hợp đồng. Vui lòng thử lại.");
    },
  });
}

export const useCustomerGroupsSelect = (keyword: string) =>
  useQuery<CustomerGroupOption[]>({
    queryKey: ["customerGroups", "select", keyword],
    queryFn: () => CustomersApi.customerGroupsSelect(keyword),
    staleTime: 60_000,
  });
export function useCustomerAddresses(customerId: string | null) {
  const qc = useQueryClient();

  const list = useQuery<CustomerAddress[]>({
    queryKey: ["customers", customerId, "addresses"],
    enabled: !!customerId,
    queryFn: () => CustomersApi.listAddresses(customerId!),
  });

  const create = useMutation({
    mutationKey: ["customers", customerId, "addresses", "create"],
    mutationFn: (d: {
      validFrom: string;
      addressLine: string;
      validTo?: string | null;
      note?: string | null;
    }) => CustomersApi.createAddress(customerId!, d),
    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: ["customers", customerId, "addresses"],
      });
      qc.invalidateQueries({ queryKey: ["customers", "detail", customerId] });
      qc.invalidateQueries({ queryKey: ["customers", "overview", customerId] });
    },
  });

  const update = useMutation({
    mutationKey: ["customers", customerId, "addresses", "update"],
    mutationFn: (args: {
      addressId: string;
      data: Partial<
        Pick<CustomerAddress, "validFrom" | "validTo" | "addressLine" | "note">
      >;
    }) => CustomersApi.updateAddress(customerId!, args.addressId, args.data),
    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: ["customers", customerId, "addresses"],
      });
      qc.invalidateQueries({ queryKey: ["customers", "detail", customerId] });
      qc.invalidateQueries({ queryKey: ["customers", "overview", customerId] });
    },
  });

  const remove = useMutation({
    mutationKey: ["customers", customerId, "addresses", "delete"],
    mutationFn: (addressId: string) =>
      CustomersApi.deleteAddress(customerId!, addressId),
    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: ["customers", customerId, "addresses"],
      });
    },
  });

  return { list, create, update, remove };
}
