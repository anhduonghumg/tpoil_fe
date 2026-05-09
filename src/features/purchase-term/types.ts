// features/purchase-terms/types.ts

import type { Paged } from "../../shared/lib/types";

export type UUID = string;

export type TermOrderStatus =
  | "DRAFT"
  | "APPROVED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type TermNextAction =
  | "APPROVE_ORDER"
  | "CREATE_RECEIPT"
  | "CALCULATE_TEMP_PRICE"
  | "CALCULATE_INVOICE_PRICE"
  | "CALCULATE_OFFICIAL_FX"
  | "COMPLETE_ORDER"
  | "VIEW_ONLY";

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
  // bizType: "TERM";
  // orderType: "SINGLE";
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

  termPremiumUsdPerBbl?: number | null;
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

export type TermPricingStageLine = {
  id: string;

  purchaseOrderLineId?: string | null;

  productId: string;
  productCode?: string | null;
  productName?: string | null;

  supplierLocationId?: string | null;
  supplierLocationName?: string | null;

  qtyActual?: number | null;
  qtyV15?: number | null;

  mopsAvgUsdPerBbl?: number | null;
  premiumUsdPerBbl?: number | null;

  unitUsdPerBbl?: number | null;
  amountUsd?: number | null;

  unitVndPerLiter?: number | null;
  amountVnd?: number | null;

  note?: string | null;

  priceDays?: TermPricingPriceDay[];
};

export type TermPricingStage = {
  id: string;
  stageType: "ESTIMATE" | "BILL_NORMALIZE" | "FINAL";

  mopsAvgUsdPerBbl?: number | null;
  premiumUsdPerBbl?: number | null;

  unitUsdPerBbl?: number | null;
  amountUsd?: number | null;

  fxRateDate?: string | null;
  fxStage?: "ESTIMATE" | "OFFICIAL" | null;
  fxRate?: number | null;

  insuranceAmountVnd?: number | null;
  shippingFeeVnd?: number | null;
  otherFeeVnd?: number | null;

  envTaxAmountVnd?: number | null;
  vatAmountVnd?: number | null;

  amountVndBeforeTax?: number | null;
  totalAmountVnd?: number | null;
  unitVndPerLiter?: number | null;

  note?: string | null;

  costs?: TermPricingStageCost[];
  lines?: TermPricingStageLine[];
};

export type TermPricingRun = {
  id: string;
  purchaseOrderId?: string;
  purchaseOrderLineId?: string | null;
  productId?: string | null;
  productName?: string | null;
  billDate?: string | null;
  qtyBasisSelected?: "ACTUAL" | "V15" | null;
  qtyActualTotal?: number | null;
  qtyV15Total?: number | null;
  qtyBasisLocked?: boolean;
  status: string;
  stages: TermPricingStage[];
};

export type TermPurchaseOrderLine = {
  id: string;
  productId: string;
  productCode?: string | null;
  productName?: string | null;
  supplierLocationId?: string | null;
  supplierLocationName?: string | null;
  orderedQty: number;
  unitPrice?: number | null;
  taxRate?: number | null;
  discountAmount?: number | null;
  withdrawnQty?: number | null;
};

export type TermGoodsReceipt = {
  id: string;
  receiptNo: string;
  status: string;
  receiptDate: string;
  purchaseOrderLineId?: string | null;
  supplierLocationId?: string | null;
  supplierLocationName?: string | null;
  productId: string;
  productCode?: string | null;
  productName?: string | null;
  qty: number;
  standardQtyV15?: number | null;
  tempC?: number | null;
  density?: number | null;
  note?: string | null;
};

export type TermPurchaseOrderDetail = {
  id: string;
  orderNo: string;
  bizType: "TERM";
  orderType: "SINGLE";
  status: TermOrderStatus;

  orderDate: string;
  expectedDate?: string | null;

  supplierCustomerId: string;
  supplierName?: string | null;
  supplierCode?: string | null;
  supplierLocationId?: string | null;
  supplierLocationName?: string | null;

  contractNo?: string | null;
  deliveryLocation?: string | null;
  paymentNote?: string | null;
  note?: string | null;

  productSummary?: string;
  lineCount?: number;

  totalQty?: number | null;
  totalAmount?: number | null;

  termPremiumUsdPerBbl?: number | null;
  premium?: number | null;

  lines: TermPurchaseOrderLine[];
  receipts: TermGoodsReceipt[];
  pricingRun?: TermPricingRun | null;
  pricingRuns: TermPricingRun[];

  nextAction: TermNextAction;

  createdAt: string;
  updatedAt: string;
};

export type TermPricingPriceDay = {
  id: string;
  quoteDate: string;
  priceUsdPerBbl?: number | null;
};

export type TermPricingStageCost = {
  id: string;
  costType: string;
  amountVnd?: number | null;
  sourceDocNo?: string | null;
  note?: string | null;
};

export type TermPurchaseOrderListResult = Paged<TermPurchaseOrderListItem>;

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

export type UpdateTermGoodsReceiptPayload =
  Partial<CreateTermGoodsReceiptPayload>;

export type TermPricingPriceDayPayload = {
  quoteDate: string;
  priceUsdPerBbl: number;
};

export type TermPricingLinePayload = {
  purchaseOrderLineId: UUID;
  qtyActual?: number;
  qtyV15?: number;
  note?: string;
};

export type TermPricingCostPayload = {
  costType: "INSURANCE" | "INSPECTION" | "SHIPPING" | "OTHER";
  amountVnd: number;
  sourceDocNo?: string;
  note?: string;
};

export type CreateTermPricingPayload = {
  billDate: string;
  qtyBasisSelected: "ACTUAL" | "V15";
  qtyBasisLocked?: boolean;

  mopsAvgUsdPerBbl?: number;
  premiumUsdPerBbl?: number;

  plattsBaseDate?: string;
  plattsDaysBefore?: number;
  plattsDaysAfter?: number;

  priceDays?: TermPricingPriceDayPayload[];

  fxRateDate?: string;
  fxStage?: "ESTIMATE" | "OFFICIAL";
  fxRate?: number;

  envTaxAmountVnd?: number;
  vatAmountVnd?: number;
  note?: string;

  lines: TermPricingLinePayload[];
  costs?: TermPricingCostPayload[];
};
