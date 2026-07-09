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
  DeploymentUnitOutlined,
} from "@ant-design/icons";
import { PERMS } from "../../authz/perms";

export type NavItem = {
  key: string;
  label: string;
  icon?: JSX.Element;
  children?: NavItem[];
  need?: string | string[];
};

export const NAV_ITEMS: NavItem[] = [
  { key: "/", label: "Dashboard", icon: <DashboardOutlined /> },
  {
    key: "/operations",
    label: "Vận hành",
    icon: <DeploymentUnitOutlined />,
    need: PERMS.OPERATIONS_VIEW,
    children: [
      { key: "/operations", label: "Dashboard vận hành" },
      {
        key: "/operations/charter-orders",
        label: "Thuê tàu + Bảo hiểm",
        children: [
          { key: "/operations/charter-orders", label: "Đơn thuê tàu" },
          { key: "/operations/partners", label: "Đối tác vận hành" },
          { key: "/operations/vessels", label: "Danh mục tàu" },
          { key: "/operations/charter-contracts", label: "Hợp đồng thuê tàu" },
          { key: "/operations/charter-appendices", label: "Phụ lục hợp đồng" },
          { key: "/operations/freight-rates", label: "Bảng giá thuê tàu" },
        ],
      },
      {
        key: "/operations/vehicles",
        label: "Quản lý xe",
        children: [
          { key: "/operations/vehicles", label: "Danh mục xe" },
          { key: "/operations/drivers", label: "Lái xe" },
          { key: "/operations/vehicle-documents", label: "Hồ sơ xe" },
          { key: "/operations/driver-documents", label: "Hồ sơ lái xe" },
          { key: "/operations/vehicle-dispatches", label: "Đơn điều xe / chuyến xe" },
        ],
      },
      {
        key: "/operations/inventory-availability",
        label: "Quản lý kho",
        children: [
          { key: "/settings/inventory", label: "Danh mục kho" },
          { key: "/operations/storage-contracts", label: "Hợp đồng thuê kho" },
          { key: "/operations/inventory-availability", label: "Tồn kho kinh doanh" },
          { key: "/operations/inventory-accounting", label: "Tồn kho kế toán" },
          { key: "/operations/expected-inventory", label: "Hàng dự kiến" },
          { key: "/operations/reservations", label: "Giữ hàng" },
          { key: "/operations/warehouse-transfers", label: "Chuyển kho" },
          { key: "/operations/inventory-matrix", label: "Ma trận tồn kho" },
        ],
      },
    ],
  },
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
  {
    key: "/settings/products",
    label: "Sản phẩm",
    icon: <TeamOutlined />,
  },
  {
    key: "/settings/supplierLocations",
    label: "Kho hàng",
    icon: <TeamOutlined />,
  },
];
