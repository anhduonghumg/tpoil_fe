import { useNavigate } from "react-router-dom";
import { Button, Tag, Typography } from "antd";
import { DatabaseOutlined, InboxOutlined } from "@ant-design/icons";
import { useCommercialLotWithdrawalsQueue } from "../commercial-lots/hooks";
import {
  LOT_WITHDRAWALS_QUEUE_QUERY,
  LotWithdrawalsQueuePanel,
} from "../commercial-lots/ui/LotWithdrawalsQueuePanel";
import { useInventoryReceipts } from "../inventory-receipts/hooks";
import {
  RECEIPT_REQUESTS_QUERY,
  ReceiptRequestsQueuePanel,
} from "../inventory-receipts/ui/ReceiptRequestsQueuePanel";
import { RefreshButton, WorkflowPageHeader } from "./ship-charter-common";
import "./ship-charter-workflow.css";

export default function WarehouseDashboardPage() {
  const navigate = useNavigate();
  const withdrawalsQuery = useCommercialLotWithdrawalsQueue(LOT_WITHDRAWALS_QUEUE_QUERY);
  const receiptsQuery = useInventoryReceipts(RECEIPT_REQUESTS_QUERY);

  const pendingWithdrawals = withdrawalsQuery.data?.total ?? 0;
  const pendingReceipts = receiptsQuery.data?.total ?? 0;
  const isFetching = withdrawalsQuery.isFetching || receiptsQuery.isFetching;

  const metrics = [
    {
      label: "Phiếu rút lô chờ duyệt",
      value: pendingWithdrawals,
      hint: "Đang chờ kho xác nhận",
      tone: pendingWithdrawals > 0 ? "warning" : "normal",
      href: "#pending-withdrawals",
    },
    {
      label: "Đề nghị nhập hàng chờ duyệt",
      value: pendingReceipts,
      hint: "Mua hàng đã gửi sang kho",
      tone: pendingReceipts > 0 ? "warning" : "normal",
      href: "#pending-receipts",
    },
  ];

  return (
    <main className="charter-page">
      <WorkflowPageHeader
        title="Dashboard kho"
        subtitle="Theo dõi và duyệt các phiếu rút lô, đề nghị nhập hàng đang chờ xử lý."
        action={
          <>
            <Button
              size="small"
              icon={<DatabaseOutlined />}
              onClick={() => navigate("/operations/inventory-availability")}
            >
              Tồn kho kinh doanh
            </Button>
            <RefreshButton
              loading={isFetching}
              onClick={() => {
                withdrawalsQuery.refetch();
                receiptsQuery.refetch();
              }}
            />
          </>
        }
      />

      <section
        className="charter-dashboard-metrics"
        style={{
          display: "inline-grid",
          gridTemplateColumns: `repeat(${metrics.length}, minmax(200px, 240px))`,
        }}
      >
        {metrics.map((metric) => (
          <button
            type="button"
            key={metric.label}
            className={`charter-dashboard-metric ${metric.tone}`}
            style={{ border: 0, textAlign: "left", cursor: "pointer" }}
            onClick={() =>
              document.querySelector(metric.href)?.scrollIntoView({ behavior: "smooth" })
            }
          >
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.hint}</small>
          </button>
        ))}
      </section>

      <section id="pending-receipts" className="charter-detail-section">
        <div className="charter-detail-heading">
          <div>
            <Typography.Title level={5}>Đề nghị nhập hàng chờ duyệt</Typography.Title>
          </div>
          <Tag color={pendingReceipts ? "gold" : "default"}>
            <InboxOutlined /> {pendingReceipts} phiếu
          </Tag>
        </div>
        <ReceiptRequestsQueuePanel />
      </section>

      <section id="pending-withdrawals" className="charter-detail-section">
        <div className="charter-detail-heading">
          <div>
            <Typography.Title level={5}>Phiếu rút lô chờ duyệt</Typography.Title>
          </div>
          <Tag color={pendingWithdrawals ? "gold" : "default"}>
            <InboxOutlined /> {pendingWithdrawals} phiếu
          </Tag>
        </div>
        <LotWithdrawalsQueuePanel />
      </section>
    </main>
  );
}
