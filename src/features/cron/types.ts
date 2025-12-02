// features/cron/types.ts

export type CronRunStatus = "SUCCESS" | "FAILED";

export interface CronJobLastRun {
  id: string;
  runDate: string;
  startedAt: string;
  finishedAt: string | null;
  status: CronRunStatus;
  error: string | null;
}

export interface CronJobSummary {
  id: string;
  type: string;
  name: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastRun: CronJobLastRun | null;
}

export interface CronJobRun {
  id: string;
  jobId: string;
  runDate: string;
  startedAt: string;
  finishedAt: string | null;
  status: CronRunStatus;
  metrics: any;
  error: string | null;
  createdAt: string;
}

export interface PagedCronJobRuns {
  items: CronJobRun[];
  total: number;
  page: number;
  pageSize: number;
}
