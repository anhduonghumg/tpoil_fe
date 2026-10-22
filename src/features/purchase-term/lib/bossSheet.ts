/**
 * Bản sao của backend `purchase-term/boss-sheet.calculator.ts` để xem trước Bảng sếp ngay khi nhập.
 * Sửa công thức thì sửa cả hai nơi; backend là nơi tính chốt khi lưu.
 */

export type BossSheetQuantities = {
  /** Số thùng nhận tại nhà máy. */
  barrels: number;
  /** Số lượng trên bill nhà máy, lít thực tế / L15. */
  billQty: number;
  billQtyV15: number | null;
  /** Số lượng lên bồn kho, lít thực tế / L15. */
  tankQty: number;
  tankQtyV15: number | null;
};

export type BossSheetInputs = {
  priceDays: Array<{ quoteDate: string; priceUsdPerBbl: number }>;
  premiumUsdPerBbl: number;
  specialConsumptionTaxUsdPerBbl: number;
  fxRate: number;
  envFeeVnd: number;
  /** Phí giám định + bảo hiểm (VNĐ). */
  inspectionInsuranceVnd: number;
  /** Quỹ bình ổn, đ/lít theo số lượng mua tại bill: dương là trích (cộng), âm là chi (trừ). */
  fundVndPerLiter: number;
  marginFeeVndPerLiter: number;
  vatRate: number;
  transportFeeVndPerLiter: number;
  storageFeeVndPerLiter: number;
  /** % hao hụt khi rút hàng của kho nhận (theo nhóm dầu/xăng). */
  withdrawLossRatePercent: number;
  retailPriceVndPerLiter: number | null;
  retailPrice2VndPerLiter: number | null;
  retailPriceV15VndPerLiter: number | null;
};

export type BossSheetResult = ReturnType<typeof calculateBossSheet>;

const round = (value: number, digits: number) => {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

export function calculateBossSheet(
  qty: BossSheetQuantities,
  input: BossSheetInputs
) {
  const prices = input.priceDays.map((day) => day.priceUsdPerBbl);
  // "GIÁ 505/515" = ROUND(AVERAGE(11 ngày), 3)
  const plattsAvgUsdPerBbl = prices.length
    ? round(prices.reduce((sum, x) => sum + x, 0) / prices.length, 3)
    : 0;
  const fobUsdPerBbl = plattsAvgUsdPerBbl + input.premiumUsdPerBbl;
  const unitUsdPerBbl = fobUsdPerBbl + input.specialConsumptionTaxUsdPerBbl;
  const amountUsd = unitUsdPerBbl * qty.barrels;
  const amountBeforeTaxVnd = amountUsd * input.fxRate;
  const unitBeforeTaxVndPerLiter =
    qty.billQty > 0 ? amountBeforeTaxVnd / qty.billQty : 0;

  const purchaseQty = qty.billQty;
  const purchaseAmountVnd = unitBeforeTaxVndPerLiter * purchaseQty;
  const fundAmountVnd = input.fundVndPerLiter * purchaseQty;
  const marginFeeVnd = input.marginFeeVndPerLiter * purchaseQty;
  const subtotalBeforeVatVnd =
    purchaseAmountVnd +
    input.envFeeVnd +
    input.inspectionInsuranceVnd +
    fundAmountVnd +
    marginFeeVnd;
  const vatAmountVnd = (subtotalBeforeVatVnd * input.vatRate) / 100;
  const orderTotalVnd = subtotalBeforeVatVnd + vatAmountVnd;

  // Vận chuyển tính trên V15 tại bill, thuê kho trên V15 tại bồn; thiếu L15 thì dùng lít thực tế.
  const transportFeeBasisQty = qty.billQtyV15 ?? qty.billQty;
  const storageFeeBasisQty = qty.tankQtyV15 ?? qty.tankQty;
  const transportFeeVnd = input.transportFeeVndPerLiter * transportFeeBasisQty;
  const storageFeeVnd = input.storageFeeVndPerLiter * storageFeeBasisQty;
  const lotTotalVnd = orderTotalVnd + transportFeeVnd + storageFeeVnd;

  // Lượng bán tại kho = lượng lên bồn trừ hao hụt rút hàng của kho.
  const keepRatio = 1 - input.withdrawLossRatePercent / 100;
  const sellQty = qty.tankQty * keepRatio;
  const sellQtyV15 = qty.tankQtyV15 != null ? qty.tankQtyV15 * keepRatio : null;
  const payPriceVndPerLiter = sellQty > 0 ? lotTotalVnd / sellQty : 0;
  const payPriceV15VndPerLiter = sellQtyV15 ? lotTotalVnd / sellQtyV15 : null;

  const discount = (retail: number | null, price: number | null) =>
    retail != null && price != null ? retail - price : null;

  return {
    plattsAvgUsdPerBbl,
    fobUsdPerBbl,
    unitUsdPerBbl,
    amountUsd,
    amountBeforeTaxVnd,
    unitBeforeTaxVndPerLiter,
    purchaseQty,
    purchaseAmountVnd,
    fundAmountVnd,
    marginFeeVnd,
    subtotalBeforeVatVnd,
    vatAmountVnd,
    orderTotalVnd,
    transportFeeBasisQty,
    storageFeeBasisQty,
    transportFeeVnd,
    storageFeeVnd,
    lotTotalVnd,
    sellQty,
    sellQtyV15,
    payPriceVndPerLiter,
    payPriceV15VndPerLiter,
    discountVndPerLiter: discount(
      input.retailPriceVndPerLiter,
      payPriceVndPerLiter
    ),
    discount2VndPerLiter: discount(
      input.retailPrice2VndPerLiter,
      payPriceVndPerLiter
    ),
    discountV15VndPerLiter: discount(
      input.retailPriceV15VndPerLiter,
      payPriceV15VndPerLiter
    ),
  };
}

export type BossSheetRow = {
  stt: number;
  code: string;
  label: string;
  value: number | null;
  unit: string;
  /** Cột V15 (chỉ một số dòng cuối có). */
  valueV15?: number | null;
  /** Cột phụ: giá bán lẻ / chiết khấu thứ hai theo lít thực tế. */
  value2?: number | null;
  isInput?: boolean;
  isBold?: boolean;
  isHighlighted?: boolean;
};

/** Các dòng hiển thị theo đúng thứ tự và STT của sheet Excel. */
export function buildBossSheetRows(
  qty: BossSheetQuantities,
  input: BossSheetInputs,
  r: BossSheetResult
): BossSheetRow[] {
  const rows: BossSheetRow[] = [
    {
      stt: 1,
      code: "BARRELS",
      label: "Số thùng",
      value: qty.barrels,
      unit: "thùng",
    },
    {
      stt: 3,
      code: "BILL_QTY_V15",
      label: "Số lượng bill",
      value: qty.billQtyV15,
      unit: "Lít 15",
    },
    {
      stt: 4,
      code: "BILL_QTY",
      label: "Số lượng bill",
      value: qty.billQty,
      unit: "Lít thực tế",
    },
  ];
  input.priceDays.forEach((day, index) =>
    rows.push({
      stt: 5 + index,
      code: `PRICE_DAY_${index + 1}`,
      label: day.quoteDate,
      value: day.priceUsdPerBbl,
      unit: "USD/thùng",
    })
  );
  rows.push(
    {
      stt: 16,
      code: "PLATTS_AVG",
      label: "GIÁ 505/515",
      value: r.plattsAvgUsdPerBbl,
      unit: "USD",
      isBold: true,
      isHighlighted: true,
    },
    {
      stt: 17,
      code: "PREMIUM",
      label: "Premium",
      value: input.premiumUsdPerBbl,
      unit: "USD",
      isInput: true,
    },
    {
      stt: 18,
      code: "FOB",
      label: "FOB Nghi Sơn",
      value: r.fobUsdPerBbl,
      unit: "USD",
    },
    {
      stt: 19,
      code: "SPECIAL_TAX",
      label: "Thuế TTĐB",
      value: input.specialConsumptionTaxUsdPerBbl,
      unit: "USD",
      isInput: true,
    },
    {
      stt: 20,
      code: "UNIT_USD",
      label: "Đơn giá bán",
      value: r.unitUsdPerBbl,
      unit: "USD/thùng",
    },
    {
      stt: 21,
      code: "BARREL_QTY",
      label: "Số lượng thùng",
      value: qty.barrels,
      unit: "thùng",
    },
    {
      stt: 22,
      code: "AMOUNT_USD",
      label: "Số tiền thanh toán",
      value: r.amountUsd,
      unit: "USD",
    },
    {
      stt: 23,
      code: "FX_RATE",
      label: "Tỷ giá VCB chính thức",
      value: input.fxRate,
      unit: "VNĐ/USD",
      isInput: true,
      isBold: true,
      isHighlighted: true,
    },
    {
      stt: 24,
      code: "AMOUNT_BEFORE_TAX",
      label: "Tổng giá trị trước thuế",
      value: r.amountBeforeTaxVnd,
      unit: "VNĐ",
      isBold: true,
    },
    {
      stt: 25,
      code: "UNIT_BEFORE_TAX",
      label: "Đơn giá trước thuế",
      value: r.unitBeforeTaxVndPerLiter,
      unit: "VNĐ/lít",
    },
    {
      stt: 26,
      code: "PURCHASE_QTY",
      label: "Số lượng TP mua tại bill",
      value: r.purchaseQty,
      unit: "lít TT",
      isBold: true,
    },
    {
      stt: 27,
      code: "PURCHASE_AMOUNT",
      label: "Thành tiền trước thuế TP",
      value: r.purchaseAmountVnd,
      unit: "VNĐ",
    },
    {
      stt: 28,
      code: "ENV_FEE",
      label: "Phí môi trường",
      value: input.envFeeVnd,
      unit: "VNĐ",
      isInput: true,
    },
    {
      stt: 29,
      code: "INSPECTION_INSURANCE",
      label: "Phí giám định + bảo hiểm",
      value: input.inspectionInsuranceVnd,
      unit: "VNĐ",
      isInput: true,
    },
    {
      stt: 30,
      code: "FUND",
      label: `Quỹ bình ổn ${
        input.fundVndPerLiter < 0 ? "chi" : "trích"
      } ${Math.abs(input.fundVndPerLiter)}đ/L`,
      value: r.fundAmountVnd,
      unit: "VNĐ",
    },
    {
      stt: 31,
      code: "MARGIN_FEE",
      label: `Phí LN biên ${input.marginFeeVndPerLiter}`,
      value: r.marginFeeVnd,
      unit: "VNĐ",
    },
    {
      stt: 32,
      code: "SUBTOTAL",
      label: "Tổng tiền trước thuế",
      value: r.subtotalBeforeVatVnd,
      unit: "VNĐ",
      isBold: true,
    },
    {
      stt: 33,
      code: "VAT",
      label: `Thuế GTGT ${input.vatRate}%`,
      value: r.vatAmountVnd,
      unit: "VNĐ",
    },
    {
      stt: 34,
      code: "ORDER_TOTAL",
      label: "Tổng giá trị đơn hàng",
      value: r.orderTotalVnd,
      unit: "VNĐ",
      isBold: true,
    },
    {
      stt: 35,
      code: "TANK_QTY",
      label: "Số lượng TP mua tại bồn",
      value: qty.tankQty,
      unit: "lít TT",
      isBold: true,
      valueV15: qty.tankQtyV15,
    },
    {
      stt: 36,
      code: "TRANSPORT_FEE",
      label: `Phí vận chuyển ${input.transportFeeVndPerLiter}đ`,
      value: r.transportFeeVnd,
      unit: "VNĐ",
    },
    {
      stt: 37,
      code: "STORAGE_FEE",
      label: `Thuê kho ${input.storageFeeVndPerLiter}`,
      value: r.storageFeeVnd,
      unit: "VNĐ",
    },
    {
      stt: 38,
      code: "LOT_TOTAL",
      label: "TỔNG GIÁ TRỊ LÔ HÀNG",
      value: r.lotTotalVnd,
      unit: "VNĐ",
      isBold: true,
    },
    {
      stt: 39,
      code: "SELL_QTY",
      label: `SỐ LƯỢNG HÀNG ĐƯỢC BÁN TẠI KHO (hao hụt ${input.withdrawLossRatePercent}%)`,
      value: r.sellQty,
      unit: "Lít TT",
      isBold: true,
      valueV15: r.sellQtyV15,
    },
    {
      stt: 40,
      code: "PAY_PRICE",
      label: "GIÁ THANH TOÁN",
      value: r.payPriceVndPerLiter,
      unit: "VNĐ/lít",
      isBold: true,
      isHighlighted: true,
      valueV15: r.payPriceV15VndPerLiter,
    },
    {
      stt: 41,
      code: "RETAIL_PRICE",
      label: "Giá bán lẻ",
      value: input.retailPriceVndPerLiter,
      value2: input.retailPrice2VndPerLiter,
      valueV15: input.retailPriceV15VndPerLiter,
      unit: "VNĐ/lít",
      isInput: true,
      isHighlighted: true,
    },
    {
      stt: 42,
      code: "DISCOUNT",
      label: "Chiết khấu",
      value: r.discountVndPerLiter,
      value2: r.discount2VndPerLiter,
      valueV15: r.discountV15VndPerLiter,
      unit: "VNĐ/lít",
      isBold: true,
      isHighlighted: true,
    }
  );
  return rows;
}

type ReceiptQtyFields = {
  status: string;
  qty?: number | null;
  billQty?: number | null;
  billQtyV15?: number | null;
  tankQty?: number | null;
  tankQtyV15?: number | null;
  factoryBarrelQty?: number | null;
};

/** Số lượng Bảng sếp từ các phiếu giao nhận đã xác nhận (giống backend `bossSheetQuantities`). */
export function bossSheetQuantitiesFromReceipts(
  receipts: ReceiptQtyFields[] = []
): BossSheetQuantities {
  const lines = receipts.filter((item) => item.status === "CONFIRMED");
  const num = (value: unknown) => {
    const n = Number(value ?? 0);
    return Number.isFinite(n) ? n : 0;
  };
  const sum = (pick: (line: ReceiptQtyFields) => unknown) =>
    lines.reduce((total, line) => total + num(pick(line)), 0);
  const sumIfAll = (pick: (line: ReceiptQtyFields) => unknown) =>
    lines.length &&
    lines.every((line) => pick(line) !== null && pick(line) !== undefined)
      ? sum(pick)
      : null;
  const tankOf = (line: ReceiptQtyFields) => line.tankQty ?? line.qty;

  return {
    barrels: sum((line) => line.factoryBarrelQty),
    billQty: sum((line) => line.billQty),
    billQtyV15: sumIfAll((line) => line.billQtyV15),
    tankQty: sum(tankOf),
    tankQtyV15: sumIfAll((line) => line.tankQtyV15),
  };
}

export type FuelProductGroup = "DIESEL" | "GASOLINE";

/** Nhóm dầu/xăng theo tên sản phẩm (giống backend `fuelProductGroup`). */
export function fuelProductGroup(
  productName?: string | null
): FuelProductGroup | null {
  const name = (productName ?? "").trim().toLowerCase();
  if (name.startsWith("xăng") || name.startsWith("xang")) return "GASOLINE";
  if (
    name.startsWith("dầu") ||
    name.startsWith("dau") ||
    name.includes("diesel") ||
    name.includes("điêzen")
  )
    return "DIESEL";
  return null;
}
