import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, DatePicker, Form, Input, InputNumber, message, Modal, Select, Space, Tag } from "antd";
import { PrinterOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import { TermPurchaseOrdersApi } from "../api";
import { PurchasesApi } from "../../purchases/api";
import { useWarehouseLossRates } from "../../supplierLocations/hooks";
import type { TermBossSheetPayload, TermPricingStage, TermPurchaseOrderDetail } from "../types";
import {
  bossSheetQuantitiesFromReceipts,
  buildBossSheetRows,
  calculateBossSheet,
  fuelProductGroup,
  type BossSheetInputs,
} from "../lib/bossSheet";

type PriceDayForm = { quoteDate?: Dayjs; priceUsdPerBbl?: number };

type FormValues = {
  billDate?: Dayjs;
  priceDays?: PriceDayForm[];
  premiumUsdPerBbl?: number;
  specialConsumptionTaxUsdPerBbl?: number;
  fxRateDate?: Dayjs;
  fxRate?: number;
  envFeeVnd?: number;
  inspectionInsuranceVnd?: number;
  /** Quỹ bình ổn đ/lít (luôn dương) + chiều trích/chi, giống dòng Trích/chi quỹ của bảng tạm. */
  fundVndPerLiter?: number;
  fundMode?: "TRICH" | "CHI";
  marginFeeVndPerLiter?: number;
  vatRate?: number;
  transportFeeVndPerLiter?: number;
  storageFeeVndPerLiter?: number;
  withdrawLossRatePercent?: number;
  retailPriceDate?: Dayjs;
  retailPriceVndPerLiter?: number;
  retailPrice2VndPerLiter?: number;
  retailPriceV15VndPerLiter?: number;
  note?: string;
};

/** Giá bán lẻ chính tự lấy theo vùng này từ bảng giá bán lẻ; các ô giá khác nhập tay. */
const RETAIL_REGION = { regionCode: "VUNG_I", label: "Vùng I" } as const;

type Props = {
  open: boolean;
  data: TermPurchaseOrderDetail;
  /** Bảng sếp đã lưu (mở lại để sửa). */
  initialStage?: TermPricingStage | null;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (payload: TermBossSheetPayload) => void;
};

const PLATTS_DAYS = 11;
const PLATTS_DAYS_AFTER = 5;

function fmt(value?: number | null, digits = 0) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "";
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: digits }).format(Number(value));
}

function parseVietnameseNumber(value?: string) {
  if (!value) return NaN;
  const n = Number(value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(/,/g, "."));
  return Number.isFinite(n) ? n : NaN;
}

function formatVietnameseNumber(value: number | string | null | undefined, info?: { userTyping: boolean; input: string }) {
  if (info?.userTyping) return info.input;
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  return Number.isFinite(n) ? new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 6 }).format(n) : "";
}

const numberProps = {
  style: { width: "100%" },
  parser: parseVietnameseNumber,
  formatter: formatVietnameseNumber,
} as const;

const toNumber = (value?: number | null) => (value === undefined || value === null ? undefined : Number(value));
const toDate = (value?: Dayjs) => (value ? value.format("YYYY-MM-DD") : undefined);

/** Phí giám định + bảo hiểm của bảng tạm tính, dùng làm mặc định cho Bảng sếp. */
/** Tiền bảo hiểm + giám định vận hành đã đăng ký trên các chuyến tàu; null nếu chưa đăng ký gì. */
function charterInspectionInsuranceOf(data: TermPurchaseOrderDetail) {
  const charter = data.charter;
  if (!charter || (!charter.insuranceCount && !charter.inspectionCount)) return null;
  return charter.insuranceVnd + charter.inspectionVnd;
}

function estimateInspectionInsuranceOf(data: TermPurchaseOrderDetail) {
  const estimate = findStage(data, "ESTIMATE");
  if (!estimate) return null;
  return Number(estimate.inspectionFeeVnd ?? 0) + Number(estimate.insuranceAmountVnd ?? 0);
}

function findStage(data: TermPurchaseOrderDetail, stageType: string) {
  return (data.pricingRuns || []).flatMap((run) => run.stages || []).find((item) => item.stageType === stageType) ?? null;
}

function emptyPriceDays(): PriceDayForm[] {
  return Array.from({ length: PLATTS_DAYS }).map(() => ({}));
}

function buildInitialValues(data: TermPurchaseOrderDetail, stage?: TermPricingStage | null): FormValues {
  const saved = stage?.inputSnapshot;
  const billDates = (data.receipts || [])
    .filter((item) => item.status === "CONFIRMED" && item.billDate)
    .map((item) => item.billDate!)
    .sort();
  const billDate = saved?.billDate ? dayjs(saved.billDate) : billDates[0] ? dayjs(billDates[0]) : dayjs();

  if (stage) {
    const days = (saved?.priceDays ?? stage.priceDays ?? []).map((day) => ({
      quoteDate: day.quoteDate ? dayjs(day.quoteDate) : undefined,
      priceUsdPerBbl: toNumber(day.priceUsdPerBbl),
    }));
    return {
      billDate,
      priceDays: days.length ? days : emptyPriceDays(),
      premiumUsdPerBbl: toNumber(saved?.premiumUsdPerBbl ?? stage.premiumUsdPerBbl),
      specialConsumptionTaxUsdPerBbl: toNumber(saved?.specialConsumptionTaxUsdPerBbl ?? stage.specialConsumptionTaxUsdPerBbl) ?? 0,
      fxRateDate: saved?.fxRateDate ? dayjs(saved.fxRateDate) : stage.fxRateDate ? dayjs(stage.fxRateDate) : billDate,
      fxRate: toNumber(saved?.fxRate ?? stage.fxRate),
      envFeeVnd: toNumber(saved?.envFeeVnd),
      inspectionInsuranceVnd: toNumber(saved?.inspectionInsuranceVnd),
      fundVndPerLiter: saved?.fundVndPerLiter == null ? undefined : Math.abs(Number(saved.fundVndPerLiter)),
      fundMode: Number(saved?.fundVndPerLiter ?? 0) < 0 ? "CHI" : "TRICH",
      marginFeeVndPerLiter: toNumber(saved?.marginFeeVndPerLiter),
      vatRate: toNumber(saved?.vatRate),
      transportFeeVndPerLiter: toNumber(saved?.transportFeeVndPerLiter),
      storageFeeVndPerLiter: toNumber(saved?.storageFeeVndPerLiter),
      withdrawLossRatePercent: toNumber(saved?.withdrawLossRatePercent),
      retailPriceDate: saved?.retailPriceDate ? dayjs(saved.retailPriceDate) : billDate,
      retailPriceVndPerLiter: toNumber(saved?.retailPriceVndPerLiter ?? stage.retailPriceVndPerLiter),
      retailPrice2VndPerLiter: toNumber(saved?.retailPrice2VndPerLiter),
      retailPriceV15VndPerLiter: toNumber(saved?.retailPriceV15VndPerLiter),
      note: stage.note ?? undefined,
    };
  }

  // Lập lần đầu: premium theo các bảng giá trước, tỷ giá chính thức nếu đã có bảng chính thức.
  const reference = findStage(data, "FINAL") ?? findStage(data, "BILL_NORMALIZE") ?? findStage(data, "ESTIMATE");
  const official = findStage(data, "FINAL");
  return {
    billDate,
    priceDays: emptyPriceDays(),
    premiumUsdPerBbl: toNumber(reference?.premiumUsdPerBbl ?? data.premium ?? data.termPremiumUsdPerBbl),
    specialConsumptionTaxUsdPerBbl: 0,
    fxRateDate: official?.fxRateDate ? dayjs(official.fxRateDate) : billDate,
    fxRate: toNumber(official?.fxRate),
    retailPriceDate: billDate,
    fundMode: "TRICH",
    inspectionInsuranceVnd: charterInspectionInsuranceOf(data) ?? estimateInspectionInsuranceOf(data) ?? undefined,
  };
}

function toInputs(values: FormValues | undefined): BossSheetInputs {
  const n = (value?: number | null) => Number(value ?? 0) || 0;
  const optional = (value?: number | null) => (value === undefined || value === null ? null : Number(value));
  return {
    priceDays: (values?.priceDays || [])
      .filter((day) => day?.quoteDate && day.priceUsdPerBbl !== undefined && day.priceUsdPerBbl !== null)
      .map((day) => ({ quoteDate: day.quoteDate!.format("YYYY-MM-DD"), priceUsdPerBbl: Number(day.priceUsdPerBbl) }))
      .sort((a, b) => a.quoteDate.localeCompare(b.quoteDate)),
    premiumUsdPerBbl: n(values?.premiumUsdPerBbl),
    specialConsumptionTaxUsdPerBbl: n(values?.specialConsumptionTaxUsdPerBbl),
    fxRate: n(values?.fxRate),
    envFeeVnd: n(values?.envFeeVnd),
    inspectionInsuranceVnd: n(values?.inspectionInsuranceVnd),
    // Trích cộng thêm, chi trừ bớt.
    fundVndPerLiter: (values?.fundMode === "CHI" ? -1 : 1) * Math.abs(n(values?.fundVndPerLiter)),
    marginFeeVndPerLiter: n(values?.marginFeeVndPerLiter),
    vatRate: n(values?.vatRate),
    transportFeeVndPerLiter: n(values?.transportFeeVndPerLiter),
    storageFeeVndPerLiter: n(values?.storageFeeVndPerLiter),
    withdrawLossRatePercent: n(values?.withdrawLossRatePercent),
    retailPriceVndPerLiter: optional(values?.retailPriceVndPerLiter),
    retailPrice2VndPerLiter: optional(values?.retailPrice2VndPerLiter),
    retailPriceV15VndPerLiter: optional(values?.retailPriceV15VndPerLiter),
  };
}

function Row({
  stt,
  label,
  value,
  unit,
  v15,
  tone,
  bold,
  hidden,
}: {
  stt?: number;
  label: React.ReactNode;
  value?: React.ReactNode;
  unit?: React.ReactNode;
  v15?: React.ReactNode;
  tone?: "yellow" | "orange" | "green";
  bold?: boolean;
  hidden?: boolean;
}) {
  return (
    <tr
      className={[tone ? `boss-sheet-${tone}` : "", bold ? "boss-sheet-bold" : ""].join(" ")}
      style={hidden ? { display: "none" } : undefined}
    >
      <td className="boss-sheet-stt">{stt}</td>
      <td>{label}</td>
      <td className="boss-sheet-value">{value}</td>
      <td className="boss-sheet-unit">{unit}</td>
      <td className="boss-sheet-value">{v15}</td>
    </tr>
  );
}

/** Nhãn có ô nhập đơn giá nhỏ bên phải, giống dòng "Trích/chi quỹ" của bảng tạm. */
function LabelWithInput({ text, name, suffix }: { text: string; name: keyof FormValues; suffix: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
      <span>{text}</span>
      <Form.Item name={name} noStyle>
        <InputNumber {...numberProps} min={0} size="small" style={{ width: 120 }} addonAfter={suffix} />
      </Form.Item>
    </div>
  );
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);

function printBossSheet(title: string, rows: ReturnType<typeof buildBossSheetRows>) {
  const cell = (value?: number | null) => (value === null || value === undefined ? "" : fmt(value, 3));
  const body = rows
    .map(
      (row) => `<tr class="${row.isBold ? "b" : ""} ${row.isHighlighted ? "h" : ""}">
        <td class="c">${row.stt}</td><td>${escapeHtml(row.label)}</td><td class="r">${cell(row.value)}</td>
        <td class="c">${row.value2 != null ? cell(row.value2) : escapeHtml(row.unit)}</td><td class="r">${cell(row.valueV15)}</td></tr>`,
    )
    .join("");
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Bảng sếp</title>
    <style>body{font-family:Arial,sans-serif;font-size:13px;margin:16px}h3{text-align:center;white-space:pre-line}
    table{border-collapse:collapse;width:100%}td,th{border:1px solid #000;padding:3px 6px}
    .c{text-align:center}.r{text-align:right}.b{font-weight:bold}.h{background:#fff59d}</style></head>
    <body><h3>${escapeHtml(title)}</h3><table><thead><tr><th>STT</th><th>Nội dung</th><th>Giá trị</th><th>ĐVT</th><th>V15</th></tr></thead>
    <tbody>${body}</tbody></table></body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

export function TermBossSheetModal({ open, data, initialStage, loading, onCancel, onSubmit }: Props) {
  const [form] = Form.useForm<FormValues>();
  const [fetchingPlatts, setFetchingPlatts] = useState(false);
  const [fetchingFx, setFetchingFx] = useState(false);
  const [fetchingRetail, setFetchingRetail] = useState(false);
  const [showPlatts, setShowPlatts] = useState(false);
  const lossRatesQuery = useWarehouseLossRates(open);
  const watched = Form.useWatch([], form) as FormValues | undefined;

  const qty = useMemo(() => bossSheetQuantitiesFromReceipts(data.receipts), [data.receipts]);
  const inputs = useMemo(() => toInputs(watched), [watched]);
  const result = useMemo(() => calculateBossSheet(qty, inputs), [qty, inputs]);
  const missingBill = qty.barrels <= 0 || qty.billQty <= 0;
  const productName = data.lines?.[0]?.productName || data.productSummary || "Sản phẩm";
  const billDate = Form.useWatch("billDate", form) as Dayjs | undefined;
  const estimateInspectionInsurance = useMemo(() => estimateInspectionInsuranceOf(data), [data]);
  const charterInspectionInsurance = useMemo(() => charterInspectionInsuranceOf(data), [data]);

  // Tỷ lệ hao hụt rút hàng mặc định: theo kho nhận của phiếu giao nhận và nhóm dầu/xăng của sản phẩm.
  const productGroup = fuelProductGroup(data.lines?.[0]?.productName);
  const receiptWarehouse = (data.receipts || []).find((item) => item.status === "CONFIRMED");
  const warehouseId = receiptWarehouse?.supplierLocationId ?? data.lines?.[0]?.supplierLocationId ?? undefined;
  const warehouseRate = lossRatesQuery.data?.find((row) => row.warehouseId === warehouseId);
  const defaultLossRate =
    productGroup === "GASOLINE" ? warehouseRate?.gasolineLossRatePercent : productGroup === "DIESEL" ? warehouseRate?.dieselLossRatePercent : null;
  const lossRateHint = warehouseRate
    ? `${warehouseRate.warehouseName} · ${productGroup === "GASOLINE" ? "Xăng" : "Dầu"}: ${defaultLossRate == null ? "chưa có tỷ lệ" : `${fmt(defaultLossRate, 4)}%`}`
    : null;

  /** Lấy giá bán lẻ Vùng I của sản phẩm tại ngày đã chọn vào ô giá bán lẻ chính. */
  const fetchRetailPrice = async (date?: Dayjs | null, silent = false) => {
    const productId = data.lines?.[0]?.productId;
    const onDate: Dayjs | undefined = date ?? form.getFieldValue("retailPriceDate");
    if (!productId || !onDate) {
      if (!silent) message.warning("Chọn ngày giá bán lẻ.");
      return;
    }
    setFetchingRetail(true);
    try {
      const res = await PurchasesApi.quotePrice({
        productId,
        regionCode: RETAIL_REGION.regionCode,
        onDate: onDate.format("YYYY-MM-DD"),
      });
      if (res?.ok && res.price != null) {
        form.setFieldsValue({ retailPriceVndPerLiter: Number(res.price) });
        if (!silent) message.success(`Đã lấy giá bán lẻ ${RETAIL_REGION.label}.`);
      } else {
        message.warning(`Chưa có giá bán lẻ ${RETAIL_REGION.label} cho ngày ${onDate.format("DD/MM/YYYY")}.`);
      }
    } catch (error) {
      console.error(error);
      if (!silent) message.error("Lấy giá bán lẻ thất bại.");
    } finally {
      setFetchingRetail(false);
    }
  };

  const fetchPlatts = async (silent = false) => {
    const productId = data.lines?.[0]?.productId;
    const baseDate: Dayjs | undefined = form.getFieldValue("billDate");
    if (!productId || !baseDate) {
      if (!silent) message.warning("Chọn ngày bill trước khi lấy giá Platts.");
      return;
    }
    setFetchingPlatts(true);
    try {
      const res = await TermPurchaseOrdersApi.getPlattsAverage({
        productId,
        baseDate: baseDate.format("YYYY-MM-DD"),
        limit: PLATTS_DAYS,
        after: PLATTS_DAYS_AFTER,
      });
      const items: PriceDayForm[] = (res?.items || []).map((item: any) => ({
        quoteDate: dayjs(item.quoteDate),
        priceUsdPerBbl: Number(item.priceUsdPerBbl),
      }));
      if (!items.length) {
        if (!silent) message.warning("Không có giá Platts quanh ngày bill.");
        return;
      }
      form.setFieldsValue({ priceDays: [...items, ...emptyPriceDays()].slice(0, Math.max(PLATTS_DAYS, items.length)) });
      if (!silent) message.success(`Đã lấy ${items.length} ngày giá Platts quanh ngày bill.`);
    } catch (error) {
      console.error(error);
      if (!silent) message.error("Lấy giá Platts thất bại.");
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
      const res = await TermPurchaseOrdersApi.getVcbFxRate({ date: fxRateDate.format("YYYY-MM-DD"), currencyCode: "USD" });
      const rate = Number(res?.sellRate ?? res?.sell ?? res?.rate ?? res?.data?.sellRate ?? res?.data?.sell ?? res?.data?.rate ?? 0);
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

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue(buildInitialValues(data, initialStage));
    // Lập lần đầu: tự lấy 11 ngày Platts quanh ngày bill.
    // Lập lần đầu: tự lấy 11 ngày Platts quanh ngày bill và giá bán lẻ Vùng I.
    if (!initialStage) {
      void fetchPlatts(true);
      void fetchRetailPrice(undefined, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialStage, data.id]);

  // Điền tỷ lệ hao hụt theo kho khi bảng chưa có (bảng đã lưu giữ nguyên tỷ lệ đã chọn).
  useEffect(() => {
    if (!open || defaultLossRate == null) return;
    if (form.getFieldValue("withdrawLossRatePercent") == null) {
      form.setFieldsValue({ withdrawLossRatePercent: defaultLossRate });
    }
  }, [open, defaultLossRate, form]);

  const submit = async () => {
    if (missingBill) {
      message.warning("Phiếu giao nhận chưa có số thùng hoặc số lượng bill nhà máy.");
      return;
    }
    const values = await form.validateFields();
    const computed = toInputs(values);
    onSubmit({
      ...computed,
      retailPriceVndPerLiter: computed.retailPriceVndPerLiter ?? undefined,
      retailPrice2VndPerLiter: computed.retailPrice2VndPerLiter ?? undefined,
      retailPriceV15VndPerLiter: computed.retailPriceV15VndPerLiter ?? undefined,
      billDate: toDate(values.billDate),
      fxRateDate: toDate(values.fxRateDate),
      retailPriceDate: toDate(values.retailPriceDate),
      note: values.note?.trim() || undefined,
    });
  };

  const title = `MUA ${(data.supplierName || "").toUpperCase()}\nMặt hàng: ${productName}\nBill ngày: ${billDate ? billDate.format("DD/MM/YYYY") : "--"}`;
  const moneyCell = (value?: number | null, digits = 0) => <span>{fmt(value, digits)}</span>;

  return (
    <Modal
      open={open}
      title="Bảng sếp"
      width="min(1080px, calc(100vw - 32px))"
      onCancel={onCancel}
      destroyOnHidden
      styles={{ body: { paddingTop: 8, maxHeight: "calc(100vh - 170px)", overflow: "auto" } }}
      footer={[
        <Button key="print" icon={<PrinterOutlined />} onClick={() => printBossSheet(title, buildBossSheetRows(qty, inputs, result))}>
          In
        </Button>,
        <Button key="cancel" onClick={onCancel}>
          Hủy
        </Button>,
        <Button key="save" type="primary" loading={loading} disabled={missingBill} onClick={submit}>
          {initialStage ? "Lưu thay đổi" : "Lưu bảng sếp"}
        </Button>,
      ]}
    >
      <Form<FormValues> form={form} layout="vertical" size="small">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8, alignItems: "center" }}>
          <Tag color="blue">{data.orderNo}</Tag>
          <Tag>{data.supplierName || "--"}</Tag>
          <span>Ngày bill</span>
          <Form.Item name="billDate" noStyle>
            <DatePicker format="DD/MM/YYYY" style={{ width: 140 }} />
          </Form.Item>
          <Button loading={fetchingPlatts} onClick={() => void fetchPlatts()}>
            Lấy 11 ngày Platts
          </Button>
        </div>

        {missingBill ? (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 8 }}
            message="Chưa đủ dữ liệu bill nhà máy"
            description="Bảng sếp cần phiếu giao nhận đã xác nhận có Số thùng và Số lượng trên bill. Bổ sung ở phần Giao nhận rồi mở lại."
          />
        ) : null}

        <table className="boss-sheet">
          <colgroup>
            <col style={{ width: "6%" }} />
            <col style={{ width: "36%" }} />
            <col style={{ width: "22%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "18%" }} />
          </colgroup>
          <thead>
            <tr>
              <th>STT</th>
              <th>Nội dung</th>
              <th>{productName}</th>
              <th>ĐVT</th>
              <th>V15</th>
            </tr>
          </thead>
          <tbody>
            <Row stt={1} label="Số thùng (theo giao nhận)" value={moneyCell(qty.barrels, 3)} unit="thùng" />
            <Row stt={3} label="Số lượng bill" value={moneyCell(qty.billQtyV15)} unit="Lít 15" />
            <Row stt={4} label="Số lượng bill" value={moneyCell(qty.billQty)} unit="Lít thực tế" />

            {/* Thu gọn chỉ ẩn dòng, ô nhập vẫn nằm trong form để lưu đủ ngày giá. */}
            {Array.from({ length: Math.max(PLATTS_DAYS, watched?.priceDays?.length || 0) }).map((_, index) => (
              <Row
                key={index}
                hidden={!showPlatts}
                stt={5 + index}
                label={
                  <Form.Item name={["priceDays", index, "quoteDate"]} noStyle>
                    <DatePicker format="DD/MM/YYYY" style={{ width: 150 }} />
                  </Form.Item>
                }
                value={
                  <Form.Item name={["priceDays", index, "priceUsdPerBbl"]} noStyle>
                    <InputNumber {...numberProps} min={0} />
                  </Form.Item>
                }
                unit="USD/thùng"
              />
            ))}

            <Row
              stt={16}
              label={
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span>GIÁ 505/515</span>
                  <Button size="small" type="link" onClick={() => setShowPlatts((value) => !value)}>
                    {showPlatts ? "Ẩn ngày Platts" : `Mở ${inputs.priceDays.length || PLATTS_DAYS} ngày Platts`}
                  </Button>
                </div>
              }
              value={moneyCell(result.plattsAvgUsdPerBbl, 3)}
              unit="USD"
              tone="yellow"
              bold
            />
            <Row
              stt={17}
              label="Premium"
              value={
                <Form.Item name="premiumUsdPerBbl" noStyle>
                  <InputNumber {...numberProps} />
                </Form.Item>
              }
              unit="USD"
            />
            <Row stt={18} label="FOB Nghi Sơn" value={moneyCell(result.fobUsdPerBbl, 3)} unit="USD" />
            <Row
              stt={19}
              label="Thuế TTĐB"
              value={
                <Form.Item name="specialConsumptionTaxUsdPerBbl" noStyle>
                  <InputNumber {...numberProps} />
                </Form.Item>
              }
              unit="USD"
            />
            <Row stt={20} label="Đơn giá bán" value={moneyCell(result.unitUsdPerBbl, 3)} unit="USD/thùng" />
            <Row stt={21} label="Số lượng thùng" value={moneyCell(qty.barrels, 3)} unit="thùng" />
            <Row stt={22} label="Số tiền thanh toán" value={moneyCell(result.amountUsd, 3)} unit="USD" />
            <Row
              stt={23}
              tone="yellow"
              bold
              label={
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span>Tỷ giá VCB chính thức</span>
                  <Space.Compact>
                    <Form.Item name="fxRateDate" noStyle>
                      <DatePicker format="DD/MM/YYYY" style={{ width: 130 }} />
                    </Form.Item>
                    <Button loading={fetchingFx} onClick={fetchVcbFxRate}>
                      Lấy VCB
                    </Button>
                  </Space.Compact>
                </div>
              }
              value={
                <Form.Item name="fxRate" noStyle>
                  <InputNumber {...numberProps} min={0} />
                </Form.Item>
              }
              unit="VNĐ/USD"
            />
            <Row stt={24} label="Tổng giá trị trước thuế" value={moneyCell(result.amountBeforeTaxVnd)} unit="VNĐ" bold />
            <Row stt={25} label="Đơn giá trước thuế" value={moneyCell(result.unitBeforeTaxVndPerLiter, 3)} unit="VNĐ/lít" />
            <Row stt={26} label="Số lượng TP mua tại bill" value={moneyCell(result.purchaseQty)} unit="lít TT" bold />
            <Row stt={27} label="Thành tiền trước thuế TP" value={moneyCell(result.purchaseAmountVnd)} unit="VNĐ" />
            <Row
              stt={28}
              label="Phí môi trường"
              value={
                <Form.Item name="envFeeVnd" noStyle>
                  <InputNumber {...numberProps} min={0} />
                </Form.Item>
              }
              unit="VNĐ"
            />
            <Row
              stt={29}
              label={
                <div>
                  <div>Phí giám định + bảo hiểm</div>
                  {charterInspectionInsurance != null ? (
                    <div style={{ fontSize: 11, color: "#64748b" }}>
                      Vận hành: BH {fmt(data.charter?.insuranceVnd)} + GĐ {fmt(data.charter?.inspectionVnd)}
                      {Math.abs(Number(watched?.inspectionInsuranceVnd ?? 0) - charterInspectionInsurance) >= 1 ? (
                        <Button
                          size="small"
                          type="link"
                          style={{ padding: "0 4px", height: "auto", fontSize: 11 }}
                          onClick={() => form.setFieldsValue({ inspectionInsuranceVnd: charterInspectionInsurance })}
                        >
                          Dùng số này
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                  {estimateInspectionInsurance != null ? (
                    <div style={{ fontSize: 11, color: "#64748b" }}>
                      Bảng tạm: {fmt(estimateInspectionInsurance)}
                    </div>
                  ) : null}
                </div>
              }
              value={
                <Form.Item name="inspectionInsuranceVnd" noStyle>
                  <InputNumber {...numberProps} min={0} />
                </Form.Item>
              }
              unit="VNĐ"
            />
            <Row
              stt={30}
              tone="orange"
              label={
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span>Quỹ bình ổn</span>
                  <Space size={4}>
                    <Form.Item name="fundMode" noStyle>
                      <Select
                        size="small"
                        style={{ width: 90 }}
                        options={[
                          { value: "TRICH", label: "Trích (+)" },
                          { value: "CHI", label: "Chi (−)" },
                        ]}
                      />
                    </Form.Item>
                    <Form.Item name="fundVndPerLiter" noStyle>
                      <InputNumber {...numberProps} min={0} size="small" style={{ width: 120 }} addonAfter="đ/L" />
                    </Form.Item>
                  </Space>
                </div>
              }
              value={moneyCell(result.fundAmountVnd)}
              unit="VNĐ"
            />
            <Row
              stt={31}
              label={<LabelWithInput text="Phí LN biên" name="marginFeeVndPerLiter" suffix="đ/L" />}
              value={moneyCell(result.marginFeeVnd)}
              unit="VNĐ"
            />
            <Row stt={32} label="Tổng tiền trước thuế" value={moneyCell(result.subtotalBeforeVatVnd)} unit="VNĐ" bold />
            <Row
              stt={33}
              label={<LabelWithInput text="Thuế GTGT" name="vatRate" suffix="%" />}
              value={moneyCell(result.vatAmountVnd)}
              unit="VNĐ"
            />
            <Row stt={34} label="Tổng giá trị đơn hàng" value={moneyCell(result.orderTotalVnd)} unit="VNĐ" bold />
            <Row stt={35} label="Số lượng TP mua tại bồn" value={moneyCell(qty.tankQty)} unit="lít TT" v15={moneyCell(qty.tankQtyV15)} bold />
            <Row
              stt={36}
              label={<LabelWithInput text="Phí vận chuyển (V15 tại bill)" name="transportFeeVndPerLiter" suffix="đ/L15" />}
              value={moneyCell(result.transportFeeVnd)}
              unit="VNĐ"
            />
            <Row
              stt={37}
              label={<LabelWithInput text="Thuê kho (V15 tại bồn)" name="storageFeeVndPerLiter" suffix="đ/L15" />}
              value={moneyCell(result.storageFeeVnd)}
              unit="VNĐ"
            />
            <Row stt={38} label="TỔNG GIÁ TRỊ LÔ HÀNG" value={moneyCell(result.lotTotalVnd)} unit="VNĐ" bold />
            <Row
              stt={39}
              label={
                <div>
                  <LabelWithInput text="SỐ LƯỢNG HÀNG ĐƯỢC BÁN TẠI KHO" name="withdrawLossRatePercent" suffix="%" />
                  <div style={{ fontSize: 11, fontWeight: 400, color: "#64748b" }}>
                    = Lên bồn × (1 − hao hụt kho){lossRateHint ? ` · Theo bảng: ${lossRateHint}` : ""}
                  </div>
                </div>
              }
              value={moneyCell(result.sellQty, 3)}
              unit="Lít TT"
              v15={moneyCell(result.sellQtyV15, 3)}
              bold
            />
            <Row
              stt={40}
              tone="green"
              label="GIÁ THANH TOÁN"
              value={moneyCell(result.payPriceVndPerLiter, 3)}
              unit="VNĐ/lít"
              v15={moneyCell(result.payPriceV15VndPerLiter, 3)}
              bold
            />
            <Row
              stt={41}
              tone="green"
              label={
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span>Giá bán lẻ</span>
                  <Space.Compact>
                    <Form.Item name="retailPriceDate" noStyle>
                      {/* Đổi ngày là tự lấy lại giá Vùng I. */}
                      <DatePicker format="DD/MM/YYYY" style={{ width: 130 }} onChange={(date) => date && void fetchRetailPrice(date)} />
                    </Form.Item>
                    <Button loading={fetchingRetail} onClick={() => void fetchRetailPrice()}>
                      Lấy lại
                    </Button>
                  </Space.Compact>
                </div>
              }
              value={
                <Form.Item name="retailPriceVndPerLiter" noStyle>
                  <InputNumber {...numberProps} min={0} addonBefore={RETAIL_REGION.label} />
                </Form.Item>
              }
              unit={
                <Form.Item name="retailPrice2VndPerLiter" noStyle>
                  <InputNumber {...numberProps} min={0} placeholder="Giá 2" />
                </Form.Item>
              }
              v15={
                <Form.Item name="retailPriceV15VndPerLiter" noStyle>
                  <InputNumber {...numberProps} min={0} />
                </Form.Item>
              }
            />
            <Row
              stt={42}
              tone="green"
              label="Chiết khấu"
              value={moneyCell(result.discountVndPerLiter, 3)}
              unit={moneyCell(result.discount2VndPerLiter, 3)}
              v15={moneyCell(result.discountV15VndPerLiter, 3)}
              bold
            />
          </tbody>
        </table>

        <Form.Item name="note" label="Ghi chú" style={{ marginTop: 8, marginBottom: 0 }}>
          <Input.TextArea autoSize={{ minRows: 1, maxRows: 3 }} />
        </Form.Item>
      </Form>

      <style>
        {`
          .boss-sheet {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            background: #fff;
            font-size: 13px;
          }
          .boss-sheet th,
          .boss-sheet td {
            border: 1px solid #1f2937;
            padding: 3px 6px;
            vertical-align: middle;
          }
          .boss-sheet th {
            background: #f8fafc;
            text-align: center;
            font-weight: 800;
          }
          .boss-sheet-stt,
          .boss-sheet-unit {
            text-align: center;
          }
          .boss-sheet-value {
            text-align: right;
            font-variant-numeric: tabular-nums;
          }
          .boss-sheet-bold td {
            font-weight: 800;
          }
          .boss-sheet-yellow td {
            background: #fff59d;
          }
          .boss-sheet-orange td {
            background: #fcd9a8;
          }
          .boss-sheet-green td {
            background: #86efac;
          }
          .boss-sheet .ant-form-item {
            margin-bottom: 0;
          }
        `}
      </style>
    </Modal>
  );
}
