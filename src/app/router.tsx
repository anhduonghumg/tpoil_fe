import { createBrowserRouter, redirect } from "react-router-dom";
import Login from "../features/auth/pages/Login";
import Dashboard from "../features/dashboard/pages/Dashboard";
import AppLayout from "../shared/components/Layout/AppLayout";
import { loadUserFromCache } from "../features/auth/session";
import UsersList from "../features/users/page/UsersList";
import UserDetail from "../features/users/page/UserDetail";
import DepartmentsPage from "../features/departments/page/DepartmentsPage";
import ContractsPage from "../features/contracts/page/ContractsPage";
import ContractTypesPage from "../features/contract-types/page/ContractTypesPage";
import { CustomerPage } from "../features/customers/page/CustomersPage";
import { ContractsExpiryReportPage } from "../features/contracts/ui/ContractsExpiryReportPage";
import { ContractsModuleLayout } from "../features/contracts/ui/ContractsModuleLayout";
import CronJobsPage from "../features/cron/page/CronJobsPage";
// import { Test } from "../page/Test";

const requireAuth = async () => {
  const cached = loadUserFromCache();
  if (!cached) {
    throw redirect("/login");
  }
  return null;
};

export const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  {
    path: "/",
    loader: requireAuth,
    element: <AppLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "dashboard", element: <Dashboard /> },
      { path: "orders", element: <div>Đơn hàng</div> },
      { path: "inventory", element: <div>Kho hàng</div> },
      { path: "users", element: <UsersList /> },
      { path: "users/:id", element: <UserDetail /> },
      { path: "department", element: <DepartmentsPage /> },
      { path: "customers", element: <CustomerPage /> },
      {
        path: "contracts",
        element: <ContractsModuleLayout />,
        children: [
          {
            index: true, // /contracts
            element: <ContractsPage />,
          },
          {
            path: "expiry-report", // /contracts/expiry-report
            element: <ContractsExpiryReportPage />,
          },
        ],
      },
      { path: "contractTypes", element: <ContractTypesPage /> },
      { path: "cron", element: <CronJobsPage /> },
    ],
  },
  // {
  //   path: "/test",
  //   // loader: requireAuth,
  //   element: <Test />,
  // },
]);
