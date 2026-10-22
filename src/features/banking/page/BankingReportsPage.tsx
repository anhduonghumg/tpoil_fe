import { Tabs } from "antd";
import { useSearchParams } from "react-router-dom";
import { BankCashPositionPanel } from "../ui/BankCashPositionPanel";
import { BankingReportPanel } from "../ui/BankingReportPanel";

/* Trọng tâm của báo cáo ngân hàng là "tiền của mình đang ở đâu, bao nhiêu". Bảng tiền vào / ra theo
   kỳ và tình trạng đối soát vẫn giữ, ở tab thứ hai. */
export default function BankingReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "flow" ? "flow" : "cash";
  return (
    <div className="page-shell">
      <Tabs
        className="page-shell-tabs"
        size="small"
        activeKey={tab}
        onChange={(key) => setSearchParams(key === "flow" ? { tab: "flow" } : {}, { replace: true })}
        items={[
          { key: "cash", label: "Số dư" },
          { key: "flow", label: "Dòng tiền theo kỳ" },
        ]}
      />
      {tab === "cash" ? <BankCashPositionPanel /> : <BankingReportPanel embedded />}
    </div>
  );
}
