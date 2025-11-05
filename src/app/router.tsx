import { createBrowserRouter, redirect } from "react-router-dom";
import Login from "../features/auth/pages/Login";
import Dashboard from "../features/dashboard/pages/Dashboard";
import AppLayout from "../shared/components/Layout/AppLayout";
import { loadUserFromCache } from "../features/auth/session";
import UsersList from "../features/users/page/UsersList";
import UserDetail from "../features/users/page/UserDetail";
import DepartmentsPage from "../features/departments/page/DepartmentsPage";
import CustomersPage from "../features/customers/page/CustomersPage";
import ContractsPage from "../features/contracts/page/ContractsPage";
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
      { path: "customers", element: <CustomersPage /> },
      { path: "contracts", element: <ContractsPage /> },
    ],
  },
  // {
  //   path: "/test",
  //   // loader: requireAuth,
  //   element: <Test />,
  // },
]);
