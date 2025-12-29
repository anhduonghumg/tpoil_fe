import { createBrowserRouter } from "react-router-dom";
import Login from "../features/auth/pages/Login";
import Dashboard from "../features/dashboard/pages/Dashboard";
import AppLayout from "../shared/components/Layout/AppLayout";
import UsersList from "../features/employees/page/UsersList";
import UserDetail from "../features/employees/page/UserDetail";
import DepartmentsPage from "../features/departments/page/DepartmentsPage";
import ContractsPage from "../features/contracts/page/ContractsPage";
import ContractTypesPage from "../features/contract-types/page/ContractTypesPage";
import { CustomerPage } from "../features/customers/page/CustomersPage";
import { ContractsExpiryReportPage } from "../features/contracts/ui/ContractsExpiryReportPage";
import { ContractsModuleLayout } from "../features/contracts/ui/ContractsModuleLayout";
import CronJobsPage from "../features/cron/page/CronJobsPage";
import RolesPage from "../features/rbac/roles/page/RolesPage";
import UsersPage from "../features/users/page/UsersPage";
import { PrivateShell } from "./PrivateShell";
import { RouteGuard } from "../shared/authz/RouteGuard";
import { PERMS } from "../shared/authz/perms";
import { CustomerGroupsPage } from "../features/customer-groups/page/CustomerGroupsPage";

export const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  {
    path: "/",
    element: <PrivateShell />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: "dashboard", element: <Dashboard /> },
          { path: "orders", element: <div>Đơn hàng</div> },
          { path: "inventory", element: <div>Kho hàng</div> },
          {
            path: "users",
            element: (
              <RouteGuard need={PERMS.USERS_VIEW}>
                <UsersPage />
              </RouteGuard>
            ),
          },
          { path: "employees", element: <UsersList /> },
          { path: "employees/:id", element: <UserDetail /> },
          { path: "department", element: <DepartmentsPage /> },
          {
            path: "customers",
            element: <CustomerPage partyTypeDefault="CUSTOMER" />,
          },
          {
            path: "customer-groups",
            element: <CustomerGroupsPage />,
          },
          {
            path: "suppliers",
            element: <CustomerPage partyTypeDefault="SUPPLIER" />,
          },
          {
            path: "contracts",
            element: <ContractsModuleLayout />,
            children: [
              { index: true, element: <ContractsPage /> },
              { path: "expiry-report", element: <ContractsExpiryReportPage /> },
            ],
          },
          { path: "contractTypes", element: <ContractTypesPage /> },
          { path: "cron", element: <CronJobsPage /> },
          { path: "settings/roles", element: <RolesPage /> },
          { path: "settings/customer-groups", element: <CustomerGroupsPage /> },
        ],
      },
    ],
  },
]);
