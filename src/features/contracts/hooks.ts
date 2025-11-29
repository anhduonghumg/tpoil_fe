// features/contracts/hooks.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ContractsApi } from "./api";
import type {
  Contract,
  ContractAttachment,
  ContractListQuery,
  ContractUpsertPayload,
} from "./types";
import type { Paged } from "../../shared/lib/types";
import type {
  CreateContractAttachmentPayload,
  UpdateContractAttachmentPayload,
} from "./api";

const CONTRACTS_QUERY_KEY = "contracts";
const CONTRACT_ATTACHMENTS_QUERY_KEY = "contractAttachments";

// ===== LIST =====

export function useContractList(query: ContractListQuery) {
  return useQuery<Paged<Contract>>({
    queryKey: [CONTRACTS_QUERY_KEY, "list", query],
    queryFn: () => ContractsApi.list(query),
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
    mutationFn: (payload: { id: string; body: Partial<ContractUpsertPayload> }) =>
      ContractsApi.update(payload.id, payload.body),
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
