import React, { useCallback, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Avatar,
  Breadcrumb,
  Drawer,
  Dropdown,
  Grid,
  Layout,
  Menu,
  Select,
} from "antd";
import {
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
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
import { getAuthorizedMenu } from "./MenuUtils";
import {
  DepartmentWorkspaceProvider,
  useDepartmentWorkspaceValue,
} from "../../../features/workspaces/context";
import type {
  DepartmentWorkspace,
  WorkspaceMenuItem,
} from "../../../features/workspaces/types";

const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;

const BREADCRUMB: Record<string, string> = {
  "/": "Dashboard",
  "/dashboard": "Dashboard",
  "/purchase-orders": "Đơn mua hàng",
  "/commercial-purchases/lots": "Mua thương mại lô",
  "/commercial-purchases/retail": "Mua thương mại lẻ",
  "/operations/inventory-receipts": "Nhập kho mua hàng",
  "/purchase-invoices": "Hóa đơn NCC",
  "/purchase/platts-prices": "Giá Platts",
  "/purchase/vcb-rates": "Tỷ giá VCB",
  "/purchase/tax-rates": "Thuế GTGT",
  "/purchase/environment-taxes": "Phí BVMT",
  "/purchase-terms": "Hồ sơ mua TERM",
  "/banking": "Ngân hàng",
  "/bank-accounts": "Tài khoản ngân hàng",
  "/bank-import-templates": "Mẫu import ngân hàng",
  "/bank-purposes": "Mục đích giao dịch",
  "/users": "Người dùng",
  "/employees": "Nhân viên",
  "/department": "Phòng ban",
  "/customers": "Khách hàng",
  "/suppliers": "Nhà cung cấp",
  "/contracts": "Hợp đồng",
  "/contracts/expiry-report": "Cảnh báo hết hạn",
  "/contractTypes": "Loại hợp đồng",
  "/cron": "Công việc định kỳ",
  "/settings/roles": "Phân quyền",
  "/settings/customer-groups": "Nhóm khách hàng",
  "/settings/products": "Sản phẩm",
  "/settings/inventory": "Kho hàng",
  "/settings/price-bulletins": "Giá sản phẩm",
};

function flattenMenu(items: WorkspaceMenuItem[]): WorkspaceMenuItem[] {
  return items.flatMap((item) =>
    item.children?.length ? [item, ...flattenMenu(item.children)] : [item],
  );
}

const SiderMenu = React.memo(function SiderMenu({
  collapsed,
  currentWorkspace,
  workspaces,
  onWorkspaceChange,
  onNavigate,
  items,
  selectedKeys,
}: {
  collapsed: boolean;
  currentWorkspace: DepartmentWorkspace;
  workspaces: DepartmentWorkspace[];
  onWorkspaceChange: (key: string) => void;
  onNavigate: (key: string) => void;
  items: any[];
  selectedKeys: string[];
}) {
  const workspaceOptions = useMemo(
    () =>
      workspaces.map((item) => ({
        value: item.key,
        label: item.name,
      })),
    [workspaces],
  );

  return (
    <>
      <div className="app-brand" onClick={() => onNavigate("/dashboard")}>
        <img style={{ width: "64px" }} src={logo} alt="Logo" />
      </div>

      <div className="app-workspace">
        {collapsed ? (
          <div className="app-workspace-compact" title={currentWorkspace.name}>
            {currentWorkspace.name.charAt(0).toUpperCase()}
          </div>
        ) : (
          <>
            <div className="app-workspace-label">Workspace</div>
            <Select
              className="app-workspace-select"
              value={currentWorkspace.key}
              options={workspaceOptions}
              disabled={workspaceOptions.length <= 1}
              onChange={onWorkspaceChange}
              popupMatchSelectWidth={false}
            />
          </>
        )}
      </div>

      <div className="app-menu-scroll">
        <Menu
          theme="dark"
          mode="inline"
          items={items}
          selectedKeys={selectedKeys}
          onClick={({ key }) => onNavigate(String(key))}
        />
      </div>
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
    [onLogout],
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
  const workspaceValue = useDepartmentWorkspaceValue({
    enabled: ready,
    permissions,
  });
  const logout = useLogout();
  const qc = useQueryClient();

  const menuItems = useMemo(() => {
    return getAuthorizedMenu(workspaceValue.menu as any, permissions);
  }, [permissions, workspaceValue.menu]);

  const flatKeys = useMemo(() => {
    const walk = (items: any[]): string[] =>
      items.flatMap((item) =>
        item.children?.length ? [item.key, ...walk(item.children)] : [item.key],
      );
    return walk(menuItems);
  }, [menuItems]);

  const menuLabels = useMemo(() => {
    return flattenMenu(workspaceValue.menu).reduce<Record<string, string>>(
      (acc, item) => {
        if (item.key.startsWith("/")) acc[item.key] = item.label;
        return acc;
      },
      {},
    );
  }, [workspaceValue.menu]);

  const onNavigate = useCallback(
    (key: string) => {
      if (!key.startsWith("/")) return;
      if (pathname !== key) nav(key);
      if (open) setOpen(false);
    },
    [nav, pathname, open],
  );

  const onWorkspaceChange = useCallback(
    (key: string) => {
      workspaceValue.setWorkspaceKey(key);
      if (pathname === "/" || pathname === "/dashboard") nav("/dashboard");
    },
    [nav, pathname, workspaceValue],
  );

  const onToggleSider = useCallback(() => {
    if (isMobile) setOpen(true);
    else setCollapsed((value) => !value);
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
      onLogout,
    );
  }, [onLogout]);

  const selectedKeys = useMemo(() => {
    const best = flatKeys
      .filter((key) => pathname === key || pathname.startsWith(key + "/"))
      .sort((a, b) => b.length - a.length)[0];
    return [best || "/dashboard"];
  }, [pathname, flatKeys]);

  const breadcrumbItems = useMemo(() => {
    const segs = pathname.split("/").filter(Boolean);
    const paths = [
      "/",
      ...segs.map((_, index) => "/" + segs.slice(0, index + 1).join("/")),
    ];

    const isUuidLike = (value: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        value,
      );

    return paths.map((path) => {
      const parts = path.split("/").filter(Boolean);
      const lastSeg = parts[parts.length - 1] || "";
      const prevSeg = parts[parts.length - 2] || "";

      let title = menuLabels[path] || BREADCRUMB[path];

      if (!title) {
        if (isUuidLike(lastSeg)) {
          if (prevSeg === "purchase-orders") title = "Chi tiết đơn mua";
          else if (prevSeg === "purchase-invoices") title = "Chi tiết hóa đơn NCC";
          else if (prevSeg === "purchase-terms") title = "Chi tiết hồ sơ TERM";
          else title = "Chi tiết";
        } else {
          title = decodeURIComponent(lastSeg || "Home");
        }
      }

      return { title, path };
    });
  }, [menuLabels, pathname]);

  const userName = (me?.name || me?.email || "User") as string;

  if (!ready) return null;

  return (
    <DepartmentWorkspaceProvider value={workspaceValue}>
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
              currentWorkspace={workspaceValue.currentWorkspace}
              workspaces={workspaceValue.workspaces}
              onWorkspaceChange={onWorkspaceChange}
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
                items={breadcrumbItems.map((item, index) => ({
                  title:
                    index === breadcrumbItems.length - 1 ? (
                      <span>{item.title}</span>
                    ) : (
                      <a
                        onClick={(event) => {
                          event.preventDefault();
                          onNavigate(item.path);
                        }}
                      >
                        {item.title}
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
            width={260}
          >
            <SiderMenu
              collapsed={false}
              currentWorkspace={workspaceValue.currentWorkspace}
              workspaces={workspaceValue.workspaces}
              onWorkspaceChange={onWorkspaceChange}
              onNavigate={onNavigate}
              items={menuItems}
              selectedKeys={selectedKeys}
            />
          </Drawer>
        )}
      </Layout>
    </DepartmentWorkspaceProvider>
  );
}
