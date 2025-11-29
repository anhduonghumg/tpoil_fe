// features/app/hooks.ts
import { useQuery } from "@tanstack/react-query";
import { getAppBootstrap } from "./api";
import { AppBootstrapResponse } from "./types";

export const APP_BOOTSTRAP_QUERY_KEY = ["app", "bootstrap"];

export function useAppBootstrap() {
  return useQuery<AppBootstrapResponse>({
    queryKey: APP_BOOTSTRAP_QUERY_KEY,
    queryFn: getAppBootstrap,
    staleTime: 5 * 60 * 1000,
  });
}
