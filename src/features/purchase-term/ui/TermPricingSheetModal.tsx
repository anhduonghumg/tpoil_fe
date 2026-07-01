import React, { useEffect, useMemo, useState } from "react";
import { Button, DatePicker, Form, Input, InputNumber, message, Modal, Space, Tag, Typography } from "antd";
import dayjs, { Dayjs } from "dayjs";
import type { CreateTermPricingPayload, TermPricingStage, TermPurchaseOrderDetail, TermPricingStageType } from "../types";
import { TermPurchaseOrdersApi } from "../api";

const { Text } = Typography;

type SheetPricingKind = Extract<TermPricingStageType, "ESTIMATE" | "BILL_NORMALIZE" | "FINAL">;

type PriceDayForm = {
  quoteDate?: Dayjs;
  priceUsdPerBbl?: number;
};

type FormValues = {
  billDate?: Dayjs;
  plattsBaseDate?: Dayjs;
  qtyBasisSelected?: "ACTUAL" | "V15";
  priceDays?: PriceDayForm[];
  mopsAvgUsdPerBbl?: number;
  premiumUsdPerBbl?: number;
  specialConsumptionTaxUsdPerBbl?: number;
  fxRateDate?: Dayjs;
  fxRate?: number;
  billBarrelQty?: number | string;
  tankQtyLiter?: number;
  insuranceAmountVnd?: number;
  inspectionFeeVnd?: number;
  transportFeeVnd?: number;
  storageFeeVnd?: number;
  transportLossAmountVnd?: number;
  transportDeductionVnd?: number;
  envTaxVndPerLiter?: number;
  extraCostVndPerLiter?: number;
  fundAdjustmentVndPerLiter?: number;
  contractPaymentRate?: number;
  bankGuaranteeRate?: number;
  note?: string;
};

type Props = {
  open: boolean;
  kind: SheetPricingKind;
  data: TermPurchaseOrderDetail;
  initialStage?: TermPricingStage | null;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (payload: CreateTermPricingPayload) => void;
};

const titleMap: Record<SheetPricingKind, string> = {
  ESTIMATE: "Bảng giá tạm tính",
  BILL_NORMALIZE: "Bảng xuất hóa đơn",
  FINAL: "Bảng chính thức",
};

function cleanNumber(value?: number | string | null) {
  if (value === null || value === undefined || value === "") return undefined;
  const raw = typeof value === "string" ? value.trim() : value;
  const normalized =
    typeof raw === "string" && raw.includes(",")
      ? raw.replace(/\./g, "").replace(/,/g, ".")
      : raw;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : undefined;
}

function toDate(value?: Dayjs) {
  return value ? value.format("YYYY-MM-DD") : undefined;
}

function fmt(value?: number | null, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "--";
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: digits }).format(Number(value));
}

function fmtFixed(value?: number | null, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "--";
  return new Intl.NumberFormat("vi-VN", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Number(value));
}

function roundNumber(value: number, digits = 3) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function formatPlainDecimalComma(value: number | string | null | undefined, digits = 6): string {
  if (value === null || value === undefined || value === "") return "";
  const num = cleanNumber(value);
  if (!Number.isFinite(num)) return "";
  return Number(num).toFixed(digits).replace(".", ",");
}

function formatPercentRate(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const num = cleanNumber(value);
  if (num === undefined) return "";
  return fmt(num * 100, 6);
}

function parsePercentRate(value?: string): number {
  const num = cleanNumber(value);
  return num === undefined ? NaN : num / 100;
}

function sanitizeNumericText(value: string) {
  const cleaned = value.replace(/[^\d.,]/g, "");
  const commaIndex = cleaned.indexOf(",");
  const withSingleComma =
    commaIndex < 0
      ? cleaned
      : cleaned.slice(0, commaIndex + 1) + cleaned.slice(commaIndex + 1).replace(/,/g, "");
  const dotIndex = withSingleComma.indexOf(".");
  if (commaIndex >= 0 || dotIndex < 0) return withSingleComma;
  return withSingleComma.slice(0, dotIndex + 1) + withSingleComma.slice(dotIndex + 1).replace(/\./g, "");
}

// Parse Vietnamese number format (comma as decimal separator)
function parseVietnameseNumber(str: string): number {
  if (!str) return NaN;
  const normalized = str
    .replace(/\./g, "")
    .replace(/,/g, ".");
  return parseFloat(normalized);
}

function formatVietnameseNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const num = typeof value === "string" ? parseVietnameseNumber(value) : Number(value);
  if (!Number.isFinite(num)) return "";
  return fmt(num, 6);
}

function averagePriceDays(days?: PriceDayForm[]) {
  const prices = (days || [])
    .map((item) => cleanNumber(item?.priceUsdPerBbl))
    .filter((value): value is number => value !== undefined);

  if (!prices.length) return undefined;
  return prices.reduce((sum, value) => sum + value, 0) / prices.length;
}

function confirmedQty(data: TermPurchaseOrderDetail) {
  const receipts = (data.receipts || []).filter((item) => item.status === "CONFIRMED");
  const actual = receipts.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const v15 = receipts.reduce((sum, item) => sum + Number(item.standardQtyV15 || item.qty || 0), 0);
  const ordered = (data.lines || []).reduce((sum, line) => sum + Number(line.orderedQty || 0), 0);
  return {
    actual: actual || ordered,
    v15: v15 || actual || ordered,
    ordered,
  };
}

function calculatePreview(values: FormValues | undefined, data: TermPurchaseOrderDetail) {
  const qtyInfo = confirmedQty(data);
  const qty = cleanNumber(values?.tankQtyLiter) ?? qtyInfo.v15;
  const mops = cleanNumber(values?.mopsAvgUsdPerBbl) ?? averagePriceDays(values?.priceDays) ?? 0;
  const premium = cleanNumber(values?.premiumUsdPerBbl) ?? 0;
  const specialTax = cleanNumber(values?.specialConsumptionTaxUsdPerBbl) ?? 0;
  const fxRate = cleanNumber(values?.fxRate) ?? 0;
  const envTax = cleanNumber(values?.envTaxVndPerLiter) ?? 0;
  const extraCostAmount = cleanNumber(values?.extraCostVndPerLiter) ?? 0;
  const fundAdjustment = cleanNumber(values?.fundAdjustmentVndPerLiter) ?? 0;
  const insuranceAmount = cleanNumber(values?.insuranceAmountVnd) ?? 0;
  const lossAmount = cleanNumber(values?.transportLossAmountVnd) ?? 0;
  const inspectionFeeVnd = cleanNumber(values?.inspectionFeeVnd) ?? 0;
  const transportFeeVnd = cleanNumber(values?.transportFeeVnd) ?? 0;
  const storageFeeVnd = cleanNumber(values?.storageFeeVnd) ?? 0;
  const transportDeductionVnd = cleanNumber(values?.transportDeductionVnd) ?? 0;
  const vatRate = Number(data.lines?.[0]?.taxRate ?? 8) / 100;

  const fobUsdPerBbl = roundNumber(mops + premium + specialTax, 3);
  const billBarrelQty = cleanNumber(values?.billBarrelQty) ?? (qty ? qty / 159 : 0);
  const amountUsd = fobUsdPerBbl * billBarrelQty;
  const amountVnd = amountUsd * fxRate;
  const billTotal = amountVnd + insuranceAmount + inspectionFeeVnd + transportFeeVnd + storageFeeVnd + lossAmount - transportDeductionVnd;
  const unitAverage = qty ? billTotal / qty : 0;
  const extraCost = qty ? extraCostAmount / qty : 0;
  const fundAdjustmentAmount = fundAdjustment * qty;
  const unitBeforeVat = unitAverage + envTax + extraCost + fundAdjustment;
  const amountBeforeVat = unitBeforeVat * qty;
  const vatAmount = amountBeforeVat * vatRate;
  const totalAmount = amountBeforeVat + vatAmount;
  const contractPaymentRate = cleanNumber(values?.contractPaymentRate) ?? 100;
  const contractPaymentAmount = amountBeforeVat * contractPaymentRate / 100;
  const bankGuaranteeRate = cleanNumber(values?.bankGuaranteeRate) ?? 0;
  const bankGuaranteeFee = amountBeforeVat * bankGuaranteeRate / 100;

  return {
    qty,
    mops,
    premium,
    fobUsdPerBbl,
    billBarrelQty,
    amountUsd,
    amountVnd,
    insuranceAmount,
    inspectionFeeVnd,
    transportFeeVnd,
    storageFeeVnd,
    lossAmount,
    transportDeductionVnd,
    extraCostAmount,
    fundAdjustment,
    fundAdjustmentAmount,
    billTotal,
    unitAverage,
    unitBeforeVat,
    amountBeforeVat,
    vatAmount,
    totalAmount,
    contractPaymentRate,
    contractPaymentAmount,
    bankGuaranteeRate,
    bankGuaranteeFee,
    vatRate,
  };
}

function padPriceDays(stage?: TermPricingStage | null) {
  const source = (stage?.priceDays || []).map((item) => ({
    quoteDate: item.quoteDate ? dayjs(item.quoteDate) : undefined,
    priceUsdPerBbl: Number(item.priceUsdPerBbl || 0) || undefined,
  }));

  if (source.length >= 11) return source.slice(0, 11);

  return [
    ...source,
    ...Array.from({ length: 11 - source.length }).map((_, index) => ({
      quoteDate: dayjs().subtract(10 - index, "day"),
    })),
  ];
}

function buildInitialValues(data: TermPurchaseOrderDetail, initialStage?: TermPricingStage | null): FormValues {
  const qtyInfo = confirmedQty(data);
  const lastPriceDay = initialStage?.priceDays?.[initialStage.priceDays.length - 1];
  const fxDate = initialStage?.fxRateDate ? dayjs(initialStage.fxRateDate) : dayjs(data.orderDate);

  return {
    billDate: fxDate,
    plattsBaseDate: lastPriceDay?.quoteDate ? dayjs(lastPriceDay.quoteDate) : dayjs(data.orderDate),
    qtyBasisSelected: "V15",
    priceDays: padPriceDays(initialStage),
    mopsAvgUsdPerBbl: initialStage?.mopsAvgUsdPerBbl ?? undefined,
    premiumUsdPerBbl: initialStage?.premiumUsdPerBbl ?? data.premium ?? data.termPremiumUsdPerBbl ?? undefined,
    specialConsumptionTaxUsdPerBbl: initialStage?.specialConsumptionTaxUsdPerBbl ?? 0,
    fxRateDate: fxDate,
    fxRate: initialStage?.fxRate ?? undefined,
    billBarrelQty: initialStage?.billBarrelQty == null ? undefined : formatPlainDecimalComma(initialStage.billBarrelQty, 6),
    tankQtyLiter: initialStage?.tankQtyLiter ?? qtyInfo.v15,
    insuranceAmountVnd: initialStage?.insuranceAmountVnd ?? 0,
    inspectionFeeVnd: initialStage?.inspectionFeeVnd ?? 0,
    transportFeeVnd: initialStage?.transportFeeVnd ?? 0,
    storageFeeVnd: initialStage?.storageFeeVnd ?? 0,
    transportLossAmountVnd: initialStage?.transportLossAmountVnd ?? 0,
    transportDeductionVnd: initialStage?.transportDeductionVnd ?? 0,
    envTaxVndPerLiter: initialStage?.envTaxVndPerLiter ?? 0,
    extraCostVndPerLiter: (initialStage?.extraCostVndPerLiter ?? 0) * (initialStage?.tankQtyLiter ?? qtyInfo.v15),
    fundAdjustmentVndPerLiter: initialStage?.fundAdjustmentVndPerLiter ?? 0,
    contractPaymentRate: initialStage?.contractPaymentRate ?? 100,
    bankGuaranteeRate: initialStage?.bankGuaranteeRate ?? 0,
    note: initialStage?.note ?? undefined,
  };
}

function buildLines(data: TermPurchaseOrderDetail, kind: SheetPricingKind) {
  const confirmedReceipts = (data.receipts || []).filter((item) => item.status === "CONFIRMED");

  return data.lines.map((line) => {
    const receiptsOfLine = confirmedReceipts.filter((receipt) => receipt.purchaseOrderLineId === line.id);
    const receiptActual = receiptsOfLine.reduce((sum, receipt) => sum + Number(receipt.qty || 0), 0);
    const receiptV15 = receiptsOfLine.reduce((sum, receipt) => sum + Number(receipt.standardQtyV15 || receipt.qty || 0), 0);
    const ordered = Number(line.orderedQty || 0);

    if (kind === "ESTIMATE") {
      return {
        purchaseOrderLineId: line.id,
        qtyActual: ordered,
        qtyV15: ordered,
      };
    }

    return {
      purchaseOrderLineId: line.id,
      qtyActual: receiptActual || ordered,
      qtyV15: receiptV15 || receiptActual || ordered,
    };
  });
}

function buildPayload(values: FormValues, data: TermPurchaseOrderDetail, kind: SheetPricingKind): CreateTermPricingPayload {
  const priceDays = (values.priceDays || [])
    .filter((item) => item?.quoteDate && cleanNumber(item.priceUsdPerBbl) !== undefined)
    .map((item) => ({
      quoteDate: toDate(item.quoteDate)!,
      priceUsdPerBbl: Number(item.priceUsdPerBbl),
    }));

  return {
    billDate: toDate(values.billDate) ?? data.orderDate,
    qtyBasisSelected: values.qtyBasisSelected ?? "V15",
    qtyBasisLocked: kind === "FINAL",
    plattsBaseDate: toDate(values.plattsBaseDate) ?? toDate(values.priceDays?.[0]?.quoteDate) ?? data.orderDate,
    plattsDaysBefore: 11,
    plattsDaysAfter: 0,
    priceDays,
    mopsAvgUsdPerBbl: cleanNumber(values.mopsAvgUsdPerBbl) ?? averagePriceDays(values.priceDays),
    premiumUsdPerBbl: cleanNumber(values.premiumUsdPerBbl),
    specialConsumptionTaxUsdPerBbl: cleanNumber(values.specialConsumptionTaxUsdPerBbl),
    fxRateDate: toDate(values.fxRateDate) ?? data.orderDate,
    fxStage: kind === "FINAL" ? "OFFICIAL" : "ESTIMATE",
    fxRate: cleanNumber(values.fxRate),
    billBarrelQty: cleanNumber(values.billBarrelQty) ?? calculatePreview(values, data).billBarrelQty,
    tankQtyLiter: cleanNumber(values.tankQtyLiter),
    insuranceAmountVnd: cleanNumber(values.insuranceAmountVnd),
    inspectionFeeVnd: cleanNumber(values.inspectionFeeVnd),
    transportFeeVnd: cleanNumber(values.transportFeeVnd),
    storageFeeVnd: cleanNumber(values.storageFeeVnd),
    transportLossAmountVnd: cleanNumber(values.transportLossAmountVnd),
    transportDeductionVnd: cleanNumber(values.transportDeductionVnd),
    envTaxVndPerLiter: cleanNumber(values.envTaxVndPerLiter),
    extraCostVndPerLiter: cleanNumber(values.extraCostVndPerLiter) && cleanNumber(values.tankQtyLiter)
      ? cleanNumber(values.extraCostVndPerLiter)! / cleanNumber(values.tankQtyLiter)!
      : undefined,
    fundAdjustmentVndPerLiter: cleanNumber(values.fundAdjustmentVndPerLiter),
    contractPaymentRate: cleanNumber(values.contractPaymentRate),
    bankGuaranteeRate: cleanNumber(values.bankGuaranteeRate),
    note: values.note?.trim() || undefined,
    lines: buildLines(data, kind),
  };
}

function SheetRow({
  label,
  unit,
  note,
  children,
  strong,
}: {
  label: React.ReactNode;
  unit?: React.ReactNode;
  note?: React.ReactNode;
  children: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <tr>
      <td className={strong ? "term-price-sheet-label strong" : "term-price-sheet-label"}>{label}</td>
      <td className="term-price-sheet-unit">{unit}</td>
      <td className={strong ? "term-price-sheet-value strong" : "term-price-sheet-value"}>{children}</td>
      <td className="term-price-sheet-note">{note}</td>
    </tr>
  );
}

function SheetText({ children }: { children: React.ReactNode }) {
  return <div style={{ minHeight: 24, display: "flex", justifyContent: "flex-end", alignItems: "center" }}>{children}</div>;
}

function RateAmountInput({ name, amount }: { name: keyof FormValues; amount: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "92px minmax(0, 1fr)", gap: 6, alignItems: "center" }}>
      <Form.Item name={name} noStyle>
        <InputNumber
          min={0}
          style={{ width: "100%" }}
          precision={6}
          parser={parsePercentRate}
          formatter={formatPercentRate}
          addonAfter="%"
        />
      </Form.Item>
      <div style={{ textAlign: "right", fontWeight: 700 }}>{fmt(amount)}</div>
    </div>
  );
}

export function TermPricingSheetModal({ open, kind, data, initialStage, loading, onCancel, onSubmit }: Props) {
  const [form] = Form.useForm<FormValues>();
  const [fetchingPlatts, setFetchingPlatts] = useState(false);
  const [fetchingFx, setFetchingFx] = useState(false);
  const [fetchingEnvTax, setFetchingEnvTax] = useState(false);
  const [showPlattsRows, setShowPlattsRows] = useState(false);
  const [showCostRows, setShowCostRows] = useState(false);
  const watched = Form.useWatch([], form) as FormValues | undefined;
  const preview = useMemo(() => calculatePreview(watched, data), [watched, data]);

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue(buildInitialValues(data, initialStage));
    setShowPlattsRows(false);
    setShowCostRows(false);
  }, [open, data, initialStage, form]);

  const fetchLast11Platts = async () => {
    const productId = data.lines?.[0]?.productId;
    const baseDate: Dayjs | undefined = form.getFieldValue("plattsBaseDate") || form.getFieldValue("billDate");

    if (!productId) {
      message.warning("Không tìm thấy sản phẩm để lấy giá Platts.");
      return;
    }

    if (!baseDate) {
      message.warning("Chọn ngày mốc Platts.");
      return;
    }

    setFetchingPlatts(true);
    try {
      const res = await TermPurchaseOrdersApi.getPlattsAverage({
        productId,
        baseDate: baseDate.format("YYYY-MM-DD"),
        limit: 11,
      });

      const items = (res?.items || []).map((item: any) => ({
        quoteDate: dayjs(item.quoteDate),
        priceUsdPerBbl: Number(item.priceUsdPerBbl),
      }));

      if (!items.length) {
        message.warning("Không tìm thấy giá Platts trước ngày đã chọn.");
        return;
      }

      form.setFieldsValue({
        priceDays: items,
        mopsAvgUsdPerBbl: Number(res?.avgPriceUsdPerBbl || averagePriceDays(items)),
      });
      message.success(`Đã lấy ${items.length} ngày giá Platts gần nhất.`);
    } catch (error) {
      console.error(error);
      message.error("Lấy giá Platts thất bại.");
    } finally {
      setFetchingPlatts(false);
    }
  };

  const fetchVcbFxRate = async () => {
    const fxRateDate: Dayjs | undefined = form.getFieldValue("fxRateDate") || form.getFieldValue("billDate");

    if (!fxRateDate) {
      message.warning("Chọn ngày tỷ giá.");
      return;
    }

    setFetchingFx(true);
    try {
      const res = await TermPurchaseOrdersApi.getVcbFxRate({
        date: fxRateDate.format("YYYY-MM-DD"),
        currencyCode: "USD",
      });

      const rate = Number(
        res?.sellRate ??
          res?.sell ??
          res?.rate ??
          res?.data?.sellRate ??
          res?.data?.sell ??
          res?.data?.rate ??
          res?.data?.data?.sellRate ??
          res?.data?.data?.sell ??
          0,
      );

      if (!rate) {
        message.warning("Không có tỷ giá VCB cho ngày đã chọn.");
        return;
      }

      form.setFieldsValue({ fxRate: rate });
      message.success("Đã lấy tỷ giá VCB.");
    } catch (error) {
      console.error(error);
      message.error("Lấy tỷ giá VCB thất bại.");
    } finally {
      setFetchingFx(false);
    }
  };

  const fetchEnvironmentTax = async () => {
    const productId = data.lines?.[0]?.productId;
    const taxDate: Dayjs | undefined = form.getFieldValue("billDate") || form.getFieldValue("fxRateDate");

    if (!productId) {
      message.warning("Không tìm thấy sản phẩm để lấy thuế môi trường.");
      return;
    }

    if (!taxDate) {
      message.warning("Chọn ngày bảng giá trước khi lấy thuế môi trường.");
      return;
    }

    setFetchingEnvTax(true);
    try {
      const res = await TermPurchaseOrdersApi.getEnvironmentTax({
        productId,
        date: taxDate.format("YYYY-MM-DD"),
      });

      const rawTax =
        res?.taxVndPerLiter ??
        res?.envTaxVndPerLiter ??
        res?.rate ??
        res?.data?.taxVndPerLiter ??
        res?.data?.envTaxVndPerLiter ??
        res?.data?.rate;

      if (rawTax === null || rawTax === undefined || rawTax === "") {
        message.warning("Không có thuế môi trường cho sản phẩm/ngày đã chọn.");
        return;
      }

      form.setFieldsValue({ envTaxVndPerLiter: Number(rawTax) });
      message.success("Đã lấy thuế môi trường.");
    } catch (error) {
      console.error(error);
      message.error("Lấy thuế môi trường thất bại.");
    } finally {
      setFetchingEnvTax(false);
    }
  };

  const submit = async () => {
    const values = await form.validateFields();
    onSubmit(buildPayload(values, data, kind));
  };

  return (
    <Modal
      open={open}
      title={titleMap[kind]}
      width="min(1180px, calc(100vw - 32px))"
      onCancel={onCancel}
      onOk={submit}
      okText={initialStage ? "Lưu thay đổi" : "Tạo bảng giá"}
      cancelText="Hủy"
      confirmLoading={loading}
      destroyOnHidden
      styles={{ body: { paddingTop: 8, maxHeight: "calc(100vh - 170px)", overflow: "auto" } }}
    >
      <Form<FormValues> form={form} layout="vertical" size="small">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <Tag color="blue">{data.orderNo}</Tag>
          <Tag>{data.supplierName || "--"}</Tag>
          <Tag color={kind === "FINAL" ? "green" : kind === "BILL_NORMALIZE" ? "purple" : "gold"}>{titleMap[kind]}</Tag>
        </div>

        <table className="term-price-sheet">
          <colgroup>
            <col style={{ width: "42%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "29%" }} />
            <col style={{ width: "16%" }} />
          </colgroup>
          <thead>
            <tr>
              <th>Nội dung</th>
              <th>Đơn vị tính</th>
              <th>Giá trị</th>
              <th>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            <SheetRow label="Ngày bảng giá" note={kind === "ESTIMATE" ? "Tạm tính" : kind === "BILL_NORMALIZE" ? "Xuất hóa đơn" : "Chính thức"}>
              <Form.Item name="billDate" rules={[{ required: true, message: "Chọn ngày bảng giá" }]} noStyle>
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </SheetRow>

            <SheetRow label="Sản phẩm">
              <SheetText>{data.lines?.[0]?.productName || data.productSummary || "--"}</SheetText>
            </SheetRow>

            <SheetRow label="Ngày mốc Platts">
              <Space.Compact style={{ width: "100%" }}>
                <Form.Item name="plattsBaseDate" noStyle>
                  <DatePicker style={{ width: "55%" }} format="DD/MM/YYYY" />
                </Form.Item>
                <Button loading={fetchingPlatts} onClick={fetchLast11Platts} style={{ width: "45%" }}>
                  Lấy 11 ngày
                </Button>
              </Space.Compact>
            </SheetRow>

            <SheetRow
              label={
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span>Giá Platts</span>
                  <Button size="small" type="link" onClick={() => setShowPlattsRows((value) => !value)}>
                    {showPlattsRows ? "Ẩn" : "Mở 11 ngày"}
                  </Button>
                </div>
              }
              strong
            >
              <SheetText>{preview.mops ? `TB ${fmt(preview.mops, 3)}` : "Chưa có giá"}</SheetText>
            </SheetRow>

            {showPlattsRows
              ? Array.from({ length: 11 }).map((_, index) => (
                  <SheetRow
                    key={index}
                    label={
                      <Form.Item name={["priceDays", index, "quoteDate"]} noStyle>
                        <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                      </Form.Item>
                    }
                  >
                    <Form.Item name={["priceDays", index, "priceUsdPerBbl"]} noStyle>
                      <InputNumber min={0} style={{ width: "100%" }} precision={3} parser={parseVietnameseNumber} formatter={formatVietnameseNumber} />
                    </Form.Item>
                  </SheetRow>
                ))
              : null}

            <SheetRow label="Giá trung bình MOPS" unit="USD/thùng">
              <Form.Item name="mopsAvgUsdPerBbl" noStyle>
                <InputNumber min={0} style={{ width: "100%" }} precision={3} parser={parseVietnameseNumber} formatter={formatVietnameseNumber} placeholder={preview.mops ? fmt(preview.mops, 3) : "Tự tính từ Platts"} />
              </Form.Item>
            </SheetRow>

            <SheetRow label="Premium" unit="USD/thùng">
              <Form.Item name="premiumUsdPerBbl" noStyle>
                <InputNumber style={{ width: "100%" }} precision={3} parser={parseVietnameseNumber} formatter={formatVietnameseNumber} />
              </Form.Item>
            </SheetRow>

            <SheetRow label="Thuế TTĐB" unit="USD/thùng">
              <Form.Item name="specialConsumptionTaxUsdPerBbl" noStyle>
                <InputNumber min={0} style={{ width: "100%" }} precision={3} parser={parseVietnameseNumber} formatter={formatVietnameseNumber} />
              </Form.Item>
            </SheetRow>

            <SheetRow label="FOB" unit="USD/thùng" strong>
              <SheetText>{fmt(preview.fobUsdPerBbl, 3)}</SheetText>
            </SheetRow>

            <SheetRow label="Số thùng BILL" unit="thùng">
              <Form.Item name="billBarrelQty" noStyle>
                <Input
                  inputMode="decimal"
                  style={{ width: "100%" }}
                  placeholder={preview.billBarrelQty ? formatPlainDecimalComma(preview.billBarrelQty, 6) : undefined}
                  onChange={(event) => {
                    const sanitized = sanitizeNumericText(event.target.value);
                    if (sanitized !== event.target.value) {
                      form.setFieldValue("billBarrelQty", sanitized);
                    }
                  }}
                />
              </Form.Item>
            </SheetRow>

            <SheetRow label="Số tiền thanh toán" unit="USD">
              <SheetText>{fmt(preview.amountUsd, 3)}</SheetText>
            </SheetRow>

            <SheetRow label="Tỷ giá" unit="VND/USD">
              <Space.Compact style={{ width: "100%" }}>
                <Button loading={fetchingFx} onClick={fetchVcbFxRate}>
                  Lấy VCB
                </Button>
                <Form.Item name="fxRateDate" noStyle>
                  <DatePicker style={{ width: "42%" }} format="DD/MM/YYYY" />
                </Form.Item>
                <Form.Item name="fxRate" noStyle>
                  <InputNumber min={0} style={{ width: "42%" }} parser={parseVietnameseNumber} formatter={formatVietnameseNumber} />
                </Form.Item>
              </Space.Compact>
            </SheetRow>

            <SheetRow label="Số tiền thanh toán" unit="VND">
              <SheetText>{fmt(preview.amountVnd)}</SheetText>
            </SheetRow>

            <SheetRow
              label={
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span>Chi phí & điều chỉnh BILL</span>
                  <Button size="small" type="link" onClick={() => setShowCostRows((value) => !value)}>
                    {showCostRows ? "Ẩn" : "Mở chi tiết"}
                  </Button>
                </div>
              }
              unit="VND"
              strong
            >
              <SheetText>{fmt(preview.billTotal - preview.amountVnd)}</SheetText>
            </SheetRow>

            {showCostRows ? (
              <>
                <SheetRow label="Bảo hiểm hàng hóa" unit="VND">
                  <Form.Item name="insuranceAmountVnd" noStyle>
                    <InputNumber min={0} style={{ width: "100%" }} parser={parseVietnameseNumber} formatter={formatVietnameseNumber} />
                  </Form.Item>
                </SheetRow>

                <SheetRow label="Phí giám định" unit="VND">
                  <Form.Item name="inspectionFeeVnd" noStyle>
                    <InputNumber min={0} style={{ width: "100%" }} parser={parseVietnameseNumber} formatter={formatVietnameseNumber} />
                  </Form.Item>
                </SheetRow>

                <SheetRow label="Cước vận chuyển" unit="VND">
                  <Form.Item name="transportFeeVnd" noStyle>
                    <InputNumber min={0} style={{ width: "100%" }} parser={parseVietnameseNumber} formatter={formatVietnameseNumber} />
                  </Form.Item>
                </SheetRow>

                <SheetRow label="Phí thuê kho" unit="VND">
                  <Form.Item name="storageFeeVnd" noStyle>
                    <InputNumber min={0} style={{ width: "100%" }} parser={parseVietnameseNumber} formatter={formatVietnameseNumber} />
                  </Form.Item>
                </SheetRow>

                <SheetRow label="Hao hụt vận chuyển trừ thẳng vào lượng" unit="VND">
                  <Form.Item name="transportLossAmountVnd" noStyle>
                    <InputNumber min={0} style={{ width: "100%" }} parser={parseVietnameseNumber} formatter={formatVietnameseNumber} />
                  </Form.Item>
                </SheetRow>
                <SheetRow label="Trừ cước/chi quỹ" unit="VND">
                  <Form.Item name="transportDeductionVnd" noStyle>
                    <InputNumber min={0} style={{ width: "100%" }} parser={parseVietnameseNumber} formatter={formatVietnameseNumber} />
                  </Form.Item>
                </SheetRow>
              </>
            ) : null}

            <SheetRow label="Tổng tiền BILL" unit="VND" strong>
              <SheetText>{fmt(preview.billTotal)}</SheetText>
            </SheetRow>

            <SheetRow label="Số lượng bồn" unit="Lít">
              <SheetText>{fmt(preview.qty)}</SheetText>
            </SheetRow>

            <SheetRow label="Đơn giá/Lít TT bồn" unit="VND/lít" strong>
              <SheetText>{fmt(preview.unitAverage, 3)}</SheetText>
            </SheetRow>

            <SheetRow
              label={
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span>Phí bảo vệ môi trường</span>
                  <Button size="small" type="link" loading={fetchingEnvTax} onClick={fetchEnvironmentTax}>
                    Lấy BVMT
                  </Button>
                </div>
              }
              unit="VND/lít"
            >
              <Form.Item name="envTaxVndPerLiter" noStyle>
                <InputNumber min={0} style={{ width: "100%" }} parser={parseVietnameseNumber} formatter={formatVietnameseNumber} />
              </Form.Item>
            </SheetRow>

            <SheetRow label="Chi phí khác" unit="VND">
              <Form.Item name="extraCostVndPerLiter" noStyle>
                <InputNumber min={0} style={{ width: "100%" }} parser={parseVietnameseNumber} formatter={formatVietnameseNumber} />
              </Form.Item>
            </SheetRow>

            <SheetRow label="Trích/chi quỹ" unit="VND/lít">
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 120px", gap: 6, alignItems: "center" }}>
                <Form.Item name="fundAdjustmentVndPerLiter" noStyle>
                  <InputNumber min={0} style={{ width: "100%" }} parser={parseVietnameseNumber} formatter={formatVietnameseNumber} />
                </Form.Item>
                <div style={{ textAlign: "right", fontWeight: 700 }}>{fmt(preview.fundAdjustmentAmount)}</div>
              </div>
            </SheetRow>

            <SheetRow label="Đơn giá trước VAT" unit="VND/lít" strong>
              <SheetText>{fmt(preview.unitBeforeVat, 3)}</SheetText>
            </SheetRow>

            <SheetRow label="Thành tiền trước thuế VAT" unit="VND" strong>
              <SheetText>{fmt(preview.amountBeforeVat)}</SheetText>
            </SheetRow>

            <SheetRow label="Số lượng nhập" unit="Lít" strong>
              <Form.Item name="tankQtyLiter" rules={[{ required: true, message: "Nhập số lượng nhập" }]} noStyle>
                <InputNumber min={0.001} style={{ width: "100%" }} parser={parseVietnameseNumber} formatter={formatVietnameseNumber} />
              </Form.Item>
            </SheetRow>

            <SheetRow label={`${fmt(preview.vatRate * 100)}% VAT`} unit="VND">
              <SheetText>{fmt(preview.vatAmount)}</SheetText>
            </SheetRow>

            <SheetRow label="Tổng tiền thanh toán" unit="VND" strong>
              <SheetText>{fmt(preview.totalAmount)}</SheetText>
            </SheetRow>

            <SheetRow
              label={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span>Giá trị thanh toán theo đơn hàng</span>
                  <Form.Item name="contractPaymentRate" noStyle>
                    <InputNumber min={0} max={200} style={{ width: 84 }} precision={3} parser={parseVietnameseNumber} formatter={formatVietnameseNumber} addonAfter="%" />
                  </Form.Item>
                </div>
              }
              unit="VND"
              strong
            >
              <SheetText>{fmt(preview.contractPaymentAmount)}</SheetText>
            </SheetRow>

            <SheetRow
              label={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span>Phí bảo lãnh ngân hàng</span>
                  <Form.Item name="bankGuaranteeRate" noStyle>
                    <InputNumber min={0} style={{ width: 84 }} precision={3} parser={parseVietnameseNumber} formatter={formatVietnameseNumber} addonAfter="%" />
                  </Form.Item>
                </div>
              }
              unit="VND"
              strong
            >
              <SheetText>{fmt(preview.bankGuaranteeFee)}</SheetText>
            </SheetRow>
          </tbody>
        </table>

        <Form.Item name="note" label="Ghi chú bảng giá" style={{ marginTop: 8, marginBottom: 0 }}>
          <Input.TextArea rows={2} />
        </Form.Item>

        <div style={{ marginTop: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Ba bảng tạm tính, xuất hóa đơn và chính thức dùng cùng cấu trúc trường. Bảng sếp được xử lý riêng.
          </Text>
        </div>
      </Form>

      <style>
        {`
          .term-price-sheet {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            background: #fff;
            font-size: 13px;
          }
          .term-price-sheet th,
          .term-price-sheet td {
            border: 1px solid #1f2937;
            padding: 4px 6px;
            vertical-align: middle;
          }
          .term-price-sheet th {
            background: #f8fafc;
            text-align: center;
            font-weight: 900;
          }
          .term-price-sheet-label {
            font-weight: 700;
          }
          .term-price-sheet-label.strong,
          .term-price-sheet-value.strong {
            font-weight: 900;
          }
          .term-price-sheet-unit {
            text-align: center;
            color: #0f172a;
          }
          .term-price-sheet-value {
            text-align: right;
          }
          .term-price-sheet-note {
            color: #64748b;
            font-size: 12px;
          }
          .term-price-sheet .ant-form-item {
            margin-bottom: 0;
          }
        `}
      </style>
    </Modal>
  );
}
