// features/cron/page/CronJobsPage.tsx
import { useState } from "react";
import { Card, Table, Tag, Typography, Modal } from "antd";
import dayjs from "dayjs";
import { useCronJobsList, useCronJobRuns } from "../hooks";
import { CronJobSummary } from "../types";

const { Text } = Typography;
const RUNS_PAGE_SIZE = 20;

export default function CronJobsPage() {
  const { data: jobs, isLoading } = useCronJobsList();

  const [selectedJob, setSelectedJob] = useState<CronJobSummary | null>(null);
  const [runsPage, setRunsPage] = useState(1);

  const { data: runsData, isLoading: runsLoading } = useCronJobRuns(
    selectedJob?.id ?? null,
    runsPage,
    RUNS_PAGE_SIZE
  );

  const jobsRows = jobs ?? [];
  const runsRows = runsData?.items ?? [];
  const runsTotal = runsData?.total ?? 0;

  console.log("jobsRows", jobsRows);
  console.log("runsRows", runsRows);

  const handleOpenRuns = (job: CronJobSummary) => {
    setSelectedJob(job);
    setRunsPage(1);
  };

  const handleCloseRuns = () => {
    setSelectedJob(null);
    setRunsPage(1);
  };

  const jobColumns = [
    {
      title: "Job",
      dataIndex: "name",
      render: (_: any, row: CronJobSummary) => (
        <div>
          <Text strong>{row.name}</Text>
          <div style={{ fontSize: 12, color: "#888" }}>{row.type}</div>
        </div>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "enabled",
      width: 130,
      align: "center" as const,
      render: (enabled: boolean) =>
        enabled ? (
          <Tag color="green">Enabled</Tag>
        ) : (
          <Tag color="red">Disabled</Tag>
        ),
    },
    {
      title: "Lần chạy gần nhất",
      dataIndex: "lastRun",
      width: 260,
      render: (lastRun: CronJobSummary["lastRun"]) => {
        if (!lastRun) {
          return <Text type="secondary">Chưa chạy</Text>;
        }
        return (
          <div>
            <Text>{dayjs(lastRun.runDate).format("DD/MM/YYYY HH:mm")}</Text>
            <div style={{ marginTop: 4 }}>
              {lastRun.status === "SUCCESS" ? (
                <Tag color="green">SUCCESS</Tag>
              ) : (
                <Tag color="red">FAILED</Tag>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: "Xem log",
      key: "actions",
      width: 120,
      align: "center" as const,
      render: (_: any, row: CronJobSummary) => (
        <a onClick={() => handleOpenRuns(row)}>Lịch sử</a>
      ),
    },
  ];

  const runColumns = [
    {
      title: "Ngày chạy",
      dataIndex: "runDate",
      width: 200,
      render: (v: string) => dayjs(v).format("DD/MM/YYYY HH:mm"),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 120,
      render: (status: string) =>
        status === "SUCCESS" ? (
          <Tag color="green">SUCCESS</Tag>
        ) : (
          <Tag color="red">FAILED</Tag>
        ),
    },
    {
      title: "Lỗi",
      dataIndex: "error",
      ellipsis: true,
      render: (err: string | null) =>
        err ? (
          <Text type="danger">{err}</Text>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
  ];

  return (
    <>
      {/* <Card title="Trạng thái Cron jobs"> */}
      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={jobsRows?.data ?? []}
        columns={jobColumns as any}
        pagination={false}
        size="middle"
      />
      {/* </Card> */}

      <Modal
        title={
          selectedJob ? `Lịch sử: ${selectedJob.name}` : "Lịch sử cron job"
        }
        open={!!selectedJob}
        onCancel={handleCloseRuns}
        footer={null}
        width={720}
      >
        <Table
          rowKey="id"
          loading={runsLoading}
          dataSource={runsRows}
          columns={runColumns as any}
          size="small"
          pagination={{
            current: runsPage,
            pageSize: RUNS_PAGE_SIZE,
            total: runsTotal,
            onChange: (page) => setRunsPage(page),
          }}
        />
      </Modal>
    </>
  );
}
