import { http } from "../../shared/lib/http";

export type PageParams = {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: string;
  [key: string]: unknown;
};

const unwrap = <T>(value: any): T => (value?.data ?? value) as T;
const get = async <T>(url: string, params?: PageParams) =>
  unwrap<T>((await http.get(url, { params })).data);
const post = async <T = any>(url: string, data?: unknown) =>
  unwrap<T>((await http.post(url, data)).data);
const put = async <T = any>(url: string, data?: unknown) =>
  unwrap<T>((await http.put(url, data)).data);
const patch = async <T = any>(url: string, data?: unknown) =>
  unwrap<T>((await http.patch(url, data)).data);

export const operationsApi = {
  dashboard: () => get<any>("/operations/dashboard"),
  warehouseDashboard: (warehouseId?: string) =>
    get<any>("/operations/warehouse-dashboard", warehouseId ? { warehouseId } : undefined),
  shipCharterDashboard: () => get<any>("/operations/ship-charters/dashboard"),
  shipOwners: (params?: PageParams) => get<any>("/operations/ship-owners", params),
  shipOwner: (id: string) => get<any>(`/operations/ship-owners/${id}`),
  shipOwnerSelect: (keyword?: string) =>
    get<any[]>("/operations/ship-owners/select", { keyword }),
  vessels: (params?: PageParams) => get<any>("/operations/vessels", params),
  vessel: (id: string) => get<any>(`/operations/vessels/${id}`),
  vesselSelect: (params?: PageParams) => get<any[]>("/operations/vessels/select", params),
  saveVessel: (data: unknown, id?: string) =>
    id ? patch(`/operations/vessels/${id}`, data) : post("/operations/vessels", data),
  vesselDocuments: (vesselId: string, params?: PageParams) =>
    get<any>(`/operations/vessels/${vesselId}/documents`, params),
  vesselDocumentCheck: (vesselId: string) =>
    get<any>(`/operations/vessels/${vesselId}/document-check`),
  saveVesselDocument: (vesselId: string, data: unknown, id?: string) =>
    id
      ? patch(`/operations/vessel-documents/${id}`, data)
      : post(`/operations/vessels/${vesselId}/documents`, data),
  charterContracts: (params?: PageParams) => get<any>("/operations/charter-contracts", params),
  charterContract: (id: string) => get<any>(`/operations/charter-contracts/${id}`),
  saveCharterContract: (data: unknown, id?: string) =>
    id ? put(`/operations/charter-contracts/${id}`, data) : post("/operations/charter-contracts", data),
  charterAppendices: (params?: PageParams) => get<any>("/operations/charter-appendices", params),
  charterAppendix: (id: string) => get<any>(`/operations/charter-appendices/${id}`),
  saveCharterAppendix: (data: unknown, id?: string) =>
    id ? put(`/operations/charter-appendices/${id}`, data) : post("/operations/charter-appendices", data),
  charterOrders: (params?: PageParams) => get<any>("/operations/charter-orders", params),
  pendingTermCharterOrders: (params?: PageParams) => get<any>("/operations/charter-orders/term-pending", params),
  charterOrder: (id: string) => get<any>(`/operations/charter-orders/${id}`),
  saveCharterOrder: (data: unknown, id?: string) =>
    id ? put(`/operations/charter-orders/${id}`, data) : post("/operations/charter-orders", data),
  createCharterOrderFromTerm: (purchaseOrderId: string, data: unknown = {}) =>
    post(`/operations/charter-orders/from-term/${purchaseOrderId}`, data),
  confirmCharterOrder: (id: string, override = false) =>
    post(`/operations/charter-orders/${id}/${override ? "confirm-override" : "confirm"}`, { overrideDocumentCheck: override }),
  createCharterAppendix: (id: string, data: unknown) =>
    post(`/operations/charter-orders/${id}/create-appendix`, data),
  cancelCharterOrder: (id: string) => post(`/operations/charter-orders/${id}/cancel`),
  changeCharterStatus: (id: string, status: string) =>
    patch(`/operations/charter-orders/${id}/status/${status}`),
  saveInsurance: (orderId: string, data: unknown, id?: string) =>
    id
      ? put(`/operations/charter-orders/${orderId}/insurances/${id}`, data)
      : post(`/operations/charter-orders/${orderId}/insurances`, data),
  charterInsurances: (params?: PageParams) => get<any>("/operations/charter-insurances", params),
  saveInspection: (orderId: string, data: unknown, id?: string) =>
    id
      ? put(`/operations/charter-orders/${orderId}/inspections/${id}`, data)
      : post(`/operations/charter-orders/${orderId}/inspections`, data),
  charterInspections: (params?: PageParams) => get<any>("/operations/charter-inspections", params),
  saveAgent: (orderId: string, data: unknown, id?: string) =>
    id
      ? put(`/operations/charter-orders/${orderId}/agents/${id}`, data)
      : post(`/operations/charter-orders/${orderId}/agents`, data),
  shippingAgentRegistrations: (params?: PageParams) => get<any>("/operations/shipping-agent-registrations", params),
  postTermCosts: (id: string) => post(`/operations/charter-orders/${id}/post-term-costs`),
  freightRates: (params?: PageParams) => get<any>("/operations/freight-rates", params),
  lookupFreightRate: (params: PageParams) => get<any>("/operations/freight-rates/lookup", params),
  saveFreightRate: (data: unknown, id?: string) =>
    id ? put(`/operations/freight-rates/${id}`, data) : post("/operations/freight-rates", data),
  storageContracts: (params?: PageParams) => get<any>("/operations/storage-contracts", params),
  storageContract: (id: string) => get<any>(`/operations/storage-contracts/${id}`),
  saveStorageContract: (data: unknown, id?: string) =>
    id ? put(`/operations/storage-contracts/${id}`, data) : post("/operations/storage-contracts", data),
  postStorageTermCost: (id: string, data: unknown) =>
    post(`/operations/storage-contracts/${id}/post-term-cost`, data),
  availability: (params?: PageParams) => get<any>("/operations/warehouse/availability", params),
  matrix: (params?: PageParams) => get<any>("/operations/warehouse/matrix", params),
  commercialLotInventory: (params?: PageParams) =>
    get<any>("/operations/warehouse/commercial-lots", params),
  customerHeldInventory: (params?: PageParams) =>
    get<any>("/operations/warehouse/customer-holds", params),
  expectedInventory: (params?: PageParams) => get<any>("/operations/expected-inventory", params),
  saveExpectedInventory: (data: unknown) => post("/operations/expected-inventory", data),
  cancelExpectedInventory: (id: string) => patch(`/operations/expected-inventory/${id}/cancel`),
  reservations: (params?: PageParams) => get<any>("/operations/warehouse-reservations", params),
  saveReservation: (data: unknown) => post("/operations/warehouse-reservations", data),
  changeReservation: (id: string, status: string) =>
    patch(`/operations/warehouse-reservations/${id}/${status}`),
  transfers: (params?: PageParams) => get<any>("/operations/warehouse-transfers", params),
  transfer: (id: string) => get<any>(`/operations/warehouse-transfers/${id}`),
  saveTransfer: (data: unknown, id?: string) =>
    id ? put(`/operations/warehouse-transfers/${id}`, data) : post("/operations/warehouse-transfers", data),
  changeTransferStatus: (id: string, status: string) =>
    patch(`/operations/warehouse-transfers/${id}/status`, { status }),
  vehicles: (params?: PageParams) => get<any>("/operations/vehicles", params),
  vehicle: (id: string) => get<any>(`/operations/vehicles/${id}`),
  saveVehicle: (data: unknown, id?: string) =>
    id ? put(`/operations/vehicles/${id}`, data) : post("/operations/vehicles", data),
  saveVehicleDocument: (vehicleId: string, data: unknown, id?: string) =>
    id
      ? put(`/operations/vehicles/${vehicleId}/documents/${id}`, data)
      : post(`/operations/vehicles/${vehicleId}/documents`, data),
  drivers: (params?: PageParams) => get<any>("/operations/drivers", params),
  driver: (id: string) => get<any>(`/operations/drivers/${id}`),
  saveDriver: (data: unknown, id?: string) =>
    id ? put(`/operations/drivers/${id}`, data) : post("/operations/drivers", data),
  saveDriverDocument: (driverId: string, data: unknown, id?: string) =>
    id
      ? put(`/operations/drivers/${driverId}/documents/${id}`, data)
      : post(`/operations/drivers/${driverId}/documents`, data),
  salesTransportRequests: (params?: PageParams) =>
    get<any>("/operations/sales-transport-requests", params),
  salesTransportRequest: (id: string) =>
    get<any>(`/operations/sales-transport-requests/${id}`),
  acknowledgeSalesTransportRequest: (id: string) =>
    patch(`/operations/sales-transport-requests/${id}/acknowledge`, {}),
  saveSalesTransportActual: (id: string, data: unknown) =>
    put(`/operations/sales-transport-requests/${id}/actual`, data),
  transportVehicleSettings: (params?: PageParams) =>
    get<any>("/operations/transport-vehicle-settings", params),
  saveTransportVehicleSetting: (data: unknown, id?: string) =>
    id ? put(`/operations/transport-vehicle-settings/${id}`, data) : post("/operations/transport-vehicle-settings", data),
  vehicleFuelLogs: (params?: PageParams) => get<any>("/operations/vehicle-fuel-logs", params),
  saveVehicleFuelLog: (data: unknown, id?: string) =>
    id ? put(`/operations/vehicle-fuel-logs/${id}`, data) : post("/operations/vehicle-fuel-logs", data),
  vehicleMaintenanceExpenses: (params?: PageParams) => get<any>("/operations/vehicle-maintenance-expenses", params),
  saveVehicleMaintenanceExpense: (data: unknown, id?: string) =>
    id ? put(`/operations/vehicle-maintenance-expenses/${id}`, data) : post("/operations/vehicle-maintenance-expenses", data),
  vehicleMonthlyFixedCosts: (params?: PageParams) => get<any>("/operations/vehicle-monthly-fixed-costs", params),
  saveVehicleMonthlyFixedCost: (data: unknown, id?: string) => id ? put(`/operations/vehicle-monthly-fixed-costs/${id}`, data) : post("/operations/vehicle-monthly-fixed-costs", data),
  vehicleEfficiencyReport: (params?: Record<string, string>) => get<any>("/operations/vehicle-efficiency-report", params),
  dispatches: (params?: PageParams) => get<any>("/operations/vehicle-dispatches", params),
  dispatch: (id: string) => get<any>(`/operations/vehicle-dispatches/${id}`),
  saveDispatch: (data: unknown, id?: string) =>
    id ? put(`/operations/vehicle-dispatches/${id}`, data) : post("/operations/vehicle-dispatches", data),
  changeDispatchStatus: (id: string, status: string) =>
    patch(`/operations/vehicle-dispatches/${id}/status`, { status }),
};
