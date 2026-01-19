import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SupplierLocationsApi } from "./api";
import type {
  SupplierLocationListQuery,
  CreateSupplierLocationPayload,
  UpdateSupplierLocationPayload,
  BatchUpdateSupplierLocationPayload,
} from "./types";

const keys = {
  all: ["supplierLocations"] as const,
  list: (q: SupplierLocationListQuery) =>
    ["supplierLocations", "list", q] as const,
};

export function useSupplierLocationList(
  q: SupplierLocationListQuery,
  enabled = true
) {
  return useQuery({
    queryKey: keys.list(q),
    queryFn: () => SupplierLocationsApi.list(q),
    enabled,
    placeholderData: (prev) => prev,
  });
}

export function useCreateSupplierLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSupplierLocationPayload) =>
      SupplierLocationsApi.create(data),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.all });
    },
  });
}

export function useUpdateSupplierLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; data: UpdateSupplierLocationPayload }) =>
      SupplierLocationsApi.update(args.id, args.data),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.all });
    },
  });
}

export function useBatchUpdateSupplierLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      id: string;
      data: BatchUpdateSupplierLocationPayload;
    }) => SupplierLocationsApi.batchUpdate(args.id, args.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all });
    },
  });
}

export function useDeactivateSupplierLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => SupplierLocationsApi.deactivate(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.all });
    },
  });
}

export function useActivateSupplierLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => SupplierLocationsApi.activate(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.all });
    },
  });
}
