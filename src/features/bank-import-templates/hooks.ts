import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { BankImportTemplatesApi } from "./api";
import type {
  BankImportTemplateListQuery,
  UpsertBankImportTemplatePayload,
  UUID,
} from "./types";

export const bankImportTemplateKeys = {
  all: ["bankImportTemplates"] as const,
  list: (query: BankImportTemplateListQuery) =>
    ["bankImportTemplates", "list", query] as const,
  detail: (id: UUID) => ["bankImportTemplates", "detail", id] as const,
};

export function useBankImportTemplates(query: BankImportTemplateListQuery) {
  return useQuery({
    queryKey: bankImportTemplateKeys.list(query),
    queryFn: () => BankImportTemplatesApi.list(query),
  });
}

export function useCreateBankImportTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertBankImportTemplatePayload) =>
      BankImportTemplatesApi.create(payload),
    onSuccess: () => {
      message.success("Đã tạo template import");
      qc.invalidateQueries({ queryKey: bankImportTemplateKeys.all });
    },
  });
}

export function useUpdateBankImportTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: UUID;
      payload: UpsertBankImportTemplatePayload;
    }) => BankImportTemplatesApi.update(id, payload),
    onSuccess: () => {
      message.success("Đã cập nhật template import");
      qc.invalidateQueries({ queryKey: bankImportTemplateKeys.all });
    },
  });
}
