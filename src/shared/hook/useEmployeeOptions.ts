// src/shared/hooks/useEmployeeOptions.ts
import { useQuery } from "@tanstack/react-query";
import { apiCall } from "../lib/api";

type EmployeeLookup = {
  id: string;
  fullName: string;
};

export function useEmployeeOptions(activeOnly = true) {
  return useQuery({
    queryKey: ["employees", "select", { activeOnly }],
    queryFn: async () => {
      const res = await apiCall<EmployeeLookup[]>("employee.select", {
        query: { activeOnly },
      });
      return res.data! ?? [];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
