export type ShipOwnerRole = "SHIP_OWNER" | "SEA_CARRIER";

export type VesselDocumentType =
  | "VESSEL_REGISTRATION"
  | "VESSEL_INSPECTION"
  | "FIRE_SAFETY_CERTIFICATE"
  | "TANK_CALIBRATION_BAREM"
  | "H_AND_M_INSURANCE"
  | "P_AND_I_INSURANCE"
  | "PIPELINE_SYSTEM_DOCUMENT"
  | "OTHER";

export type VesselDocumentStatus =
  | "MISSING"
  | "EXPIRED"
  | "EXPIRING_SOON"
  | "VALID";

export type VesselReadinessStatus = "READY" | "WARNING" | "NOT_READY";

export interface ShipOwner {
  id: string;
  code: string;
  name: string;
  taxCode?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  billingAddress?: string | null;
  status: "Active" | "Inactive" | "Blacklisted";
  partnerRoles: ShipOwnerRole[];
  activeVesselCount?: number;
  ownedVessels?: Vessel[];
  shipCharterContracts?: any[];
  shipCharterOrders?: any[];
  shipFreightRates?: any[];
}

export interface VesselDocument {
  id: string;
  vesselId: string;
  documentType: VesselDocumentType;
  documentNo?: string | null;
  issuedDate?: string | null;
  expiredDate?: string | null;
  fileUrl?: string | null;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VesselDocumentCheckItem {
  documentType: Exclude<VesselDocumentType, "OTHER">;
  label: string;
  required: true;
  status: VesselDocumentStatus;
  latestDocument?: VesselDocument | null;
}

export interface VesselDocumentCheck {
  vesselId: string;
  readinessStatus: VesselReadinessStatus;
  isReady: boolean;
  missingCount: number;
  expiredCount: number;
  expiringSoonCount: number;
  items: VesselDocumentCheckItem[];
}

export interface Vessel {
  id: string;
  name: string;
  ownerCustomerId: string;
  owner?: Pick<ShipOwner, "id" | "code" | "name">;
  imoNo?: string | null;
  mmsiNo?: string | null;
  nationality?: string | null;
  deadweightTonnage?: number | string | null;
  capacity?: number | string | null;
  length?: number | string | null;
  width?: number | string | null;
  draft?: number | string | null;
  allowedCargoTypes?: unknown;
  documentFileUrl?: string | null;
  isActive: boolean;
  note?: string | null;
  documents?: VesselDocument[];
  documentCheck?: VesselDocumentCheck;
  charterOrders?: any[];
  createdAt: string;
  updatedAt: string;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
