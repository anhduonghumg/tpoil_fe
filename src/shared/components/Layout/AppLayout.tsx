import React, { useMemo, useState, useCallback } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Layout, Menu, Dropdown, Avatar, Breadcrumb, Drawer, Grid } from "antd";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  ShoppingCartOutlined,
  DatabaseOutlined,
  UserOutlined,
  ApartmentOutlined,
  TeamOutlined,
  SolutionOutlined,
  UnorderedListOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import "./AppLayout.css";
import { useLogout } from "../../../features/auth/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { clearUserCache } from "../../../features/auth/session";

// @ts-ignore
import logo from "../../../assets/logo_200.png";
import { confirmDialog } from "../../lib/confirm";
import NotificationsBell from "./NotificationsBell";
import { useAppSession } from "../../authz/AppSessionProvider";
import { PERMS } from "../../authz/perms";
import { getAuthorizedMenu } from "./MenuUtils";

const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;

type NavItem = {
  key: string;
  label: string;
  icon?: JSX.Element;
  children?: NavItem[];
  need?: string;
};

const NAV: NavItem[] = [
  { key: "/", label: "Dashboard", icon: <DashboardOutlined /> },
  { key: "/orders", label: "Đơn hàng", icon: <ShoppingCartOutlined /> },
  { key: "/inventory", label: "Kho hàng", icon: <DatabaseOutlined /> },
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
  },
  { key: "/department", label: "Phòng ban", icon: <ApartmentOutlined /> },
  {
    key: "/customers",
    label: "Khách hàng",
    icon: <TeamOutlined />,
  },
  {
    key: "/suppliers",
    label: "Nhà cung cấp",
    icon: <TeamOutlined />,
  },
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
    key: "master",
    label: "Danh mục",
    icon: <UnorderedListOutlined />,
    children: [
      {
        key: "/settings/customer-groups",
        label: "Nhóm khách hàng",
        icon: <TeamOutlined />,
      },
    ],
  },
];

const BREADCRUMB: Record<string, string> = {
  "/": "Dashboard",
  "/orders": "Đơn hàng",
  "/inventory": "Kho hàng",
  "/users": "Người dùng",
  "/employees": "Nhân viên",
  "/department": "Phòng ban",
  "/customers": "Khách hàng",
  "/contracts": "Hợp đồng",
  "/contractTypes": "Loại hợp đồng",
  "/cron": "Công việc định kỳ",
  "/settings/roles": "Phân quyền",
  "/settings/customer-groups": "Nhóm khách hàng",
};

const SiderMenu = React.memo(function SiderMenu({
  collapsed,
  onNavigate,
  items,
  selectedKeys,
}: {
  collapsed: boolean;
  onNavigate: (key: string) => void;
  items: any[];
  selectedKeys: string[];
}) {
  return (
    <>
      <div className="app-brand" onClick={() => onNavigate("/")}>
        <img style={{ width: "64px" }} src={logo} className="" alt="Logo" />
      </div>
      <Menu
        theme="dark"
        mode="inline"
        items={items}
        selectedKeys={selectedKeys}
        onClick={({ key }) => onNavigate(String(key))}
      />
    </>
  );
});

const HeaderRight = React.memo(function HeaderRight({
  userName,
  onLogout,
}: {
  userName: string;
  onLogout: () => void;
}) {
  const userMenu = useMemo(
    () => ({
      items: [
        {
          key: "profile",
          icon: <UserOutlined />,
          label: "Hồ sơ",
          disabled: false,
        },
        { type: "divider" as const },
        {
          key: "logout",
          icon: <LogoutOutlined />,
          label: "Đăng xuất",
          onClick: onLogout,
        },
      ],
    }),
    [onLogout]
  );

  return (
    <div className="app-header-right">
      <NotificationsBell />
      <Dropdown menu={userMenu} trigger={["click"]} placement="bottomRight">
        <div className="app-user">
          <Avatar size={32} style={{ backgroundColor: "#10b981" }}>
            {userName.charAt(0).toUpperCase()}
          </Avatar>
          <span className="app-user-name">{userName}</span>
        </div>
      </Dropdown>
    </div>
  );
});

export default function AppLayout() {
  const screens = useBreakpoint();
  const isMobile = !screens.lg;
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);

  const nav = useNavigate();
  const { pathname } = useLocation();

  const { me, ready, permissions } = useAppSession();
  const logout = useLogout();
  const qc = useQueryClient();

  if (!ready) return null;

  const menuItems = useMemo(() => {
    return getAuthorizedMenu(NAV, permissions);
  }, [permissions]);

  const flatKeys = useMemo(() => {
    const walk = (items: any[]): string[] =>
      items.flatMap((i) =>
        i.children?.length ? [i.key, ...walk(i.children)] : [i.key]
      );
    return walk(menuItems);
  }, [menuItems]);

  const onNavigate = useCallback(
    (key: string) => {
      if (!key.startsWith("/")) return;
      if (pathname !== key) nav(key);
      if (open) setOpen(false);
    },
    [nav, pathname, open]
  );

  const onToggleSider = useCallback(() => {
    if (isMobile) setOpen(true);
    else setCollapsed((c) => !c);
  }, [isMobile]);

  const onLogout = useCallback(async () => {
    try {
      await logout.mutateAsync();
    } finally {
      clearUserCache();
      await qc.cancelQueries();
      qc.clear();
      nav("/login", { replace: true });
    }
  }, [logout, qc, nav]);

  const handleLogout = useCallback(() => {
    confirmDialog.confirm(
      "Xác nhận",
      "Bạn có chắc chắn muốn đăng xuất khỏi phiên làm việc hiện tại?",
      onLogout
    );
  }, [onLogout]);

  const selectedKeys = useMemo(() => {
    const best = flatKeys
      .filter((k) => pathname === k || pathname.startsWith(k + "/"))
      .sort((a, b) => b.length - a.length)[0];
    return [best || "/"];
  }, [pathname, flatKeys]);

  const breadcrumbItems = useMemo(() => {
    const segs = pathname.split("/").filter(Boolean);
    const paths = [
      "/",
      ...segs.map((_, i) => "/" + segs.slice(0, i + 1).join("/")),
    ];
    return paths.map((p, i) => ({
      title:
        i === paths.length - 1
          ? BREADCRUMB[p] || decodeURIComponent(p.split("/").pop() || "")
          : BREADCRUMB[p] || "Home",
      path: p,
    }));
  }, [pathname]);

  const userName = (me?.name || me?.email || "User") as string;

  return (
    <Layout className="app-root">
      {!isMobile && (
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          breakpoint="lg"
          width={220}
          className="app-sider"
        >
          <SiderMenu
            collapsed={collapsed}
            onNavigate={onNavigate}
            items={menuItems}
            selectedKeys={selectedKeys}
          />
        </Sider>
      )}

      <Layout>
        <Header className="app-header">
          <div className="app-header-left">
            {isMobile ? (
              <MenuUnfoldOutlined
                className="trigger"
                onClick={() => setOpen(true)}
              />
            ) : collapsed ? (
              <MenuUnfoldOutlined className="trigger" onClick={onToggleSider} />
            ) : (
              <MenuFoldOutlined className="trigger" onClick={onToggleSider} />
            )}
            <Breadcrumb
              items={breadcrumbItems.map((b, i) => ({
                title:
                  i === breadcrumbItems.length - 1 ? (
                    <span>{b.title}</span>
                  ) : (
                    <a
                      onClick={(e) => {
                        e.preventDefault();
                        onNavigate(b.path);
                      }}
                    >
                      {b.title}
                    </a>
                  ),
              }))}
            />
          </div>

          <HeaderRight userName={userName} onLogout={handleLogout} />
        </Header>

        <Content className="app-content">
          <div className="app-card">
            <Outlet />
          </div>
        </Content>
      </Layout>

      {isMobile && (
        <Drawer
          open={open}
          placement="left"
          onClose={() => setOpen(false)}
          style={{ padding: 0 }}
          width={220}
        >
          <SiderMenu
            collapsed={false}
            onNavigate={onNavigate}
            items={menuItems}
            selectedKeys={selectedKeys}
          />
        </Drawer>
      )}
    </Layout>
  );
}
