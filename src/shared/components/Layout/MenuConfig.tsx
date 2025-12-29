import React from "react";
import {
  DashboardOutlined,
  ShoppingCartOutlined,
  DatabaseOutlined,
  UserOutlined,
  ApartmentOutlined,
  TeamOutlined,
  SolutionOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import { PERMS } from "../../authz/perms";

export type NavItem = {
  key: string;
  label: string;
  icon?: JSX.Element;
  children?: NavItem[];
  need?: string;
};

export const NAV_ITEMS: NavItem[] = [
  { key: "/", label: "Dashboard", icon: <DashboardOutlined /> },
  {
    key: "/orders",
    label: "Đơn hàng",
    icon: <ShoppingCartOutlined />,
  },
  {
    key: "/inventory",
    label: "Kho hàng",
    icon: <DatabaseOutlined />,
  },
  {
    key: "/users",
    label: "Người dùng",
    icon: <UserOutlined />,
    need: PERMS.USERS_VIEW,
  },
  {
    key: "/employees",
    label: "Nhân viên",
    icon: <UserOutlined />,
    need: PERMS.USERS_VIEW,
  },
  {
    key: "/department",
    label: "Phòng ban",
    icon: <ApartmentOutlined />,
  },
  {
    key: "/customers",
    label: "Khách hàng",
    icon: <TeamOutlined />,
  },
  { key: "/suppliers", label: "Nhà cung cấp", icon: <TeamOutlined /> },
  {
    key: "/contracts",
    label: "Hợp đồng",
    icon: <SolutionOutlined />,
  },
  {
    key: "/contractTypes",
    label: "Loại hợp đồng",
    icon: <UnorderedListOutlined />,
  },
  {
    key: "/cron",
    label: "Công việc định kỳ",
    icon: <UnorderedListOutlined />,
    need: PERMS.SYSTEM_RBAC_ADMIN,
  },
  {
    key: "/settings/roles",
    label: "Phân quyền",
    icon: <UnorderedListOutlined />,
    need: PERMS.SYSTEM_RBAC_ADMIN,
  },
  {
    key: "/settings/customer-groups",
    label: "Nhóm khách hàng",
    icon: <TeamOutlined />,
  },
];
