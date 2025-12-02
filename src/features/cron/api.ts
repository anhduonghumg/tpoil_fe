// features/cron/api.ts
import { apiCall } from "../../shared/lib/api";
import { ApiResponse } from "../../shared/lib/types";
import { CronJobSummary, PagedCronJobRuns } from "./types";

export const CronApi = {
  listJobs: (): Promise<CronJobSummary[]> =>
    apiCall<ApiResponse<CronJobSummary[]>>("cron.listJobs", {}).then(
      (r) => r.data ?? []
    ),

  listRuns: (
    jobId: string,
    page: number,
    pageSize: number
  ): Promise<PagedCronJobRuns> =>
    apiCall<ApiResponse<PagedCronJobRuns>>("cron.listRuns", {
      params: { id: jobId },
      query: { page, pageSize },
    }).then((r) => r.data!),
};
