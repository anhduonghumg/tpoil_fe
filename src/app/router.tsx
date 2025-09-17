import { createBrowserRouter, redirect } from "react-router-dom";
import { AuthApi } from "../features/auth/api";
import Login from "../features/auth/pages/Login";
import Dashboard from "../features/dashboard/pages/Dashboard";
import AppLayout from "../shared/components/Layout/AppLayout";
import { loadUserFromCache } from "../features/auth/session";
import UsersList from "../features/users/page/UsersList";
import UserDetail from "../features/users/page/UserDetail";

const requireAuth = async () => {
  if (loadUserFromCache()) return null;
  try {
    await AuthApi.me();
    return null;
  } catch {
    throw redirect("/login");
  }
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
      { path: 'users', element: <UsersList /> },
      { path: 'users/:id', element: <UserDetail /> },
    ],
  },
  // {
  //   path: "/",
  //   loader: requireAuth,
  //   element: <AppLayout />,
  //   children: [
  //     { index: true, element: <Dashboard /> },
  //     { path: "dashboard", element: <Dashboard /> },
  //   ],
  // },
  // { path: "*", element: <NotFound /> },
]);
