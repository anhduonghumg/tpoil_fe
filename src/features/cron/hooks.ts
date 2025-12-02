// features/cron/hooks.ts
import { useQuery } from "@tanstack/react-query";
import { CronApi } from "./api";
import { CronJobSummary, PagedCronJobRuns } from "./types";

export function useCronJobsList() {
  return useQuery<CronJobSummary[]>({
    queryKey: ["cronJobs", "list"],
    queryFn: () => CronApi.listJobs(),
    staleTime: 60_000,
  });
}

export function useCronJobRuns(
  jobId: string | null,
  page: number,
  pageSize: number
) {
  return useQuery<PagedCronJobRuns>({
    queryKey: ["cronJobs", "runs", jobId, page, pageSize],
    queryFn: () => CronApi.listRuns(jobId!, page, pageSize),
    enabled: !!jobId,
  });
}
