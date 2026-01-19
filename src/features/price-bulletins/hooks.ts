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
    queryKey: ["priceBulletins", "importPdf", "status", runId],
    queryFn: () => PriceBulletinsApi.importPdfStatus(runId!),
    enabled: !!runId,
    refetchInterval: (q) => {
      const d: any = q.state.data;
      if (!d) return 1500;
      if (d.status === "SUCCESS" || d.status === "FAILED") return false;
      return 1500;
    },
  });
}

// export function useImportPdfPreviewData(runId?: string, enabled?: boolean) {
//   return useQuery({
//     queryKey: ["priceBulletins", "importPdf", "preview", runId],
//     queryFn: () => PriceBulletinsApi.importPdfPreviewData(runId!),
//     enabled: !!runId && !!enabled,
//   });
// }

export function useImportPdfPreviewData(runId?: string, enabled?: boolean) {
  return useQuery({
    queryKey: ["priceBulletins", "importPdf", "preview", runId],
    queryFn: () => PriceBulletinsApi.importPdfPreviewData(runId!),
    enabled: !!runId && !!enabled,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 5,
  });
}

export function useImportPdfCommit() {
  return useMutation({
    mutationFn: (payload: {
      effectiveFrom: string;
      isOverride: boolean;
      lines: Array<{ productId: string; regionId: string; price: number }>;
    }) => PriceBulletinsApi.importPdfCommit(payload),
  });
}
