// features/contracts/hooks.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ContractsApi } from "./api";
import { notify } from "../../shared/lib/notification";
import { extractApiError } from "../../shared/lib/httpError";
import type {
  Contract,
  ContractAttachment,
  ContractExpiryListResult,
  ContractExpiryReportQuery,
  ContractImportRow,
  ContractListQuery,
  ContractUpsertPayload,
  UpsertContractAppendixPayload,
} from "./types";
import type { Paged } from "../../shared/lib/types";
import type {
  CreateContractAttachmentPayload,
  UpdateContractAttachmentPayload,
} from "./api";

const CONTRACTS_QUERY_KEY = "contracts";
const CONTRACT_ATTACHMENTS_QUERY_KEY = "contractAttachments";
const CONTRACTS_LIST_QUERY_KEY = ["contracts", "list"];

// ===== LIST =====

export function useContractList(query: ContractListQuery, enabled = true) {
  return useQuery<Paged<Contract>>({
    queryKey: [CONTRACTS_QUERY_KEY, "list", query],
    queryFn: () => ContractsApi.list(query),
    enabled,
    // keepPreviousData: true,
  });
}

// ===== DETAIL =====

export function useContractDetail(id?: string) {
  return useQuery<Contract>({
    queryKey: [CONTRACTS_QUERY_KEY, "detail", id],
    queryFn: () => {
      if (!id) {
        throw new Error("Missing contract id");
      }
      return ContractsApi.detail(id);
    },
    enabled: !!id,
  });
}

// ===== CREATE / UPDATE / DELETE CONTRACT =====

export function useCreateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: ContractUpsertPayload) => ContractsApi.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [CONTRACTS_QUERY_KEY, "list"],
      });
    },
  });
}

export function useUpdateContract(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      id: string;
      body: Partial<ContractUpsertPayload>;
    }) => ContractsApi.update(payload.id, payload.body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [CONTRACTS_QUERY_KEY, "list"],
      });
      // queryClient.invalidateQueries({
      //   queryKey: [CONTRACTS_QUERY_KEY, "detail", id],
      // });
    },
  });
}

export function useDeleteContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ContractsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [CONTRACTS_QUERY_KEY, "list"],
      });
    },
  });
}

// ===== ATTACHMENTS =====

export function useContractAttachments(contractId?: string) {
  return useQuery<ContractAttachment[]>({
    queryKey: [CONTRACT_ATTACHMENTS_QUERY_KEY, contractId],
    queryFn: () => {
      if (!contractId) {
        throw new Error("Missing contractId");
      }
      return ContractsApi.listAttachments(contractId);
    },
    enabled: !!contractId,
  });
}

export function useCreateContractAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateContractAttachmentPayload) =>
      ContractsApi.createAttachment(body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [CONTRACT_ATTACHMENTS_QUERY_KEY, variables.contractId],
      });
    },
  });
}

export function useUpdateContractAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: {
      id: string;
      contractId: string;
      body: UpdateContractAttachmentPayload;
    }) => ContractsApi.updateAttachment(args.id, args.body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [CONTRACT_ATTACHMENTS_QUERY_KEY, variables.contractId],
      });
    },
  });
}

export function useDeleteContractAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { id: string; contractId: string }) =>
      ContractsApi.deleteAttachment(args.id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [CONTRACT_ATTACHMENTS_QUERY_KEY, variables.contractId],
      });
    },
  });
}

// ===== CONTRACT EXPIRY REPORT =====
export function useContractsExpiryReport(filters: ContractExpiryReportQuery) {
  return useQuery<ContractExpiryListResult[]>({
    queryKey: [CONTRACTS_QUERY_KEY, "expiryReport", filters],
    queryFn: () => ContractsApi.getContractExpiryReport(filters),
  });
}

export function useExportContractsExpiryReport(
  filters: ContractExpiryReportQuery
) {
  return useMutation({
    mutationFn: () => ContractsApi.exportContractExpiryReport(filters),
  });
}

export function useContractsForRenewal(
  customerId?: string | null,
  excludeId?: string
) {
  return useQuery({
    queryKey: ["contracts", "for-renewal", { customerId, excludeId }],
    enabled: !!customerId,
    queryFn: async () => {
      const res = await ContractsApi.list({
        customerId: customerId!,
        status: "Active",
        page: 1,
        pageSize: 100,
      });
      // console.log(res);

      const items: Contract[] = res?.items || [];
      return excludeId ? items.filter((c) => c.id !== excludeId) : items;
    },
  });
}

export function useImportContracts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rows: ContractImportRow[]) =>
      ContractsApi.importFromExcel(rows),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTRACTS_LIST_QUERY_KEY });
    },
  });
}

/* ===== Phụ lục hợp đồng ===== */

const appendixKeys = {
  list: (contractId?: string) => ["contracts", contractId, "appendices"] as const,
  terms: (contractId?: string, at?: string) =>
    ["contracts", contractId, "terms", at ?? "today"] as const,
};

export function useContractAppendices(contractId?: string) {
  const qc = useQueryClient();
  // Sửa phụ lục là đổi điều khoản, nên bảng "điều khoản tại ngày" phải tính lại theo.
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: appendixKeys.list(contractId) });
    qc.invalidateQueries({ queryKey: ["contracts", contractId, "terms"] });
  };

  const list = useQuery({
    queryKey: appendixKeys.list(contractId),
    queryFn: () => ContractsApi.listAppendices(contractId!),
    enabled: Boolean(contractId),
  });

  const create = useMutation({
    mutationFn: (d: UpsertContractAppendixPayload) =>
      ContractsApi.createAppendix(contractId!, d),
    onSuccess: () => {
      invalidate();
      notify.success("Đã thêm phụ lục");
    },
    onError: (e) =>
      notify.error(extractApiError(e).message || "Không thêm được phụ lục"),
  });

  const update = useMutation({
    mutationFn: (args: { appendixId: string; data: UpsertContractAppendixPayload }) =>
      ContractsApi.updateAppendix(contractId!, args.appendixId, args.data),
    onSuccess: () => {
      invalidate();
      notify.success("Đã cập nhật phụ lục");
    },
    onError: (e) =>
      notify.error(extractApiError(e).message || "Không cập nhật được phụ lục"),
  });

  const remove = useMutation({
    mutationFn: (appendixId: string) =>
      ContractsApi.deleteAppendix(contractId!, appendixId),
    onSuccess: () => {
      invalidate();
      notify.success("Đã xóa phụ lục");
    },
    onError: (e) =>
      notify.error(extractApiError(e).message || "Không xóa được phụ lục"),
  });

  return { list, create, update, remove };
}

/** Điều khoản đang áp tại một ngày cụ thể. */
export function useContractTermsAt(contractId?: string, at?: string) {
  return useQuery({
    queryKey: appendixKeys.terms(contractId, at),
    queryFn: () => ContractsApi.termsAt(contractId!, at),
    enabled: Boolean(contractId),
  });
}
