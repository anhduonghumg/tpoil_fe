import type { Vessel, VesselDocumentCheck } from "./ship-master.types";

export type CharterOrderStatus =
  | "DRAFT"
  | "WAITING_CONFIRMATION"
  | "CONFIRMED"
  | "APPENDIX_CREATED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type ContractStatus = "DRAFT" | "ACTIVE" | "EXPIRED" | "TERMINATED";
export type RegistrationStatus = "DRAFT" | "REGISTERED" | "CONFIRMED" | "CANCELLED";
export type FreightRateStatus = "DRAFT" | "ACTIVE" | "INACTIVE";
export type FreightRateSource = "CONTRACT" | "APPENDIX" | "MANUAL";

export interface CompactCustomer { id: string; code?: string; name: string }
export interface CompactProduct { id: string; code?: string | null; name: string; uom?: string }
export interface CompactWarehouse { id: string; code: string; name: string }

export interface ContractLossRate {
  id?: string;
  productGroup: string;
  lossRatePercent: number | string;
  note?: string | null;
}

export interface ShipCharterContract {
  id: string;
  contractNo: string;
  ownerCustomerId: string;
  owner?: CompactCustomer;
  signedDate?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  qtyBasis: string;
  freightVatIncluded: boolean;
  defaultLaytimeHours?: number | string | null;
  demurrageRatePerDay?: number | string | null;
  paymentTermDays?: number | null;
  paymentTermText?: string | null;
  status: ContractStatus;
  fileUrl?: string | null;
  note?: string | null;
  lossRates?: ContractLossRate[];
  appendices?: ShipCharterAppendix[];
  orders?: ShipCharterOrder[];
  freightRates?: ShipFreightRate[];
  _count?: { appendices: number };
}

export interface ShipCharterAppendix {
  id: string;
  contractId: string;
  contract?: ShipCharterContract;
  appendixNo: string;
  appendixDate: string;
  vesselId?: string | null;
  vessel?: Vessel | null;
  purchaseOrderId?: string | null;
  purchaseOrder?: { id: string; orderNo: string } | null;
  productId?: string | null;
  product?: CompactProduct | null;
  receivingWarehouseId?: string | null;
  receivingWarehouse?: CompactWarehouse | null;
  cargoName?: string | null;
  plannedQty?: number | string | null;
  plannedQtyUnit: string;
  qtyTolerancePercent?: number | string | null;
  loadingPort?: string | null;
  dischargePort?: string | null;
  laycanFrom?: string | null;
  laycanTo?: string | null;
  freightRateVndPerLiter?: number | string | null;
  qtyBasis: string;
  vatIncluded: boolean;
  vatRate?: number | string | null;
  lossRatePercent?: number | string | null;
  deliveryMethod?: string | null;
  paymentTermText?: string | null;
  fileUrl?: string | null;
  note?: string | null;
}

export interface ShipFreightRate {
  id: string;
  rateCode: string;
  ownerCustomerId?: string | null;
  owner?: CompactCustomer | null;
  vesselId?: string | null;
  vessel?: Vessel | null;
  contractId?: string | null;
  contract?: ShipCharterContract | null;
  appendixId?: string | null;
  sourceType: FreightRateSource;
  loadingPort: string;
  dischargePort: string;
  routeName?: string | null;
  productGroup?: string | null;
  productId?: string | null;
  product?: CompactProduct | null;
  qtyBasis: string;
  freightRateVndPerLiter: number | string;
  vatIncluded: boolean;
  vatRate?: number | string | null;
  allowedLossRatePercent?: number | string | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  status: FreightRateStatus;
  note?: string | null;
}

export interface CharterInsurance {
  id: string;
  charterOrderId: string;
  insuranceCompanyId: string;
  insuranceCompany?: CompactCustomer;
  policyNo?: string | null;
  policyDate?: string | null;
  insuredValue?: number | string | null;
  premiumAmount: number | string;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  fileUrl?: string | null;
  status: RegistrationStatus;
  note?: string | null;
  charterOrder?: ShipCharterOrder;
}

export interface CharterInspection {
  id: string;
  charterOrderId: string;
  inspectionCompanyId: string;
  inspectionCompany?: CompactCustomer;
  inspectionType: "QUANTITY" | "QUALITY" | "BOTH";
  registeredDate?: string | null;
  plannedInspectionDate?: string | null;
  certificateNo?: string | null;
  feeAmount: number | string;
  fileUrl?: string | null;
  status: RegistrationStatus;
  note?: string | null;
  charterOrder?: ShipCharterOrder;
}

export interface AgentRegistration {
  id: string;
  charterOrderId: string;
  agentCustomerId: string;
  agent?: CompactCustomer;
  registeredDate?: string | null;
  agencyFee: number | string;
  fileUrl?: string | null;
  status: RegistrationStatus;
  note?: string | null;
  charterOrder?: ShipCharterOrder;
}

export interface ShipCharterOrder {
  id: string;
  charterOrderNo: string;
  sourceType: "DIRECT" | "FROM_TERM";
  status: CharterOrderStatus;
  purchaseOrderId?: string | null;
  purchaseOrder?: { id: string; orderNo: string } | null;
  /** Bảo hiểm/giám định mua hàng đã tạm tính trên bảng giá TERM, để đối chiếu khi đăng ký. */
  termEstimate?: { insuranceVnd: number; inspectionVnd: number } | null;
  termShipmentId?: string | null;
  ownerCustomerId?: string | null;
  owner?: CompactCustomer | null;
  vesselId?: string | null;
  vessel?: Vessel | null;
  contractId?: string | null;
  contract?: ShipCharterContract | null;
  appendixId?: string | null;
  appendix?: ShipCharterAppendix | null;
  receivingWarehouseId?: string | null;
  receivingWarehouse?: CompactWarehouse | null;
  productId?: string | null;
  product?: CompactProduct | null;
  laycanFrom?: string | null;
  laycanTo?: string | null;
  cargoName?: string | null;
  plannedQty: number | string;
  plannedQtyUnit: string;
  qtyTolerancePercent?: number | string | null;
  loadingPort?: string | null;
  dischargePort?: string | null;
  freightRateVndPerLiter?: number | string | null;
  qtyBasis: string;
  vatIncluded: boolean;
  vatRate?: number | string | null;
  lossRatePercent?: number | string | null;
  insuranceRequired: boolean;
  appendixFileUrl?: string | null;
  note?: string | null;
  vesselDocumentCheck?: VesselDocumentCheck | null;
  insurances?: CharterInsurance[];
  inspections?: CharterInspection[];
  agentRegistrations?: AgentRegistration[];
  _count?: { insurances: number; inspections: number; agentRegistrations: number };
}

export interface ShipCharterDashboard {
  termOrdersPending: number;
  draftOrders: number;
  ordersWithoutAppendix: number;
  insurancePending: number;
  inspectionPending: number;
  agentPending: number;
  laycanSoon: number;
  contractsExpiringSoon: number;
  vesselsMissingDocuments: number;
  vesselsWithExpiredDocuments: number;
  vesselsWithExpiringDocuments: number;
  selectedVesselsNotReady: number;
  appendicesMissingFile: number;
}
