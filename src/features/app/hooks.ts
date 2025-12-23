// features/app/hooks.ts
import { useQuery } from "@tanstack/react-query";
import { getAppBootstrap } from "./api";
import { AppBootstrapResponse } from "./types";

export const APP_BOOTSTRAP_QUERY_KEY = ["app", "bootstrap"] as const;

export function useAppBootstrap(opts?: { enabled?: boolean }) {
  return useQuery<AppBootstrapResponse>({
    queryKey: APP_BOOTSTRAP_QUERY_KEY,
    queryFn: getAppBootstrap,
    enabled: opts?.enabled ?? true,
    staleTime: 5 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
