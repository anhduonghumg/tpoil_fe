import { createBrowserRouter, Navigate } from "react-router-dom";
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
import RequireAnonymous from "./RequireAnonymous";
import { RouteGuard } from "../shared/authz/RouteGuard";
import { PERMS } from "../shared/authz/perms";
import { CustomerGroupsPage } from "../features/customer-groups/page/CustomerGroupsPage";
import PurchaseOrdersPage from "../features/purchases/page/PurchaseOrdersPage";
import RetailPurchaseCreatePage from "../features/purchases/page/RetailPurchaseCreatePage";
import RetailPurchaseDetailPage from "../features/purchases/page/RetailPurchaseDetailPage";
import { ProductsPage } from "../features/products/page/ProductsPage";
import { SupplierLocationsPage } from "../features/supplierLocations/page/SupplierLocationsPage";
import { WarehouseRentalContractsPage } from "../features/supplierLocations/page/WarehouseRentalContractsPage";
import PurchaseInvoiceUpsertPage from "../features/purchases/page/PurchaseInvoiceUpsertPage";
import PurchaseInvoiceDetailPage from "../features/purchases/page/PurchaseInvoiceDetailPage";
import CommercialLotPurchasesPage from "../features/commercial-lots/page/CommercialLotPurchasesPage";
import CommercialLotPurchaseCreatePage from "../features/commercial-lots/page/CommercialLotPurchaseCreatePage";
import CommercialLotPurchaseDetailPage from "../features/commercial-lots/page/CommercialLotPurchaseDetailPage";
import SalesOrdersPage from "../features/sales/page/SalesOrdersPage";
import SalesOrderDetailPage from "../features/sales/page/SalesOrderDetailPage";
import SalesApprovalsPage from "../features/sales/page/SalesApprovalsPage";
import SalesWithdrawalsPage from "../features/sales/page/SalesWithdrawalsPage";
import CustomerStockPage from "../features/sales/page/CustomerStockPage";
import SalesDeliveriesPage from "../features/sales/page/SalesDeliveriesPage";
import SalesInvoicesPage from "../features/sales/page/SalesInvoicesPage";
import InvoiceSettingsPage from "../features/sales/page/InvoiceSettingsPage";
import ReceivablesPage from "../features/sales/page/ReceivablesPage";
import ReceivableInterestPage from "../features/sales/page/ReceivableInterestPage";
import SalesReceiptsPage from "../features/sales/page/SalesReceiptsPage";
import PurchaseSourceProfitPage from "../features/sales/page/PurchaseSourceProfitPage";
import SalesManagementReportPage from "../features/sales/page/SalesManagementReportPage";
import SalesAliasesPage from "../features/sales/page/SalesAliasesPage";
import CreditConfigPage from "../features/sales/page/CreditConfigPage";
import BankingDashboardPage from "../features/banking/page/BankingDashboardPage";
import BankingPaymentsPage from "../features/banking/page/BankingPaymentsPage";
import BankingReceiptsPage from "../features/banking/page/BankingReceiptsPage";
import BankingStatementsPage from "../features/banking/page/BankingStatementsPage";
import BankingReportsPage from "../features/banking/page/BankingReportsPage";
import BankAccountsPage from "../features/bank-accounts/page/BankAccountsPage";
import BankImportTemplatesPage from "../features/bank-import-templates/ui/page/BankImportTemplatesPage";
import BankPurposesPage from "../features/bank-purposes/page/BankPurposesPage";
import PlattsPricesPage from "../features/platts-prices/page/PlattsPricesPage";
import VcbRatesPage from "../features/vcb-rates/page/VcbRatesPage";
import EnvironmentTaxesPage from "../features/environment-taxes/page/EnvironmentTaxesPage";
import TaxRatesPage from "../features/tax-rates/page/TaxRatesPage";
import TermPurchaseOrderCreatePage from "../features/purchase-term/ui/PurchaseTermCreatePage";
import TermPurchaseOrdersPage from "../features/purchase-term/page/PurchaseTermPage";
import TermPurchaseOrderDetailPage from "../features/purchase-term/page/TermPurchaseOrderDetailPage";
import {
  DriverListPage,
  DriverDocumentPage,
  ExpectedInventoryPage,
  InventoryAccountingPage,
  InventoryAvailabilityPage,
  InventoryMatrixReportPage,
  ShipOwnerListPage,
  SalesTransportRequestDetailPage,
  SalesTransportRequestListPage,
  TransportVehicleSettingPage,
  VehicleFuelLogPage,
  VehicleMaintenanceExpensePage,
  VehicleMonthlyFixedCostPage,
  VehicleEfficiencyReportPage,
  VehicleDispatchOrderDetailPage,
  VehicleDispatchOrderFormPage,
  VehicleDispatchOrderListPage,
  VehicleListPage,
  VehicleDocumentPage,
  VesselListPage,
  VesselDetailPage,
  VesselDocumentListPage,
  WarehouseReservationPage,
  WarehouseTransferDetailPage,
  WarehouseTransferFormPage,
  WarehouseTransferListPage,
} from "../features/operations/pages";
import OperationsDashboardPage from "../features/operations/OperationsDashboardPage";
import WarehouseDashboardPage from "../features/operations/WarehouseDashboardPage";
import PriceDiscountPage from "../features/operations/PriceDiscountPage";
import InventoryReceiptsPage from "../features/inventory-receipts/page/InventoryReceiptsPage";
import StockCardPage from "../features/inventory-receipts/page/StockCardPage";
import {
  ShipCharterOrderDetailPage,
  ShipCharterOrderFormPage,
  ShipCharterOrderListPage,
} from "../features/operations/ship-charter-order-pages";
import {
  ShipCharterAppendixDetailPage,
  ShipCharterAppendixListPage,
  ShipCharterContractDetailPage,
  ShipCharterContractListPage,
  ShipCharterDashboardPage,
  ShipCharterInsuranceListPage,
  ShipCharterInspectionListPage,
  ShipFreightRatePage,
  ShippingAgentRegistrationListPage,
} from "../features/operations/ship-charter-master-pages";
import OpeningBalancesPage from "../features/opening-balances/OpeningBalancesPage";
import NotificationsCenterPage from "../features/notifications/page/NotificationsCenterPage";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <RequireAnonymous>
        <Login />
      </RequireAnonymous>
    ),
  },
  {
    path: "/",
    element: <PrivateShell />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: "dashboard", element: <Dashboard /> },
          { path: "notifications", element: <NotificationsCenterPage /> },
          {
            path: "purchase-orders",
            children: [
              {
                index: true,
                element: <Navigate to="/commercial-purchases/retail" replace />,
              },
              {
                path: "/purchase-orders/:id",
                element: <RetailPurchaseDetailPage />,
              },
            ],
            // element: <PurchaseOrdersPage />,
          },
          {
            path: "/sales/orders",
            element: (
              <RouteGuard need={PERMS.SALES_VIEW}>
                <SalesOrdersPage />
              </RouteGuard>
            ),
          },
          {
            path: "/sales/orders/:id",
            element: (
              <RouteGuard need={PERMS.SALES_VIEW}>
                <SalesOrderDetailPage />
              </RouteGuard>
            ),
          },
          {
            path: "/sales/approvals",
            element: (
              <RouteGuard need={PERMS.SALES_VIEW}>
                <SalesApprovalsPage />
              </RouteGuard>
            ),
          },
          {
            path: "/sales/withdrawals",
            element: (
              <RouteGuard need={PERMS.SALES_VIEW}>
                <SalesWithdrawalsPage />
              </RouteGuard>
            ),
          },
          {
            path: "/sales/deliveries",
            element: (
              // Nhân viên kho có thể chỉ có quyền xác nhận xuất, không có sales.view —
              // backend cũng chỉ đòi một trong hai (PermissionsGuard là ANY-of).
              <RouteGuard
                need={(ctx) =>
                  ctx.permissions.has(PERMS.SALES_VIEW) ||
                  ctx.permissions.has(PERMS.SALES_DELIVERY_CONFIRM)
                }
              >
                <SalesDeliveriesPage />
              </RouteGuard>
            ),
          },
          {
            path: "/sales/invoices/settings",
            element: (
              <RouteGuard
                need={(ctx) =>
                  ctx.permissions.has(PERMS.SALES_INVOICE_VIEW) ||
                  ctx.permissions.has(PERMS.SALES_INVOICE_ISSUE)
                }
              >
                <InvoiceSettingsPage />
              </RouteGuard>
            ),
          },
          {
            path: "/sales/invoices",
            element: (
              <RouteGuard
                need={(ctx) =>
                  ctx.permissions.has(PERMS.SALES_INVOICE_VIEW) ||
                  ctx.permissions.has(PERMS.SALES_INVOICE_ISSUE)
                }
              >
                <SalesInvoicesPage />
              </RouteGuard>
            ),
          },
          {
            path: "/sales/receivables",
            element: (
              <RouteGuard need={PERMS.SALES_RECEIVABLE_VIEW}>
                <ReceivablesPage />
              </RouteGuard>
            ),
          },
          {
            path: "/sales/receivable-interest",
            element: (
              <RouteGuard need={PERMS.SALES_RECEIVABLE_VIEW}>
                <ReceivableInterestPage />
              </RouteGuard>
            ),
          },
          {
            path: "/sales/receipts",
            element: (
              <RouteGuard need={PERMS.SALES_RECEIVABLE_VIEW}>
                <SalesReceiptsPage />
              </RouteGuard>
            ),
          },
          {
            path: "/sales/reports",
            element: (
              <RouteGuard need={PERMS.SALES_PROFITABILITY_VIEW}>
                <SalesManagementReportPage />
              </RouteGuard>
            ),
          },
          {
            path: "/sales/profitability",
            element: (
              <RouteGuard need={PERMS.SALES_PROFITABILITY_VIEW}>
                <PurchaseSourceProfitPage />
              </RouteGuard>
            ),
          },
          {
            path: "/sales/aliases",
            element: (
              <RouteGuard
                need={(ctx) =>
                  ctx.permissions.has(PERMS.SALES_ALIAS_MANAGE) ||
                  ctx.permissions.has(PERMS.SALES_VIEW)
                }
              >
                <SalesAliasesPage />
              </RouteGuard>
            ),
          },
          {
            // Đã gộp vào màn "Giá bán & chiết khấu" của vận hành — giữ link cũ cho khỏi gãy.
            path: "/sales/discounts",
            element: (
              <Navigate to="/operations/price-discounts?tab=discount" replace />
            ),
          },
          {
            path: "/sales/credit",
            element: (
              // Kế toán chỉ có quyền xem công nợ vẫn vào được, nhưng không sửa hạn mức.
              <RouteGuard
                need={(ctx) =>
                  ctx.permissions.has(PERMS.SALES_CREDIT_MANAGE) ||
                  ctx.permissions.has(PERMS.SALES_RECEIVABLE_VIEW)
                }
              >
                <CreditConfigPage />
              </RouteGuard>
            ),
          },
          {
            path: "/sales/customer-stock",
            element: (
              <RouteGuard need={PERMS.SALES_VIEW}>
                <CustomerStockPage />
              </RouteGuard>
            ),
          },
          {
            path: "/commercial-purchases/lots",
            element: <CommercialLotPurchasesPage />,
          },
          {
            path: "/commercial-purchases/lots/create",
            element: <CommercialLotPurchaseCreatePage />,
          },
          {
            path: "/commercial-purchases/lots/:id/edit",
            element: <CommercialLotPurchaseCreatePage />,
          },
          {
            path: "/commercial-purchases/lots/:id",
            element: <CommercialLotPurchaseDetailPage />,
          },
          {
            path: "/commercial-purchases/retail",
            element: <PurchaseOrdersPage />,
          },
          {
            path: "/commercial-purchases/retail/create",
            element: <RetailPurchaseCreatePage />,
          },
          {
            path: "/commercial-purchases/retail/:id/edit",
            element: <RetailPurchaseCreatePage />,
          },
          {
            path: "/purchase/platts-prices",
            element: <PlattsPricesPage />,
          },
          {
            path: "/purchase/vcb-rates",
            element: <VcbRatesPage />,
          },
          {
            path: "/purchase/environment-taxes",
            element: <EnvironmentTaxesPage />,
          },
          {
            path: "/purchase/tax-rates",
            element: <TaxRatesPage />,
          },
          {
            path: "/purchase-terms",
            element: <TermPurchaseOrdersPage />,
          },
          {
            path: "/purchase-terms/:id",
            element: <TermPurchaseOrderDetailPage />,
          },
          {
            path: "/purchase-terms/create",
            element: <TermPurchaseOrderCreatePage />,
          },
          {
            path: "/purchase-invoices/create",
            element: <PurchaseInvoiceUpsertPage />,
          },
          {
            path: "/purchase-invoices/:id",
            element: <PurchaseInvoiceDetailPage />,
          },
          { path: "inventory", element: <InventoryAvailabilityPage /> },
          {
            path: "operations",
            element: (
              <RouteGuard need={PERMS.OPERATIONS_VIEW}>
                <OperationsDashboardPage />
              </RouteGuard>
            ),
          },
          { path: "operations/charter-orders", element: <ShipCharterOrderListPage /> },
          { path: "operations/ship-charters/dashboard", element: <ShipCharterDashboardPage /> },
          { path: "operations/ship-owners", element: <ShipOwnerListPage /> },
          { path: "operations/charter-orders/create", element: <ShipCharterOrderFormPage /> },
          { path: "operations/charter-orders/:id/edit", element: <ShipCharterOrderFormPage /> },
          { path: "operations/charter-orders/:id", element: <ShipCharterOrderDetailPage /> },
          { path: "operations/vessels", element: <VesselListPage /> },
          { path: "operations/vessel-documents", element: <VesselDocumentListPage /> },
          { path: "operations/vessels/:id", element: <VesselDetailPage /> },
          { path: "operations/charter-contracts", element: <ShipCharterContractListPage /> },
          { path: "operations/charter-contracts/:id", element: <ShipCharterContractDetailPage /> },
          { path: "operations/charter-appendices", element: <ShipCharterAppendixListPage /> },
          { path: "operations/charter-appendices/:id", element: <ShipCharterAppendixDetailPage /> },
          { path: "operations/freight-rates", element: <ShipFreightRatePage /> },
          { path: "operations/charter-insurances", element: <ShipCharterInsuranceListPage /> },
          { path: "operations/charter-inspections", element: <ShipCharterInspectionListPage /> },
          { path: "operations/shipping-agent-registrations", element: <ShippingAgentRegistrationListPage /> },
           { path: "operations/storage-contracts", element: <WarehouseRentalContractsPage /> },
          { path: "operations/warehouse-dashboard", element: <WarehouseDashboardPage /> },
          {
            // Gộp bảng giá bán + thông báo chiết khấu về một màn (2 tab) của vận hành.
            path: "operations/price-discounts",
            element: (
              <RouteGuard
                need={(ctx) =>
                  ctx.permissions.has(PERMS.OPERATIONS_VIEW) ||
                  ctx.permissions.has(PERMS.SALES_DISCOUNT_MANAGE) ||
                  ctx.permissions.has(PERMS.SALES_VIEW)
                }
              >
                <PriceDiscountPage />
              </RouteGuard>
            ),
          },
          { path: "operations/inventory-availability", element: <InventoryAvailabilityPage /> },
          { path: "operations/inventory-receipts", element: <InventoryReceiptsPage /> },
          { path: "operations/stock-card", element: <StockCardPage /> },
          { path: "operations/inventory-accounting", element: <InventoryAccountingPage /> },
          { path: "operations/inventory-matrix", element: <InventoryMatrixReportPage /> },
          { path: "operations/expected-inventory", element: <ExpectedInventoryPage /> },
          { path: "operations/reservations", element: <WarehouseReservationPage /> },
          { path: "operations/warehouse-transfers", element: <WarehouseTransferListPage /> },
          { path: "operations/warehouse-transfers/create", element: <WarehouseTransferFormPage /> },
          { path: "operations/warehouse-transfers/:id", element: <WarehouseTransferDetailPage /> },
          { path: "operations/vehicles", element: <VehicleListPage /> },
          { path: "operations/vehicle-documents", element: <VehicleDocumentPage /> },
          { path: "operations/drivers", element: <DriverListPage /> },
          { path: "operations/driver-documents", element: <DriverDocumentPage /> },
          { path: "operations/sales-transport-requests", element: <SalesTransportRequestListPage /> },
          { path: "operations/sales-transport-requests/:id", element: <SalesTransportRequestDetailPage /> },
          { path: "operations/transport-vehicle-settings", element: <TransportVehicleSettingPage /> },
          { path: "operations/vehicle-fuel-logs", element: <VehicleFuelLogPage /> },
          { path: "operations/vehicle-maintenance-expenses", element: <VehicleMaintenanceExpensePage /> },
          { path: "operations/vehicle-monthly-fixed-costs", element: <VehicleMonthlyFixedCostPage /> },
          { path: "operations/vehicle-efficiency-report", element: <VehicleEfficiencyReportPage /> },
          { path: "operations/vehicle-dispatches", element: <VehicleDispatchOrderListPage /> },
          { path: "operations/vehicle-dispatches/create", element: <VehicleDispatchOrderFormPage /> },
          { path: "operations/vehicle-dispatches/:id", element: <VehicleDispatchOrderDetailPage /> },
          { path: "operations/vehicle-dispatches/:id/edit", element: <VehicleDispatchOrderFormPage /> },
          {
            path: "users",
            element: (
              <RouteGuard need={PERMS.USERS_VIEW}>
                <UsersPage />
              </RouteGuard>
            ),
          },
          {
            path: "/banking",
            element: <BankingDashboardPage />,
          },
          {
            path: "/banking/payment-approvals",
            element: <BankingPaymentsPage />,
          },
          {
            path: "/banking/receipts",
            element: <BankingReceiptsPage />,
          },
          {
            path: "/banking/payments",
            element: <BankingPaymentsPage />,
          },
          {
            path: "/banking/statements",
            element: <BankingStatementsPage />,
          },
          {
            path: "/banking/term-batches",
            element: <BankingPaymentsPage />,
          },
          {
            path: "/banking/reports",
            element: <BankingReportsPage />,
          },
          {
            path: "/bank-accounts",
            element: <BankAccountsPage />,
          },
          {
            path: "/bank-import-templates",
            element: <BankImportTemplatesPage />,
          },
          {
            path: "/bank-purposes",
            element: <BankPurposesPage />,
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
          { path: "settings/products", element: <ProductsPage /> },
          { path: "settings/inventory", element: <SupplierLocationsPage /> },
          {
            // Đã gộp vào màn "Giá bán & chiết khấu" của vận hành — giữ link cũ cho khỏi gãy.
            path: "settings/price-bulletins",
            element: (
              <Navigate to="/operations/price-discounts?tab=price" replace />
            ),
          },
          {
            path: "settings/opening-balances",
            element: (
              <RouteGuard
                need={(ctx) =>
                  ctx.permissions.has(PERMS.SYSTEM_OPENING_BALANCES_VIEW) ||
                  ctx.permissions.has(PERMS.SYSTEM_RBAC_ADMIN)
                }
              >
                <OpeningBalancesPage />
              </RouteGuard>
            ),
          },
        ],
      },
    ],
  },
]);
