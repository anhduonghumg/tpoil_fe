import { useMemo, useState } from "react";
import { Button, Empty, Segmented, Spin, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  ArrowDownOutlined,
  ArrowRightOutlined,
  ArrowUpOutlined,
  AuditOutlined,
  CheckCircleOutlined,
  FileDoneOutlined,
  ImportOutlined,
  PlusOutlined,
  SendOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { useCommercialLotPaymentRequests } from "../../commercial-lots/hooks";
import { useBankTransactions, useGeneralPaymentRequests, useTermPaymentBatches, useTermPaymentPendingRequests } from "../hooks";
import { batchNextStep } from "./TermPaymentBatchesPanel";
import { PageHeader } from "../../../shared/ui/PageHeader";
import "../../../shared/ui/data-grid.css";
import {
  COMMERCIAL_REQUEST_STATUS,
  GENERAL_REQUEST_STATUS,
  RECONCILIATION_STATUS,
  SignedAmount,
  dateText,
  formatMoney,
  isReconciled,
  stack,
  statusTag,
} from "../lib/format";
import { BankingKpis, BankingSection } from "./BankingKpis";
import type { BankingKpiItem } from "./BankingKpis";
import { GeneralPaymentCreateModal } from "./GeneralPaymentCreateModal";
import ImportStatementModal from "./ImportStatementModal";
import "../banking.css";

type Stage = "approval" | "verify" | "pay" | "returned";

type WorkRow = {
  id: string;
  requestNo: string;
  requestDate: string;
  kind: "commercial" | "general";
  source: string;
  orderNo?: string;
  beneficiary: string;
  remainingAmount: number;
  status: string;
  stage: Stage;
  deadline?: string | null;
};

const STAGE_OF: Record<string, Stage> = {
  PENDING_APPROVAL: "approval",
  PENDING_DIRECTOR_APPROVAL: "approval",
  APPROVED: "verify",
  SUBMITTED: "verify",
  BANK_VERIFIED: "pay",
  PARTIALLY_PAID: "pay",
  BANK_RETURNED: "returned",
  REJECTED: "returned",
  DIRECTOR_REJECTED: "returned",
};

const STAGE_ACTION: Record<Stage, { label: string; path: string }> = {
  approval: { label: "Duyệt", path: "/banking/payment-approvals" },
  verify: { label: "Kiểm tra", path: "/banking/payments" },
  pay: { label: "Ghi nhận chi", path: "/banking/payments" },
  returned: { label: "Xem lại", path: "/banking/payment-approvals" },
};

export function BankingDashboardPanel() {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [stageFilter, setStageFilter] = useState<Stage | "all">("all");
  const commercialQuery = useCommercialLotPaymentRequests();
  const generalQuery = useGeneralPaymentRequests();
  const recentQuery = useBankTransactions({ page: 1, pageSize: 100, confirmed: "" });
  const recent = recentQuery.data?.data ?? [];
  const termPendingQuery = useTermPaymentPendingRequests();
  const termBatchesQuery = useTermPaymentBatches({ page: 1, pageSize: 20 });
  const termPending = Array.isArray(termPendingQuery.data) ? termPendingQuery.data.length : 0;
  const termActive = (termBatchesQuery.data?.items ?? []).filter((batch) => batchNextStep(batch).step !== "DONE").length;

  const workRows = useMemo<WorkRow[]>(() => {
    const general = (generalQuery.data ?? [])
      .filter((item) => STAGE_OF[item.status])
      .map((item): WorkRow => ({
        id: `general-${item.id}`,
        requestNo: item.requestNo,
        requestDate: item.requestDate,
        kind: "general",
        source: "Chi khác",
        beneficiary: item.beneficiaryName,
        remainingAmount: Number(item.remainingAmount || 0),
        status: item.status,
        stage: STAGE_OF[item.status],
        deadline: item.paymentDeadline,
      }));
    const commercial = (commercialQuery.data ?? [])
      .filter((item) => STAGE_OF[item.status])
      .map((item): WorkRow => ({
        id: `commercial-${item.id}`,
        requestNo: item.requestNo,
        requestDate: item.requestDate,
        kind: "commercial",
        source: "Mua TM",
        orderNo: item.purchaseOrder.orderNo,
        beneficiary: item.purchaseOrder.supplier.name,
        remainingAmount: Number(item.remainingAmount || 0),
        status: item.status,
        stage: STAGE_OF[item.status],
      }));
    /* Hồ sơ có hạn gần nhất lên đầu, sau đó tới hồ sơ lập sớm nhất. */
    return [...general, ...commercial].sort((a, b) => {
      if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return a.requestDate.localeCompare(b.requestDate);
    });
  }, [commercialQuery.data, generalQuery.data]);

  const stageCount = (stage: Stage) => workRows.filter((row) => row.stage === stage).length;
  const stageAmount = (stage: Stage) => workRows.filter((row) => row.stage === stage).reduce((sum, row) => sum + row.remainingAmount, 0);
  const incomingPending = recent.filter((row) => row.direction === "IN" && !isReconciled(row.reconciliationStatus)).length;
  const outgoingPending = recent.filter((row) => row.direction === "OUT" && !isReconciled(row.reconciliationStatus)).length;
  const overdue = workRows.filter((row) => row.deadline && dayjs(row.deadline).isBefore(dayjs(), "day")).length;

  const kpis: BankingKpiItem[] = [
    { key: "approval", label: "Chờ phê duyệt", value: stageCount("approval"), hint: `${formatMoney(stageAmount("approval"))} đ`, icon: <AuditOutlined />, color: "#b7791f", warning: stageCount("approval") > 0, onClick: () => setStageFilter("approval") },
    { key: "verify", label: "Chờ kiểm tra hồ sơ", value: stageCount("verify"), hint: `${formatMoney(stageAmount("verify"))} đ`, icon: <CheckCircleOutlined />, color: "#3b6fd4", onClick: () => setStageFilter("verify") },
    { key: "pay", label: "Sẵn sàng lập lệnh", value: stageCount("pay"), hint: `${formatMoney(stageAmount("pay"))} đ`, icon: <SendOutlined />, color: "#08979c", onClick: () => setStageFilter("pay") },
    { key: "returned", label: "Bị trả lại / từ chối", value: stageCount("returned"), hint: overdue ? `${overdue} hồ sơ quá hạn` : "Cần bổ sung rồi gửi lại", icon: <WarningOutlined />, color: "#d46b08", warning: overdue > 0, onClick: () => setStageFilter("returned") },
    { key: "term", label: "Mua Term", value: termPending + termActive, hint: `${termPending} đề nghị chờ lập · ${termActive} bảng kê đang xử lý`, icon: <FileDoneOutlined />, color: "#722ed1", warning: termPending + termActive > 0, onClick: () => navigate("/banking/payments?source=term") },
    { key: "in", label: "Tiền vào chờ đối soát", value: incomingPending, hint: "Phân bổ vào công nợ khách", icon: <ArrowDownOutlined />, color: "#1d7a3a", warning: incomingPending > 0, onClick: () => navigate("/banking/receipts") },
    { key: "out", label: "Tiền ra chưa khớp", value: outgoingPending, hint: "Khớp với hồ sơ chi", icon: <ArrowUpOutlined />, color: "#c0392b", warning: outgoingPending > 0, onClick: () => navigate("/banking/statements") },
  ];

  const visibleRows = stageFilter === "all" ? workRows : workRows.filter((row) => row.stage === stageFilter);

  const columns: ColumnsType<WorkRow> = [
    { title: "Mã đơn / hồ sơ", dataIndex: "requestNo", width: 160, render: (value, row) => stack(row.orderNo || value, `${row.orderNo ? `${value} · ` : ""}${dateText(row.requestDate)}`, true) },
    { title: "Thụ hưởng / nhóm", width: 240, render: (_, row) => stack(row.beneficiary, row.source, true) },
    { title: "Còn phải chi", dataIndex: "remainingAmount", width: 130, align: "right", render: (value) => <span className="data-grid-num data-grid-strong">{formatMoney(value)}</span> },
    {
      title: "Hạn TT",
      dataIndex: "deadline",
      width: 92,
      render: (value) => <span style={value && dayjs(value).isBefore(dayjs(), "day") ? { color: "#c0392b", fontWeight: 600 } : undefined}>{dateText(value)}</span>,
    },
    { title: "Trạng thái", dataIndex: "status", width: 135, render: (status, row) => statusTag(row.kind === "general" ? GENERAL_REQUEST_STATUS : COMMERCIAL_REQUEST_STATUS, status) },
    {
      title: "",
      width: 100,
      align: "right",
      render: (_, row) => {
        const action = STAGE_ACTION[row.stage];
        return (
          <Button size="small" type={row.stage === "returned" ? "default" : "primary"} onClick={() => navigate(`${action.path}?source=${row.kind}`)}>
            {action.label}
          </Button>
        );
      },
    },
  ];

  return (
    <div className="page-shell">
      <PageHeader
        title="Tổng quan ngân hàng"
        subtitle="Việc cần xử lý hôm nay: duyệt chi, kiểm tra hồ sơ, lập lệnh và đối soát sao kê."
        actions={
          <>
            <Button size="small" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>Tạo hồ sơ chi</Button>
            <Button size="small" type="primary" icon={<ImportOutlined />} onClick={() => setImportOpen(true)}>Import sao kê</Button>
          </>
        }
      />

      <BankingKpis items={kpis} activeKey={stageFilter} />

      <div className="banking-dashboard-grid">
        <BankingSection
          title="Hồ sơ chi cần xử lý"
          hint={`${visibleRows.length} hồ sơ`}
          extra={
            <Segmented<Stage | "all">
              size="small"
              value={stageFilter}
              onChange={setStageFilter}
              options={[
                { value: "all", label: "Tất cả" },
                { value: "approval", label: "Chờ duyệt" },
                { value: "verify", label: "Chờ kiểm tra" },
                { value: "pay", label: "Lập lệnh" },
                { value: "returned", label: "Trả lại" },
              ]}
            />
          }
        >
          <Table<WorkRow>
            className="data-grid"
            rowKey="id"
            size="small"
            loading={commercialQuery.isLoading || generalQuery.isLoading}
            dataSource={visibleRows}
            columns={columns}
            scroll={{ x: 840 }}
            pagination={{ pageSize: 10, hideOnSinglePage: true, showSizeChanger: false }}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có hồ sơ cần xử lý" /> }}
          />
        </BankingSection>

        <BankingSection
          title="Giao dịch gần đây"
          extra={
            <Button size="small" type="link" style={{ padding: 0 }} onClick={() => navigate("/banking/statements")}>
              Xem sao kê <ArrowRightOutlined />
            </Button>
          }
        >
          <Spin spinning={recentQuery.isLoading}>
            {recent.length ? (
              <div className="banking-feed">
                {recent.slice(0, 10).map((row) => (
                  <div className="banking-feed-row" key={row.id}>
                    <span className="data-grid-clip data-grid-strong">{row.counterpartyName || row.description || "—"}</span>
                    <SignedAmount direction={row.direction} value={row.amount} />
                    <span className="data-grid-clip data-grid-sub">
                      {dateText(row.txnDate)}
                      {row.bankAccount ? ` · ${row.bankAccount.bankCode}` : ""}
                      {" · "}
                      {RECONCILIATION_STATUS[row.reconciliationStatus ?? "PENDING"]?.label}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có giao dịch" />
            )}
          </Spin>
        </BankingSection>
      </div>

      <GeneralPaymentCreateModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <ImportStatementModal open={importOpen} onCancel={() => setImportOpen(false)} onSuccess={() => recentQuery.refetch()} />
    </div>
  );
}
