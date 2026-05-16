// =========================
// COMMON
// =========================
import type { Paged } from "../../shared/lib/types";

export type UUID = string;

export type FxStageType = string;

// =========================
// ORDER
// =========================

export type TermOrderStatus =
  | "DRAFT"
  | "APPROVED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type TermNextAction =
  | "APPROVE_ORDER"
  | "CREATE_RECEIPT"
  | "CALCULATE_ESTIMATE"
  | "CALCULATE_BILL_NORMALIZE"
  | "CALCULATE_FINAL"
  | "COMPLETE_ORDER"
  | "VIEW_ONLY";

// =========================
// CREATE ORDER
// =========================

export type CreateTermBillInfoPayload = {
  premium?: number;
};

export type CreateTermPurchaseOrderLinePayload = {
  productId: UUID;
  supplierLocationId?: UUID;
  orderedQty: number;
  unitPrice?: number;
  taxRate?: number;
  discountAmount?: number;
};

export type CreateTermPurchaseOrderPayload = {
  bizType: "TERM";

  orderType: "SINGLE";

  supplierCustomerId: UUID;

  supplierLocationId?: UUID;

  orderDate: string;

  expectedDate?: string;

  contractNo?: string;

  deliveryLocation?: string;

  paymentNote?: string;

  note?: string;

  billInfo?: CreateTermBillInfoPayload;

  lines: CreateTermPurchaseOrderLinePayload[];
};

export type CreateTermPurchaseOrderResult = {
  id: UUID;
  orderNo: string;
};

// =========================
// LIST
// =========================

export type TermPurchaseOrderListItem = {
  id: UUID;

  orderNo: string;

  status: TermOrderStatus;

  orderDate: string;

  expectedDate?: string | null;

  supplierCustomerId: UUID;

  supplierName?: string | null;

  productSummary: string;

  lineCount: number;

  totalQty: number;

  totalAmount?: number | null;

  premium?: number | null;

  nextAction: TermNextAction;

  createdAt: string;

  updatedAt: string;
};

export type TermPurchaseOrderListQuery = {
  keyword?: string;

  status?: TermOrderStatus;

  supplierCustomerId?: UUID;

  fromDate?: string;

  toDate?: string;

  page?: number;

  pageSize?: number;
};

// =========================
// GOODS RECEIPT
// =========================

export type TermGoodsReceipt = {
  id: UUID;

  receiptNo: string;

  status: string;

  receiptDate: string;

  purchaseOrderLineId?: UUID | null;

  supplierLocationId?: UUID | null;

  supplierLocationName?: string | null;

  productId: UUID;

  productCode?: string | null;

  productName?: string | null;

  qty: number;

  standardQtyV15?: number | null;

  tempC?: number | null;

  density?: number | null;

  note?: string | null;
};

// =========================
// ORDER LINE
// =========================

export type TermPurchaseOrderLine = {
  id: UUID;

  productId: UUID;

  productCode?: string | null;

  productName?: string | null;

  supplierLocationId?: UUID | null;

  supplierLocationName?: string | null;

  orderedQty: number;

  unitPrice?: number | null;

  taxRate?: number | null;

  discountAmount?: number | null;

  withdrawnQty?: number | null;
};

// =========================
// PRICING
// =========================

export type TermPricingStageType =
  | "ESTIMATE"
  | "BILL_NORMALIZE"
  | "FINAL"
  | "BOSS_SHEET";

export type TermPricingCostType =
  | "INSURANCE"
  | "INSPECTION"
  | "TRANSPORT"
  | "STORAGE"
  | "LOSS"
  | "OTHER";

export type TermPricingSheetRowType =
  | "PRICE_DAY"
  | "INPUT"
  | "FORMULA"
  | "COST"
  | "TAX"
  | "RESULT"
  | "NOTE";

export type TermPricingSheetValueType =
  | "NUMBER"
  | "MONEY"
  | "PERCENT"
  | "TEXT"
  | "DATE";

// =========================
// PRICE DAYS
// =========================

export type TermPricingPriceDayPayload = {
  quoteDate: string;
  priceUsdPerBbl: number;
};

export type TermPricingPriceDay = {
  id: UUID;

  quoteDate: string;

  priceUsdPerBbl: number;
};

// =========================
// RECEIPTS PAYLOAD
// =========================

export type TermPricingReceiptPayload = {
  goodsReceiptId: UUID;

  qtyActualUsed?: number;

  qtyV15Used?: number;
};

// =========================
// PRICING LINE
// =========================

export type TermPricingLinePayload = {
  purchaseOrderLineId: UUID;

  qtyActual?: number;

  qtyV15?: number;

  note?: string;
};

export type TermPricingStageLine = {
  id: UUID;

  purchaseOrderLineId?: UUID | null;

  productId: UUID;

  productCode?: string | null;

  productName?: string | null;

  supplierLocationId?: UUID | null;

  supplierLocationName?: string | null;

  qtyActual?: number | null;

  qtyV15?: number | null;

  unitVndPerLiter?: number | null;

  amountVnd?: number | null;

  note?: string | null;

  createdAt?: string;

  updatedAt?: string;
};

// =========================
// COSTS
// =========================

export type TermPricingCostPayload = {
  costType: TermPricingCostType;

  name?: string;

  amountVnd: number;

  sourceDocNo?: string;

  note?: string;

  sortOrder?: number;
};

export type TermPricingStageCost = {
  id: UUID;

  costType: TermPricingCostType;

  name?: string | null;

  amountVnd?: number | null;

  sourceDocNo?: string | null;

  note?: string | null;

  sortOrder?: number | null;

  createdAt?: string;

  updatedAt?: string;
};

// =========================
// SHEET ROWS
// =========================

export type TermPricingSheetRow = {
  id: UUID;

  rowNo: number;

  code?: string | null;

  label: string;

  rowType: TermPricingSheetRowType;

  valueType: TermPricingSheetValueType;

  inputValue?: number | null;

  calculatedValue?: number | null;

  displayValue?: string | null;

  unit?: string | null;

  formula?: string | null;

  note?: string | null;

  isInput: boolean;

  isResult: boolean;

  isBold: boolean;

  isHighlighted: boolean;

  sortOrder: number;

  createdAt?: string;

  updatedAt?: string;
};

// =========================
// STAGE
// =========================

export type TermPricingStage = {
  id: UUID;

  stageType: TermPricingStageType;

  mopsAvgUsdPerBbl?: number | null;

  premiumUsdPerBbl?: number | null;

  specialConsumptionTaxUsdPerBbl?: number | null;

  unitUsdPerBbl?: number | null;

  amountUsd?: number | null;

  paymentAmountUsd?: number | null;

  fxRateDate?: string | null;

  fxStage?: FxStageType | null;

  fxRate?: number | null;

  billBarrelQty?: number | null;

  tankQtyLiter?: number | null;

  insuranceRate?: number | null;

  insuranceAmountVnd?: number | null;

  inspectionFeeVnd?: number | null;

  transportFeeVnd?: number | null;

  storageFeeVnd?: number | null;

  transportLossRate?: number | null;

  transportLossAmountVnd?: number | null;

  envTaxAmountVnd?: number | null;

  vatAmountVnd?: number | null;

  envTaxVndPerLiter?: number | null;

  extraCostVndPerLiter?: number | null;

  retailPriceVndPerLiter?: number | null;

  amountVndBeforeTax?: number | null;

  totalAmountVnd?: number | null;

  unitVndPerLiter?: number | null;

  billTotalVnd?: number | null;

  tankUnitPriceVndPerLiter?: number | null;

  sellingUnitPriceVndPerLiter?: number | null;

  temporaryAmountVnd?: number | null;

  discountVndPerLiter?: number | null;

  note?: string | null;

  priceDays: TermPricingPriceDay[];

  costs: TermPricingStageCost[];

  lines: TermPricingStageLine[];

  sheetRows: TermPricingSheetRow[];

  createdAt?: string;

  updatedAt?: string;
};

// =========================
// RUN
// =========================

export type TermPricingRun = {
  id: UUID;

  purchaseOrderId?: UUID;

  purchaseOrderLineId?: UUID | null;

  productId?: UUID | null;

  productName?: string | null;

  billDate?: string | null;

  qtyBasisSelected?: "ACTUAL" | "V15" | null;

  qtyBasisLocked?: boolean;

  qtyActualTotal?: number | null;

  qtyV15Total?: number | null;

  status: string;

  stages: TermPricingStage[];

  createdAt?: string;

  updatedAt?: string;
};

// =========================
// CREATE PRICING
// =========================

export type CreateTermPricingPayload = {
  billDate: string;

  qtyBasisSelected: "ACTUAL" | "V15";

  qtyBasisLocked?: boolean;

  mopsAvgUsdPerBbl?: number;

  premiumUsdPerBbl?: number;

  specialConsumptionTaxUsdPerBbl?: number;

  plattsBaseDate?: string;

  plattsDaysBefore?: number;

  plattsDaysAfter?: number;

  priceDays?: TermPricingPriceDayPayload[];

  fxRateDate?: string;

  fxStage?: FxStageType;

  fxRate?: number;

  billBarrelQty?: number;

  tankQtyLiter?: number;

  insuranceRate?: number;

  inspectionFeeVnd?: number;

  transportFeeVnd?: number;

  storageFeeVnd?: number;

  transportLossRate?: number;

  envTaxVndPerLiter?: number;

  extraCostVndPerLiter?: number;

  retailPriceVndPerLiter?: number;

  envTaxAmountVnd?: number;

  vatAmountVnd?: number;

  note?: string;

  receipts?: TermPricingReceiptPayload[];

  lines: TermPricingLinePayload[];

  costs?: TermPricingCostPayload[];
};

export type CreateTermPricingResult = TermPricingStage;

// =========================
// DETAIL
// =========================

export type TermPurchaseOrderDetail = {
  id: UUID;

  orderNo: string;

  bizType: "TERM";

  orderType: "SINGLE";

  status: TermOrderStatus;

  orderDate: string;

  expectedDate?: string | null;

  supplierCustomerId: UUID;

  supplierName?: string | null;

  supplierCode?: string | null;

  supplierLocationId?: UUID | null;

  supplierLocationName?: string | null;

  contractNo?: string | null;

  deliveryLocation?: string | null;

  paymentNote?: string | null;

  note?: string | null;

  productSummary?: string;

  lineCount?: number;

  totalQty?: number | null;

  totalAmount?: number | null;

  premium?: number | null;

  lines: TermPurchaseOrderLine[];

  receipts: TermGoodsReceipt[];

  pricingRun?: TermPricingRun | null;

  pricingRuns: TermPricingRun[];

  nextAction: TermNextAction;

  termPremiumUsdPerBbl?: number | null;

  createdAt: string;

  updatedAt: string;
};

export type CreateTermGoodsReceiptPayload = {
  purchaseOrderLineId: UUID;
  supplierLocationId?: UUID;
  productId: UUID;
  receiptDate: string;
  qty: number;
  tempC?: number;
  density?: number;
  standardQtyV15?: number;
  vehicleId?: UUID;
  driverId?: UUID;
  shippingFee?: number;
  note?: string;
};

export type TermPurchaseOrderListResult = Paged<TermPurchaseOrderListItem>;

export type UpdateTermGoodsReceiptPayload =
  Partial<CreateTermGoodsReceiptPayload>;
