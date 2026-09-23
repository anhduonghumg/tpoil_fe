import { useMemo, useState } from "react";
import { Badge, Button, Segmented, Tabs } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "../../../shared/ui/PageHeader";
import "../../../shared/ui/table-filter.css";
import { useCommercialLotPaymentRequests } from "../../commercial-lots/hooks";
import { useGeneralPaymentRequests, useTermPaymentBatches, useTermPaymentPendingRequests } from "../hooks";
import { COMMERCIAL_APPROVAL_STATUSES, CommercialPaymentRequestsPanel } from "../ui/CommercialPaymentRequestsPanel";
import { GENERAL_APPROVAL_STATUSES, GeneralPaymentRequestsPanel } from "../ui/GeneralPaymentRequestsPanel";
import { GeneralPaymentCreateModal } from "../ui/GeneralPaymentCreateModal";
import { TermPaymentBatchesPanel, batchNextStep } from "../ui/TermPaymentBatchesPanel";
import "../banking.css";

type Stage = "approval" | "execution";
/* Ba loại hồ sơ chi, mỗi loại một cách chi:
   - commercial: mua hàng lẻ (lô thương mại) đã có hóa đơn, chi từng hồ sơ;
   - term: đơn mua TERM theo hợp đồng, gộp nhiều đề nghị vào một bảng kê gửi ngân hàng;
   - general: chi ngoài mua hàng (nội bộ, tài sản, thuế phí...). */
type Source = "commercial" | "term" | "general";

const PATH_BY_STAGE: Record<Stage, string> = {
  approval: "/banking/payment-approvals",
  execution: "/banking/payments",
};

/* Việc tồn ở bước "Thực hiện chi": hồ sơ đã trả xong vẫn nằm trong danh sách để
   tra cứu, nhưng không tính vào số trên tab. */
const GENERAL_EXECUTION_TODO = ["APPROVED", "BANK_VERIFIED", "PARTIALLY_PAID"];
const COMMERCIAL_EXECUTION_TODO = ["SUBMITTED", "BANK_VERIFIED", "PARTIALLY_PAID"];

const tabLabel = (text: string, count: number) => (
  <span>
    {text}
    {count ? <Badge count={count} size="small" overflowCount={99} style={{ marginLeft: 6, background: "#3b6fd4" }} /> : null}
  </span>
);

const withCount = (label: string, count: number) => `${label}${count ? ` (${count})` : ""}`;

export default function BankingPaymentsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  /* Link cũ /banking/term-batches giờ mở thẳng nhóm Mua TERM trong "Thực hiện chi". */
  const isLegacyTermPath = location.pathname === "/banking/term-batches";
  const stage: Stage = location.pathname === PATH_BY_STAGE.approval ? "approval" : "execution";

  const commercialQuery = useCommercialLotPaymentRequests();
  const generalQuery = useGeneralPaymentRequests();
  const termPendingQuery = useTermPaymentPendingRequests();
  const termBatchesQuery = useTermPaymentBatches({ page: 1, pageSize: 20 });

  const counts = useMemo(() => {
    const commercial = commercialQuery.data ?? [];
    const general = generalQuery.data ?? [];
    const termPending = Array.isArray(termPendingQuery.data) ? termPendingQuery.data.length : 0;
    const termBatches = (termBatchesQuery.data?.items ?? []).filter((batch) => batchNextStep(batch).step !== "DONE").length;
    return {
      approval: {
        commercial: commercial.filter((item) => COMMERCIAL_APPROVAL_STATUSES.includes(item.status)).length,
        term: 0,
        general: general.filter((item) => GENERAL_APPROVAL_STATUSES.includes(item.status)).length,
      },
      execution: {
        commercial: commercial.filter((item) => COMMERCIAL_EXECUTION_TODO.includes(item.status)).length,
        term: termPending + termBatches,
        general: general.filter((item) => GENERAL_EXECUTION_TODO.includes(item.status)).length,
      },
    };
  }, [commercialQuery.data, generalQuery.data, termPendingQuery.data, termBatchesQuery.data]);

  const stageCounts = counts[stage];
  const sources: Source[] = stage === "approval" ? ["commercial", "general"] : ["commercial", "term", "general"];
  const sourceParam = (isLegacyTermPath ? "term" : searchParams.get("source")) as Source | null;
  /* Chưa chọn nguồn thì mở sẵn nhóm đầu tiên đang có việc, để không ai phải bấm qua một bảng trống. */
  const source: Source = sourceParam && sources.includes(sourceParam)
    ? sourceParam
    : sources.find((item) => stageCounts[item] > 0) ?? "commercial";

  const setSource = (value: Source) => {
    const next = new URLSearchParams(searchParams);
    next.set("source", value);
    navigate({ pathname: PATH_BY_STAGE[stage], search: next.toString() }, { replace: true });
  };

  const sourceLabels: Record<Source, string> = {
    commercial: "Mua TM",
    term: "Mua Term",
    general: "Chi khác",
  };
  const sourceSwitch = (
    <Segmented<Source>
      size="small"
      value={source}
      onChange={setSource}
      options={sources.map((value) => ({ value, label: withCount(sourceLabels[value], stageCounts[value]) }))}
    />
  );

  const view = stage === "approval" ? "approval" : "payment";

  return (
    <div className="page-shell">
      <PageHeader
        title="Chi tiền"
        subtitle="Phê duyệt → kiểm tra thông tin thụ hưởng → lập lệnh tại ngân hàng → ghi nhận đã chi → đối soát sao kê."
        actions={
          <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            Tạo hồ sơ chi
          </Button>
        }
      />

      <Tabs
        className="page-shell-tabs"
        size="small"
        activeKey={stage}
        onChange={(key) => navigate(PATH_BY_STAGE[key as Stage])}
        items={[
          { key: "approval", label: tabLabel("Chờ phê duyệt", counts.approval.commercial + counts.approval.general) },
          { key: "execution", label: tabLabel("Thực hiện chi", counts.execution.commercial + counts.execution.term + counts.execution.general) },
        ]}
      />

      {source === "term" ? (
        <TermPaymentBatchesPanel toolbarLeft={sourceSwitch} />
      ) : source === "commercial" ? (
        <CommercialPaymentRequestsPanel key={`commercial-${view}`} view={view} toolbarLeft={sourceSwitch} />
      ) : (
        <GeneralPaymentRequestsPanel key={`general-${view}`} view={view} toolbarLeft={sourceSwitch} />
      )}

      <GeneralPaymentCreateModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
