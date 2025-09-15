import React, { useMemo, useState, useCallback } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Layout,
  Menu,
  Dropdown,
  Avatar,
  Typography,
  Breadcrumb,
  Drawer,
  Grid,
  Badge,
  Tooltip,
  Input,
} from "antd";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  ShoppingCartOutlined,
  DatabaseOutlined,
  UserOutlined,
  LogoutOutlined,
  BellOutlined,
  MailOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import "./AppLayout.css";
import { useLogout, useMe } from "../../../features/auth/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { saveUserToCache } from "../../../features/auth/session";

import logo from "../../../assets/logo_200.png";
import { confirmDialog } from "../../lib/confirm";

const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;

type NavItem = {
  key: string;
  label: string;
  icon?: JSX.Element;
  children?: NavItem[];
};

const NAV: NavItem[] = [
  { key: "/", label: "Dashboard", icon: <DashboardOutlined /> },
  { key: "/orders", label: "Đơn hàng", icon: <ShoppingCartOutlined /> },
  { key: "/inventory", label: "Kho hàng", icon: <DatabaseOutlined /> },
];
const FLAT_KEYS = NAV.flatMap((i) =>
  i.children ? [i.key, ...i.children.map((c) => c.key)] : [i.key]
);
const MENU_ITEMS = NAV.map((n) => ({
  key: n.key,
  icon: n.icon,
  label: n.label,
  children: n.children?.map((c) => ({
    key: c.key,
    icon: c.icon,
    label: c.label,
  })),
}));
const BREADCRUMB: Record<string, string> = {
  "/": "Dashboard",
  "/orders": "Đơn hàng",
  "/inventory": "Kho hàng",
};

const SiderMenu = React.memo(function SiderMenu({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate: (key: string) => void;
}) {
  return (
    <>
      <div className="app-brand" onClick={() => onNavigate("/")}>
        <img style={{ width: "64px" }} src={logo} className="" alt="Logo" />
      </div>
      <Menu
        theme="dark"
        mode="inline"
        items={MENU_ITEMS}
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
      <Input
        allowClear
        prefix={<SearchOutlined />}
        placeholder="Tìm kiếm..."
        className="app-search"
      />
      <Tooltip title="Thông báo">
        <Badge count={3} size="small">
          <BellOutlined className="icon-btn" />
        </Badge>
      </Tooltip>
      <Tooltip title="Tin nhắn">
        <Badge dot>
          <MailOutlined className="icon-btn" />
        </Badge>
      </Tooltip>
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

  const me = useMe();
  const logout = useLogout();
  const qc = useQueryClient();

  const onNavigate = useCallback(
    (key: string) => {
      if (pathname !== key) nav(key);
      if (open) setOpen(false);
    },
    [nav, pathname, open]
  );

  const onToggleSider = useCallback(() => {
    if (isMobile) setOpen(true);
    else setCollapsed((c) => !c);
  }, [isMobile]);


  const handleLogout = () => {
    confirmDialog.confirm(
      "Xác nhận",
      "Bạn có chắc chắn muốn đăng xuất khỏi phiên làm việc hiện tại?",
      onLogout
    );
  };

  const onLogout = async () => {
    try {
      await logout.mutateAsync();
    } finally {
      qc.removeQueries({ queryKey: ["auth", "me"], exact: true });
      saveUserToCache(null);
      nav("/login", { replace: true });
    }
  };
  
  const selectedKeys = useMemo(() => {
    const best = FLAT_KEYS.filter(
      (k) => pathname === k || pathname.startsWith(k + "/")
    ).sort((a, b) => b.length - a.length)[0];
    return [best || "/"];
  }, [pathname]);

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

  const userName = (me?.data?.fullname || me?.data?.email || "User") as string;

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
          <SiderMenu collapsed={collapsed} onNavigate={onNavigate} />
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
          <SiderMenu collapsed={false} onNavigate={onNavigate} />
        </Drawer>
      )}
    </Layout>
  );
}
