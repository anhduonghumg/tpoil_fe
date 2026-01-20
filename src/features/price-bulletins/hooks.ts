// features/price-bulletins/hooks.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PriceBulletinsApi } from "./api";
import type {
  PriceBulletinListQuery,
  CreatePriceBulletinPayload,
  UpdatePriceBulletinPayload,
} from "./types";

export const keys = {
  all: ["priceBulletins"] as const,
  list: (q: PriceBulletinListQuery) => ["priceBulletins", "list", q] as const,
  detail: (id: string) => ["priceBulletins", "detail", id] as const,
};

export function usePriceBulletinList(q: PriceBulletinListQuery) {
  return useQuery({
    queryKey: keys.list(q),
    queryFn: () => PriceBulletinsApi.list(q),
  });
}

export function usePriceBulletinDetail(id?: string, enabled = true) {
  return useQuery({
    queryKey: id ? keys.detail(id) : ["priceBulletins", "detail", "none"],
    queryFn: () => PriceBulletinsApi.detail(id!),
    enabled: !!id && enabled,
  });
}

export function useCreatePriceBulletin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePriceBulletinPayload) =>
      PriceBulletinsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useUpdatePriceBulletin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; data: UpdatePriceBulletinPayload }) =>
      PriceBulletinsApi.update(args.id, args.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function usePublishPriceBulletin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => PriceBulletinsApi.publish(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useVoidPriceBulletin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => PriceBulletinsApi.void(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}
export function useImportPdfPreview() {
  return useMutation({
    mutationFn: (file: File) => PriceBulletinsApi.importPdfPreview(file),
  });
}

export function useImportPdfStatus(runId?: string) {
  return useQuery({
    queryKey: ["priceBulletins", "import-status", runId],
    queryFn: () => PriceBulletinsApi.importPdfStatus(runId!),
    enabled: !!runId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "SUCCESS" || status === "FAILED" ? false : 2000;
    },
  });
}

export function useImportPdfPreviewData(runId?: string, enabled = false) {
  return useQuery({
    queryKey: ["priceBulletins", "import-preview", runId],
    queryFn: () => PriceBulletinsApi.getImportPreviewData(runId!),
    enabled: !!runId && enabled,
  });
}

export function useUpdatePreviewLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { runId: string; rowNo: number; data: any }) =>
      PriceBulletinsApi.updatePreviewLine(args.runId, args.rowNo, args.data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({
        queryKey: ["priceBulletins", "import-preview", variables.runId],
      });
      qc.refetchQueries({
        queryKey: ["priceBulletins", "import-preview", variables.runId],
      });
    },
  });
}

export function useImportPdfCommit() {
  return useMutation({
    mutationFn: (data: any) => PriceBulletinsApi.importPdfCommit(data),
  });
}
