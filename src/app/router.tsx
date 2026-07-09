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
import PurchaseOrdersPage from "../features/purchases/page/PurchaseOrdersPage";
import { ProductsPage } from "../features/products/page/ProductsPage";
import { SupplierLocationsPage } from "../features/supplierLocations/page/SupplierLocationsPage";
import { PriceBulletinsPage } from "../features/price-bulletins/page/PriceBulletinsPage";
import PurchaseOrderDetailPage from "../features/purchases/page/PurchaseOrderDetailPage";
import PurchaseInvoiceUpsertPage from "../features/purchases/page/PurchaseInvoiceUpsertPage";
import PurchaseInvoiceDetailPage from "../features/purchases/page/PurchaseInvoiceDetailPage";
import BankStatementPage from "../features/banking/page/BankStatementPage";
import BankAccountsPage from "../features/bank-accounts/page/BankAccountsPage";
import BankImportTemplatesPage from "../features/bank-import-templates/ui/page/BankImportTemplatesPage";
import BankPurposesPage from "../features/bank-purposes/page/BankPurposesPage";
import PlattsPricesPage from "../features/platts-prices/page/PlattsPricesPage";
import VcbRatesPage from "../features/vcb-rates/page/VcbRatesPage";
import EnvironmentTaxesPage from "../features/environment-taxes/page/EnvironmentTaxesPage";
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
  OperationsDashboardPage,
  OperationsPartnerPage,
  ShipCharterAppendixListPage,
  ShipCharterContractListPage,
  ShipCharterOrderDetailPage,
  ShipCharterOrderFormPage,
  ShipCharterOrderListPage,
  ShipFreightRatePage,
  StorageRentalContractPage,
  VehicleDispatchOrderDetailPage,
  VehicleDispatchOrderFormPage,
  VehicleDispatchOrderListPage,
  VehicleListPage,
  VehicleDocumentPage,
  VesselListPage,
  WarehouseReservationPage,
  WarehouseTransferDetailPage,
  WarehouseTransferFormPage,
  WarehouseTransferListPage,
} from "../features/operations/pages";

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
          {
            path: "purchase-orders",
            children: [
              { index: true, element: <PurchaseOrdersPage /> },
              {
                path: "/purchase-orders/:id",
                element: <PurchaseOrderDetailPage />,
              },
            ],
            // element: <PurchaseOrdersPage />,
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
          { path: "operations/partners", element: <OperationsPartnerPage /> },
          { path: "operations/charter-orders/create", element: <ShipCharterOrderFormPage /> },
          { path: "operations/charter-orders/:id", element: <ShipCharterOrderDetailPage /> },
          { path: "operations/vessels", element: <VesselListPage /> },
          { path: "operations/charter-contracts", element: <ShipCharterContractListPage /> },
          { path: "operations/charter-appendices", element: <ShipCharterAppendixListPage /> },
          { path: "operations/freight-rates", element: <ShipFreightRatePage /> },
          { path: "operations/storage-contracts", element: <StorageRentalContractPage /> },
          { path: "operations/inventory-availability", element: <InventoryAvailabilityPage /> },
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
          { path: "operations/vehicle-dispatches", element: <VehicleDispatchOrderListPage /> },
          { path: "operations/vehicle-dispatches/create", element: <VehicleDispatchOrderFormPage /> },
          { path: "operations/vehicle-dispatches/:id", element: <VehicleDispatchOrderDetailPage /> },
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
            element: <BankStatementPage />,
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
          { path: "settings/price-bulletins", element: <PriceBulletinsPage /> },
        ],
      },
    ],
  },
]);
