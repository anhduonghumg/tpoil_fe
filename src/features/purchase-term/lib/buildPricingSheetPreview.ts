import type { CreateTermPricingPayload, TermPricingSheetRow } from "../types";

function n(v: unknown): number {
  const x = Number(v || 0);
  return Number.isFinite(x) ? x : 0;
}

function money(v: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.round(v));
}

export function buildPricingSheetPreview(
  values: Partial<CreateTermPricingPayload>,
): TermPricingSheetRow[] {
  const rows: TermPricingSheetRow[] = [];

  const mops = n(values.mopsAvgUsdPerBbl);

  const premium = n(values.premiumUsdPerBbl);

  const specialTax = n(values.specialConsumptionTaxUsdPerBbl);

  const fx = n(values.fxRate);

  const barrelQty = n(values.billBarrelQty);

  const tankQty = n(values.tankQtyLiter);

  const insuranceRate = n(values.insuranceRate);

  const inspection = n(values.inspectionFeeVnd);

  const transport = n(values.transportFeeVnd);

  const storage = n(values.storageFeeVnd);

  const envTax = n(values.envTaxVndPerLiter);

  const extraCost = n(values.extraCostVndPerLiter);

  const retailPrice = n(values.retailPriceVndPerLiter);

  const unitUsd = mops + premium + specialTax;

  const amountUsd = unitUsd * barrelQty;

  const amountVnd = amountUsd * fx;

  const insuranceAmount = amountVnd * insuranceRate;

  const totalCost = insuranceAmount + inspection + transport + storage;

  const totalBeforeTax = amountVnd + totalCost;

  const unitVnd = tankQty > 0 ? totalBeforeTax / tankQty : 0;

  let rowNo = 1;

  const push = (
    label: string,
    value: number,
    opts?: Partial<TermPricingSheetRow>,
  ) => {
    rows.push({
      id: `${rowNo}`,
      rowNo,

      label,

      rowType: "RESULT",

      valueType: "MONEY",

      inputValue: value,

      calculatedValue: value,

      displayValue: money(value),

      unit: "",

      formula: null,

      note: null,

      isInput: false,

      isResult: true,

      isBold: false,

      isHighlighted: false,

      sortOrder: rowNo,

      ...opts,
    });

    rowNo++;
  };

  push("Giá Platts TB", mops);

  push("Premium", premium);

  push("Thuế TTĐB", specialTax);

  push("Đơn giá USD/thùng", unitUsd, {
    isBold: true,
    isHighlighted: true,
  });

  push("Số lượng thùng", barrelQty);

  push("Tổng USD", amountUsd);

  push("Tỷ giá", fx);

  push("Thành tiền VND", amountVnd, {
    isBold: true,
    isHighlighted: true,
  });

  push("Bảo hiểm", insuranceAmount);

  push("Giám định", inspection);

  push("Vận chuyển", transport);

  push("Lưu kho", storage);

  push("Tổng chi phí", totalCost, {
    isBold: true,
  });

  push("Tổng trước thuế", totalBeforeTax, {
    isBold: true,
    isHighlighted: true,
  });

  push("Thuế BVMT/lít", envTax);

  push("Chi phí khác/lít", extraCost);

  push("Giá vốn/lít", unitVnd + envTax + extraCost, {
    isBold: true,
    isHighlighted: true,
  });

  if (retailPrice > 0) {
    push("Giá bán lẻ", retailPrice, {
      isBold: true,
    });

    push("Lãi gộp/lít", retailPrice - (unitVnd + envTax + extraCost), {
      isBold: true,
      isHighlighted: true,
    });
  }

  return rows;
}
