// features/contracts/ui/ContractsModuleLayout.tsx
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Tabs } from "antd";
export const ContractsModuleLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isExpiryReport = location.pathname.includes("/contracts/expiry-report");
  const activeKey = isExpiryReport ? "expiry" : "list";

  const handleChangeTab = (key: string) => {
    if (key === "list") {
      navigate("/contracts");
    } else if (key === "expiry") {
      navigate("/contracts/expiry-report");
    }
  };

  return (
    <>
      <Tabs
        activeKey={activeKey}
        onChange={handleChangeTab}
        items={[
          { key: "list", label: "Danh sách hợp đồng" },
          { key: "expiry", label: "Báo cáo hết hạn" },
        ]}
      />
      <Outlet />
    </>
  );
};
