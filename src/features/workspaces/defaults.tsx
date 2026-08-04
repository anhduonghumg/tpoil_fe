import React from "react";
import {
  ApartmentOutlined,
  AuditOutlined,
  BankOutlined,
  BarChartOutlined,
  BellOutlined,
  BookOutlined,
  CalculatorOutlined,
  CheckCircleOutlined,
  ContainerOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  DollarOutlined,
  FileDoneOutlined,
  FileProtectOutlined,
  FileSearchOutlined,
  FileSyncOutlined,
  FileTextOutlined,
  FormOutlined,
  GoldOutlined,
  HddOutlined,
  OrderedListOutlined,
  PercentageOutlined,
  ReconciliationOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  SolutionOutlined,
  SwapOutlined,
  TeamOutlined,
  ToolOutlined,
  TruckOutlined,
  UserOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { PERMS } from "../../shared/authz/perms";
import type {
  DepartmentWorkspace,
  DepartmentWorkspaceKey,
  WorkspaceDashboard,
  WorkspaceMenuItem,
  WorkspaceProcessStep,
  WorkspaceReport,
  WorkspaceShortcut,
} from "./types";

export const DEFAULT_WORKSPACES: DepartmentWorkspace[] = [
  {
    key: "purchase",
    name: "Mua hàng",
    departmentCode: "PURCHASE",
    dashboardKey: "purchase.dashboard",
    isPrimary: true,
  },
  {
    key: "banking",
    name: "Ngân hàng",
    departmentCode: "BANKING",
    dashboardKey: "banking.dashboard",
  },
  {
    key: "sales",
    name: "Bán hàng",
    departmentCode: "SALES",
    dashboardKey: "sales.dashboard",
  },
  {
    key: "operations",
    name: "Vận hành",
    departmentCode: "OPERATIONS",
    dashboardKey: "operations.dashboard",
  },
  {
    key: "legal",
    name: "Pháp chế",
    departmentCode: "LEGAL",
    dashboardKey: "legal.dashboard",
  },
  {
    key: "executive",
    name: "Ban giám đốc",
    departmentCode: "EXECUTIVE",
    dashboardKey: "executive.dashboard",
  },
  {
    key: "admin",
    name: "Quản trị",
    departmentCode: "ADMIN",
    dashboardKey: "admin.dashboard",
  },
];

export const WORKSPACE_MENU: Record<string, WorkspaceMenuItem[]> = {
  purchase: [
    { key: "/dashboard", label: "Tổng quan mua hàng", icon: <DashboardOutlined /> },
    { key: "/contracts", label: "Hợp đồng mua hàng", icon: <SolutionOutlined /> },
    { key: "/purchase-terms", label: "Hồ sơ mua TERM", icon: <FileDoneOutlined /> },
    {
      key: "commercial-purchases",
      label: "Mua thương mại",
      icon: <ShoppingCartOutlined />,
      children: [
        { key: "/commercial-purchases/lots", label: "Mua thương mại lô" },
        { key: "/commercial-purchases/retail", label: "Mua thương mại lẻ" },
      ],
    },
    { key: "/operations/inventory-receipts", label: "Nhập kho mua hàng", icon: <DatabaseOutlined /> },
    { key: "/suppliers", label: "Công nợ NCC", icon: <TeamOutlined /> },
    { key: "/settings/products", label: "Hàng hóa, dịch vụ", icon: <GoldOutlined /> },
    {
      key: "purchase-price-config",
      label: "Giá & thuế",
      icon: <BarChartOutlined />,
      children: [
        { key: "/purchase/platts-prices", label: "Platts/MOPS" },
        { key: "/purchase/vcb-rates", label: "Tỷ giá VCB" },
        { key: "/purchase/tax-rates", label: "Thuế GTGT" },
        { key: "/purchase/environment-taxes", label: "Phí BVMT" },
      ],
    },
  ],
  banking: [
    { key: "/banking", label: "Dashboard cảnh báo", icon: <DashboardOutlined /> },
    { key: "/banking/payment-approvals", label: "Đề nghị duyệt chi", icon: <CheckCircleOutlined /> },
    { key: "/banking/payments", label: "Thanh toán", icon: <BankOutlined /> },
    { key: "/banking/statements", label: "Sao kê", icon: <FileTextOutlined /> },
    { key: "/banking/term-batches", label: "Bảng kê TERM", icon: <ReconciliationOutlined /> },
    { key: "/bank-accounts", label: "Tài khoản công ty", icon: <BankOutlined /> },
    { key: "/bank-import-templates", label: "Mẫu import sao kê", icon: <SettingOutlined /> },
  ],
  sales: [
    { key: "/dashboard", label: "Tổng quan bán hàng", icon: <DashboardOutlined /> },
    { key: "/contracts", label: "Hợp đồng bán hàng", icon: <SolutionOutlined /> },
    {
      key: "/sales/orders",
      label: "Đơn bán",
      icon: <OrderedListOutlined />,
      need: PERMS.SALES_VIEW,
    },
    {
      key: "/sales/withdrawals",
      label: "Rút lô",
      icon: <TruckOutlined />,
      need: PERMS.SALES_VIEW,
    },
    {
      key: "/sales/deliveries",
      label: "Lệnh xuất kho",
      icon: <ContainerOutlined />,
      need: PERMS.SALES_VIEW,
    },
    {
      key: "/sales/customer-stock",
      label: "Tồn kho của khách",
      icon: <DatabaseOutlined />,
      need: PERMS.SALES_VIEW,
    },
    {
      key: "/sales/invoices",
      label: "Hóa đơn bán hàng",
      icon: <FileTextOutlined />,
      need: PERMS.SALES_INVOICE_VIEW,
    },
    {
      key: "/sales/receivables",
      label: "Công nợ phải thu",
      icon: <DollarOutlined />,
      need: PERMS.SALES_RECEIVABLE_VIEW,
    },
    {
      key: "/sales/approvals",
      label: "Phê duyệt đơn bán",
      icon: <CheckCircleOutlined />,
      need: PERMS.SALES_VIEW,
    },
    { key: "/purchase-orders", label: "Đơn đặt mua trong ngày", icon: <ShoppingCartOutlined /> },
    { key: "/customers", label: "Khách hàng", icon: <TeamOutlined /> },
    { key: "/settings/products", label: "Hàng hóa", icon: <GoldOutlined /> },
    { key: "/settings/price-bulletins", label: "Bảng giá bán", icon: <BarChartOutlined /> },
    { key: "/banking/statements", label: "Thu tiền", icon: <BankOutlined /> },
  ],
  operationsLegacy: [
    { key: "/dashboard", label: "Tổng quan vận hành", icon: <DashboardOutlined /> },
    { key: "/settings/inventory", label: "Tồn kho", icon: <DatabaseOutlined /> },
    { key: "/purchase-terms", label: "Giao nhận", icon: <TruckOutlined /> },
    { key: "/settings/inventory", label: "Đối chiếu kho", icon: <SwapOutlined /> },
    { key: "/purchase-terms", label: "Tàu/chuyến biển", icon: <ContainerOutlined /> },
    { key: "/purchase-terms", label: "Logistics", icon: <TruckOutlined /> },
    { key: "/purchase-terms", label: "Hao hụt", icon: <WarningOutlined /> },
  ],
  operations: [
    {
      key: "/operations",
      label: "Dashboard vận hành",
      icon: <DashboardOutlined />,
      need: PERMS.OPERATIONS_VIEW,
    },
    {
      key: "operations-charter",
      label: "Thuê tàu + Bảo hiểm",
      icon: <ContainerOutlined />,
      need: PERMS.OPERATIONS_VIEW,
      children: [
        { key: "/operations/ship-charters/dashboard", label: "Dashboard thuê tàu" },
        { key: "/operations/charter-orders", label: "Đơn thuê tàu" },
        { key: "/operations/ship-owners", label: "Chủ tàu / Đơn vị vận tải biển" },
        { key: "/operations/vessels", label: "Danh mục tàu" },
        { key: "/operations/vessel-documents", label: "Hồ sơ con tàu" },
        { key: "/operations/charter-contracts", label: "Hợp đồng thuê tàu" },
        { key: "/operations/charter-appendices", label: "Phụ lục hợp đồng thuê tàu" },
        { key: "/operations/freight-rates", label: "Bảng giá thuê tàu" },
        { key: "/operations/charter-insurances", label: "Bảo hiểm hàng hóa" },
        { key: "/operations/charter-inspections", label: "Đăng ký giám định" },
        { key: "/operations/shipping-agent-registrations", label: "Đăng ký đại lý tàu" },
      ],
    },
    {
      key: "operations-road",
      label: "Quản lý xe",
      icon: <TruckOutlined />,
      need: PERMS.OPERATIONS_VIEW,
      children: [
        { key: "/operations/vehicles", label: "Danh mục xe" },
        { key: "/operations/drivers", label: "Lái xe" },
        { key: "/operations/vehicle-documents", label: "Hồ sơ xe" },
        { key: "/operations/driver-documents", label: "Hồ sơ lái xe" },
        { key: "/operations/vehicle-dispatches", label: "Đơn điều xe / chuyến xe" },
      ],
    },
    {
      key: "operations-warehouse",
      label: "Quản lý kho",
      icon: <DatabaseOutlined />,
      need: PERMS.OPERATIONS_VIEW,
      children: [
        { key: "/operations/warehouse-dashboard", label: "Dashboard kho" },
        { key: "/settings/inventory", label: "Danh mục kho" },
        { key: "/settings/products", label: "Danh mục sản phẩm" },
        { key: "/operations/storage-contracts", label: "Hợp đồng thuê kho" },
        { key: "/operations/inventory-availability", label: "Tồn kho kinh doanh" },
        { key: "/operations/inventory-receipts", label: "Nhập kho mua hàng" },
        { key: "/sales/deliveries", label: "Xuất kho bán hàng" },
        { key: "/operations/inventory-accounting", label: "Tồn kho kế toán" },
        { key: "/operations/expected-inventory", label: "Hàng dự kiến" },
        { key: "/operations/reservations", label: "Giữ hàng / đặt giữ hàng" },
        { key: "/operations/warehouse-transfers", label: "Chuyển kho" },
        { key: "/operations/inventory-matrix", label: "Báo cáo ma trận tồn kho" },
      ],
    },
  ],
  legal: [
    { key: "/dashboard", label: "Tổng quan pháp chế", icon: <DashboardOutlined /> },
    { key: "/contracts", label: "Hợp đồng", icon: <SolutionOutlined /> },
    { key: "/contractTypes", label: "Phụ lục", icon: <BookOutlined /> },
    { key: "/contracts", label: "Tài liệu đính kèm", icon: <FileProtectOutlined /> },
    { key: "/contracts/expiry-report", label: "Cảnh báo hết hạn", icon: <BellOutlined /> },
    { key: "/customers", label: "Rủi ro đối tác", icon: <SafetyCertificateOutlined /> },
  ],
  executive: [
    { key: "/dashboard", label: "Dashboard tổng hợp", icon: <DashboardOutlined /> },
    { key: "/purchase-terms", label: "Giá vốn / bảng sếp", icon: <BarChartOutlined /> },
    { key: "/banking", label: "Dòng tiền", icon: <DollarOutlined /> },
    { key: "/suppliers", label: "Công nợ", icon: <FileSearchOutlined /> },
    { key: "/settings/inventory", label: "Tồn kho", icon: <DatabaseOutlined /> },
    { key: "/purchase-terms", label: "Duyệt hồ sơ", icon: <CheckCircleOutlined /> },
  ],
  admin: [
    { key: "/dashboard", label: "Tổng quan quản trị", icon: <DashboardOutlined /> },
    { key: "/users", label: "Người dùng", icon: <UserOutlined />, need: PERMS.USERS_VIEW },
    { key: "/employees", label: "Nhân viên", icon: <UserOutlined /> },
    { key: "/department", label: "Phòng ban", icon: <ApartmentOutlined /> },
    { key: "/settings/roles", label: "Vai trò & quyền", icon: <SafetyCertificateOutlined />, need: PERMS.SYSTEM_RBAC_ADMIN },
    { key: "/settings/roles", label: "Menu theo phòng ban", icon: <SettingOutlined />, need: PERMS.SYSTEM_RBAC_ADMIN },
    { key: "/settings/products", label: "Sản phẩm", icon: <GoldOutlined /> },
    { key: "/settings/price-bulletins", label: "Bảng giá bán", icon: <BarChartOutlined /> },
    { key: "/purchase/platts-prices", label: "Platts/MOPS", icon: <BarChartOutlined /> },
    { key: "/purchase/environment-taxes", label: "Phí BVMT", icon: <DatabaseOutlined /> },
    { key: "/cron", label: "Sequence", icon: <OrderedListOutlined />, need: PERMS.SYSTEM_RBAC_ADMIN },
    { key: "/cron", label: "Audit log", icon: <AuditOutlined />, need: PERMS.SYSTEM_RBAC_ADMIN },
  ],
};

export const ICONS: Record<string, React.ReactNode> = {
  apartment: <ApartmentOutlined />,
  audit: <AuditOutlined />,
  bank: <BankOutlined />,
  chart: <BarChartOutlined />,
  contract: <SolutionOutlined />,
  dashboard: <DashboardOutlined />,
  database: <DatabaseOutlined />,
  dollar: <DollarOutlined />,
  file: <FileTextOutlined />,
  inventory: <HddOutlined />,
  order: <OrderedListOutlined />,
  payment: <BankOutlined />,
  percentage: <PercentageOutlined />,
  purchase: <ShoppingCartOutlined />,
  safety: <SafetyCertificateOutlined />,
  settings: <SettingOutlined />,
  team: <TeamOutlined />,
  truck: <TruckOutlined />,
  user: <UserOutlined />,
  warning: <WarningOutlined />,
};

type WorkspaceDefaultConfig = {
  title: string;
  description: string;
  metrics: WorkspaceDashboard["metrics"];
  quickActions: WorkspaceDashboard["quickActions"];
  processSteps: WorkspaceProcessStep[];
  reports: WorkspaceReport[];
  shortcuts: WorkspaceShortcut[];
};

const WORKSPACE_DASHBOARDS: Record<string, WorkspaceDefaultConfig> = {
  "purchase.dashboard": {
    title: "Mua hàng",
    description: "Theo dõi hồ sơ mua TERM, thanh toán NCC, nhận hàng và giá vốn.",
    metrics: [
      { label: "Hồ sơ TERM đang mở", value: "-", hint: "Theo trạng thái xử lý" },
      { label: "Thanh toán chờ duyệt", value: "-", hint: "Đề nghị chưa hoàn tất" },
      { label: "Giá chính thức chưa chốt", value: "-", hint: "Cần cập nhật bảng chính thức" },
      { label: "Công nợ NCC", value: "-", hint: "Chờ dữ liệu kế toán" },
    ],
    quickActions: [
      { label: "Tạo hồ sơ TERM", href: "/purchase-terms/create" },
      { label: "Tạo đơn mua lô", href: "/commercial-purchases/lots/create" },
    ],
    processSteps: [
      { label: "Hợp đồng mua hàng", href: "/contracts", icon: <SolutionOutlined /> },
      { label: "Hồ sơ mua TERM / Bảng tạm", href: "/purchase-terms", icon: <FileDoneOutlined /> },
      { label: "Mua thương mại lô", href: "/commercial-purchases/lots", icon: <ShoppingCartOutlined /> },
      { label: "Đề nghị thanh toán", href: "/banking", icon: <FileTextOutlined /> },
      { label: "Chi tiền / Ủy nhiệm chi", href: "/banking", icon: <BankOutlined /> },
      { label: "Nhận hàng hóa, dịch vụ", href: "/purchase-terms", icon: <TruckOutlined /> },
      { label: "Nhận hóa đơn", href: "/purchase-invoices/create", icon: <FileSyncOutlined /> },
      { label: "Xử lý hóa đơn đầu vào", href: "/purchase-invoices/create", icon: <ReconciliationOutlined /> },
      { label: "Bảng chính thức", href: "/purchase-terms", icon: <CalculatorOutlined /> },
      { label: "Bảng sếp / Giá vốn", href: "/purchase-terms", icon: <BarChartOutlined /> },
    ],
    reports: [
      { label: "Sổ chi tiết mua hàng", href: "/commercial-purchases/lots" },
      { label: "Chi tiết công nợ phải trả NCC", href: "/suppliers" },
      { label: "Tổng hợp mua hàng theo mặt hàng", href: "/commercial-purchases/lots" },
      { label: "Tổng hợp công nợ phải trả NCC", href: "/suppliers" },
      { label: "Chênh lệch giá tạm và giá chính thức", href: "/purchase-terms" },
      { label: "Báo cáo giá vốn TERM", href: "/purchase-terms" },
    ],
    shortcuts: [
      { label: "Nhà cung cấp", href: "/suppliers", icon: <TeamOutlined /> },
      { label: "Hàng hóa, dịch vụ", href: "/settings/products", icon: <GoldOutlined /> },
      { label: "Kho / nơi nhận NCC", href: "/settings/inventory", icon: <HddOutlined /> },
      { label: "Điều khoản thanh toán", href: "/bank-purposes", icon: <FileTextOutlined /> },
      { label: "Platts / MOPS", href: "/purchase/platts-prices", icon: <BarChartOutlined /> },
      { label: "Tỷ giá VCB", href: "/purchase/vcb-rates", icon: <DollarOutlined /> },
      { label: "Phí BVMT", href: "/purchase/environment-taxes", icon: <DatabaseOutlined /> },
    ],
  },
  "banking.dashboard": {
    title: "Ngân hàng",
    description: "Kiểm tra đề nghị chi, thực hiện thanh toán, đối chiếu sao kê và theo dõi cảnh báo.",
    metrics: [
      { label: "Đề nghị chờ duyệt", value: "-", hint: "Chờ giám đốc hoặc người có thẩm quyền" },
      { label: "Chờ ngân hàng kiểm tra", value: "-", hint: "Đề nghị đã được duyệt" },
      { label: "Sẵn sàng thanh toán", value: "-", hint: "Có thể ghi nhận chi tiền" },
      { label: "Sao kê chưa đối chiếu", value: "-", hint: "Theo giao dịch ngân hàng" },
    ],
    quickActions: [
      { label: "Mở đề nghị duyệt chi", href: "/banking/payment-approvals" },
      { label: "Thanh toán", href: "/banking/payments" },
    ],
    processSteps: [
      { label: "Dashboard cảnh báo", href: "/banking", icon: <DashboardOutlined /> },
      { label: "Đề nghị duyệt chi", href: "/banking/payment-approvals", icon: <CheckCircleOutlined /> },
      { label: "Kiểm tra thông tin chi", href: "/banking/payments", icon: <FileSearchOutlined /> },
      { label: "Thanh toán nhiều lần", href: "/banking/payments", icon: <BankOutlined /> },
      { label: "Import và đối chiếu sao kê", href: "/banking/statements", icon: <ReconciliationOutlined /> },
      { label: "Bảng kê TERM", href: "/banking/term-batches", icon: <FileDoneOutlined /> },
    ],
    reports: [
      { label: "Danh sách đề nghị chi", href: "/banking/payment-approvals" },
      { label: "Lịch sử thanh toán", href: "/banking/payments" },
      { label: "Sao kê ngân hàng", href: "/banking/statements" },
    ],
    shortcuts: [
      { label: "Tài khoản công ty", href: "/bank-accounts", icon: <BankOutlined /> },
      { label: "Mẫu import sao kê", href: "/bank-import-templates", icon: <SettingOutlined /> },
      { label: "Mục đích thanh toán", href: "/bank-purposes", icon: <FileTextOutlined /> },
    ],
  },
  "sales.dashboard": {
    title: "Bán hàng",
    description: "Quản lý hợp đồng, đơn bán, xuất hàng, hóa đơn và thu tiền.",
    metrics: [
      { label: "Đơn bán đang xử lý", value: "-", hint: "Theo quy trình bán hàng" },
      { label: "Hóa đơn chờ phát hành", value: "-", hint: "Chờ dữ liệu kế toán" },
      { label: "Thu tiền trong kỳ", value: "-", hint: "Theo giao dịch ngân hàng" },
      { label: "Công nợ khách hàng", value: "-", hint: "Chờ dữ liệu đối chiếu" },
    ],
    quickActions: [
      { label: "Mở đơn bán", href: "/purchase-orders" },
      { label: "Khách hàng", href: "/customers" },
    ],
    processSteps: [
      { label: "Hợp đồng bán hàng", href: "/contracts", icon: <SolutionOutlined /> },
      { label: "Báo giá", href: "/settings/price-bulletins", icon: <BarChartOutlined /> },
      { label: "Đơn bán hàng", href: "/purchase-orders", icon: <OrderedListOutlined /> },
      { label: "Xuất hàng", href: "/settings/inventory", icon: <TruckOutlined /> },
      { label: "Hóa đơn bán hàng", href: "/purchase-invoices/create", icon: <FileTextOutlined /> },
      { label: "Thu tiền", href: "/banking", icon: <BankOutlined /> },
      { label: "Trả lại hàng bán", href: "/purchase-orders", icon: <SwapOutlined /> },
      { label: "Giảm giá hàng bán", href: "/settings/price-bulletins", icon: <PercentageOutlined /> },
      { label: "Đối chiếu công nợ khách hàng", href: "/customers", icon: <ReconciliationOutlined /> },
    ],
    reports: [
      { label: "Tổng hợp bán hàng", href: "/purchase-orders" },
      { label: "Doanh số theo khách hàng", href: "/customers" },
      { label: "Công nợ phải thu khách hàng", href: "/customers" },
      { label: "Hóa đơn bán hàng", href: "/purchase-invoices/create" },
    ],
    shortcuts: [
      { label: "Khách hàng", href: "/customers", icon: <TeamOutlined /> },
      { label: "Bảng giá bán", href: "/settings/price-bulletins", icon: <BarChartOutlined /> },
      { label: "Hàng hóa", href: "/settings/products", icon: <GoldOutlined /> },
      { label: "Tài khoản ngân hàng", href: "/bank-accounts", icon: <BankOutlined /> },
    ],
  },
  "operations.dashboard": {
    title: "Vận hành",
    description: "Điều phối nhận xuất hàng, tồn kho, giao nhận và hao hụt.",
    metrics: [
      { label: "Kế hoạch trong ngày", value: "-", hint: "Nhận/xuất hàng" },
      { label: "Phiếu giao nhận mở", value: "-", hint: "Chờ xác nhận" },
      { label: "Tồn kho cần đối chiếu", value: "-", hint: "Theo kho/NCC" },
      { label: "Hao hụt cần xử lý", value: "-", hint: "Chờ dữ liệu vận hành" },
    ],
    quickActions: [
      { label: "Giao nhận", href: "/purchase-terms" },
      { label: "Tồn kho", href: "/settings/inventory" },
    ],
    processSteps: [
      { label: "Kế hoạch nhận/xuất hàng", href: "/purchase-terms", icon: <OrderedListOutlined /> },
      { label: "Phiếu giao nhận", href: "/purchase-terms", icon: <FileDoneOutlined /> },
      { label: "Xe / lái xe", href: "/employees", icon: <TruckOutlined /> },
      { label: "Tàu / chuyến biển", href: "/purchase-terms", icon: <ContainerOutlined /> },
      { label: "Giám định", href: "/purchase-terms", icon: <FileSearchOutlined /> },
      { label: "Cập nhật tồn kho", href: "/settings/inventory", icon: <DatabaseOutlined /> },
      { label: "Đối chiếu kho NCC", href: "/settings/inventory", icon: <SwapOutlined /> },
      { label: "Hao hụt tồn chứa", href: "/purchase-terms", icon: <WarningOutlined /> },
      { label: "Hao hụt xuất", href: "/purchase-terms", icon: <PercentageOutlined /> },
      { label: "Điều chỉnh tồn kho", href: "/settings/inventory", icon: <ToolOutlined /> },
    ],
    reports: [
      { label: "Tồn kho theo kho", href: "/settings/inventory" },
      { label: "Đối chiếu kho NCC", href: "/settings/inventory" },
      { label: "Hao hụt theo chuyến", href: "/purchase-terms" },
      { label: "Lịch nhận/xuất hàng", href: "/purchase-terms" },
    ],
    shortcuts: [
      { label: "Kho hàng", href: "/settings/inventory", icon: <HddOutlined /> },
      { label: "Sản phẩm", href: "/settings/products", icon: <GoldOutlined /> },
      { label: "Nhân viên", href: "/employees", icon: <UserOutlined /> },
      { label: "Nhà cung cấp", href: "/suppliers", icon: <TeamOutlined /> },
    ],
  },
  "legal.dashboard": {
    title: "Pháp chế",
    description: "Theo dõi vòng đời hợp đồng, phụ lục, bản ký và cảnh báo hiệu lực.",
    metrics: [
      { label: "Hợp đồng cần review", value: "-", hint: "Chờ pháp chế xử lý" },
      { label: "Hợp đồng chờ duyệt", value: "-", hint: "Theo workflow" },
      { label: "Sắp hết hạn", value: "-", hint: "Cảnh báo hiệu lực" },
      { label: "Thiếu bản scan ký", value: "-", hint: "Cần bổ sung hồ sơ" },
    ],
    quickActions: [
      { label: "Tạo hợp đồng", href: "/contracts" },
      { label: "Cảnh báo hết hạn", href: "/contracts/expiry-report" },
    ],
    processSteps: [
      { label: "Tạo hợp đồng", href: "/contracts", icon: <FormOutlined /> },
      { label: "Review hợp đồng", href: "/contracts", icon: <FileSearchOutlined /> },
      { label: "Phê duyệt hợp đồng", href: "/contracts", icon: <CheckCircleOutlined /> },
      { label: "Phụ lục hợp đồng", href: "/contractTypes", icon: <BookOutlined /> },
      { label: "Upload bản scan ký", href: "/contracts", icon: <FileProtectOutlined /> },
      { label: "Theo dõi hiệu lực", href: "/contracts", icon: <SafetyCertificateOutlined /> },
      { label: "Cảnh báo hết hạn", href: "/contracts/expiry-report", icon: <BellOutlined /> },
      { label: "Gia hạn / chấm dứt hợp đồng", href: "/contracts", icon: <FileSyncOutlined /> },
    ],
    reports: [
      { label: "Hợp đồng sắp hết hạn", href: "/contracts/expiry-report" },
      { label: "Hợp đồng theo đối tác", href: "/contracts" },
      { label: "Phụ lục hợp đồng", href: "/contractTypes" },
      { label: "Rủi ro đối tác", href: "/customers" },
    ],
    shortcuts: [
      { label: "Hợp đồng", href: "/contracts", icon: <SolutionOutlined /> },
      { label: "Loại hợp đồng", href: "/contractTypes", icon: <BookOutlined /> },
      { label: "Khách hàng", href: "/customers", icon: <TeamOutlined /> },
      { label: "Nhà cung cấp", href: "/suppliers", icon: <TeamOutlined /> },
    ],
  },
  "executive.dashboard": {
    title: "Ban giám đốc",
    description: "Theo dõi hiệu quả, dòng tiền, công nợ, tồn kho và phê duyệt trọng yếu.",
    metrics: [
      { label: "Hồ sơ chờ duyệt", value: "-", hint: "Thanh toán/hợp đồng" },
      { label: "Dòng tiền", value: "-", hint: "Theo ngân hàng" },
      { label: "Công nợ", value: "-", hint: "Phải thu/phải trả" },
      { label: "Tồn kho", value: "-", hint: "Giá trị và sản lượng" },
    ],
    quickActions: [
      { label: "Duyệt hồ sơ", href: "/purchase-terms" },
      { label: "Dòng tiền", href: "/banking" },
    ],
    processSteps: [
      { label: "Dashboard tổng hợp", href: "/dashboard", icon: <DashboardOutlined /> },
      { label: "Duyệt đề nghị thanh toán", href: "/banking", icon: <CheckCircleOutlined /> },
      { label: "Duyệt hợp đồng", href: "/contracts", icon: <SolutionOutlined /> },
      { label: "Xem giá vốn / bảng sếp", href: "/purchase-terms", icon: <BarChartOutlined /> },
      { label: "Xem dòng tiền", href: "/banking", icon: <DollarOutlined /> },
      { label: "Xem công nợ", href: "/suppliers", icon: <FileSearchOutlined /> },
      { label: "Xem tồn kho", href: "/settings/inventory", icon: <DatabaseOutlined /> },
      { label: "Xem cảnh báo rủi ro", href: "/contracts/expiry-report", icon: <WarningOutlined /> },
    ],
    reports: [
      { label: "Dashboard tổng hợp", href: "/dashboard" },
      { label: "Báo cáo giá vốn", href: "/purchase-terms" },
      { label: "Dòng tiền", href: "/banking" },
      { label: "Công nợ tổng hợp", href: "/suppliers" },
    ],
    shortcuts: [
      { label: "Hồ sơ TERM", href: "/purchase-terms", icon: <FileDoneOutlined /> },
      { label: "Ngân hàng", href: "/banking", icon: <BankOutlined /> },
      { label: "Hợp đồng", href: "/contracts", icon: <SolutionOutlined /> },
      { label: "Tồn kho", href: "/settings/inventory", icon: <DatabaseOutlined /> },
    ],
  },
  "admin.dashboard": {
    title: "Quản trị",
    description: "Quản lý người dùng, phòng ban, phân quyền và cấu hình hệ thống.",
    metrics: [
      { label: "Người dùng", value: "-", hint: "Tài khoản đang quản lý" },
      { label: "Phòng ban", value: "-", hint: "Cấu trúc tổ chức" },
      { label: "Vai trò", value: "-", hint: "Nhóm quyền" },
      { label: "Audit cần xem", value: "-", hint: "Nhật ký hệ thống" },
    ],
    quickActions: [
      { label: "Người dùng", href: "/users" },
      { label: "Vai trò & quyền", href: "/settings/roles" },
    ],
    processSteps: [
      { label: "Quản lý người dùng", href: "/users", icon: <UserOutlined />, need: PERMS.USERS_VIEW },
      { label: "Quản lý nhân viên", href: "/employees", icon: <TeamOutlined /> },
      { label: "Quản lý phòng ban", href: "/department", icon: <ApartmentOutlined /> },
      { label: "Quản lý vai trò", href: "/settings/roles", icon: <SafetyCertificateOutlined />, need: PERMS.SYSTEM_RBAC_ADMIN },
      { label: "Quản lý quyền", href: "/settings/roles", icon: <SettingOutlined />, need: PERMS.SYSTEM_RBAC_ADMIN },
      { label: "Cấu hình menu theo phòng ban", href: "/settings/roles", icon: <OrderedListOutlined />, need: PERMS.SYSTEM_RBAC_ADMIN },
      { label: "Sequence chứng từ", href: "/cron", icon: <FileSyncOutlined />, need: PERMS.SYSTEM_RBAC_ADMIN },
      { label: "Audit log", href: "/cron", icon: <AuditOutlined />, need: PERMS.SYSTEM_RBAC_ADMIN },
    ],
    reports: [
      { label: "Người dùng theo vai trò", href: "/users", need: PERMS.USERS_VIEW },
      { label: "Phân quyền hệ thống", href: "/settings/roles", need: PERMS.SYSTEM_RBAC_ADMIN },
      { label: "Nhật ký định kỳ", href: "/cron", need: PERMS.SYSTEM_RBAC_ADMIN },
    ],
    shortcuts: [
      { label: "Người dùng", href: "/users", icon: <UserOutlined />, need: PERMS.USERS_VIEW },
      { label: "Nhân viên", href: "/employees", icon: <TeamOutlined /> },
      { label: "Phòng ban", href: "/department", icon: <ApartmentOutlined /> },
      { label: "Vai trò & quyền", href: "/settings/roles", icon: <SafetyCertificateOutlined />, need: PERMS.SYSTEM_RBAC_ADMIN },
      { label: "Sequence", href: "/cron", icon: <OrderedListOutlined />, need: PERMS.SYSTEM_RBAC_ADMIN },
    ],
  },
};

const DASHBOARD_BY_WORKSPACE: Record<string, string> = {
  purchase: "purchase.dashboard",
  banking: "banking.dashboard",
  sales: "sales.dashboard",
  operations: "operations.dashboard",
  legal: "legal.dashboard",
  executive: "executive.dashboard",
  admin: "admin.dashboard",
};

export function getDefaultWorkspace(key?: DepartmentWorkspaceKey | null) {
  return (
    DEFAULT_WORKSPACES.find((item) => item.key === key) ??
    DEFAULT_WORKSPACES[0]
  );
}

export function getDefaultMenu(key?: DepartmentWorkspaceKey | null) {
  return WORKSPACE_MENU[String(key || "purchase")] ?? WORKSPACE_MENU.purchase;
}

export function getDefaultDashboard(
  dashboardKey?: string | null,
  workspaceName?: string | null,
): WorkspaceDashboard {
  const key =
    dashboardKey ||
    DASHBOARD_BY_WORKSPACE[String(workspaceName || "purchase")] ||
    "purchase.dashboard";
  const config =
    WORKSPACE_DASHBOARDS[key] ?? WORKSPACE_DASHBOARDS["purchase.dashboard"];

  return {
    key,
    workspaceName,
    title: config.title,
    description: config.description,
    metrics: config.metrics,
    tasks: [],
    alerts: [],
    quickActions: config.quickActions,
    processSteps: config.processSteps,
    reports: config.reports,
    shortcuts: config.shortcuts,
  };
}
