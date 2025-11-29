// src/shared/hooks/useContractTypeOptions.ts
import { useQuery } from "@tanstack/react-query";
import { apiCall } from "../lib/api";

export function useContractTypeOptions(activeOnly = true) {
  return useQuery({
    queryKey: ["lookups", "contractTypes", { activeOnly }],
    queryFn: async () => {
      const res = await apiCall<{ id: string; code: string; name: string }[]>(
        "lookups.contractTypes",
        {
          query: { activeOnly },
        }
      );
      return res.data! ?? [];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
